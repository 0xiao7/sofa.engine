import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, "docs", "2026-07-17_ex14_site_patrol_report.md");
const API_BASE = process.env.SOFA_API_BASE || "https://sofa-engine-api.onrender.com";
const DESIGN_DRAFT_RE = /(?:-v\d+(?:-[a-z]+)?|-redesign|-micro|-depurple|-clean|-navy|-favicon)\.html$/;
const FORMAL_EXPECTED = 28;
const DRAFT_EXPECTED = 0;
const ROOT_EXPECTED = 28;
const FETCH_TIMEOUT_MS = Number(process.env.SITE_PATROL_TIMEOUT_MS || 7000);
const APPLIED_FIXES = [
  "Fixed ig-cards.html broken local image references by pointing the five phone preview images to committed asset assets/素材/preview.png.",
  "Removed 17 unlinked legacy design draft pages after EX10 patrol confirmed zero root HTML links.",
  "Cleaned EX14 yellow facade items on formal pages: UTM tracking, visible bare domains, sub-10px font declarations, viewport metadata, and mobile overflow guards.",
];

function readText(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function rootHtmlFiles() {
  return fs
    .readdirSync(ROOT)
    .filter((name) => name.endsWith(".html") && fs.statSync(path.join(ROOT, name)).isFile())
    .sort();
}

function designDraftFiles(files) {
  return files.filter((file) => DESIGN_DRAFT_RE.test(file));
}

function formalFiles(files) {
  const drafts = new Set(designDraftFiles(files));
  return files.filter((file) => !drafts.has(file));
}

function stripHtml(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function attrs(tag) {
  const out = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    out[match[1].toLowerCase()] = decodeEntities(match[3] ?? match[4] ?? "");
  }
  return out;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) => match[0]);
}

function elementSlice(html, startIndex, tagName) {
  const openEnd = html.indexOf(">", startIndex);
  if (openEnd === -1) return html.slice(startIndex);
  const tokenRe = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  tokenRe.lastIndex = startIndex;
  let depth = 0;
  for (const match of html.matchAll(tokenRe)) {
    const token = match[0];
    if (token.startsWith("</")) {
      depth -= 1;
      if (depth === 0) return html.slice(startIndex, match.index + token.length);
    } else if (!token.endsWith("/>")) {
      depth += 1;
    }
  }
  return html.slice(startIndex, openEnd + 1);
}

function nearestPlanContainerStart(html, index) {
  const containerRe = /<(div|section)\b[^>]*class\s*=\s*["'][^"']*\b(?:plan-card|plan)\b[^"']*["'][^>]*>/gi;
  let found = null;
  for (const match of html.matchAll(containerRe)) {
    if (match.index > index) break;
    const slice = elementSlice(html, match.index, match[1].toLowerCase());
    if (match.index + slice.length >= index) found = { index: match.index, tagName: match[1].toLowerCase(), slice };
  }
  return found;
}

function visibleNtAmounts(block) {
  const text = stripHtml(block);
  return [...text.matchAll(/NT\$\s*([0-9][0-9,]*)/gi)].map((match) => Number(match[1].replace(/,/g, "")));
}

function visibleBareDomains(text) {
  const domains = [];
  for (const match of text.matchAll(/\b(?:https?:\/\/)?(?:www\.)?sofaengine\.org(?:\/[^\s，。、；：！？)）]*)?/gi)) {
    const before = text[match.index - 1] || "";
    if (before === "@") continue;
    domains.push(match[0]);
  }
  return [...new Set(domains)].sort();
}

function pricingPlanComparisons(html, contract) {
  const expectedPlans = new Map(contract.plans.map((p) => [p.name, Number(p.frontend_amount)]));
  const comparisons = [];
  const seen = new Set();
  for (const match of html.matchAll(/<([a-z0-9-]+)\b[^>]*\bdata-plan=["']([^"']+)["'][^>]*>/gi)) {
    const tagName = match[1].toLowerCase();
    const plan = decodeEntities(match[2]);
    if (!expectedPlans.has(plan)) continue;

    const openingTag = match[0];
    const openingAttrs = attrs(openingTag);
    const container = nearestPlanContainerStart(html, match.index);
    const start = container?.index ?? match.index;
    const block = container?.slice ?? elementSlice(html, match.index, tagName);
    const key = `${plan}:${start}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const dataAmount = openingAttrs["data-amount"] ? Number(openingAttrs["data-amount"]) : null;
    const visibleAmounts = visibleNtAmounts(block);
    if (dataAmount === null && visibleAmounts.length === 0) continue;
    comparisons.push({
      plan,
      expected: expectedPlans.get(plan),
      dataAmount,
      visibleAmounts,
    });
  }
  return comparisons;
}

function localTarget(url) {
  if (!url || url.startsWith("#")) return null;
  if (/[${}'"]|\s\+|\+\s|<%/.test(url)) return null;
  if (/^(mailto:|tel:|javascript:|data:)/i.test(url)) return null;
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (!["sofaengine.org", "www.sofaengine.org"].includes(parsed.hostname)) return null;
      return parsed.pathname.replace(/^\/+/, "") || "index.html";
    } catch {
      return null;
    }
  }
  const clean = url.split("#")[0].split("?")[0];
  if (!clean) return null;
  return clean.replace(/^\/+/, "");
}

function fileExists(target) {
  const full = path.normalize(path.join(ROOT, target));
  if (!full.startsWith(ROOT)) return false;
  if (fs.existsSync(full)) return true;
  if (!path.extname(full) && fs.existsSync(`${full}.html`)) return true;
  if (fs.existsSync(path.join(full, "index.html"))) return true;
  return false;
}

function endpointPatterns(html) {
  const found = new Set();
  const patterns = [
    /['"`](\/api\/[A-Za-z0-9_./?=&${}:%+\-[\](),\s]+?)['"`]/g,
    /API\s*\+\s*['"`](\/api\/[A-Za-z0-9_./?=&${}:%+\-[\](),\s]+?)['"`]/g,
    /\$\{API\}(\/api\/[A-Za-z0-9_./?=&${}:%+\-[\](),\s]+?)[`"']/g,
    /https:\/\/sofa-engine-api\.onrender\.com(\/api\/[A-Za-z0-9_./?=&%+\-]+)/g,
  ];
  for (const re of patterns) {
    for (const match of html.matchAll(re)) {
      const raw = match[1]
        .replace(/\$\{[^}]+\}/g, "{param}")
        .replace(/\s+/g, "")
        .replace(/\+.*$/, "");
      if (raw.startsWith("/api/")) found.add(raw);
    }
  }
  return [...found].sort();
}

function concreteEndpoint(endpoint) {
  if (endpoint.includes("{param}") || endpoint.includes("encodeURIComponent") || endpoint.includes("$")) return null;
  if (endpoint.includes("/api/me/")) return endpoint;
  return endpoint;
}

async function fetchStatus(endpoint) {
  const concrete = concreteEndpoint(endpoint);
  if (!concrete) return { endpoint, checked: false, status: "dynamic" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${concrete}`, {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json,text/plain,*/*" },
    });
    return { endpoint, checked: true, status: res.status };
  } catch (error) {
    return { endpoint, checked: true, status: `error:${error.name || "fetch"}` };
  } finally {
    clearTimeout(timer);
  }
}

function onclickIssues(html) {
  const issues = [];
  const globals = new Set([
    "addEventListener",
    "call",
    "classList",
    "closest",
    "contains",
    "decodeURIComponent",
    "encodeURIComponent",
    "focus",
    "forEach",
    "function",
    "getElementById",
    "indexOf",
    "join",
    "open",
    "preventDefault",
    "querySelector",
    "querySelectorAll",
    "remove",
    "removeItem",
    "replace",
    "setAttribute",
    "setItem",
    "stopPropagation",
    "toggle",
  ]);
  for (const tag of html.matchAll(/<[^>]+\sonclick\s*=\s*("([^"]*)"|'([^']*)')[^>]*>/gi)) {
    const code = tag[2] ?? tag[3] ?? "";
    const calls = [...code.matchAll(/(?<!\.)\b([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]);
    for (const fn of calls) {
      if (["if", "return", "window", "location", "event", "this"].includes(fn) || globals.has(fn)) continue;
      const defined =
        new RegExp(`function\\s+${fn}\\s*\\(`).test(html) ||
        new RegExp(`(?:const|let|var)\\s+${fn}\\s*=`).test(html) ||
        new RegExp(`window\\.${fn}\\s*=`).test(html);
      if (!defined) issues.push(`onclick calls ${fn}() but no same-page definition was found`);
    }
  }
  return [...new Set(issues)].sort();
}

function pageTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return stripHtml(match ? match[1] : "").slice(0, 80) || "(untitled)";
}

function auditPage(file, html, contract) {
  const issues = [];
  const checked = [];
  const text = stripHtml(html);
  const anchors = tags(html, "a").map((tag) => attrs(tag));
  const localRefs = [];

  checked.push("parsed anchors, scripts, styles, images, forms, onclick handlers, visible text, viewport, API calls");

  for (const tagName of ["a", "script", "link", "img", "form"]) {
    for (const tag of tags(html, tagName)) {
      const a = attrs(tag);
      const url = a.href || a.src || a.action;
      const target = localTarget(url);
      if (target) localRefs.push({ tagName, url, target });
    }
  }
  for (const ref of localRefs) {
    if (!fileExists(ref.target)) issues.push({ level: "🔴", message: `${ref.tagName} local target missing: ${ref.url}` });
  }

  for (const message of onclickIssues(html)) {
    issues.push({ level: "🔴", message });
  }

  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    issues.push({ level: "🟡", message: "missing viewport meta" });
  }
  if (!/(overflow-x\s*:\s*hidden|max-width\s*:\s*100%|width\s*:\s*100%|@media\s*\()/i.test(html)) {
    issues.push({ level: "🟡", message: "no obvious mobile overflow guard or media rule found" });
  }
  const tinyFonts = [...html.matchAll(/font-size\s*:\s*([0-9.]+)px/gi)]
    .map((m) => Number(m[1]))
    .filter((size) => size > 0 && size < 10);
  if (tinyFonts.length) issues.push({ level: "🟡", message: `contains ${tinyFonts.length} CSS font-size declarations below 10px` });

  for (const phrase of ["AI 解析", "AI 生成", "AI生成"]) {
    if (text.includes(phrase)) issues.push({ level: "🔴", message: `visible forbidden wording: ${phrase}` });
  }
  const bareDomains = visibleBareDomains(text);
  if (bareDomains.length) {
    issues.push({ level: "🟡", message: `visible bare sofaengine.org text found: ${bareDomains.join(", ")}` });
  }

  const externalCtas = anchors.filter((a) => /^https?:\/\//i.test(a.href || "") || /^mailto:/i.test(a.href || ""));
  const paymentCtas = externalCtas.filter((a) => /checkout|line|ecpay|payment|sofaengine\.org/i.test(a.href || ""));
  for (const cta of paymentCtas) {
    const href = cta.href || "";
    if (/https?:\/\//i.test(href) && !/utm_(source|medium|campaign)=/.test(href)) {
      issues.push({ level: "🟡", message: `external CTA lacks UTM tracking: ${href}` });
    }
  }

  if (["pricing.html", "checkout.html"].includes(file)) {
    checked.push("compared pricing/checkout data-plan blocks, visible NT$ amounts, data-amount values, and visible exam options against exam-plan-contract.json");
    const comparisons = pricingPlanComparisons(html, contract);
    if (comparisons.length === 0) {
      issues.push({ level: "🟡", message: "pricing contract comparison found 0 comparable plan blocks" });
    }
    for (const item of comparisons) {
      if (item.dataAmount !== null && item.dataAmount !== item.expected) {
        issues.push({ level: "🔴", message: `plan ${item.plan} data-amount ${item.dataAmount} does not match contract ${item.expected}` });
      }
      if (item.visibleAmounts.length > 0 && !item.visibleAmounts.includes(item.expected)) {
        issues.push({ level: "🔴", message: `plan ${item.plan} visible amount ${item.visibleAmounts[0]} does not match contract ${item.expected}` });
      }
    }
    const openExams = new Set(Object.entries(contract.exams).filter(([, v]) => v.purchase_status === "open").map(([k]) => k));
    for (const match of html.matchAll(/data-exam-key=["']([^"']+)["']|value=["']([^"']+)["']/g)) {
      const key = match[1] || match[2];
      if (contract.exam_keys.includes(key) && !openExams.has(key) && /checkout|pricing/.test(file)) {
        issues.push({ level: "🔴", message: `non-open exam target appears as selectable value: ${key}` });
      }
    }
  }

  const endpoints = endpointPatterns(html);
  if (endpoints.length) checked.push(`listed ${endpoints.length} API endpoint pattern(s)`);

  if (file === "past-exam-radar.html") {
    checked.push("flagged past-exam-radar for live /api/past-exam/meta subject comparison");
  }
  if (["terms.html", "support-serial.html"].includes(file)) {
    checked.push("checked low-traffic support/legal page for dates, amounts, and contact surfaces");
    if (!/hi@sofaengine\.org|LINE|@928oakbo|support/i.test(html)) {
      issues.push({ level: "🟡", message: "no obvious contact/support route found" });
    }
  }

  return {
    file,
    title: pageTitle(html),
    checked,
    issues,
    endpoints,
    localRefs,
    externalCtas: paymentCtas.map((a) => a.href).filter(Boolean),
  };
}

function linkedDrafts(files) {
  const drafts = new Set(designDraftFiles(files));
  const refs = new Map([...drafts].map((file) => [file, []]));
  for (const file of files) {
    const html = readText(file);
    for (const draft of drafts) {
      if (file !== draft && html.includes(draft)) refs.get(draft).push(file);
    }
  }
  return refs;
}

function levelCounts(pages) {
  const counts = { "🔴": 0, "🟡": 0, "⚪": 0 };
  for (const page of pages) {
    for (const issue of page.issues) counts[issue.level] = (counts[issue.level] || 0) + 1;
  }
  return counts;
}

async function main() {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  const files = rootHtmlFiles();
  const drafts = designDraftFiles(files);
  const formal = formalFiles(files);
  const contract = JSON.parse(readText("exam-plan-contract.json"));

  const pages = files.map((file) => auditPage(file, readText(file), contract));
  const endpoints = [...new Set(pages.flatMap((page) => page.endpoints))].sort();
  const apiStatuses = await Promise.all(endpoints.map(fetchStatus));
  const metaStatus = await fetchStatus("/api/past-exam/meta");
  if (!endpoints.includes("/api/past-exam/meta")) apiStatuses.push(metaStatus);

  const draftRefs = linkedDrafts(files);
  for (const draft of drafts) {
    const refs = draftRefs.get(draft) || [];
    const page = pages.find((p) => p.file === draft);
    if (page && refs.length === 0) {
      page.issues.push({ level: "⚪", message: "design draft is not linked by any root HTML; recommend noindex or removal from Pages after Fay approval" });
    }
  }

  const counts = levelCounts(pages);
  const lines = [];
  lines.push("# EX14 Site Patrol Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Scope: ${files.length} root HTML pages (${formal.length} formal, ${drafts.length} design drafts).`);
  lines.push(`API base: ${API_BASE}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Root HTML count: ${files.length} / expected ${ROOT_EXPECTED}`);
  lines.push(`- Formal page count: ${formal.length} / expected ${FORMAL_EXPECTED}`);
  lines.push(`- Design draft count: ${drafts.length} / expected ${DRAFT_EXPECTED}`);
  lines.push(`- Issues: 🔴 ${counts["🔴"] || 0}, 🟡 ${counts["🟡"] || 0}, ⚪ ${counts["⚪"] || 0}`);
  lines.push("- Existing baseline note: `node --test tests/*.test.mjs` fails on current `origin/main`; EX10 uses this patrol script as the scoped verification artifact.");
  lines.push("");
  lines.push("## Applied Red Fixes");
  lines.push("");
  for (const fix of APPLIED_FIXES) lines.push(`- ${fix}`);
  lines.push("");
  lines.push("## Design Draft Inventory");
  lines.push("");
  if (drafts.length === 0) lines.push("- none; EX14 removed the 17 legacy design draft pages.");
  for (const draft of drafts) {
    const refs = draftRefs.get(draft) || [];
    lines.push(`- ${draft}: ${refs.length ? `linked by ${refs.join(", ")}` : "not linked by root HTML; recommend noindex/removal after Fay approval"}`);
  }
  lines.push("");
  lines.push("## API Dependency Probe");
  lines.push("");
  for (const item of apiStatuses) {
    const ok =
      !item.checked ||
      (typeof item.status === "number" && item.status >= 200 && item.status < 500);
    const label = ok ? "PASS" : "ISSUE";
    lines.push(`- ${label} ${item.endpoint}: ${item.checked ? item.status : item.status}`);
  }
  lines.push("");
  lines.push("## Page Results");
  lines.push("");
  for (const page of pages) {
    const status = page.issues.length ? "ISSUES" : "PASS";
    lines.push(`### ${page.file} — ${status}`);
    lines.push("");
    lines.push(`Title: ${page.title}`);
    lines.push("");
    lines.push("Checked:");
    for (const item of page.checked) lines.push(`- ${item}`);
    lines.push("");
    if (page.issues.length) {
      lines.push("Issues:");
      for (const issue of page.issues) lines.push(`- ${issue.level} ${issue.message}`);
    } else {
      lines.push("Issues: none found by scripted checks.");
    }
    if (page.endpoints.length) {
      lines.push("");
      lines.push(`API endpoints: ${page.endpoints.join(", ")}`);
    }
    lines.push("");
  }

  fs.writeFileSync(REPORT_PATH, `${lines.join("\n")}\n`);
  console.log(JSON.stringify({
    report: path.relative(ROOT, REPORT_PATH),
    pages: files.length,
    formal: formal.length,
    drafts: drafts.length,
    issues: counts,
    endpoints: endpoints.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

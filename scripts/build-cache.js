const fs = require('fs');
const path = require('path');

const API = process.env.SOFA_API || 'https://sofa-engine-api.onrender.com';
const OUT = path.join(__dirname, '..', 'data', 'cache.json');
const CONCURRENCY = 5;
const DELAY_MS = 200;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function main() {
  console.log('Fetching law list...');
  const { laws } = await fetchJSON(`${API}/api/laws`);
  console.log(`Found ${laws.length} laws`);

  const allArticles = [];
  for (const law of laws) {
    const name = law.name || law;
    console.log(`  ${name} ...`);
    try {
      const d = await fetchJSON(`${API}/api/articles?law=${encodeURIComponent(name)}`);
      if (d && d.articles) {
        d.articles.forEach(a => { a._law = name; });
        allArticles.push(...d.articles);
      }
    } catch (e) {
      console.error(`  SKIP ${name}: ${e.message}`);
    }
    await sleep(100);
  }
  console.log(`Total articles to fetch: ${allArticles.length}`);

  const cache = {};
  let done = 0;

  for (let i = 0; i < allArticles.length; i += CONCURRENCY) {
    const batch = allArticles.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(a => fetchJSON(`${API}/api/article/${encodeURIComponent(a.id)}`))
    );
    results.forEach((r, idx) => {
      const a = batch[idx];
      if (r.status === 'fulfilled' && r.value) {
        cache[a.id] = r.value;
      } else {
        console.error(`  FAIL ${a._law} ${a.title}: ${r.reason}`);
      }
      done++;
    });
    if (done % 50 === 0 || done === allArticles.length) {
      console.log(`  ${done}/${allArticles.length}`);
    }
    await sleep(DELAY_MS);
  }

  fs.writeFileSync(OUT, JSON.stringify(cache));
  const sizeMB = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
  console.log(`Cache written: ${Object.keys(cache).length} articles, ${sizeMB} MB`);
}

main().catch(e => { console.error(e); process.exit(1); });

#!/usr/bin/env python3
"""
Extract all unique law names from the NODES JavaScript object in an HTML file,
and compare them against the SoFa Engine bookkeeper-exam LAW_DB.

Usage:
    python _extract_laws.py <path-to-html-file>

The HTML file must contain a JavaScript block like:
    const NODES = { ... };
"""

import sys
import re
import json


# ---------------------------------------------------------------------------
# The 33 laws already in SoFa Engine (bookkeeper / 記帳士 national exam)
# ---------------------------------------------------------------------------
LAW_DB = {
    "記帳士法",
    "商業會計法",
    "公司法",
    "行政程序法",
    "稅捐稽徵法施行細則",
    "稅捐稽徵法",
    "納稅者權利保護法",
    "所得基本稅額條例",
    "加值型及非加值型營業稅法",
    "遺產及贈與稅法",
    "特種貨物及勞務稅條例",
    "所得稅法",
    "各類所得扣繳率標準",
    "營利事業所得稅查核準則",
    "統一發票使用辦法",
    "納稅者權利保護法施行細則",
    "所得稅法施行細則",
    "所得基本稅額條例施行細則",
    "加值型及非加值型營業稅法施行細則",
    "遺產及贈與稅法施行細則",
    "特種貨物及勞務稅條例施行細則",
    "兼營營業人營業稅額計算辦法",
    "統一發票給獎辦法",
    "商業會計處理準則",
    "公司登記辦法",
    "商業登記法",
    "商業登記申請辦法",
    "記帳士職業倫理道德規範",
    "中華民國記帳士職業道德規範",
    "記帳士法第三十五條規定之管理辦法",
    "記帳士暨記帳及報稅代理人防制洗錢與打擊資恐辦法",
    "記帳士懲戒委員會與懲戒覆審委員會組織及審議規則",
    "商業使用電子方式處理會計資料辦法",
}


def extract_nodes_from_html(html: str) -> dict:
    """
    Pull the NODES object out of the HTML, convert JS object literal to
    Python dict, and return it.
    """
    # Match:  const NODES = { ... };
    # We use a greedy match between the outermost braces.  Because the value
    # might span thousands of lines we use re.DOTALL.
    pattern = r'const\s+NODES\s*=\s*(\{.+?\})\s*;'

    # Greedy approach: find the opening brace after "const NODES =" and then
    # locate the matching closing brace by brace-counting, which is more
    # reliable than regex for deeply nested objects.
    m = re.search(r'const\s+NODES\s*=\s*\{', html)
    if not m:
        sys.exit("ERROR: Could not find 'const NODES = {' in the file.")

    start = m.end() - 1  # index of the opening '{'
    depth = 0
    end = start
    for i in range(start, len(html)):
        if html[i] == '{':
            depth += 1
        elif html[i] == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    else:
        sys.exit("ERROR: Could not find the matching closing brace for NODES.")

    js_obj = html[start:end]

    # ---- Convert JS object literal to valid JSON ----
    # 1. Strip single-line comments  (// ...)
    js_obj = re.sub(r'//[^\n]*', '', js_obj)
    # 2. Strip multi-line comments   (/* ... */)
    js_obj = re.sub(r'/\*.*?\*/', '', js_obj, flags=re.DOTALL)
    # 3. Replace single-quoted strings with double-quoted
    #    (only if the file uses single quotes for values)
    #    We do a conservative approach: replace ' that are not inside "..."
    #    This handles the common case where keys/values use single quotes.
    #    For safety we first check whether double-quotes are already dominant.
    if js_obj.count("'") > js_obj.count('"'):
        # Swap single <-> double so json.loads works
        js_obj = _swap_quotes(js_obj)

    # 4. Remove trailing commas before } or ]
    js_obj = re.sub(r',\s*([}\]])', r'\1', js_obj)

    # 5. Ensure property keys are double-quoted.
    #    Matches an unquoted key at the start of a line or after { / ,
    js_obj = re.sub(
        r'(?<=[{\[,\n])\s*([A-Za-z_$][\w$]*)\s*:',
        lambda m: ' "{}":'.format(m.group(1)),
        js_obj,
    )

    try:
        return json.loads(js_obj)
    except json.JSONDecodeError as e:
        # Dump a snippet around the error for debugging
        pos = e.pos if e.pos else 0
        snippet = js_obj[max(0, pos - 120):pos + 120]
        sys.exit(
            f"JSON parse error at position {pos}: {e.msg}\n"
            f"--- snippet around error ---\n{snippet}\n"
        )


def _swap_quotes(s: str) -> str:
    """Swap single and double quotes in a JS literal string."""
    out = []
    in_single = False
    in_double = False
    prev = ''
    for ch in s:
        if ch == "'" and not in_double and prev != '\\':
            in_single = not in_single
            out.append('"')
        elif ch == '"' and not in_single and prev != '\\':
            in_double = not in_double
            out.append("'")  # will not appear inside our strings
        else:
            out.append(ch)
        prev = ch
    return ''.join(out)


def collect_laws(nodes: dict) -> set:
    """Walk every node and union all 'laws' arrays."""
    all_laws: set[str] = set()
    for key, node in nodes.items():
        if isinstance(node, dict):
            laws = node.get("laws", [])
            if isinstance(laws, list):
                for law in laws:
                    if isinstance(law, str) and law.strip():
                        all_laws.add(law.strip())
    return all_laws


def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: python _extract_laws.py <path-to-html-file>")

    filepath = sys.argv[1]
    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()

    nodes = extract_nodes_from_html(html)

    all_laws = collect_laws(nodes)
    sorted_laws = sorted(all_laws, key=lambda s: s)

    # Compare with LAW_DB
    covered = all_laws & LAW_DB
    missing = all_laws - LAW_DB
    extra_in_db = LAW_DB - all_laws  # laws in our DB but not referenced by any career

    sorted_covered = sorted(covered)
    sorted_missing = sorted(missing)
    sorted_extra = sorted(extra_in_db)

    # ---- Print results ----
    divider = "=" * 60

    print(divider)
    print(f"  NODES parsed: {len(nodes)} career/exam nodes")
    print(divider)

    print(f"\n(a) Total unique laws across all nodes: {len(all_laws)}\n")

    print(f"(b) Complete sorted list ({len(sorted_laws)} laws):")
    print("-" * 40)
    for i, law in enumerate(sorted_laws, 1):
        print(f"  {i:>3}. {law}")

    print(f"\n{divider}")
    print(f"(c) Laws ALREADY in LAW_DB ({len(sorted_covered)}/{len(LAW_DB)}):")
    print("-" * 40)
    for i, law in enumerate(sorted_covered, 1):
        print(f"  {i:>3}. {law}")

    print(f"\n{divider}")
    print(f"(d) Laws NOT YET in LAW_DB — the gap ({len(sorted_missing)}):")
    print("-" * 40)
    for i, law in enumerate(sorted_missing, 1):
        print(f"  {i:>3}. {law}")

    if sorted_extra:
        print(f"\n{divider}")
        print(f"(extra) Laws in LAW_DB but NOT referenced by any career ({len(sorted_extra)}):")
        print("-" * 40)
        for i, law in enumerate(sorted_extra, 1):
            print(f"  {i:>3}. {law}")

    print(f"\n{divider}")
    print(f"(e) Summary:")
    print(f"    LAW_DB size:            {len(LAW_DB)}")
    print(f"    Unique laws in NODES:   {len(all_laws)}")
    print(f"    Already covered:        {len(covered)}")
    print(f"    Missing (gap):          {len(missing)}")
    print(f"    In DB but unreferenced: {len(extra_in_db)}")
    print(divider)


if __name__ == "__main__":
    main()

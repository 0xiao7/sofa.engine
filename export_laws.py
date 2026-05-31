"""
export_laws.py — 從 Notion 輸出 laws.json
用途：GitHub Actions 每日自動執行，輸出靜態 JSON 供網頁讀取
"""

import os
import json
from datetime import datetime, timezone, timedelta
from notion_client import Client

# ── 設定 ──
NOTION_API_KEY  = os.environ["NOTION_API_KEY"]
NOTION_LAW_DB   = os.environ.get("NOTION_LAW_DB_ID", "30d6e707a54381efa78dc298446a0c5a")
OUTPUT_FILE     = "laws.json"   # 輸出到 repo 根目錄

notion = Client(auth=NOTION_API_KEY)

def get_block_text(block_id: str) -> str:
    """遞迴讀取 Notion 頁面 blocks，合併所有文字"""
    text_parts = []
    cursor = None
    while True:
        kwargs = {"block_id": block_id, "page_size": 100}
        if cursor:
            kwargs["start_cursor"] = cursor
        resp = notion.blocks.children.list(**kwargs)
        for block in resp.get("results", []):
            bt = block.get("type", "")
            rich = block.get(bt, {}).get("rich_text", [])
            line = "".join(r["plain_text"] for r in rich)
            if line:
                text_parts.append(line)
            # 遞迴子 blocks（toggle、bulleted 等）
            if block.get("has_children"):
                child_text = get_block_text(block["id"])
                if child_text:
                    text_parts.append(child_text)
        if not resp.get("has_more"):
            break
        cursor = resp["next_cursor"]
    return "\n".join(text_parts)

def get_page_sections(page_id: str) -> list:
    """讀取法條頁面的六段 toggle 內文"""
    sections = []
    cursor = None
    while True:
        kwargs = {"block_id": page_id, "page_size": 100}
        if cursor:
            kwargs["start_cursor"] = cursor
        resp = notion.blocks.children.list(**kwargs)
        for block in resp.get("results", []):
            bt = block.get("type", "")
            if bt in ("toggle", "heading_2", "heading_3"):
                rich = block.get(bt, {}).get("rich_text", [])
                head = "".join(r["plain_text"] for r in rich)
                body = ""
                if block.get("has_children"):
                    body = get_block_text(block["id"])
                if head:
                    sections.append({"head": head, "body": body})
        if not resp.get("has_more"):
            break
        cursor = resp["next_cursor"]
    return sections

def get_callout_text(page_id: str) -> str:
    """讀取頁面中第一個 callout 的文字（原文區塊）"""
    resp = notion.blocks.children.list(block_id=page_id, page_size=20)
    for block in resp.get("results", []):
        if block.get("type") == "callout":
            rich = block["callout"].get("rich_text", [])
            return "".join(r["plain_text"] for r in rich)
    return ""

def fetch_all_articles() -> list:
    """從 Notion 資料庫讀取所有法條"""
    articles = []
    cursor = None
    total = 0

    while True:
        kwargs = {
            "database_id": NOTION_LAW_DB,
            "page_size": 100,
        }
        if cursor:
            kwargs["start_cursor"] = cursor

        resp = notion.databases.query(**kwargs)
        for page in resp.get("results", []):
            props = page.get("properties", {})

            # 條號（title）
            title_prop = props.get("條號", {}).get("title", [])
            no = "".join(t["plain_text"] for t in title_prop).strip()
            if not no:
                continue

            # 法規名稱（從 relation → master index 讀取）
            # 先嘗試 select 或 formula 屬性，若無則留空
            law_name = ""
            for key in ["法規名稱", "法規", "Law"]:
                prop = props.get(key, {})
                if prop.get("type") == "select" and prop.get("select"):
                    law_name = prop["select"]["name"]
                    break
                if prop.get("type") == "formula":
                    law_name = prop.get("formula", {}).get("string", "")
                    break
                if prop.get("type") == "rollup":
                    arr = prop.get("rollup", {}).get("array", [])
                    if arr and arr[0].get("title"):
                        law_name = arr[0]["title"][0]["plain_text"]
                    break

            # 標題（若有獨立欄位）
            article_title = ""
            for key in ["標題", "title", "Title"]:
                prop = props.get(key, {})
                if prop.get("type") == "rich_text":
                    article_title = "".join(t["plain_text"] for t in prop.get("rich_text", []))
                    break

            # 重要性
            imp_prop = props.get("重要性", {})
            importance = ""
            if imp_prop.get("type") == "select" and imp_prop.get("select"):
                importance = imp_prop["select"]["name"]

            # 讀取頁面內容（原文 callout + 六段 toggle）
            page_id = page["id"]
            text = get_callout_text(page_id)
            sections = get_page_sections(page_id)

            articles.append({
                "no":         no,
                "law":        law_name,
                "title":      article_title,
                "text":       text,
                "sections":   sections,
                "importance": importance,
            })
            total += 1
            if total % 50 == 0:
                print(f"  已讀取 {total} 條…")

        if not resp.get("has_more"):
            break
        cursor = resp["next_cursor"]

    return articles

def main():
    print("開始從 Notion 輸出 laws.json…")
    articles = fetch_all_articles()
    print(f"共讀取 {len(articles)} 條")

    # 台灣時間
    tz_tw = timezone(timedelta(hours=8))
    updated = datetime.now(tz_tw).strftime("%Y/%m/%d %H:%M")

    output = {
        "updated":  updated,
        "total":    len(articles),
        "articles": articles,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✓ 輸出完成：{OUTPUT_FILE}（{len(articles)} 條，更新時間 {updated}）")

if __name__ == "__main__":
    main()

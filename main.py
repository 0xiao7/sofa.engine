from __future__ import annotations
"""
SoFa Engine 備考中控系統 v5.0 (Python)
GAS → Python 遷移版
"""

import os
import json
import time
import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from flask import Flask, request, abort
from linebot.v3 import WebhookHandler
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import (
    Configuration, ApiClient, MessagingApi,
    ReplyMessageRequest, PushMessageRequest,
    TextMessage, QuickReply, QuickReplyItem, MessageAction
)
from linebot.v3.webhooks import MessageEvent, TextMessageContent
import requests
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

app = Flask(__name__)

# ── 環境變數 ────────────────────────────────────────────────
LINE_TOKEN    = os.environ['LINE_CHANNEL_ACCESS_TOKEN']
LINE_SECRET   = os.environ['LINE_CHANNEL_SECRET']
LINE_UID      = os.environ['LINE_USER_ID']
NOTION_KEY    = os.environ['NOTION_API_KEY']
LAW_DB        = os.environ['NOTION_LAW_DB_ID']
INDEX_DB      = os.environ['NOTION_INDEX_DB_ID']


TAIPEI = ZoneInfo('Asia/Taipei')
DAILY_LAW_COUNT = 5

configuration = Configuration(access_token=LINE_TOKEN)
handler = WebhookHandler(LINE_SECRET)

# ── 法規清單 ────────────────────────────────────────────────
LAW_ORDER = [
    '記帳士法', '商業會計法', '公司法', '行政程序法', '稅捐稽徵法施行細則',
    '稅捐稽徵法', '納稅者權利保護法', '所得基本稅額條例',
    '加值型及非加值型營業稅法', '遺產及贈與稅法', '特種貨物及勞務稅條例',
    '所得稅法', '各類所得扣繳率標準', '營利事業所得稅查核準則', '統一發票使用辦法',
    '納稅者權利保護法施行細則', '所得稅法施行細則', '所得基本稅額條例施行細則',
    '加值型及非加值型營業稅法施行細則', '遺產及贈與稅法施行細則',
    '特種貨物及勞務稅條例施行細則', '兼營營業人營業稅額計算辦法',
    '統一發票給獎辦法', '商業會計處理準則', '公司登記辦法', '商業登記法',
    '商業登記申請辦法', '記帳士職業倫理道德規範', '中華民國記帳士職業道德規範',
    '記帳士法第三十五條規定之管理辦法', '記帳士暨記帳及報稅代理人防制洗錢與打擊資恐辦法',
    '記帳士懲戒委員會與懲戒覆審委員會組織及審議規則', '商業使用電子方式處理會計資料辦法',
]

LAW_MAP = {
    '1':'記帳士法', '2':'記帳士職業倫理道德規範', '3':'中華民國記帳士職業道德規範',
    '4':'記帳士法第三十五條規定之管理辦法', '5':'記帳士暨記帳及報稅代理人防制洗錢與打擊資恐辦法',
    '6':'記帳士懲戒委員會與懲戒覆審委員會組織及審議規則',
    '7':'公司法', '8':'公司登記辦法', '9':'商業登記法', '10':'商業登記申請辦法',
    '11':'商業會計法', '12':'商業會計處理準則', '13':'商業使用電子方式處理會計資料辦法',
    '14':'行政程序法',
    '15':'稅捐稽徵法', '16':'稅捐稽徵法施行細則', '17':'納稅者權利保護法', '18':'納稅者權利保護法施行細則',
    '19':'所得稅法', '20':'所得稅法施行細則', '21':'所得基本稅額條例', '22':'所得基本稅額條例施行細則',
    '23':'各類所得扣繳率標準', '24':'營利事業所得稅查核準則',
    '25':'加值型及非加值型營業稅法', '26':'加值型及非加值型營業稅法施行細則',
    '27':'兼營營業人營業稅額計算辦法', '28':'統一發票使用辦法', '29':'統一發票給獎辦法',
    '30':'遺產及贈與稅法', '31':'遺產及贈與稅法施行細則',
    '32':'特種貨物及勞務稅條例', '33':'特種貨物及勞務稅條例施行細則',
}

LAW_ALIAS = {
    '記帳士':'記帳士法', '倫理':'記帳士職業倫理道德規範', '道德':'中華民國記帳士職業道德規範',
    '公司':'公司法', '公司登記':'公司登記辦法', '商登':'商業登記法', '商業登記':'商業登記法',
    '商會':'商業會計法', '商業會計':'商業會計法', '會計準則':'商業會計處理準則',
    '行政':'行政程序法', '稅稽':'稅捐稽徵法', '稅捐':'稅捐稽徵法', '納保':'納稅者權利保護法',
    '所得':'所得稅法', '所得稅':'所得稅法', '基本稅額':'所得基本稅額條例',
    '扣繳率':'各類所得扣繳率標準', '查核準則':'營利事業所得稅查核準則',
    '營業':'加值型及非加值型營業稅法', '營業稅':'加值型及非加值型營業稅法',
    '統一發票':'統一發票使用辦法', '發票':'統一發票使用辦法',
    '遺贈':'遺產及贈與稅法', '遺產':'遺產及贈與稅法',
    '特種':'特種貨物及勞務稅條例', '特貨':'特種貨物及勞務稅條例',
}

HELP_TEXT = """📚 SoFa Engine 備考中控

【查法條】
查 13　查 記帳士 13　查 進項


【每日法條】
早上 8:00 自動推播
下一批 → 再推下一批
進度 → 查看各法規進度

【縮寫對照】
記帳士　公司　商會　行政
稅捐　　納保　所得　營業
遺贈　　特貨　查核準則

輸入「幫助」查看此說明"""

# ── 簡易記憶體快取（取代 GAS CacheService）──────────────────
# 格式：{ user_id: { 'pending': str, 'data': str, 'article': str, 'expires': float } }
_cache: dict = {}

def cache_set(user_id: str, key: str, value: str, ttl: int = 180):
    if user_id not in _cache:
        _cache[user_id] = {}
    _cache[user_id][key] = {'value': value, 'expires': time.time() + ttl}

def cache_get(user_id: str, key: str) -> str:
    entry = _cache.get(user_id, {}).get(key)
    if not entry:
        return None
    if time.time() > entry['expires']:
        del _cache[user_id][key]
        return None
    return entry['value']

def cache_del(user_id: str, key: str):
    _cache.get(user_id, {}).pop(key, None)

# ── 法規進度（取代 GAS ScriptProperties，用 JSON 檔持久化）──
PROGRESS_FILE = 'law_progress.json'

def load_progress() -> dict:
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_progress(data: dict):
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# ── Notion API ──────────────────────────────────────────────
NOTION_HEADERS = {
    'Authorization': f'Bearer {NOTION_KEY}',
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
}
_law_page_id_cache: dict = {}

def notion_get(endpoint: str) -> dict:
    r = requests.get(f'https://api.notion.com/v1/{endpoint}', headers=NOTION_HEADERS)
    data = r.json()
    if data.get('object') == 'error':
        raise Exception(data.get('message', 'Notion error'))
    return data

def notion_post(endpoint: str, body: dict) -> dict:
    r = requests.post(f'https://api.notion.com/v1/{endpoint}', headers=NOTION_HEADERS, json=body)
    data = r.json()
    if data.get('object') == 'error':
        raise Exception(data.get('message', 'Notion error'))
    return data

def notion_patch(endpoint: str, body: dict) -> dict:
    r = requests.patch(f'https://api.notion.com/v1/{endpoint}', headers=NOTION_HEADERS, json=body)
    data = r.json()
    if data.get('object') == 'error':
        raise Exception(data.get('message', 'Notion error'))
    return data

# ── Notion 工具函式 ─────────────────────────────────────────
def get_title(prop) -> str:
    if not prop:
        return ''
    items = prop.get('title') or prop.get('rich_text') or []
    return ''.join(r.get('plain_text') or r.get('text', {}).get('content', '') for r in items)

def get_rich_text(prop) -> str:
    if not prop:
        return ''
    return ''.join(r.get('plain_text', '') for r in prop.get('rich_text', []))

def get_select(prop) -> str:
    if not prop:
        return ''
    return (prop.get('select') or {}).get('name', '')

def get_multi_select(prop) -> str:
    if not prop:
        return ''
    return '、'.join(s['name'] for s in prop.get('multi_select', []))

def get_number(prop) -> int:
    if not prop:
        return 0
    return prop.get('number') or 0

def get_law_page_id(law_name: str) -> str:
    if law_name in _law_page_id_cache:
        return _law_page_id_cache[law_name]
    data = notion_post(f'databases/{INDEX_DB}/query', {
        'filter': {'property': '法條名稱', 'title': {'equals': law_name}},
        'page_size': 5
    })
    results = data.get('results', [])
    if not results:
        return None
    page_id = results[0]['id']
    _law_page_id_cache[law_name] = page_id
    return page_id

def query_law_page(law_page_id: str, article: str) -> dict:
    padded = article
    if article.isdigit():
        padded = article.zfill(2)
    queries = list(dict.fromkeys([article, padded]))
    for art in queries:
        data = notion_post(f'databases/{LAW_DB}/query', {
            'filter': {'and': [
                {'property': '條號', 'title': {'contains': f'§ {art}｜'}},
                {'property': '【法規總目錄】Master Index', 'relation': {'contains': law_page_id}}
            ]},
            'page_size': 5
        })
        if data.get('results'):
            return data['results'][0]
    return None

def extract_article_num(title: str) -> str:
    import re
    m = re.search(r'§\s*(\d+[之\d]*)', title)
    return m.group(1) if m else title

def get_all_blocks(page_id: str) -> list:
    blocks, cursor, safety = [], None, 0
    while safety < 10:
        url = f'blocks/{page_id}/children?page_size=100'
        if cursor:
            url += f'&start_cursor={cursor}'
        data = notion_get(url)
        blocks.extend(data.get('results', []))
        if data.get('has_more'):
            cursor = data['next_cursor']
            safety += 1
        else:
            break
    return blocks

def get_block_text(block: dict) -> str:
    btype = block.get('type', '')
    content = block.get(btype, {})
    rt = content.get('rich_text') or content.get('text') or []
    return ''.join(r.get('plain_text') or r.get('text', {}).get('content', '') for r in rt)

def read_children(block_id: str, depth: int = 0) -> str:
    if depth > 3:
        return ''
    text = ''
    try:
        data = notion_get(f'blocks/{block_id}/children?page_size=100')
        for child in data.get('results', []):
            ct = get_block_text(child)
            if ct:
                text += '  ' * depth + ct + '\n'
            if child.get('has_children'):
                text += read_children(child['id'], depth + 1)
    except Exception as e:
        log.error(f'read_children: {e}')
    return text

def parse_blocks(blocks: list) -> dict:
    import re
    result = {'rawText': '', 'parts': ['', '', '', '', '', '']}
    mode = 'none'
    for block in blocks:
        text = get_block_text(block)
        if re.match(r'^【(關鍵字|期限|罰金|查找戳記|章節)】', text):
            continue
        if re.match(r'^(錄音檔|課堂重點解析)', text):
            continue
        btype = block.get('type', '')
        if btype in ('callout', 'quote'):
            if mode in ('none', 'raw'):
                mode = 'raw'
                inline = text.replace('【原文】', '').replace('：', '').replace(':', '').strip()
                if inline:
                    result['rawText'] += inline + '\n'
            continue
        if btype in ('toggle', 'heading_3'):
            m = re.search(r'(\d)[．\.、。\s【]', text)
            if m:
                idx = int(m.group(1)) - 1
                if 0 <= idx <= 5:
                    mode = idx
                    if block.get('has_children'):
                        result['parts'][mode] += read_children(block['id'], 0)
            continue
        if btype == 'divider':
            continue
        if mode == 'raw' and text:
            result['rawText'] += text + '\n'

    result['rawText'] = result['rawText'].strip()
    result['parts'] = [p.strip() for p in result['parts']]
    return result

def get_law_name_from_relation(page: dict) -> str:
    try:
        rel = page['properties'].get('【法規總目錄】Master Index', {}).get('relation', [])
        if not rel:
            return None
        rel_page = notion_get(f'pages/{rel[0]["id"]}')
        return get_title(rel_page['properties'].get('法條名稱') or rel_page['properties'].get('Name'))
    except Exception:
        return None

# ── LINE API ────────────────────────────────────────────────
def cap(text: str, max_len: int = 4999) -> str:
    return text[:max_len - 1] + '…' if len(text) > max_len else text

def line_reply(reply_token: str, text: str):
    with ApiClient(configuration) as api_client:
        MessagingApi(api_client).reply_message(ReplyMessageRequest(
            reply_token=reply_token,
            messages=[TextMessage(text=cap(text))]
        ))

def line_push(user_id: str, text: str):
    with ApiClient(configuration) as api_client:
        MessagingApi(api_client).push_message(PushMessageRequest(
            to=user_id,
            messages=[TextMessage(text=cap(text))]
        ))

def line_push_with_quick_reply(user_id: str, text: str, count: int):
    items = []
    for i in range(1, min(count, 12) + 1):
        items.append(QuickReplyItem(action=MessageAction(label=str(i), text=str(i))))
    items.append(QuickReplyItem(action=MessageAction(label='下一批▶', text='下一批')))
    with ApiClient(configuration) as api_client:
        MessagingApi(api_client).push_message(PushMessageRequest(
            to=user_id,
            messages=[TextMessage(text=cap(text), quick_reply=QuickReply(items=items))]
        ))

# ── 核心功能 ────────────────────────────────────────────────
def push_full_content(page: dict, law_name: str, article: str, user_id: str):
    props = page['properties']
    title      = get_title(props.get('條號') or props.get('Name'))
    importance = get_select(props.get('重要性'))
    keywords   = get_multi_select(props.get('關鍵字'))
    deadline   = get_rich_text(props.get('期限｜時限'))
    penalty    = get_rich_text(props.get('罰金｜罰鍰'))
    difficulty = get_select(props.get('難度評級'))
    count      = get_number(props.get('複習次數'))

    blocks   = get_all_blocks(page['id'])
    sections = parse_blocks(blocks)

    msg1 = f'📖 {law_name} §{article}\n{title}\n'
    if importance or difficulty:
        if importance:
            msg1 += f'\n{importance}'
        if difficulty:
            msg1 += f'　難度：{difficulty}　第{count}次'
        msg1 += '\n'
    if keywords:
        msg1 += f'🏷 {keywords}\n'
    if deadline and deadline != '無':
        msg1 += f'⏱ 期限：{deadline}\n'
    if penalty and penalty != '無':
        msg1 += f'💰 罰則：{penalty}\n'
    if sections['rawText']:
        msg1 += f'\n📜 原文\n\n{sections["rawText"]}'

    section_labels = [
        '1️⃣ 章節標題與戰略權重', '2️⃣ 規範意旨與條文解析',
        '3️⃣ 執業要點與考情提示', '4️⃣ 核心摘要與記憶策略',
        '5️⃣ 2026修法與聯覺備註', '6️⃣ 相關法規及注意事項',
    ]

    messages = [msg1]
    for idx, content in enumerate(sections['parts']):
        if content and content.strip():
            messages.append(f'{section_labels[idx]}\n\n{content.strip()}')

    for i, m in enumerate(messages):
        if m.strip():
            line_push(user_id, m)
            if i < len(messages) - 1:
                time.sleep(0.4)

    # 更新複習紀錄
    try:
        now = datetime.now(TAIPEI).strftime('%Y-%m-%d %H:%M')
        old_stamp = get_rich_text(props.get('【查找戳記】')) or ''
        new_stamp = (old_stamp + '\n' + now if old_stamp else now)[-500:]
        new_count = count + 1
        notion_patch(f'pages/{page["id"]}', {'properties': {
            '【查找戳記】': {'rich_text': [{'type': 'text', 'text': {'content': new_stamp}}]},
            '複習次數': {'number': new_count}
        }})
        line_push(user_id, f'✅ 複習紀錄已更新\n📅 {now}\n🔄 複習次數：第{count}次 → 第{new_count}次')
    except Exception as e:
        log.error(f'update stamp: {e}')

def fetch_and_reply(law_name: str, article: str, user_id: str):
    try:
        law_page_id = get_law_page_id(law_name)
        if not law_page_id:
            line_push(user_id, f'❌ 總目錄找不到「{law_name}」')
            return
        page = query_law_page(law_page_id, article)
        if not page:
            line_push(user_id, f'❌ 找不到「{law_name} 第{article}條」')
            return
        push_full_content(page, law_name, article, user_id)
    except Exception as e:
        log.error(f'fetch_and_reply: {e}')
        line_push(user_id, f'❌ 查詢失敗：{e}')

def fetch_by_page_id(page_id: str, law_name: str, article: str, user_id: str, cached_data: str):
    try:
        page = notion_get(f'pages/{page_id}')
        push_full_content(page, law_name, article, user_id)
        time.sleep(0.6)
        data_str = cached_data or cache_get(user_id, 'data')
        if data_str:
            results = json.loads(data_str)
            list_msg = '📚 繼續選：\n\n'
            for idx, r in enumerate(results):
                list_msg += f'{idx+1}. {r["title"]}\n   {r["lawName"]}\n\n'
            cache_set(user_id, 'pending', 'pick', 600)
            cache_set(user_id, 'data', data_str, 600)
            line_push_with_quick_reply(user_id, list_msg, len(results))
    except Exception as e:
        log.error(f'fetch_by_page_id: {e}')
        line_push(user_id, f'❌ 查詢失敗：{e}')

def search_by_keyword(keyword: str, user_id: str):
    try:
        data = notion_post(f'databases/{LAW_DB}/query', {
            'filter': {'or': [
                {'property': '關鍵字', 'multi_select': {'contains': keyword}},
                {'property': '條號', 'title': {'contains': keyword}}
            ]},
            'sorts': [{'property': '複習次數', 'direction': 'ascending'}],
            'page_size': 10
        })
        pages = data.get('results', [])
        if not pages:
            line_push(user_id, f'🔍 找不到含「{keyword}」的法條\n請確認關鍵字是否存在於標籤中。')
            return

        result_list = []
        msg = f'🔍「{keyword}」共找到 {len(pages)} 筆：\n\n'
        for idx, page in enumerate(pages):
            props      = page['properties']
            title      = get_title(props.get('條號') or props.get('Name'))
            importance = get_select(props.get('重要性'))
            count      = get_number(props.get('複習次數'))
            kws        = get_multi_select(props.get('關鍵字'))
            law_name   = get_law_name_from_relation(page) or '未知法規'
            article    = extract_article_num(title)

            result_list.append({'id': page['id'], 'lawName': law_name, 'article': article, 'title': title})
            msg += f'{idx+1}. {title}\n'
            msg += f'   {law_name} ｜ {importance} ｜ 第{count}次\n'
            if kws:
                msg += f'   🏷 {kws}\n'
            msg += '\n'

        msg += '輸入數字查看完整內容'
        cache_set(user_id, 'pending', 'pick', 180)
        cache_set(user_id, 'data', json.dumps(result_list, ensure_ascii=False), 180)
        line_push(user_id, msg)
    except Exception as e:
        log.error(f'search_by_keyword: {e}')
        line_push(user_id, f'❌ 搜尋失敗：{e}')

def daily_law_push(user_id: str = None):
    user_id = user_id or LINE_UID
    try:
        progress = load_progress()
        current_law, cursor = None, 0

        for law_name in LAW_ORDER:
            if progress.get(f'LAW_DONE_{law_name}') == '1':
                continue
            current_law = law_name
            cursor = int(progress.get(f'LAW_CURSOR_{law_name}', 0))
            break

        if not current_law:
            line_push(user_id, '🎉 所有法規已完成第一輪！重新開始。')
            for law_name in LAW_ORDER:
                progress.pop(f'LAW_DONE_{law_name}', None)
                progress.pop(f'LAW_CURSOR_{law_name}', None)
            save_progress(progress)
            return

        law_page_id = get_law_page_id(current_law)
        if not law_page_id:
            progress[f'LAW_DONE_{current_law}'] = '1'
            save_progress(progress)
            daily_law_push(user_id)
            return

        data = notion_post(f'databases/{LAW_DB}/query', {
            'filter': {'and': [
                {'property': '【法規總目錄】Master Index', 'relation': {'contains': law_page_id}},
                {'or': [
                    {'property': '重要性', 'select': {'equals': '★★★★★'}},
                    {'property': '重要性', 'select': {'equals': '★★★★☆'}},  # ← 修正在這裡
                ]}
            ]},
            'sorts': [{'property': '條號', 'direction': 'ascending'}],
            'page_size': 100
        })
        all_pages = data.get('results', [])

        if not all_pages:
            progress[f'LAW_DONE_{current_law}'] = '1'
            save_progress(progress)
            daily_law_push(user_id)
            return

        batch = all_pages[cursor: cursor + DAILY_LAW_COUNT]
        new_cursor = cursor + len(batch)
        is_last = new_cursor >= len(all_pages)

        if is_last:
            progress[f'LAW_DONE_{current_law}'] = '1'
            progress.pop(f'LAW_CURSOR_{current_law}', None)
        else:
            progress[f'LAW_CURSOR_{current_law}'] = str(new_cursor)
        save_progress(progress)

        result_list = []
        list_msg = f'📚 {current_law}\n'
        suffix = '（本法規完成！✅）\n\n' if is_last else f'／共 {len(all_pages)} 條\n\n'
        list_msg += f'第 {cursor+1}～{cursor+len(batch)} 條{suffix}'

        for idx, page in enumerate(batch):
            props      = page['properties']
            title      = get_title(props.get('條號') or props.get('Name'))
            importance = get_select(props.get('重要性'))
            count      = get_number(props.get('複習次數'))
            kws        = get_multi_select(props.get('關鍵字'))
            article    = extract_article_num(title)

            result_list.append({'id': page['id'], 'lawName': current_law, 'article': article, 'title': title})
            list_msg += f'{idx+1}. {title}\n'
            list_msg += f'   {importance} ｜ 第{count}次\n'
            if kws:
                list_msg += f'   🏷 {kws}\n'
            list_msg += '\n'

        cache_set(user_id, 'pending', 'pick', 600)
        cache_set(user_id, 'data', json.dumps(result_list, ensure_ascii=False), 600)
        line_push_with_quick_reply(user_id, list_msg, len(batch))

        if is_last:
            time.sleep(0.5)
            idx_now = LAW_ORDER.index(current_law)
            if idx_now + 1 < len(LAW_ORDER):
                next_law = LAW_ORDER[idx_now + 1]
                line_push(user_id, f'🎯 {current_law} 完成！\n明天開始：{next_law}')

    except Exception as e:
        log.error(f'daily_law_push: {e}')
        line_push(user_id, f'❌ 法條推播失敗：{e}')

def push_progress(user_id: str):
    try:
        progress = load_progress()
        msg = '📊 法條複習進度\n\n'
        total_done = 0
        for law_name in LAW_ORDER:
            done   = progress.get(f'LAW_DONE_{law_name}') == '1'
            cursor = int(progress.get(f'LAW_CURSOR_{law_name}', 0))
            if done:
                msg += f'✅ {law_name}\n'
                total_done += 1
            elif cursor > 0:
                msg += f'🔄 {law_name}（第{cursor}條）\n'
        pct = round(total_done / len(LAW_ORDER) * 100)
        msg += f'\n完成 {total_done}／{len(LAW_ORDER)} 部（{pct}%）'
        line_push(user_id, msg)
    except Exception as e:
        log.error(f'push_progress: {e}')
        line_push(user_id, f'❌ 進度查詢失敗：{e}')

def build_law_menu(article: str) -> str:
    msg = f'第 {article} 條是哪部法規？\n\n'
    for k in sorted(LAW_MAP.keys(), key=lambda x: int(x)):
        msg += f'{k}. {LAW_MAP[k]}\n'
    return msg + '\n請回覆數字'

# ── 路由 ────────────────────────────────────────────────────
def route_message(text: str, user_id: str, reply_token: str):
    import re
    pending_type = cache_get(user_id, 'pending')
    pending_data = cache_get(user_id, 'data')

    # 對話第二步：選法規編號
    if pending_type == 'law' and text.isdigit():
        cache_del(user_id, 'pending')
        law_name = LAW_MAP.get(text)
        if not law_name:
            line_reply(reply_token, '❌ 請輸入正確的數字編號')
            return
        article = cache_get(user_id, 'article') or ''
        cache_del(user_id, 'article')
        line_reply(reply_token, '⏳ 查詢中，稍後推播完整內容...')
        fetch_and_reply(law_name, article, user_id)
        return

    # 對話第二步：從清單選號
    if pending_type == 'pick' and text.isdigit():
        cache_del(user_id, 'pending')
        results = json.loads(pending_data or '[]')
        idx = int(text) - 1
        if idx < 0 or idx >= len(results):
            line_reply(reply_token, '❌ 請輸入正確的編號')
            return
        line_reply(reply_token, '⏳ 查詢中，稍後推播完整內容...')
        fetch_by_page_id(results[idx]['id'], results[idx]['lawName'], results[idx]['article'], user_id, pending_data)
        return

    # 精確指令

    if text in ('下一批', '+5', '法條'):
        line_reply(reply_token, '📚 推播下一批法條中...')
        daily_law_push(user_id)
        return

    if text == '進度':
        line_reply(reply_token, '📊 查詢複習進度中...')
        push_progress(user_id)
        return

    if text in ('幫助', 'help', '#幫助'):
        line_reply(reply_token, HELP_TEXT)
        return

    # 查法條
    if text.startswith('查'):
        query = text[1:].strip()
        query = re.sub(r'([^\d])((\d+之?\d*))$', r'\1 \2', query)
        parts = query.split()

        if len(parts) >= 2 and re.match(r'^\d+之?\d*$', parts[-1]):
            article = parts[-1]
            raw_law = ''.join(parts[:-1])
            law_name = LAW_ALIAS.get(raw_law, raw_law)
            line_reply(reply_token, '⏳ 查詢中，稍後推播完整內容...')
            fetch_and_reply(law_name, article, user_id)
            return

        if len(parts) == 1 and re.match(r'^\d+之?\d*$', parts[0]):
            cache_set(user_id, 'article', parts[0], 180)
            cache_set(user_id, 'pending', 'law', 180)
            line_reply(reply_token, build_law_menu(parts[0]))
            return

        if len(query) >= 2:
            line_reply(reply_token, f'🔍 搜尋「{query}」中...')
            search_by_keyword(query, user_id)
            return

        line_reply(reply_token, '格式：查 13　查 記帳士 13　查 進項')
        return

    line_reply(reply_token, '輸入「幫助」查看所有指令')

# ── Flask Webhook ────────────────────────────────────────────
@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Line-Signature', '')
    body = request.get_data(as_text=True)
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        abort(400)
    return 'OK'

@handler.add(MessageEvent, message=TextMessageContent)
def handle_message(event: MessageEvent):
    text    = event.message.text.strip()
    user_id = event.source.user_id
    reply_token = event.reply_token
    route_message(text, user_id, reply_token)

# ── 早上推播（可用排程器呼叫此 endpoint）───────────────────
@app.route('/morning_push', methods=['POST'])
def morning_push():
    daily_law_push(LINE_UID)
    return 'OK'

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)


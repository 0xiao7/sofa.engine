# SoFa Engine 搬遷 × 擴充｜本機執行總結
> 日期：2026-05-28
> 整合來源：SYSTEM_INVENTORY_20260527.md（盤點）＋ Ro 交接文（決策）
> 用途：拿到本機後對 Claude Code 用，直接照做

---

## 一、現況 × 目標（一張表看完）

| 維度 | 現況 | 目標 |
|------|------|------|
| 收錄法規 | 33 部 | 295 部（11.2% → 100%） |
| 缺漏法規 | — | **262 部要擴充** |
| 條文數 | 2,131 條 | 約 22,000 條（+~20,000） |
| 主資料庫 | Notion LAW_DB | Supabase（PostgreSQL） |
| 用戶資料庫 | Firestore | 維持 Firestore |
| Bot 部署 | Render Free | Render $7/月（建議） |
| 付費用戶 | 2 位（季費 990） | 損益兩平需 ~26 位 |

---

## 二、預算速查（不要看錯）

```
Max 訂閱（吃到飽）  ← Fay × Claude 寫 code/SOP，已付
Claude API（按 token）← Ro 跑解析，獨立帳單

全 262 部擴充（混合 Opus+Sonnet + Caching + Batch API）
≈ $800 USD ≈ NT$26,000

⚠️ 不要一次燒，分 Phase 來
```

| Phase | 條文數 | 預算 USD |
|-------|-------|---------|
| Phase 0 搬遷 33 部 | 0（純搬資料） | $0 |
| Phase 1 試水 5 部 | ~500 | $30 |
| Phase 2 Batch A 會計師 | ~3,000 | $120 |
| Phase 2 Batch B 地政士 | ~2,000 | $80 |
| Phase 2 Batch C 公務員 | ~3,000 | $120 |
| Phase 2 Batch D 民商事 | ~3,000 | $120 |
| Phase 2 Batch E 刑法系 | ~5,000 | $200 |
| Phase 2 Batch F 雜項 | ~3,500 | $140 |

---

## 三、Phase 0 搬遷 SOP（本機要做的第一件事）

### 任務拆解
1. **Schema 設計**：Supabase 表結構（laws + articles + sections）
2. **匯出腳本**：Notion LAW_DB → laws.json（已有 `_archive/export_laws.py` 可改）
3. **匯入腳本**：laws.json → Supabase（新寫）
4. **main.py 改寫**：Notion 讀寫換 Supabase 讀寫
5. **雙寫過渡 4 週**：Notion + Supabase 同步寫
6. **切斷 Notion 讀取**：確認穩定後

### 時程：2–3 週｜風險：低｜API 費用：$0

---

## 四、本機要備齊的資產

### ✅ 已在 sofa.engine repo 內（`_archive/`）
- main.py（704 行，LINE Bot 主程式）
- export_laws.py（175 行，Notion → JSON）
- export-cards.py、export-rich-menu.py
- requirements.txt、render.yaml
- 本次盤點：SYSTEM_INVENTORY_20260527.md

### ⚠️ 需要找的（不在 repo）
| 檔案 | 用途 | 在哪找 |
|------|------|--------|
| find_page_ids.py | 查 page_id | Fay Mac / OneDrive / iCloud / GAS |
| delete_specific.py | 刪多餘條文 | 同上 |
| fix_from_csv.py | 從 CSV 補原文 callout | 同上 |
| fix_content.py | 補六段內文（斷點續跑） | 同上 |
| health_check_final.py | 全面健康檢查 | 同上 |
| AutoPatch_LAW_DB_v4_FINAL.js | 爬全國法規 + Claude API | Fay GAS 專案 |
| 六段解析 v1.0 prompt | 系統提示詞 | Fay 本機 |

### 🆕 Phase 0 要新寫的
- Supabase schema.sql
- migrate_notion_to_supabase.py
- supabase_client.py（取代 main.py 內的 notion_post/notion_get）
- 雙寫 wrapper

---

## 五、Supabase Schema 草案（Claude Code 第一個 sprint 要寫）

```
法規層（statutes）           — 295 部
  ├─ id, name, abbr, category
  ├─ level（法律 / 命令）
  ├─ exam_tracks（國考類科 array）
  └─ ...

條文層（articles）           — 22,000 條
  ├─ id, statute_id, article_no, title
  ├─ raw_text（原文）
  ├─ importance（★1–5）
  ├─ keywords（jsonb array）
  ├─ deadline, penalty
  ├─ chapter
  └─ ...

六段層（sections）           — 22,000 × 6 = 132,000 rows
  ├─ id, article_id, section_no (1–6)
  ├─ content (text)
  └─ char_count
```

實際 schema 等回到本機由 Claude Code 從盤點欄位（A-7 那 19 欄）逐欄對應出 SQL。

---

## 六、本機第一個對話對 Claude Code 的開場 prompt

```
我要做 SoFa Engine 從 Notion 搬到 Supabase 的 Phase 0。

讀這兩份文件作為背景：
1. SYSTEM_INVENTORY_20260527.md（盤點現況）
2. SoFa_搬遷任務交接_Ro.md（決策方案）

請先做這件事：
- 根據盤點 A-7 的 19 個欄位，設計 Supabase Schema（statutes + articles + sections 三層）
- 輸出 schema.sql 可直接灌 Supabase
- 同時列出哪些 Notion 欄位不搬（如【查找戳記】、複習階段等用戶行為欄位
  改放 Firestore 或 Postgres 另一張表）

不要動 _archive/ 內既有腳本，新檔案放 migration/ 資料夾。
```

---

## 七、考前凍結期（提醒設提醒）

```
🚫 2026-10-01 ~ 2026-11-15
   只修 bug，不擴充、不加新功能
   全力衝刺準備考試
```

---

## 八、待補資訊（Ro 回去查再回來）

- [ ] 失蹤 5 支 Python 腳本實際位置
- [ ] 六段 System Prompt 實際運轉版 vs v1.0 差異
- [ ] Firestore collection 完整結構（Ro 比 Fay 熟）
- [ ] GAS 哪些還在跑、哪些已停用
- [ ] 樣本資料：「記帳士法 §13」完整 Notion 頁面 JSON（給 Claude 看真實結構）

---

## 九、無法從盤點取得、要 Ro 補實測的數據

| 項目 | 怎麼補 |
|------|-------|
| A-5/A-6 條文字元統計 | 跑 export_laws.py 後 jq 統計 laws.json |
| B-4 UptimeRobot uptime% | 登入 UptimeRobot 截圖 |
| B-5 每日查詢次數 | 跑一支 script 統計【查找戳記】時間戳 |
| C-1 單條解析耗時 | Phase 1 跑 5 部時實測 |
| C-4 429 頻率 | 加 logging 後實測 |

# SoFa Engine — 前端 Repo

GitHub Pages 靜態網站，部署到 sofaengine.org。  
記帳士國考法條備考工具，6/1 正式上線。

---

## 設計系統

**所有 UI 改動都必須對齊 `design/` 下的視覺系統。**

- 設計稿：`design/dashboard-design.html`（可在瀏覽器直接開啟預覽）
- 設計交付文件：`design/HANDOFF-Dashboard.md`（含 token、layout、互動規格）

### Design Tokens（快速參考）

```css
--navy:   #1F3848;   /* 主深藍背景 */
--navy-2: #19303E;   /* 卡片背景（暗區） */
--navy-3: #142836;   /* 最外層畫布 */
--navy-4: #0D1C28;   /* 最深層 */
--plum-1: #2C4A5C;   /* hover on dark card */

--peach:   #E7BBA7;  /* 主強調色 — CTA、eyebrow、高亮 */
--peach-2: #F0CDBD;  /* hover */
--peach-3: #C89580;  /* cream 背景上的桃色 */

--cream:   #F5F0EA;  /* Drawer / 亮色區 */
--cream-2: #ECE5DB;
--cream-3: #E0D6C7;

--good: #9FB89F;     /* 成功/啟用 */
--warn: #D9B084;     /* 待複習/警示 */

--line:   rgba(245,240,234,.10);
--line-2: rgba(245,240,234,.18);

--serif: "Noto Serif TC", serif;
--sans:  "Noto Sans TC", sans-serif;
--mono:  "JetBrains Mono", monospace;
```

### 禁止事項

- 不用紫色（和米色區衝突）
- 不用綠色/紅色等冷色
- 不用 emoji（人設除外）
- 不用 gradient 背景（只允許 hero 光暈 radial 微光）
- 不用圓角 >6px
- 不焦慮感：無倒數警告、無紅色 KPI

---

## 頁面清單

| 檔案 | 路徑 | 說明 |
|---|---|---|
| 首頁 | `index.html` | Landing + inline 法條查詢 |
| 登入 | `login.html` | 序號登入牆 |
| 會員中心 | `dashboard.html` | 主功能頁，9 個 section |
| 打字練習 | `practice.html` | 逐字輸入法條原文 |
| 填空題 | `fill.html` | 數字關鍵字填空 |
| 選擇題 | `quiz.html` | A/B/C/D 數字選擇題 |

---

## 開發規則

1. **改 CSS 前先看 `design/HANDOFF-Dashboard.md`**，確認 token 名稱和用法。
2. **語氣規則**：「晚安，Fay。今天讀一條也算數。」— 不改成英文 UI 文字。
3. **動畫**：最多 200–350ms ease-out；hover translate-Y(-2~4px)；不要 bouncy。
4. **Favicon**：`favicon.svg` + `favicon-32.png` + `apple-touch-icon.png`，全站統一引用。
5. **API**：`https://sofa-engine-api.onrender.com`，呼叫時帶 `X-Sofa-UID` header。
6. **部署**：直接 push main → GitHub Pages 自動部署，約 1 分鐘生效。

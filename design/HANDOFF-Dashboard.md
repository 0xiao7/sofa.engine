# SoFa Engine — Dashboard Handoff

設計稿：`SoFa Dashboard.html`（深藍 + 暖桃 + 米白）
品牌個性：穩、陪伴、條理；不焦慮、不亢奮。

---

## 1. Design Tokens

```css
/* Colors */
--navy:   #1F3848;  /* primary bg, dark sections */
--navy-2: #19303E;  /* cards on dark */
--navy-3: #142836;  /* outer bg / main canvas */
--navy-4: #0D1C28;  /* deepest */
--plum-1: #2C4A5C;  /* hover state on dark card */

--peach:   #E7BBA7; /* primary accent — CTA, eyebrows, highlights */
--peach-2: #F0CDBD; /* hover */
--peach-3: #C89580; /* on cream bg */

--cream:   #F5F0EA; /* drawer / light sections */
--cream-2: #ECE5DB;
--cream-3: #E0D6C7;

--good: #9FB89F;    /* active/success */
--warn: #D9B084;    /* review pending */

--line:   rgba(245,240,234,.10);  /* on dark */
--line-2: rgba(245,240,234,.18);

/* Type */
--serif: "Noto Serif TC", serif;     /* headings, big numbers */
--sans:  "Noto Sans TC", sans-serif; /* body */
--mono:  "JetBrains Mono", mono;     /* labels, eyebrows, numbers */

/* Scale */
H1 42px serif 600  | H2 26px serif 600  | H3 22px serif 600
Body 15px / 1.65   | Small 13px         | Mono label 11px / .18em tracking
Radius 3–4px (sharp, slight soften)
Section gap 64px   | Card padding 28–36px
```

---

## 2. Layout

```
┌─ topbar (sticky, blurred navy, 70px) ───────────────┐
│ brand · top-nav · user-pill · 登出                  │
├──────────┬──────────────────────────────────────────┤
│ sidebar  │ main                                     │
│ 260px    │ max-w 1140px, padded 56/64px             │
│ sticky   │ - greet (h1 + clock)                     │
│          │ - 9 sections (sec-head + content)        │
└──────────┴──────────────────────────────────────────┘
```

**RWD**：≤1100px sidebar 縮 220、≤760px sidebar 變抽屜（漢堡按鈕）。

---

## 3. Sections（按順序）

| # | id | 內容 |
|---|---|---|
| 01 | `#member` | 會員卡：到期/連續/啟用 + Avatar |
| 02 | `#progress` | 4 大數字 + 6 條法規進度條 |
| 03 | `#search` | 法規/條號/時限 + 5 chips + 即時結果 |
| 04 | `#favorites` | 3-col 收藏卡格（empty state） |
| 05 | `#memorized` | empty state |
| 06 | `#review` | warn 風格卡（暖橘） |
| 07 | `#tools` | 4 工具卡：TYPE / QUIZ / FILL / LINE |
| 08 | `#laws` | 33 部法規 grid + 搜尋 + 高頻 badge |
| 09 | `#recent` | list 最近 7 天查詢 |

每節 head 結構：mono eyebrow（`SECTION 0X — NAME`）+ serif H2 + 右側 meta。

---

## 4. 互動

- **Drawer 詳解**（右滑面板）：點任何條文卡 / recent-row 開啟
  - 米白底、深藍字，桃色 left-border
  - 上：標題、條號（serif 54px）、3 chip（收藏/已熟記/待複習）
  - 中：條文原文（節序用 mono 桃色）+ 但書區
  - 下：accordion 6 區（章節權重 / 條文解析 / 考情 / 記憶 / 修法 / 相關法規）
  - 底部：3 顆按鈕（已熟記 / 再讀清單 / 收藏）
- **Sidebar nav**：scroll spy 自動 highlight 當前 section（桃色左邊條）
- **Member card**：右下角巨大 serif "S" 浮水印（opacity .04）

---

## 5. Behaviors to keep

- **語氣**：「晚安，Fay。今天讀一條也算數。」— 不要改成「Hi, Welcome back」
- **不要強調**：倒數警告、紅色、KPI 焦慮
- **要強調**：每節清楚的編號、結構化的 mono label、襯線數字的重量感
- **動畫**：limit 200–350ms ease-out；hover translate-Y(-2~4px)；不要 bouncy

---

## 6. 直接套用

設計稿是純 HTML+CSS，沒有 framework。轉到 Next.js / React 時：
- 把 9 個 section 拆成 components（`MemberCard`, `ProgressBoard`, `SearchPanel`, `ItemCard`, `EmptyState`, `ToolCard`, `LawCard`, `RecentList`, `ArticleDrawer`）
- CSS variables 直接搬到 `tailwind.config.ts` 的 `theme.extend.colors`
- 字體用 `next/font/google` 載入三套
- Drawer 用 `@radix-ui/react-dialog` 或自建（已含完整動畫 spec）

---

## 7. Don'ts

- 不要紫色（已試過，米色區會打架）
- 不要綠色 / 紅色 / 藍以外的冷色
- 不要 emoji（除非有人設）
- 不要 gradient 背景（除了 hero 光暈這種 radial 微光）
- 不要圓角 >6px

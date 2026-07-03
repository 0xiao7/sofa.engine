# SoFa 自習室「無止盡圖書館」— 資產升級接手說明書

> 給接手的人或 AI（Codex / Claude / 其他 code model）。目標只有一個：
> 讓 `room-v2-library.html` 的畫面品質逼近 `previews/room-v2-mockup.png`。
> 現況截圖在 `previews/room-v2-current.png`——構圖、配色、元素都已對齊，
> 剩下的差距在**資產精緻度**（模型、材質），不在佈局。

---

## 0. 現況一分鐘看懂

- `room-v2-library.html`：獨立 prototype，three.js **r160**（repo 內 `three.min.js`、`GLTFLoader.js`，無 CDN 依賴）。
- 場景：第一/第三人稱（按 `V` 切換）無止盡圖書館走廊。6 段走廊（`SEG_LEN=16`）循環回收，鏡頭前行。
- 角色：程序化 chibi 小人（`makeChibi()`，膠囊身體＋圓頭＋髮殼＋耳朵＋canvas 臉），
  坐姿讀書（六成捧書）＋主角走路（擺腿甩手）。
- 家具：`models/*.glb`（desk / bookcase / plant / lamp）＋程序化木椅、矮櫃、吊燈、窗戶。
- UI：右側卡片（在線名單/番茄鐘/喊話/今日記錄）與手機 bottom sheet **全是假資料**，
  之後接 Supabase presence——**絕對不要動 UI 的 HTML/CSS/JS**。
- 本地預覽：`python3 -m http.server 8765` → `http://localhost:8765/room-v2-library.html`
  （GLB 用 fetch 載入，直接開檔案會失敗，一定要起 server）。

---

## 1. 要生成／取得的資產清單

風格總綱（所有資產共用）：**吉卜力感的溫暖極簡、淺色木質、圓潤邊角、手繪感平塗材質**。
禁止：寫實 PBR 金屬感、髒污貼圖、尖銳硬邊、高對比木紋。

配色錨點（場景現用色，新資產必須融入）：

| 用途 | Hex |
|---|---|
| 地板淺麥稈木 | `#E8D6AE` |
| 書櫃/桌椅淺樺木 | `#E2CCA6` / `#D3B888` |
| 牆暖白 | `#FCF9F2` |
| 主角背包藍 | `#7FA3C4` |
| 衣服粉彩 | `#B7CFE3` `#C4D6B4` `#E3C3B7` `#CBBCDD` |
| 綠植 | `#9DB28D` |
| 吊燈銅金 | `#C9A96E` |

技術規格（每一個 GLB 都要滿足）：

- 格式 `.glb`、Y-up、原點在**底部中心**（貼地）、真實世界尺寸（公尺）。
- 面數 ≤ 15k tri／資產；貼圖 ≤ 1024px 或純色材質（偏好純色/頂點色，好調色）。
- 單一物件單一 mesh 為佳；材質命名有意義（程式會按材質名調色，見 §3 `LIFT`）。

### 1a. 文字生成 3D（Meshy / Tripo / Luma Genie…）— 家具道具類

每條 prompt 直接貼：

1. **書桌**（取代 `models/desk.glb`，目標寬 1.5m）
   > A cozy minimal wooden study desk, light birch wood, rounded edges, Ghibli-style hand-painted flat shading, warm pale wood color #E2CCA6, single drawer, low-poly stylized, clean topology, game-ready prop

2. **木椅**（取代程序化 `makeWoodChair()`，目標高 0.95m）
   > A simple wooden library chair with two horizontal back slats, light birch wood #D3B888, rounded corners, Ghibli-style flat shading, low-poly stylized game prop

3. **書櫃**（取代 `models/bookcase.glb`，目標高 2.6m）
   > A tall open wooden bookshelf filled with colorful books, light birch wood frame #E2CCA6, book spines in soft pastel red blue green tones, Ghibli anime library style, hand-painted flat shading, low-poly game asset

4. **矮櫃**（取代程序化 `makeSideboard()`，目標寬 1.5m 高 0.85m）
   > A low wooden sideboard cabinet with two doors, light birch wood, rounded edges, Ghibli-style flat shading, minimal cozy library furniture, low-poly game prop

5. **吊燈**（取代程序化 `makePendantLamp()`，目標罩徑 0.5m）
   > A small brass dome pendant lamp on a short cord, warm bronze #C9A96E, soft rounded dome shade, glowing warm bulb underneath, Ghibli cozy library style, low-poly stylized

6. **盆栽 ×2 款**（補充 `models/plant.glb`：一大一小，白色羅紋盆）
   > A potted monstera plant in a white ribbed ceramic pot, lush stylized leaves in soft sage green #9DB28D, Ghibli anime style, hand-painted flat shading, low-poly game asset
   >
   > A small potted trailing plant in a white ceramic pot, soft green leaves, cozy desk plant, Ghibli style flat shading, low-poly

7. **窗景卡片**（可選：一張窗外景 billboard 用的貼圖，直接用圖像模型生成 512×1024）
   > Soft watercolor view through a window: pale blue sky, distant small houses with terracotta roofs, green treeline, gentle morning light, Ghibli background art style, muted pastel palette

### 1b. 角色 — 不建議用文字生 3D（會歪），走這兩條之一

文字生 3D 對「帶骨架的一致角色」成功率很低，實務上：

- **資產庫採購**（最快）：Sketchfab / CGTrader / Unity Asset Store 搜
  `chibi kid rigged`、`stylized child character low poly`、`toon student character pack`。
  需求：綁好骨架（Mixamo 相容尤佳）、素色材質可換色、~3 頭身。
  買一隻就夠——程式會 clone 換色出全班（見 §3）。
- **Mixamo 流程**（免費）：任一 T-pose chibi 模型丟 [mixamo.com](https://www.mixamo.com)
  自動綁骨＋下載 `Walking`、`Sitting Idle` 動畫 → Blender 合併輸出 .glb。
  程式端已有 SkeletonUtils／AnimationMixer 的整合前例（git 歷史 `910fb0c` 之前的版本
  就是這樣接 `models/character.glb` 的，動畫名 `Rig|Walk_Loop`、`Rig|Sitting_Idle_Loop`）。

### 1c. 驗收資產的標準

把新 GLB 丟進 `models/`，在場景裡看：
- 顏色不需要靠 `LIFT` 硬調就融入整體（±10% 色相內）。
- 剪影圓潤，沒有寫實感金屬/塑膠反光。
- 45° 頂光下沒有破面黑斑（法線正確）。

---

## 2. 給 code model 的接手 prompt（直接整段貼給 Codex）

```
你在 sofa.engine repo 的 claude/self-study-room-repo-z8bxwu 分支工作。
任務：把新的 GLB 資產整合進 room-v2-library.html，取代對應的舊資產/程序化物件，
讓畫面更接近 previews/room-v2-mockup.png（參考圖）。previews/room-v2-current.png 是現況。

【鐵則——違反任何一條就是失敗】
1. 只改 room-v2-library.html 底部 <script> 的 three.js 場景區塊。
   絕對不動：topbar/右側卡片/bottom sheet 的 HTML、CSS、JS 邏輯、USERS 假資料、
   番茄鐘/喊話/今日記錄的行為。
2. 場景是 6 段走廊（SEG_LEN=16）循環回收（segments 陣列，animate 裡 position.z 推進），
   所有新物件必須放進 buildSegment() 的段落 group，才會跟著循環。
3. 效能上限：無 postprocessing、貼圖 ≤1024、shadow map ≤2048、
   每段最多 2 個 PointLight、新資產全部用 clone 共用幾何材質。
4. 每改一輪必須自我驗證：python3 -m http.server 8765 起服務，
   截圖或親自開 http://localhost:8765/room-v2-library.html 看
   1440×900 和 390×844 兩種尺寸，對照 mockup 確認沒有物件穿模、浮空、色調突兀。

【整合接口】
- GLB 載入：檔尾 Promise.all([loadGLB('models/…')]) 區塊；
  normalize(scene, targetH) 會把模型縮放到目標高度、底部貼地、水平置中。
  各資產目標尺寸：desk 高 0.82 / bookcase 高 2.65 / plant 高 1.25 / lamp 高 0.42 /
  chair 高 0.95 / sideboard 寬 1.5 / pendant 罩徑 0.5。
- 換色：LIFT 表（材質名 → hex）。新 GLB 若材質命名清楚，直接加表即可微調。
- 椅子：makeWoodChair() 是程序化的，直接整個函式替換成回傳 GLB clone。
- 矮櫃：makeSideboard() 同上（保留 withPlant 參數行為：上面擺 TPL.plant 的縮小 clone）。
- 吊燈：makePendantLamp() 同上（保留 withLight 的 PointLight 與 glow sprite）。
- 角色（如果拿到綁骨模型）：用 THREE.SkeletonUtils.clone + AnimationMixer，
  取代 makeChibi()。必須保留的行為契約：
  * 坐姿放在 makeStudySpot() 內，位置 (0, 0, 0.55)、面向桌子（rotation.y = π）
  * 走路主角在 makeWalker()，walkers[] 陣列驅動；坐姿進 sitters[]（呼吸/點頭動畫）
  * 每個角色隨機換色（衣服 CHAR_COLORS、髮色 HAIR_COLORS、膚色 SKIN_TONES）
  * 接觸陰影 contactShadow() 要跟著放
- 所有腳下要有 contactShadow(寬, 深)，材質共用，別自己發明新陰影系統。

【驗收標準（對照 previews/room-v2-mockup.png）】
- 平整白色格狀天花板 + 一排短繩銅罩吊燈
- 兩側淺木書牆 + 大窗（窗外綠意）+ 窗下光斑
- 每段 3~4 組讀書位，六成的人捧書讀，木椅
- 中央走道淨空，主角（奶油上衣+藍背包）置中背對鏡頭走路
- 前景偶爾白盆大綠植；整體淺麥稈+暖白+粉彩，柔和無硬影
```

---

## 3. 程式地圖（人類/模型都適用的快速索引）

| 區塊 | 搜尋關鍵字 | 作用 |
|---|---|---|
| 假資料/UI 邏輯 | `const USERS` | 名單/番茄鐘/喊話/記錄（**別動**） |
| 場景常數 | `const SEG_LEN` | 走廊尺寸、步速、霧色 |
| 地板貼圖 | `woodFloorTexture` | canvas 程序化木板 |
| 窗景貼圖 | `windowSkyTexture` | 天空漸層+樹冠+小屋 |
| 材質總表 | `const MAT` / `const LIFT` | 場景材質、GLB 換色表 |
| 接觸陰影 | `contactShadow` | 家具落地感 |
| chibi 小人 | `makeChibi` / `chibiHead` | 程序化角色（換綁骨 GLB 時整組取代） |
| 讀書位 | `makeStudySpot` | 桌+椅+人+雜物 |
| 段落生成 | `buildSegment` | 一段走廊的全部內容 |
| 吊燈/矮櫃/木椅 | `makePendantLamp` / `makeSideboard` / `makeWoodChair` | 程序化道具 |
| 動畫主迴圈 | `function animate` | 段落回收、鏡頭、walkers/sitters |

分支：`claude/self-study-room-repo-z8bxwu`。改完 commit + push 同分支。

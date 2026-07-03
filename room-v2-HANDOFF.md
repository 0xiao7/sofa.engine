# SoFa 自習室「無止盡圖書館」— 換漂亮模型，三步驟，不用寫程式

> 目標：讓 `room-v2-library.html` 逼近 `previews/room-v2-mockup.png`（參考圖）。
> 現況在 `previews/room-v2-current.png`。差距只剩模型精緻度，
> **程式已經做好熱插拔**：把檔案丟進資料夾就自動換上，不用改任何程式。

---

## 🟢 三步驟（任何人都會）

1. **生模型**：打開 [meshy.ai](https://www.meshy.ai)（或 [tripo3d.ai](https://www.tripo3d.ai)），
   註冊登入 → 選 Text to 3D → 把下面 §1 任何一條英文 prompt 整段貼上 → Generate
   → 挑一個順眼的結果 → Download → 格式選 **GLB**。
2. **改檔名**：把下載的檔案改名成那條 prompt 標的 **指定檔名**（一字不差，全小寫）。
3. **丟資料夾**：放進 repo 的 `models/v2/` 資料夾（沒有就建一個），
   重新整理網頁 → 換好了。

- 不滿意？**把檔案刪掉就還原**，或再生一個蓋掉。一次換一個，隨時看效果。
- 尺寸、比例、原點都不用管，程式會自動縮放、貼地、置中。
  唯一要求：**模型直立、正面朝前**。
- 換了哪些，瀏覽器 Console 會列出來（`[v2 assets] 使用 models/v2/：…`）。

## §1 每個模型的 prompt（貼上就能用）＋指定檔名

**共同風格**（每條 prompt 都已內含）：吉卜力感、淺色木質、圓角、平塗手繪、低模。

### `desk.glb` — 書桌
```
A cozy minimal wooden study desk, light birch wood, rounded edges, Ghibli-style
hand-painted flat shading, warm pale wood color #E2CCA6, single drawer,
low-poly stylized, clean topology, game-ready prop
```

### `chair.glb` — 木椅
```
A simple wooden library chair with two horizontal back slats, light birch wood
#D3B888, rounded corners, Ghibli-style flat shading, low-poly stylized game prop
```

### `bookcase.glb` — 書櫃
```
A tall open wooden bookshelf filled with colorful books, light birch wood frame
#E2CCA6, book spines in soft pastel red blue green tones, Ghibli anime library
style, hand-painted flat shading, low-poly game asset
```

### `sideboard.glb` — 矮櫃
```
A low wooden sideboard cabinet with two doors, light birch wood, rounded edges,
Ghibli-style flat shading, minimal cozy library furniture, low-poly game prop
```

### `pendant.glb` — 吊燈
```
A small brass dome pendant lamp hanging on a short cord, warm bronze #C9A96E,
soft rounded dome shade, glowing warm bulb underneath, Ghibli cozy library
style, low-poly stylized
```

### `plant.glb` — 大盆栽
```
A potted monstera plant in a white ribbed ceramic pot, lush stylized leaves in
soft sage green #9DB28D, Ghibli anime style, hand-painted flat shading,
low-poly game asset
```

### `plant-small.glb` — 小盆栽（桌上/矮櫃上）
```
A small potted trailing plant in a white ceramic pot, soft green leaves, cozy
desk plant, Ghibli style flat shading, low-poly
```

**驗收口訣**：放進去看一眼——顏色融不融、邊角圓不圓、有沒有塑膠反光。不對就刪掉重生。

---

## §2 角色（唯一需要幫手的部分）

小人（chibi 學生）**不要用文字生 3D**，會歪。兩條路：

- **買現成**：Sketchfab / CGTrader 搜 `chibi kid rigged` 或
  `stylized child character low poly`，挑綁好骨架、素色材質、約 3 頭身的。
- **免費做**：找一隻 T-pose chibi 模型丟 [mixamo.com](https://www.mixamo.com)
  自動綁骨，下載 `Walking` 和 `Sitting Idle` 兩個動畫，用 Blender 合併輸出 .glb。

拿到檔案後，把下面 §3 的 prompt 連同檔案交給 Codex / Claude 之類的 code model 處理
（角色要接骨架動畫，超出丟檔案的範圍）。

---

## §3 給 code model 的整合 prompt（整段複製貼上）

```
你在 sofa.engine repo 的 claude/self-study-room-repo-z8bxwu 分支工作。
任務：把綁好骨架的角色 GLB（models/v2/character.glb，含 Walking 與 Sitting Idle
動畫）整合進 room-v2-library.html，取代程序化 chibi（makeChibi）。
參考圖 previews/room-v2-mockup.png，現況 previews/room-v2-current.png。

【鐵則——違反任何一條就是失敗】
1. 只改 room-v2-library.html 底部 <script> 的 three.js 場景區塊。
   絕對不動：topbar/右側卡片/bottom sheet 的 HTML、CSS、JS 邏輯、USERS 假資料、
   番茄鐘/喊話/今日記錄的行為、models/v2 熱插拔機制。
2. 場景是 6 段走廊（SEG_LEN=16）循環回收（segments 陣列），所有物件必須在
   buildSegment() 的段落 group 裡才會跟著循環。
3. 效能：無 postprocessing、貼圖 ≤1024、shadow map ≤2048、每段 ≤2 個 PointLight、
   角色用 THREE.SkeletonUtils.clone 共用骨架資源。
4. 每改一輪自我驗證：python3 -m http.server 8765 起服務，開
   http://localhost:8765/room-v2-library.html 看 1440×900 與 390×844，
   確認無穿模、浮空、色調突兀、動畫不同步炸裂。

【必須保留的行為契約】
- 坐姿角色在 makeStudySpot() 內，位置 (0,0,0.55)、面向桌子；播 Sitting Idle，
  每隻隨機 time offset 與 0.92~1.08 timeScale。
- 走路主角在 makeWalker()：位置 (0,0,-2.0)、背對鏡頭、播 Walking；
  鏡頭邏輯（第三人稱跟拍、V 鍵切第一人稱）不變。
- 每隻角色隨機換色：衣服 CHAR_COLORS、髮 HAIR_COLORS、膚 SKIN_TONES
  （traverse 材質換 MeshLambertMaterial，參考 git 歷史 3166656 的做法）。
- 腳下接觸陰影 contactShadow() 跟著放；尺寸用 normalize(scene, 1.35) 標準化。
- 若骨架 bbox 量不準（skinned mesh），用 SkinnedMesh.computeBoundingBox() 修正
  （git 歷史裡有現成做法，搜 charNormalize）。

【驗收】所有小人自然坐在木椅上讀書、主角走路擺手自然、20 人場景 60fps。
```

---

## §4 程式地圖（快速索引）

| 區塊 | 搜尋關鍵字 | 作用 |
|---|---|---|
| 熱插拔清單 | `V2_NAMES` | models/v2/ 支援的檔名 |
| 假資料/UI | `const USERS` | 名單/番茄鐘/喊話/記錄（**別動**） |
| 場景常數 | `const SEG_LEN` | 走廊尺寸、步速、霧色 |
| 材質/換色 | `const MAT` / `const LIFT` | 場景材質、舊 GLB 調色表 |
| chibi 小人 | `makeChibi` / `chibiHead` | 程序化角色（§3 要取代的） |
| 讀書位 | `makeStudySpot` | 桌+椅+人+雜物 |
| 段落生成 | `buildSegment` | 一段走廊的全部內容 |
| 動畫主迴圈 | `function animate` | 段落回收、鏡頭、walkers/sitters |

分支：`claude/self-study-room-repo-z8bxwu`。改完 commit + push 同分支。

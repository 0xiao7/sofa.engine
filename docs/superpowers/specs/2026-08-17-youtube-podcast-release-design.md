# YouTube Podcast 發布鏈設計

日期：2026-08-17  
狀態：已獲 Fay 原則核准，待書面規格複核後進入實作

## 目標

把現有「官網 Podcast／RSS 的 fail-closed 日更骨架」擴充成可驗證的 YouTube Podcast 發布鏈。第一階段只處理 EP007–EP009：產出 Hana MP3／M4A／VTT 聽核包，通過逐集人工聽核後，以 YouTube provider 的 private 狀態冪等上傳並加入正式 Podcast playlist；取得公開核准後才切換公開並啟動成效窗口。

本功能不得再把 workflow success、草稿、私人影片、排程或本機音檔稱為已發布。

## 範圍

### 納入

- EP007–EP009 Hana 聲線 MP3／M4A／VTT 候選產製。
- 逐集 QA manifest：來源、聲線版本、音訊規格、正音結果、完整聽核狀態與核准者。
- YouTube Data API 上傳器，預設 privacy status 為 `private`。
- 固定 Podcast playlist 的查找／建立與冪等加入。
- 非兒童設定、標題、說明、正式法源連結、單一 SoFa CTA 與每集獨立 UTM。
- provider 回寫：video ID、playlist ID、privacy status、provider timestamp、exact URL 與錯誤分類。
- GitHub Actions 手動／排程入口；只有 `approved_for_release` 集數可進入上傳。
- private → public 的獨立明確動作；公開後才建立 +24h／+72h 指標窗口。

### 不納入

- 自動替 Fay 寫入 `listenApproval=approved`。
- 未聽核即公開。
- 一次產製或發布 30 集。
- 重開或發布已 superseded 的 PR #206 產品操作 EP007。
- 用 RSS workflow 綠燈、YouTube private URL 或 workflow dispatch 代替公開證據。

## 架構

### 1. Episode readiness gate

既有 `data/podcast-law-queue.json` 保留內容來源與發布狀態。每集只有在以下條件全部成立時才可成為 `approved_for_release`：

- MP3、M4A、VTT 路徑存在且 SHA-256 與 manifest 一致。
- Hana 聲線版本符合核准基準。
- 音訊 codec、sample rate、channels、duration、loudness 與 true peak 通過。
- 正音清單與逐字稿一致。
- `listenApproval.status=approved`，包含核准者與時間。

任何欄位缺失都 fail closed，不改 provider。

### 2. YouTube provider adapter

新增獨立 adapter，職責只有：

- 取得或建立固定 Podcast playlist。
- 依 episode ID／既有 provider record 判斷是否已上傳。
- 上傳音訊對應的 16:9 靜態影像影片或已產出的影音容器。
- 設定 title、description、tags、category、`madeForKids=false` 與 privacy status。
- 加入 playlist 並回傳 provider evidence。

adapter 不負責決定內容是否合格，也不自行改成 public。

### 3. Idempotency ledger

provider ledger 以 episode ID 為唯一鍵，至少保存：

- `episodeId`
- `youtubeVideoId`
- `youtubePlaylistId`
- `privacyStatus`
- `uploadedAt`
- `publishedAt`
- `exactUrl`
- `assetSha256`
- `metadataSha256`

重跑時若 asset 與 metadata SHA 相同，禁止重複上傳；若不同，停止並要求顯式 update 模式，避免產生兩支同集影片。

### 4. Workflow

GitHub Actions 分為三種明確模式：

- `validate`：只驗來源、assets、approval、metadata 與 secrets presence，不呼叫 YouTube mutation。
- `upload_private`：只上傳已核准集數為 private 並加入 playlist。
- `publish`：只把 ledger 中指定且已人工確認的 private video 切成 public。

排程預設只執行 `validate`。`upload_private` 與 `publish` 必須手動 dispatch 並指定 episode ID；不得一次模糊處理全部 due episodes。

## Metadata 契約

每集標題必須包含考試、法規與條號，不使用誇大承諾。說明欄順序固定：

1. 本集解決的具體易錯點。
2. 正式法源與 SoFa 來源說明。
3. 逐步推導摘要。
4. 單一練習 CTA，使用每集獨立 UTM。
5. `SoFa Engine 參考解析` 與 `非考選部官方標準答案`。

## 錯誤處理

- 缺少 YouTube OAuth／refresh token：validate 顯示 `credential_missing`，不得嘗試上傳。
- token 無效或 scope 不足：分類為 `credential_invalid`／`scope_insufficient`，不得重試 mutation。
- quota exceeded：分類為 `quota_exceeded`，保留 ledger 原狀，不自動重試。
- playlist 已存在：重用 exact playlist ID，不重建。
- video 已存在：比對 asset／metadata SHA；相同即 idempotent success，不同即 fail closed。
- upload 成功但 playlist 寫入失敗：保存 video ID 與 partial state，後續只補 playlist，不重傳影片。
- publish 後無 exact public URL 或仍非 public：保持 `待確認`，不啟動 metrics。

所有 log 必須遮罩 token、authorization header 與個人帳號資訊。

## 測試與驗收

### 自動測試

- readiness gate 對每個缺漏欄位皆有失敗案例。
- 未核准集數無法呼叫 adapter。
- 預設 privacy status 永遠是 private。
- 相同 SHA 重跑不會重複上傳。
- 不同 SHA 不會靜默覆蓋。
- partial playlist failure 可安全續跑。
- publish 模式只能處理指定且已有 private provider record 的 episode。
- workflow 的 schedule 只能執行 validate。
- secrets 不會出現在測試輸出或錯誤訊息。

### 首批成品驗收

- EP007–EP009 各有 MP3／M4A／VTT、manifest、SHA 與 contact metadata。
- `ffprobe` 與 loudness 檢查通過；VTT 時序不超出音檔。
- 每集完整人工聽核後才可改為 `approved_for_release`。
- private upload 後取得 exact Studio/provider evidence、video ID、playlist ID 與 private URL。
- Fay 明確核准公開後才切 public；public URL 可匿名存取，CTA／UTM HTTP 驗證通過。
- 只有 confirmed publication instant 才建立 +24h／+72h 指標窗口。

## 安全與權限

- OAuth 憑證只放 GitHub Actions secrets 或受控本機憑證，不進 git、不寫 Notion。
- 本設計不授權自動核准聽感，也不授權未審音檔公開。
- 使用者的「處理」授權建立與驗證發布鏈；公開動作仍受逐集 listen approval 與 publish mode 雙重 gate。

## 完成定義

「YouTube Podcast 發布鏈完成」必須同時具備：通過測試的程式碼、EP007–EP009 首批聽核包、至少一集 approved private provider upload、正式 playlist evidence、可重跑的 ledger，以及公開後的 exact URL／CTA／UTM 驗證。只有程式、音檔、workflow 綠燈或 private video 任一單項都不構成完成。

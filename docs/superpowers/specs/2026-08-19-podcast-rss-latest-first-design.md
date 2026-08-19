# Podcast RSS 最新集數優先設計

## 目標

讓 Podcast RSS 以最新發布集數優先排列，降低目錄服務只先掃描舊項目時延後辨識更新的機會。這是對 Apple 尚未反映 2026-08-18 發布日期的低風險來源改善；不承諾能繞過 Apple 的平台快取或立即刷新。

## 已知狀態

- 公開 `https://sofaengine.org/podcast.xml` 的 EP002–EP006 `pubDate` 已是 2026-08-18，`lastBuildDate` 已是 2026-08-19。
- Apple Podcasts 公開頁仍把 EP002–EP006 顯示為 2026-07-23。
- RSS 目前依 EP001、EP002、…、EP006 排列，最舊項目在最前。
- Apple Podcasts Connect 的手動 `Refresh Feed` 需要 Apple 帳號本人登入，目前無法使用。

## 方案

1. 將 RSS `<item>` 依可解析的 `<pubDate>` 由新到舊排列；同一時間時以集數由大到小作為穩定排序。
2. 現有公開 feed 調整為 EP006、EP005、EP004、EP003、EP002、EP001。
3. 修改每日 Podcast renderer：新增集數時不再固定附加於 `</channel>` 前，而是插入後統一排序。
4. 更新 `lastBuildDate` 為本次部署時間，確保 HTTP ETag／Last-Modified 與 RSS 內容一起變更。

## 不變條件

- 不修改任何 episode GUID。
- 不修改 enclosure、MP3、M4A、VTT 或 YouTube URL。
- 不刪除、不複製、不重新發布集數。
- 不改標題、摘要、法規原文、聲音或考科 Topic。
- 不使用 301、`itunes:new-feed-url` 或其他 feed 遷移手段。

## 錯誤處理

- 任一 item 缺少或含無效 `pubDate` 時，renderer 必須失敗，不可產生排序不明的 RSS。
- 任一 item 缺少 `itunes:episode` 時，renderer 必須失敗，不可用來源順序猜測。
- RSS 日期一致性、GUID／enclosure 不變與全部既有測試任一失敗時，不部署。

## 驗收標準

- 新回歸測試先在舊 feed 上因 EP001 位於最前而失敗。
- 修正後所有 `<item>` 的時間為非遞增順序，第一個 item 是 EP006，最後一個是 EP001。
- 每日 renderer 在暫存 feed 加入新集數後，會把新集數排到正確位置並推進 `lastBuildDate`。
- 完整 Node 測試、Podcast release checker 與 `git diff --check` 全部通過。
- 合併後 GitHub Pages 成功；公開 RSS 回讀順序為 EP006 → EP001，EP002–EP006 日期仍為 2026-08-18，所有 GUID／音檔 URL 維持不變。
- Apple 公開頁只報告實際讀到的狀態；在平台完成重抓前明確標記為尚未更新。

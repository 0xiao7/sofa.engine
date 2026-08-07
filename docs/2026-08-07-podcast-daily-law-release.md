# Podcast 每日法條雲端發布

## Current truth

- 30 集來源鎖定內容已建立：EP007–EP036，24 集記帳士、6 集地政士。
- 每集保存正式法規網址、SoFa article ID/API、原文 SHA-256、解析 SHA-256、逐字稿及 VTT 草稿。
- 全部仍為 `content_verified_audio_pending`；尚無一集取得完整 Hana 音檔與逐集聽感核准，因此目前不會自動公開。
- GitHub Actions 每日 UTC 13:00（Asia/Taipei 21:00）執行；Mac 關機不影響 GitHub-hosted runner。

## Fail-closed release gate

每日 workflow 只處理 queue 最前面尚未發布的一集。它必須同時符合：

1. 日期已到。
2. 狀態為 `approved_for_release`。
3. MP3、M4A、VTT 均存在且通過基本格式檢查。
4. `listenApproval` 保存 Fay、核准時間與 approved 狀態。
5. GUID 已由 provisional 改為不可變 release GUID。
6. Podcast queue tests、既有 Podcast contracts 與 release checker 全部通過。

任一條件不成立時正常停止，不跳過、不補位、不建立公開 commit。

## Remaining external gate

目前唯一阻塞是 30 集音訊的 Hana 產製與逐集聽感核准。既有公開 voice policy 明確禁止未經 Fay 核准更換 provider 或聲線；因此不能用未核准的 Google Wavenet 或其他聲音假裝完成每日發布。

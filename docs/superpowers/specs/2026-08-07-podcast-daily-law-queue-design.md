# Podcast 每日法條雲端發布設計

日期：2026-08-07（Asia/Taipei）

## 目標

建立 30 集來源鎖定的法條 Podcast 內容庫，並由 GitHub Actions 每日自動釋出一集。Mac 關機不得影響發布；產品介紹不得取代法條主線。

## 核准方向

- 節目主線為臺灣國考法條、易錯點與真實考古題連結。
- 第一批 30 集以記帳士稅法為主，穿插地政士核心法規。
- 每集只處理一個法條核心，標題必須標示記帳士、地政士或國考。
- 產品功能只可出現在片尾 CTA，最長 15 秒。
- 雲端自動的是「從已核准佇列釋出」，不是臨時生成未驗證法律內容。

## 架構

1. `podcast-queue.json` 保存 30 集完整候選資料、正式來源、來源雜湊、考試別、預定日期及發布狀態。
2. `scripts/validate-podcast-queue.mjs` fail closed 驗證數量、唯一性、法源、臺灣用語、產品 CTA 上限及內容狀態。
3. `scripts/release-due-podcast.mjs` 只選取臺北日期已到期且 `approved` 的第一集；把已預製 MP3、M4A、VTT 與節目資料加入 `podcast-release.json`、`podcast.xml`、`podcast.html`。
4. `.github/workflows/podcast-daily-release.yml` 每日 UTC 13:00（臺北 21:00）執行，通過 queue、Podcast contract 與 release checker 後才 commit/push。
5. 任一步失敗即不修改公開檔案；不得跳過失敗集、不得用下一集補位。

## 內容與法源契約

- 正式法條網址限 `law.moj.gov.tw`，另保存 SoFa API article id／URL。
- 條文、解析、口訣與題目只能來自 SoFa 已保存資料；缺少任一必要來源即 `blocked`。
- 30 集不得有重複的 episode id、法條角度、GUID、音檔或 UTM campaign。
- 禁用中國大陸用語；用字採臺灣法制及國考慣例。
- EP007 產品操作 PR #206 不進入法條 Podcast release queue。

## 發布與失敗處理

- 只有 `approved` 且資產完整的集數可發布。
- 音檔必須先完成 Hana 聲線的人工完整聽感驗收；未核准只可保存為 `audio_pending`。
- GitHub Actions 使用最小 `contents: write` 權限；沒有到期集時正常退出且不產生 commit。
- push 或 Pages 部署失敗時保留該集未發布，下一次不得重複建立 GUID。
- 公開完成必須以正式 RSS、網站播放器、VTT、音檔、CTA HTTP 及 exact episode URL 驗證。

## 驗收標準

- 30 集 queue schema 與內容契約測試全數通過。
- 模擬到期日只釋出一集；未到期、blocked、缺資產及重複集數均 fail closed。
- 既有 Podcast 12 項 contract tests 保持通過。
- workflow 含每日雲端 schedule、手動 dry-run 與 concurrency lock。
- Mac 關機時仍由 GitHub-hosted runner 執行。
- 未取得實際 workflow success、Pages success 及公開網址以前，不宣稱每日發布已上線。

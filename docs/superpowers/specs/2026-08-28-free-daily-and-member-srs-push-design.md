# SoFa 免費刷題提醒與會員複習推播設計

## 目標

建立兩條清楚分離的 Web Push 產品路徑，並以實體 iPhone 可見通知作最後驗收：

- 免費匿名使用者可開啟每天 20:00 的固定刷題提醒，但不保存答題、錯題、星等或複習日期。
- 體驗、月費、季費、到考日、買斷與 Admin 會員可開啟依 SRS 到期資料產生的個人化複習提醒。
- 啟用後立即送出一則測試通知；使用者也可再次按「傳送測試通知」。

## 產品邊界

免費提醒只保存 Web Push 必要的裝置端點、加密金鑰、匿名安裝憑證雜湊、啟用狀態與固定提醒時間。它不建立會員、不保存任何學習紀錄，也不顯示到期題數。通知固定導向免費刷題入口。

會員提醒沿用 `user_stats.next_review_date`、`user_settings.freeze_mode` 與 `daily_review_limit`。方案為 `免費` 或 `free` 的登入帳號不得建立會員 SRS 訂閱；到期會員仍由既有認證層拒絕。會員通知導向 `dashboard.html#review-due`。

## 架構

### 免費匿名資料

新增 `free_web_push_subscriptions` 與 `free_web_push_deliveries`。瀏覽器首次使用時以 Web Crypto 產生不可預測的安裝憑證；伺服器只保存 SHA-256 雜湊。訂閱、取消與立即測試都必須同時提供 endpoint 與安裝憑證，避免只知道公開 API 便能操作別人的裝置。

免費派送帳本以 `(subscription_id, delivery_date)` 唯一約束保證每台裝置每天最多一則。失效端點收到 404／410 時停用；其他錯誤保留可重試狀態。

### 會員資料

既有 `web_push_subscriptions` 與 `web_push_deliveries` 保持會員專用。新增方案檢查 helper，供 status、subscribe 與 test route 共用。既有 unsubscribe 仍允許已登入會員清除自己的 endpoint。

### 立即測試

免費與會員各有一支受限速保護的 test route。它只向呼叫者擁有的 endpoint 送一則可見通知，不計入每日正式提醒帳本；成功只代表 push provider 接受。最後仍以 iPhone 鎖定畫面／通知中心實際可見作 human-use PASS。

### 前端

`web-push.js` 依登入狀態切換模式：

- 無登入且為免費模式：顯示「每天提醒我刷題」，走匿名免費 API。
- 已登入：先讀會員 eligibility；符合方案才顯示「依複習曲線提醒」。
- iOS／iPadOS 非 standalone：只顯示加入主畫面說明，不要求通知權限。
- `denied`：顯示到 iOS 設定重新允許的指引。
- `default`：只有使用者按啟用按鈕時才呼叫 `Notification.requestPermission()`。
- 啟用成功：保存訂閱，立即送測試訊息，顯示關閉與再次測試按鈕。

Service Worker 以 payload 的 URL 深連，通知一定可見；免費與會員使用不同 tag，避免互相覆蓋。

## 錯誤處理與隱私

- VAPID 未設定：503，前端顯示服務暫不可用。
- 訂閱格式、安裝憑證或 endpoint 無效：400，不落庫。
- 免費操作憑證不符：404，避免洩漏 endpoint 是否存在。
- 會員方案不符：403，回傳可讀原因，不建立 SRS 訂閱。
- Provider 404／410：停用訂閱；其他 provider 錯誤回 502，畫面保留可重試狀態。
- 日誌不得輸出 endpoint、p256dh、auth、Bearer token 或匿名安裝憑證。

## 測試矩陣

自動化覆蓋：桌面支援／不支援、iPhone 未加入主畫面、已加入未授權、允許、拒絕、已訂閱、取消、免費匿名、合格會員、免費方案會員、到期會員、無到期、有到期、20:00 前、20:00 後、同日重跑、provider 404／410、一般 provider 失敗、測試通知、通知點擊落點與快取更新。

正式環境覆蓋：public key、manifest、Service Worker、未登入 guards、Fay 登入 eligibility、訂閱狀態、立即測試 API、Render deploy SHA、GitHub Pages SHA。

實機覆蓋：iPhone Safari 加入主畫面 → 從主畫面啟動 → 登入 `SOFA-FAYY-TEST` → 按啟用 → iOS 允許通知 → 看見立即測試通知 → 點通知落到今日複習。沒有實機可見通知之前不得宣稱完成，也不得撰寫介紹文案。

## 說明文案必要內容

完成功能後的對外說明必須明載 iOS 加入主畫面、本人點擊授權、免費與會員差異、每日最多一則、20:00 發送、沒有到期便不發會員提醒、關閉方式，以及拒絕後如何從 iOS 通知設定重新允許。

# MVP 構建分步任務計劃（工程 LLM 專用、可直接餵任務）
（基於 ARCHITECTURE.md 的架構）

> **每個任務單元皆具備：**
> - 小且可測試（Atomic）
> - 清楚輸入與輸出（I/O 明確）
> - 有明確開始與結束條件
> - 單一責任、可獨立驗收
> - 任務依賴順序清晰（不可跳步）
> - 含工時預估（以 LLM / 工程師執行為主）

---
# 📌 任務格式（工程 LLM 標準格式）
每個任務遵循以下格式：
```
TASK-N: <任務名稱>
依賴：<之前必須完成的任務>
目標：<要達成的具體狀態>
輸入：<工程 LLM 執行任務需要的最小資訊>
輸出：<任務完成後的具體產物>
步驟：<可執行、原子化步驟>
驗收標準：<如何確定任務完成>
預估工時：<0.x hr / 1 hr / ...>
```

---
# 🧱 1. 環境建置與系統骨架

## TASK-1：建立 FastAPI 最小專案骨架
依賴：無
目標：能啟動 FastAPI 並回應 health check。
輸入：空專案資料夾
輸出：main.py + requirements + `GET /health` endpoint
步驟：
1. 建立 main.py
2. 建立 FastAPI app
3. 建立 `/health` route
4. 加入 requirements.txt（fastapi, uvicorn）
5. 啟動並測試 localhost
驗收標準：`GET /health` → `{"status":"ok"}`
預估工時：0.2 hr

---
## TASK-2：建立 database.py + MySQL 最小連線功能
依賴：TASK-1
目標：可成功與 MySQL 建立連線並執行 SELECT 1。
輸入：DB 連線設定
輸出：database.py（connect、execute_query）
步驟：
1. 建立 Database class
2. 實作 connect()
3. 實作 execute_query()
4. 使用 `SELECT 1` 測試
驗收標準：後端啟動時能成功 log 「DB connected」。
預估工時：0.4 hr

---
## TASK-3：加入 CORS 中介層
依賴：TASK-1
目標：前端可跨域呼叫 API。
輸入：main.py
輸出：加入 CORS 設定
步驟：
1. 在 main.py 加入 CORSMiddleware
2. 開放 OPTIONS 請求
驗收標準：瀏覽器呼叫 API 不再跨域錯誤。
預估工時：0.1 hr

---
# 🔐 2. 認證系統（MVP 最小功能）

## TASK-4：建立使用者資料表 users（最小欄位）
依賴：TASK-2
目標：建立 users 表：id, username, password_hash, role
輸入：SQL schema
輸出：users table
驗收標準：SHOW TABLES 出現 users
預估工時：0.2 hr

---
## TASK-5：建立 password.hash 與 verify 函式
依賴：TASK-4
目標：支援 SHA256 密碼加密/驗證
輸入：password.py
輸出：hash_password(), verify_password()
驗收標準：unit test：正確密碼通過、錯誤密碼失敗
預估工時：0.2 hr

---
## TASK-6：建立 JWT create/decode 功能
依賴：TASK-5
目標：能 encode/decode JWT
輸入：auth.py
輸出：create_token_for_user(), decode_access_token()
驗收標準：可手動成功 encode/decode
預估工時：0.3 hr

---
## TASK-7：建立 POST /auth/login
依賴：TASK-6
目標：可登入並回傳 token
驗收標準：POST /auth/login → token
預估工時：0.3 hr

---
## TASK-8：建立 get_current_user 依賴
依賴：TASK-7
目標：能保護 API（需 JWT）
驗收：未帶 token→401；帶 token→回傳 user。
預估工時：0.2 hr

---
# 🧩 3. 客戶管理（MVP 核心功能）

## TASK-9：建立 customers 資料表（最小欄位）
依賴：TASK-2
目標：欄位：id, customer_abbr
預估工時：0.2 hr

---
## TASK-10：建立 customers CRUD API
依賴：TASK-9, TASK-8
目標：支援新增/查詢/更新/刪除
預估工時：0.5 hr

---
## TASK-11：建立前端 api-customers.js
依賴：TASK-10
目標：能從前端呼叫 customers CRUD
預估工時：0.3 hr

---
## TASK-12：實作 CustomerState（LocalStorage）
依賴：TASK-11
目標：能存/取 current_customer
預估工時：0.2 hr

---
# 🔧 4. 治具管理（Fixture）MVP

## TASK-13：建立 fixtures 資料表（最小欄位）
依賴：TASK-9
目標：欄位：id, customer_id, fixture_name, status
預估工時：0.2 hr

---
## TASK-14：建立 fixtures CRUD API
依賴：TASK-13, TASK-8
目標：支援 CRUD 並支援 customer_id 過濾
預估工時：0.5 hr

---
## TASK-15：前端 api-fixtures.js
依賴：TASK-14
目標：支援 listFixtures/createFixture
預估工時：0.3 hr

---
## TASK-16：建立前端 renderFixtureTable()
依賴：TASK-15
目標：能將 fixtures 渲染到表格
預估工時：0.3 hr

---
# 📦 5. 收料（Receipt）最小流程

## TASK-17：建立 material_transactions 資料表（最小欄位）
依賴：TASK-13
目標：欄位：transaction_type, customer_id, fixture_id, quantity
預估工時：0.3 hr

---
## TASK-18：建立新增收料 API（最小版）
依賴：TASK-17
目標：POST /receipts 可新增紀錄
預估工時：0.4 hr

---
## TASK-19：前端 api-receipts.js
依賴：TASK-18
目標：可從前端建立收料紀錄
預估工時：0.3 hr

---
# 🖥 6. SPA 前端建置

## TASK-20：建立 index.html 最小架構
依賴：無（可平行）
目標：能載入必要 JS
預估工時：0.3 hr

---
## TASK-21：建立 app-main.js 初始化流程
依賴：TASK-20, TASK-11
預估工時：0.4 hr

---
## TASK-22：建立 fixtures 分頁 + 列表載入流程
依賴：TASK-16
預估工時：0.4 hr

---
## TASK-23：新增治具前端流程（Form → API → Refresh）
依賴：TASK-22, TASK-15
預估工時：0.4 hr

---
# 🧹 7. 資料驗證 + 錯誤處理

## TASK-24：加入 Pydantic 驗證
依賴：之前所有 CRUD API
預估工時：0.3 hr

---
## TASK-25：全域錯誤處理器
依賴：TASK-24
預估工時：0.3 hr

---
# 🧪 8. 自動化測試（MVP）

## TASK-26：test_auth.py
預估工時：0.3 hr

## TASK-27：test_customers.py
預估工時：0.3 hr

## TASK-28：test_fixtures.py
預估工時：0.3 hr

---
# 🚀 9. 部署準備

## TASK-29：建立 .env.example + config.py 支援環境變數
預估工時：0.2 hr

---
## TASK-30：整合測試、啟動完整 MVP
依賴：全部
驗收：
- 能登入
- 能切換客戶
- 能新增治具
- 能新增收料
預估工時：0.5 hr

---
# 📊 10. 總工時
大約：**9.5 ~ 12 小時（LLM/工程師）**

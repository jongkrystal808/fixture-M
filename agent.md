以下是用中文撰寫的 `agent.md`，適用於您的專案來協助進行除錯：

------

# 治具管理系統除錯指引

## 概述

本文檔說明了如何設置和使用 Codex 助手來協助除錯「治具管理系統」專案。該助手的主要目的是分析後端（FastAPI）和前端（Vanilla JS）代碼，幫助定位和解決問題。

## 系統需求

請確保已經準備好以下環境和工具：

- **FastAPI 後端 (Python 3.x)**
  - FastAPI (v0.100+)
  - MySQL 8.x 資料庫
  - Pydantic 模型進行資料驗證
  - 使用 Uvicorn 來啟動應用程式
- **前端 (Vanilla JS)** 使用動態標籤頁面切換
- **MySQL 資料庫**：執行 v3.0 架構，必須支持客戶資料隔離

### 需要分析的檔案：

- **後端檔案**：
  - `backend/app/routers/` (例如：`customers.py`、`fixtures.py`、`receipts.py`)
  - `backend/app/models/` (Pydantic 模型)
  - `backend/app/database.py` (資料庫查詢和連接)
  - `main.py` (FastAPI 應用程式和路由設定)
- **前端檔案**：
  - `web/js/app-main.js`
  - `web/js/api-*.js` (例如：`api-fixtures.js`、`api-receipts.js` 等)
  - HTML 結構和動態標籤頁元件

------

## 設置指引

### 1. **確保資料庫連接**

在進行除錯前，請確保 FastAPI 應用程式能夠成功連接 MySQL 資料庫。資料庫必須已經運行並使用 v3.0 架構，並支持客戶資料隔離。

檢查資料庫連接的代碼範例：

```python
from backend.app.database import db
print(db.check_connection())  # 應該返回 True，表示成功連接
```

### 2. **啟動 FastAPI 應用程式**

確保 FastAPI 伺服器正在運行並且能同時服務後端和前端。使用以下命令啟動伺服器：

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. **確認資料庫架構**

請確保資料庫中的所有表格（例如：`customers`、`fixtures`、`stations`）和視圖（例如：`view_fixture_status`、`view_model_max_stations`）都已正確建立。您可以使用提供的資料庫腳本來清理並建立所需的結構。

### 4. **啟用除錯中間件**

下面的中間件會捕獲未處理的異常並打印出來，幫助除錯：

```python
@app.middleware("http")
async def debug_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        print("🔥 捕獲錯誤:", e)
        raise
```

這個中間件會將錯誤日誌顯示在終端機中，幫助定位問題。

------

## 除錯步驟

### 1. **後端除錯 (FastAPI)**

#### 錯誤處理：

- 檢查錯誤回應和 HTTP 狀態碼（如 401 Unauthorized、404 Not Found）。
- 確保所有路由正確註冊並設置適當的認證（JWT 認證）。
- 例如，對 `customer_id` 的過濾進行除錯：

```python
@router.get("/fixtures/{fixture_id}")
async def get_fixture(fixture_id: str, customer_id: str):
    query = "SELECT * FROM fixtures WHERE id = %s AND customer_id = %s"
    result = db.execute_query(query, (fixture_id, customer_id))
    if not result:
        raise HTTPException(status_code=404, detail="治具不存在或無權限")
    return result
```

#### 資料庫查詢：

- 確保 SQL 查詢正確並且得到優化。
- 檢查資料表之間的關聯是否正確，尤其是在查詢 `customer_id` 時。

------

### 2. **前端除錯 (JavaScript)**

#### 標籤頁和子標籤管理：

確保標籤頁和子標籤能正確切換並顯示對應的內容：

```javascript
function initTabs() {
  const tabs = document.querySelectorAll('button[data-tab]');
  const sections = document.querySelectorAll('[id^="tab-"]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      // 按鈕樣式
      tabs.forEach(t => t.classList.remove('tab-active'));
      tab.classList.add('tab-active');

      // 顯示對應分頁
      sections.forEach(s => {
        s.style.display = (s.id === `tab-${target}`) ? 'block' : 'none';
      });

      // 更新標題
      const title = document.getElementById("activeTabTitle");
      if (title) title.textContent = tab.textContent;
    });
  });
}
```

#### 客戶選擇：

確保客戶選擇邏輯正常運作，並且每次請求後端 API 時，會正確傳遞 `customer_id`：

```javascript
async function loadFixtures() {
  const customerId = CustomerState.getCurrentCustomer();
  if (!customerId) {
    showToast('請先選擇客戶', 'warning');
    return;
  }

  const response = await api(`/fixtures?customer_id=${customerId}`);
  if (response.ok) {
    return await response.json();
  }
}
```

#### 錯誤處理：

確保錯誤信息能夠正確顯示給用戶，並且在控制台中進行日誌記錄，便於除錯：

```javascript
function handleApiError(error) {
  if (error.message === '請先選擇客戶') {
    showToast('請先選擇客戶', 'warning');
  } else {
    showToast(error.message || '操作失敗', 'error');
    console.error('API 錯誤:', error);
  }
}
```

------

### 3. **測試案例範例**

- **測試 `customer_id` 過濾**：確保所有 API 請求（例如：獲取治具、更新記錄）都會正確根據 `customer_id` 來過濾資料。

```javascript
test('應該根據選擇的客戶來獲取治具列表', async () => {
  const customerId = 'customerA';
  const response = await apiGetFixtures({ customer_id: customerId });
  expect(response).toBeTruthy();
  expect(response.customer_id).toBe(customerId);
});
```

------

## 除錯清單

-  檢查資料庫連接和資料庫架構。
-  測試 FastAPI 路由，確認認證和授權正確。
-  確保前端正確根據 `customer_id` 過濾和顯示資料。
-  確保標籤頁和子標籤頁面切換正常。
-  確保所有 API 請求都能傳遞正確的客戶上下文（例如：`customer_id`）。
-  測試邊界情況（例如：缺少 `customer_id`，空回應等）。

------

## 結論

完成上述步驟後，如果問題依然存在，請收集後端和前端的錯誤日誌，並提供詳細的錯誤信息。
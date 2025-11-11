# 🔧 治具管理系統 v2.0.0

完整的治具生命週期管理系統，支援收退料、使用記錄、更換追蹤、開站數智能計算等功能。

## 📋 目錄

- [功能特色](#功能特色)
- [技術架構](#技術架構)
- [快速開始](#快速開始)
- [API 文件](#api-文件)
- [專案結構](#專案結構)
- [資料庫設計](#資料庫設計)
- [常見問題](#常見問題)

---

## ✨ 功能特色

### 🔐 認證系統
- JWT Token 認證
- 角色權限管理 (admin/user)
- 密碼加密 (Bcrypt)
- Token 刷新機制

### 🔧 治具管理
- 完整的 CRUD 操作
- 自購/客供數量追蹤
- 治具狀態管理 (正常/返還/報廢)
- 儲存位置管理
- 更換週期追蹤 (天數/次數)
- 自動計算更換狀態

### 📦 收退料管理
- 批量收料 (流水號起訖)
- 少量收料 (逗號分隔)
- 批量退料
- 少量退料
- 收退料記錄查詢
- 統計報表

### 📝 記錄管理
- 使用記錄登記
- 批量使用記錄
- 更換記錄管理
- 異常狀態追蹤
- 完整的歷史記錄

### 🏭 機種管理 ⭐ 核心功能
- 機種資料維護
- **開站數智能計算**
- 治具需求管理
- 站點配置管理
- 瓶頸分析

### 📊 統計分析
- 治具狀況總覽
- 使用統計
- 更換統計
- 收退料統計
- 儀表板數據

---

## 🏗️ 技術架構

### 後端
- **框架**: FastAPI 0.104+
- **資料庫**: MySQL 8.0+
- **ORM**: 原生 SQL (PyMySQL)
- **認證**: JWT (python-jose)
- **密碼加密**: Bcrypt
- **資料驗證**: Pydantic v2

### 前端
- **技術**: 原生 JavaScript
- **樣式**: Tailwind CSS
- **架構**: SPA (單頁應用)

### 資料庫特色
- 12 個資料表
- 2 個視圖 (自動計算)
- 3 個觸發器 (自動更新)
- 完整的外鍵約束
- 索引優化

---

## 🚀 快速開始

### 前置需求

- Python 3.10+
- MySQL 8.0+
- Git (可選)

### Step 1: 下載專案

將所有檔案放置在專案目錄中，結構如下：

```
backend/
├── app/
│   ├── models/          # Pydantic 模型
│   ├── routers/         # API 路由
│   ├── auth.py          # JWT 認證
│   ├── config.py        # 配置管理
│   ├── database.py      # 資料庫連接
│   └── dependencies.py  # 依賴注入
├── web/
│   └── index.html       # 前端頁面
├── main.py              # FastAPI 主程式
├── requirements.txt     # Python 依賴
├── .env                 # 環境變數
└── README.md           # 本文件
```

### Step 2: 安裝依賴

```bash
cd backend
pip install -r requirements.txt
```

### Step 3: 設定資料庫

1. 建立資料庫：

```sql
CREATE DATABASE fixture_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. 執行初始化腳本 (使用 Phase 1 提供的 init_database.sql)：

```bash
mysql -u root -p fixture_management < init_database.sql
```

### Step 4: 設定環境變數

建立 `.env` 檔案：

```env
# 資料庫配置
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=fixture_management
DATABASE_USER=root
DATABASE_PASSWORD=your_password_here

# API 配置
API_TITLE=治具管理系統 API
API_VERSION=2.0.0

# 上傳目錄
UPLOAD_DIR=./uploads
```

### Step 5: 啟動系統

```bash
python main.py
```

或使用 uvicorn：

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Step 6: 訪問系統

- 🌐 **系統首頁**: http://localhost:8000/
- 📚 **API 文件**: http://localhost:8000/docs
- 📖 **ReDoc**: http://localhost:8000/redoc
- 🖥️ **前端頁面**: http://localhost:8000/web/index.html

---

## 📚 API 文件

### 認證 API

#### 登入
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

回應：
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

#### 使用 Token
```http
GET /api/fixtures
Authorization: Bearer <your_token>
```

### 治具管理 API

#### 查詢治具列表
```http
GET /api/fixtures?skip=0&limit=100&status_filter=正常
```

#### 建立治具
```http
POST /api/fixtures
Authorization: Bearer <token>
Content-Type: application/json

{
  "fixture_id": "L-00017",
  "fixture_name": "主板測試治具 A",
  "self_purchased_qty": 100,
  "customer_supplied_qty": 50,
  "replacement_cycle": 30.0,
  "cycle_unit": "uses",
  "status": "正常"
}
```

### 開站數查詢 API ⭐

#### 查詢機種最大開站數
```http
GET /api/models/EDS-518A-SS-SC-80/max-stations
```

回應：
```json
{
  "model_id": "EDS-518A-SS-SC-80",
  "model_name": "EDS-518A 交換器",
  "stations": [
    {
      "station_id": 1,
      "station_code": "T1_MP",
      "station_name": "T1 主板測試站",
      "max_stations": 1,
      "bottleneck_fixture": "L-33-14 (測試治具B)",
      "bottleneck_available": 1,
      "bottleneck_required": 1
    }
  ]
}
```

### 收料 API

#### 批量收料
```http
POST /api/receipts
Authorization: Bearer <token>
Content-Type: application/json

{
  "receipt_type": "batch",
  "vendor": "ABC 供應商",
  "order_no": "PO20251107001",
  "fixture_code": "L-00017",
  "serial_start": "001",
  "serial_end": "010",
  "note": "品質良好"
}
```

#### 少量收料
```http
POST /api/receipts
Authorization: Bearer <token>
Content-Type: application/json

{
  "receipt_type": "individual",
  "vendor": "ABC 供應商",
  "order_no": "PO20251107002",
  "fixture_code": "L-00017",
  "serials": "A001, A002, A003",
  "note": "少量補貨"
}
```

完整 API 文件請訪問: http://localhost:8000/docs

---

## 📁 專案結構

```
backend/
├── app/
│   ├── models/                    # Pydantic 資料模型
│   │   ├── user.py               # 使用者模型
│   │   ├── owner.py              # 負責人模型
│   │   ├── station.py            # 站點模型
│   │   ├── fixture.py            # 治具模型
│   │   ├── receipt.py            # 收退料模型
│   │   └── log.py                # 記錄模型
│   │
│   ├── routers/                   # API 路由
│   │   ├── auth_router.py        # 認證 API
│   │   ├── fixtures_router.py    # 治具管理 API
│   │   ├── receipts_router.py    # 收料 API
│   │   ├── returns_router.py     # 退料 API
│   │   ├── logs_router.py        # 記錄 API
│   │   └── models_router.py      # 機種管理 API
│   │
│   ├── utils/                     # 工具模組
│   │   ├── password.py           # 密碼工具
│   │   └── validators.py         # 資料驗證
│   │
│   ├── auth.py                    # JWT 認證處理
│   ├── config.py                  # 配置管理
│   ├── database.py                # 資料庫連接
│   └── dependencies.py            # 依賴注入
│
├── web/
│   └── index.html                 # 前端介面
│
├── uploads/                       # 檔案上傳目錄
│
├── main.py                        # FastAPI 主程式
├── requirements.txt               # Python 依賴清單
├── .env                          # 環境變數 (需自建)
└── README.md                      # 說明文件
```

---

## 🗄️ 資料庫設計

### 資料表 (12 個)

1. **users** - 使用者
2. **owners** - 負責人
3. **fixtures** - 治具主檔
4. **machine_models** - 機種
5. **stations** - 站點
6. **model_stations** - 機種-站點關聯
7. **fixture_requirements** - 治具需求
8. **fixture_deployments** - 治具部署
9. **usage_logs** - 使用記錄
10. **replacement_logs** - 更換記錄
11. **receipts** - 收料記錄
12. **returns_table** - 退料記錄

### 視圖 (2 個)

1. **view_fixture_status** - 治具狀況總覽
2. **view_model_max_stations** - 機種最大開站數

### 觸發器 (3 個)

1. **trg_replacement_insert** - 自動更新更換日期
2. **trg_replacement_delete** - 刪除後重算日期
3. **trg_replacement_update** - 更新後重算日期

---

## 🎯 核心功能說明

### 開站數計算邏輯

系統會根據以下資訊計算最大開站數：

1. **治具需求**: 每個機種在每個站點需要的治具種類和數量
2. **治具庫存**: 每個治具的可用數量 (自購 + 客供)
3. **計算公式**: `最大開站數 = MIN(庫存數量 / 需求數量)` 

範例：
- T1_MP 站需要：L-00017 × 8, L-33-14 × 1
- 庫存：L-00017 有 2455 個, L-33-14 有 1 個
- 計算：
  - L-00017: 2455 / 8 = 306 站
  - L-33-14: 1 / 1 = 1 站
- **結果**: 最多只能開 **1 站** (受限於 L-33-14)

### 治具更換判斷

系統自動判斷治具是否需要更換：

**按使用次數:**
- 如果 `累計使用次數 >= 更換週期` → 需更換

**按天數:**
- 如果 `(今天 - 最後更換日期) >= 更換週期` → 需更換

---

## ❓ 常見問題

### Q1: 如何重設管理員密碼？

使用 MySQL 直接更新：

```sql
-- 使用 bcrypt 加密的密碼 "admin123"
UPDATE users 
SET password_hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqGqbqA1Im'
WHERE username = 'admin';
```

### Q2: Token 過期怎麼辦？

重新登入取得新 Token，或實作 Token 刷新機制。

### Q3: 如何備份資料庫？

```bash
mysqldump -u root -p fixture_management > backup_$(date +%Y%m%d).sql
```

### Q4: 如何還原資料庫？

```bash
mysql -u root -p fixture_management < backup_20251107.sql
```

### Q5: 如何修改 JWT 密鑰？

編輯 `app/auth.py` 中的 `SECRET_KEY`：

```python
SECRET_KEY = "your-new-secret-key-here"
```

⚠️ **注意**: 修改後所有現有 Token 都會失效。

### Q6: 如何部署到生產環境？

1. 關閉 FastAPI 的 `reload` 模式
2. 使用 Gunicorn + Uvicorn workers
3. 設定 CORS 為特定域名
4. 使用 HTTPS
5. 設定防火牆
6. 使用環境變數管理密鑰

### Q7: 支援哪些資料庫？

目前支援 MySQL 8.0+。如需支援 PostgreSQL，需要修改 SQL 語法。

---

## 🔧 開發指南

### 新增 API 端點

1. 在 `app/models/` 建立 Pydantic 模型
2. 在 `app/routers/` 建立路由檔案
3. 在 `main.py` 註冊路由

範例：
```python
# app/routers/example.py
from fastapi import APIRouter

router = APIRouter(prefix="/example", tags=["範例"])

@router.get("/")
async def list_examples():
    return {"message": "Hello"}

# main.py
from routers import example
app.include_router(example.router, prefix="/api")
```

### 執行測試

```bash
pytest tests/
```

### 程式碼格式化

```bash
black .
flake8 .
```

---

## 📝 更新日誌

### v2.0.0 (2025-11-07)
- ✨ 全新架構重構
- ✨ JWT 認證系統
- ✨ 開站數智能計算
- ✨ 批量操作支援
- ✨ 完整的 API 文件
- ✨ 資料庫觸發器和視圖
- ✨ 前端介面優化

---

## 📄 授權

本專案為內部使用系統。

---

## 👥 開發團隊

治具管理系統開發團隊

---

## 📮 聯絡方式

如有問題或建議，請聯絡開發團隊。

---

**感謝使用治具管理系統！** 🎉
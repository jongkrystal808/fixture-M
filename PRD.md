# 治具管理系統架構文檔 v3.0

> 完整的系統架構設計、文件結構、職責劃分與服務連接說明

---

## 📑 目錄

- [系統概覽](#系統概覽)
- [專案結構](#專案結構)
- [後端架構](#後端架構)
- [前端架構](#前端架構)
- [資料庫架構](#資料庫架構)
- [狀態管理](#狀態管理)
- [服務連接](#服務連接)
- [資料流向](#資料流向)
- [部署架構](#部署架構)

---

## 🎯 系統概覽

### 核心特性

治具管理系統 v3.0 是一個基於 **FastAPI + MySQL + Vanilla JavaScript** 的企業級管理系統，採用 **前後端分離** 架構。

**主要特點:**
- ✅ 多客戶支援，資料完全隔離
- ✅ RESTful API 設計
- ✅ JWT 認證機制
- ✅ 序號級別追蹤
- ✅ Excel 匯入/匯出
- ✅ 即時統計分析

### 技術棧

```
前端: Vanilla JavaScript + Tailwind CSS + XLSX.js
後端: FastAPI 0.100+ (Python 3.9+)
資料庫: MySQL 8.0+
認證: JWT Bearer Token (SHA256)
```

### 系統架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (瀏覽器)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              index.html (單一頁面應用)                  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  UI Components (治具/收料/統計/管理...)          │  │ │
│  │  └──────────────┬───────────────────────────────────┘  │ │
│  │                 │                                        │ │
│  │  ┌──────────────▼───────────────────────────────────┐  │ │
│  │  │  App Layer (app-*.js)                            │  │ │
│  │  │  - 頁面控制邏輯                                   │  │ │
│  │  │  - 事件處理                                       │  │ │
│  │  │  - UI 渲染                                        │  │ │
│  │  └──────────────┬───────────────────────────────────┘  │ │
│  │                 │                                        │ │
│  │  ┌──────────────▼───────────────────────────────────┐  │ │
│  │  │  API Layer (api-*.js)                            │  │ │
│  │  │  - HTTP 請求封裝                                  │  │ │
│  │  │  - 自動帶入 Token                                 │  │ │
│  │  │  - 錯誤處理                                       │  │ │
│  │  └──────────────┬───────────────────────────────────┘  │ │
│  │                 │                                        │ │
│  │  ┌──────────────▼───────────────────────────────────┐  │ │
│  │  │  Utils (utils/*.js)                              │  │ │
│  │  │  - storage.js   (狀態管理 - LocalStorage)        │  │ │
│  │  │  - utils.js     (工具函數)                        │  │ │
│  │  │  - ui-render.js (渲染函數)                        │  │ │
│  │  │  - calculations.js (計算邏輯)                     │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ 
                           │ HTTP/JSON + JWT Token
                           │ 
┌──────────────────────────▼──────────────────────────────────┐
│              FastAPI Application (main.py)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Middleware Layer                                       │ │
│  │  - CORS                                                 │ │
│  │  - JWT Authentication (dependencies.py)                │ │
│  │  - Error Handler                                       │ │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │  Routers (API Endpoints)                               │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  auth.py             使用者認證                   │  │ │
│  │  │  customers.py        客戶管理                     │  │ │
│  │  │  fixtures.py         治具管理                     │  │ │
│  │  │  receipts.py         收料管理                     │  │ │
│  │  │  returns.py          退料管理                     │  │ │
│  │  │  serials.py          序號管理                     │  │ │
│  │  │  usage.py            使用記錄                     │  │ │
│  │  │  replacement.py      更換記錄                     │  │ │
│  │  │  machine_models.py   機種管理                     │  │ │
│  │  │  stations.py         站點管理                     │  │ │
│  │  │  model_stations.py   機種-站點綁定               │  │ │
│  │  │  fixture_requirements.py  治具需求               │  │ │
│  │  │  owners.py           負責人管理                   │  │ │
│  │  │  users.py            使用者管理                   │  │ │
│  │  │  stats.py            統計分析                     │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │  Models (Pydantic)                                      │ │
│  │  - 資料驗證                                             │ │
│  │  - 序列化/反序列化                                      │ │
│  │  - API 文檔自動生成                                     │ │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │  Utils (工具函數)                                       │ │
│  │  - password.py       (密碼加密/驗證)                    │ │
│  │  - serial_tools.py   (序號展開/正規化)                 │ │
│  │  - excel.py          (Excel 處理)                       │ │
│  │  - validators.py     (資料驗證)                         │ │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │  Database Layer (database.py)                          │ │
│  │  - Connection Pool                                     │ │
│  │  - Query Execution (execute_query, execute_update)    │ │
│  │  - Transaction Management                              │ │
│  └─────────────────────────┬──────────────────────────────┘ │
└────────────────────────────┼────────────────────────────────┘
                             │ PyMySQL
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    MySQL 8.0+ Database                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Tables (16 張資料表)                                   │ │
│  │  - customers                客戶主檔                    │ │
│  │  - users                    使用者                      │ │
│  │  - owners                   負責人                      │ │
│  │  - fixtures                 治具主檔                    │ │
│  │  - fixture_serials          序號管理                    │ │
│  │  - machine_models           機種主檔                    │ │
│  │  - stations                 站點主檔                    │ │
│  │  - model_stations           機種-站點綁定               │ │
│  │  - fixture_requirements     治具需求                    │ │
│  │  - fixture_deployments      治具部署                    │ │
│  │  - material_transactions    收退料交易                  │ │
│  │  - material_transaction_details  交易明細               │ │
│  │  - usage_logs               使用記錄                    │ │
│  │  - replacement_logs         更換記錄                    │ │
│  │  - inventory_snapshots      庫存快照                    │ │
│  │  - deployment_history       部署歷史                    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Views (視圖)                                           │ │
│  │  - view_fixture_status      治具狀態視圖                │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Stored Procedures (存儲過程)                           │ │
│  │  - sp_material_receipt      收料業務邏輯                │ │
│  │  - sp_material_return       退料業務邏輯                │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Triggers (觸發器)                                      │ │
│  │  - trg_serial_status_update 序號狀態更新               │ │
│  │  - trg_serial_insert        序號新增統計               │ │
│  │  - trg_serial_delete        序號刪除統計               │ │
│  │  - trg_record_deployment    記錄部署歷史                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 專案結構

### 完整目錄樹

```
fixture-management-system/
│
├── backend/                          # 後端根目錄
│   ├── app/                          # 應用程式核心
│   │   │
│   │   ├── models/                   # Pydantic 資料模型
│   │   │   ├── __init__.py
│   │   │   ├── customer.py          # 客戶模型
│   │   │   ├── fixture.py           # 治具模型
│   │   │   ├── fixture_requirements.py  # 治具需求模型
│   │   │   ├── machine_model.py     # 機種模型
│   │   │   ├── owners.py            # 負責人模型
│   │   │   ├── receipts.py          # 收料模型
│   │   │   ├── replacement.py       # 更換記錄模型
│   │   │   ├── station.py           # 站點模型
│   │   │   ├── usage.py             # 使用記錄模型
│   │   │   └── users.py             # 使用者模型
│   │   │
│   │   ├── routers/                  # API 路由
│   │   │   ├── auth.py              # 認證 API
│   │   │   ├── customers.py         # 客戶管理 API
│   │   │   ├── fixtures.py          # 治具管理 API
│   │   │   ├── receipts.py          # 收料管理 API
│   │   │   ├── returns.py           # 退料管理 API
│   │   │   ├── serials.py           # 序號管理 API
│   │   │   ├── usage.py             # 使用記錄 API
│   │   │   ├── replacement.py       # 更換記錄 API
│   │   │   ├── machine_models.py    # 機種管理 API
│   │   │   ├── stations.py          # 站點管理 API
│   │   │   ├── model_stations.py    # 機種-站點綁定 API
│   │   │   ├── fixture_requirements.py  # 治具需求 API
│   │   │   ├── owners.py            # 負責人管理 API
│   │   │   ├── users.py             # 使用者管理 API
│   │   │   └── stats.py             # 統計分析 API
│   │   │
│   │   ├── utils/                    # 工具函數
│   │   │   ├── excel.py             # Excel 處理
│   │   │   ├── password.py          # 密碼加密/驗證
│   │   │   ├── serial_tools.py      # 序號工具
│   │   │   └── validators.py        # 資料驗證器
│   │   │
│   │   ├── auth.py                   # JWT 認證模組
│   │   ├── database.py               # 資料庫連接層
│   │   └── dependencies.py           # FastAPI 依賴注入
│   │
│   ├── uploads/                      # 上傳檔案暫存
│   ├── config.py                     # 系統配置
│   └── main.py                       # 應用程式入口
│
├── web/                              # 前端根目錄
│   ├── js/                           # JavaScript 檔案
│   │   │
│   │   ├── api/                      # API 服務層
│   │   │   ├── api-config.js        # API 配置
│   │   │   ├── api-auth.js          # 認證 API
│   │   │   ├── api-customers.js     # 客戶 API
│   │   │   ├── api-fixtures.js      # 治具 API
│   │   │   ├── api-receipts.js      # 收料 API
│   │   │   ├── api-returns.js       # 退料 API
│   │   │   ├── api-serials.js       # 序號 API
│   │   │   ├── api-usage.js         # 使用記錄 API
│   │   │   ├── api-replacement.js   # 更換記錄 API
│   │   │   ├── api-machine-models.js # 機種 API
│   │   │   ├── api-stations.js      # 站點 API
│   │   │   ├── api-owners.js        # 負責人 API
│   │   │   ├── api-users.js         # 使用者 API
│   │   │   └── api-stats.js         # 統計 API
│   │   │
│   │   ├── app/                      # 應用程式控制層
│   │   │   ├── app-main.js          # 主控制器
│   │   │   ├── app-auth.js          # 認證控制器
│   │   │   ├── app-customers.js     # 客戶管理控制器
│   │   │   ├── app-fixtures.js      # 治具管理控制器
│   │   │   ├── app-receipts.js      # 收料控制器
│   │   │   ├── app-returns.js       # 退料控制器
│   │   │   ├── app-serials.js       # 序號管理控制器
│   │   │   ├── app-usage.js         # 使用記錄控制器
│   │   │   ├── app-replacement.js   # 更換記錄控制器
│   │   │   ├── app-machine-models.js # 機種管理控制器
│   │   │   ├── app-stations.js      # 站點管理控制器
│   │   │   ├── app-owners.js        # 負責人管理控制器
│   │   │   ├── app-users.js         # 使用者管理控制器
│   │   │   └── app-stats.js         # 統計控制器
│   │   │
│   │   └── utils/                    # 前端工具函數
│   │       ├── storage.js           # 狀態管理 (LocalStorage)
│   │       ├── utils.js             # 通用工具
│   │       ├── ui-render.js         # UI 渲染函數
│   │       └── calculations.js      # 計算邏輯
│   │
│   ├── index.html                    # 主頁面 (SPA)
│   └── favicon.ico                   # 網站圖標
│
├── database/                         # 資料庫相關
│   ├── init_database.sql            # 初始化腳本
│   ├── schema_v3.sql                # v3.0 資料表結構
│   ├── procedures.sql               # 存儲過程
│   └── sample_data.sql              # 測試資料
│
├── docs/                             # 文檔
│   ├── README.md                    # 專案說明
│   ├── ARCHITECTURE.md              # 本文檔
│   ├── API.md                       # API 文檔
│   └── UPGRADE_TO_V3.md             # 升級指南
│
├── tests/                            # 測試
│   ├── test_api/                    # API 測試
│   └── test_utils/                  # 工具函數測試
│
├── .env.example                      # 環境變數範例
├── .gitignore                        # Git 忽略規則
├── config.py                         # 全域配置
├── main.py                           # 應用程式入口
├── requirements.txt                  # Python 依賴
└── README.md                         # 專案說明
```

---

## 🔧 後端架構

### 層級結構

```
┌─────────────────────────────────────┐
│        API Layer (Routers)          │  ← FastAPI 路由端點
├─────────────────────────────────────┤
│     Business Logic (Routers)        │  ← 業務邏輯處理
├─────────────────────────────────────┤
│      Data Models (Pydantic)         │  ← 資料驗證與序列化
├─────────────────────────────────────┤
│    Database Layer (database.py)     │  ← 資料庫操作抽象
├─────────────────────────────────────┤
│         MySQL Database              │  ← 資料持久化
└─────────────────────────────────────┘
```

### 核心模組說明

#### 1. `main.py` - 應用程式入口

**職責:**
- 建立 FastAPI 應用程式實例
- 註冊所有 API 路由
- 配置 CORS 中間件
- 設定全域異常處理
- 管理應用程式生命週期

**關鍵程式碼:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="治具管理系統 API", version="3.0.0")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊路由
app.include_router(auth_router, prefix="/api/v2")
app.include_router(customers_router, prefix="/api/v2")
app.include_router(fixtures_router, prefix="/api/v2")
# ... 其他路由
```

#### 2. `config.py` - 系統配置

**職責:**
- 從環境變數讀取配置
- 提供全域配置物件
- 管理資料庫連接參數
- JWT 設定

**配置項:**
```python
class Settings:
    # 資料庫
    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_PASS: str
    DB_NAME: str
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
```

#### 3. `app/database.py` - 資料庫層

**職責:**
- 管理 MySQL 連接池
- 提供統一的查詢介面
- 處理連接重試機制
- 事務管理

**核心方法:**
```python
class Database:
    def connect()                # 建立連接
    def check_connection()       # 檢查連接狀態
    def execute_query()          # 執行查詢 (SELECT)
    def execute_update()         # 執行更新 (INSERT/UPDATE/DELETE)
    def execute_one()            # 查詢單筆
    def insert()                 # 插入資料
    def update()                 # 更新資料
    def delete()                 # 刪除資料
    def get_cursor()             # 取得游標 (上下文管理器)
```

**特點:**
- 自動重連機制
- DictCursor (結果為字典)
- 事務自動提交/回滾
- 連接池管理

#### 4. `app/auth.py` - JWT 認證模組

**職責:**
- 產生 JWT Token
- 驗證 Token
- 解析 Token 取得使用者資訊

**核心函數:**
```python
def create_token_for_user(user_row: dict) -> str
    # 根據使用者資料產生 Token
    
def decode_access_token(token: str) -> dict
    # 解析 Token 取得 payload
```

**Token 結構:**
```json
{
  "sub": "username",
  "user_id": 1,
  "role": "admin",
  "exp": 1234567890
}
```

#### 5. `app/dependencies.py` - 依賴注入

**職責:**
- 提供可重用的依賴函數
- 實現認證檢查
- 權限驗證
- 當前使用者資訊取得

**核心依賴:**
```python
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict
    # 取得當前使用者 (驗證 Token)
    
async def get_current_username(current_user: dict = Depends(get_current_user)) -> str
    # 取得當前使用者名稱
    
async def get_current_admin(current_user: dict = Depends(get_current_user)) -> dict
    # 檢查管理員權限
```

**使用範例:**
```python
@router.get("/fixtures")
async def list_fixtures(current_user: dict = Depends(get_current_user)):
    # current_user 自動注入
    pass

@router.post("/users")
async def create_user(admin: dict = Depends(get_current_admin)):
    # 僅管理員可存取
    pass
```

### Pydantic 模型層

**位置:** `backend/app/models/`

**職責:**
- 資料驗證
- 序列化/反序列化
- API 文檔自動生成
- 型別提示

**模型類型:**

1. **Base Models** - 基礎欄位定義
   ```python
   class CustomerBase(BaseModel):
       id: str
       customer_abbr: Optional[str] = None
       contact_person: Optional[str] = None
   ```

2. **Create Models** - 新增資料用
   ```python
   class CustomerCreate(CustomerBase):
       pass  # 繼承 Base，所有欄位必填
   ```

3. **Update Models** - 更新資料用
   ```python
   class CustomerUpdate(BaseModel):
       customer_abbr: Optional[str] = None
       # 所有欄位可選
   ```

4. **Response Models** - API 回應用
   ```python
   class CustomerResponse(CustomerBase):
       created_at: Optional[str] = None
       updated_at: Optional[str] = None
   ```

### Router 路由層

**位置:** `backend/app/routers/`

**職責:**
- 定義 API 端點
- 處理 HTTP 請求
- 呼叫資料庫層
- 返回 JSON 回應

**標準 CRUD 結構:**
```python
router = APIRouter(prefix="/customers", tags=["客戶管理"])

@router.get("")                    # 列表查詢
@router.get("/{id}")               # 單筆查詢
@router.post("")                   # 新增
@router.put("/{id}")               # 更新
@router.delete("/{id}")            # 刪除
```

**特殊端點範例:**
```python
@router.post("/receipts/import")   # 批量匯入
@router.get("/stats/summary")      # 統計摘要
@router.post("/auth/login")        # 登入
```

### Utils 工具層

**位置:** `backend/app/utils/`

#### 1. `password.py` - 密碼處理

```python
def hash_password(password: str) -> str
    # SHA256 加密
    
def verify_password(plain: str, hashed: str) -> bool
    # 驗證密碼
```

#### 2. `serial_tools.py` - 序號工具

```python
def expand_serial_range(start: str, end: str) -> List[str]
    # 展開序號範圍: "001"~"010" → ["001","002",...,"010"]
    
def normalise_serial_list(serials: List[str]) -> List[str]
    # 正規化序號列表 (去重、排序、補零)
```

#### 3. `excel.py` - Excel 處理

```python
def parse_excel_file(file) -> List[Dict]
    # 解析 Excel 檔案
    
def generate_excel_report(data: List[Dict]) -> bytes
    # 生成 Excel 報表
```

#### 4. `validators.py` - 資料驗證

```python
def validate_customer_id(customer_id: str) -> bool
    # 驗證客戶 ID 格式
    
def validate_serial_format(serial: str) -> bool
    # 驗證序號格式
```

---

## 🎨 前端架構

### 層級結構

```
┌─────────────────────────────────────┐
│       UI Layer (index.html)         │  ← 使用者介面
├─────────────────────────────────────┤
│   App Controller Layer (app-*.js)   │  ← 頁面控制邏輯
├─────────────────────────────────────┤
│     API Service Layer (api-*.js)    │  ← HTTP 請求封裝
├─────────────────────────────────────┤
│      Utils Layer (utils/*.js)       │  ← 工具函數與狀態管理
└─────────────────────────────────────┘
```

### 核心模組說明

#### 1. `index.html` - 單一頁面應用 (SPA)

**職責:**
- 定義 HTML 結構
- 引入 CSS 框架 (Tailwind CSS)
- 引入所有 JavaScript 模組
- 初始化應用程式

**頁面結構:**
```html
<body>
  <!-- 登入 Modal -->
  <div id="loginModal"></div>
  
  <!-- 頂部導覽 (含客戶選擇器) -->
  <header>
    <select id="customerSelect"></select>
  </header>
  
  <!-- 主容器 -->
  <main>
    <!-- 功能分頁 -->
    <nav>
      <button data-tab="dashboard">儀表板</button>
      <button data-tab="receipts">收料/退料</button>
      <button data-tab="query">治具查詢</button>
      <!-- ... -->
    </nav>
    
    <!-- 儀表板 -->
    <section id="tab-dashboard"></section>
    
    <!-- 收料/退料 -->
    <section id="tab-receipts"></section>
    
    <!-- 治具查詢 -->
    <section id="tab-query"></section>
    
    <!-- 其他分頁 -->
  </main>
  
  <!-- Toast 通知 -->
  <div id="toast"></div>
  
  <!-- 引入 JavaScript (順序很重要!) -->
  <script src="/web/js/api/api-config.js"></script>
  <script src="/web/js/utils/storage.js"></script>
  <script src="/web/js/utils/utils.js"></script>
  <!-- ... -->
</body>
```

**模組載入順序:**
1. **基礎配置** (api-config.js)
2. **工具函數** (storage.js, utils.js, calculations.js, ui-render.js)
3. **API 服務層** (api-*.js)
4. **應用控制層** (app-*.js)
5. **主控制器** (app-main.js)

#### 2. API 服務層 (`js/api/`)

**職責:**
- 封裝 HTTP 請求
- 自動帶入 JWT Token
- 錯誤處理
- 回應格式化

**核心配置:** `api-config.js`
```javascript
window.API_BASE = '';
const API_PREFIX = '/api/v2';

function getToken() {
  return localStorage.getItem('auth_token');
}

async function api(path, opts = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(opts.headers || {})
  };
  
  const res = await fetch(apiURL(path), {
    ...opts,
    headers
  });
  
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  
  return res.json();
}
```

**API 函數模式:**
```javascript
// api-fixtures.js
async function apiListFixtures(options = {}) {
  const { customer_id, page, pageSize, status } = options;
  
  // 構建查詢參數
  const params = new URLSearchParams();
  params.set('customer_id', customer_id);
  params.set('skip', (page - 1) * pageSize);
  params.set('limit', pageSize);
  if (status) params.set('status', status);
  
  // 呼叫 API
  return api(`/fixtures?${params}`);
}

async function apiCreateFixture(data) {
  return api('/fixtures', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// 匯出到全域
window.apiListFixtures = apiListFixtures;
window.apiCreateFixture = apiCreateFixture;
```

#### 3. 應用控制層 (`js/app/`)

**職責:**
- 處理使用者互動
- 呼叫 API 服務
- 更新 UI
- 狀態管理

**控制器模式:**
```javascript
// app-fixtures.js

// 載入治具列表
async function loadFixtures() {
  try {
    const customerId = CustomerState.getCurrentCustomer();
    if (!customerId) {
      showToast('請先選擇客戶', 'warning');
      return;
    }
    
    const options = {
      customer_id: customerId,
      page: 1,
      pageSize: 10,
      status: document.getElementById('statusFilter').value
    };
    
    const data = await apiListFixtures(options);
    renderFixtureTable(data.fixtures);
    
  } catch (error) {
    console.error('載入治具失敗:', error);
    showToast('載入治具失敗', 'error');
  }
}

// 新增治具
async function createFixture(event) {
  event.preventDefault();
  
  try {
    const formData = {
      id: document.getElementById('fixtureId').value,
      fixture_name: document.getElementById('fixtureName').value,
      // ...
    };
    
    await apiCreateFixture(formData);
    showToast('新增成功', 'success');
    closeFixtureModal();
    await loadFixtures();
    
  } catch (error) {
    showToast('新增失敗', 'error');
  }
}

// 匯出到全域
window.loadFixtures = loadFixtures;
window.createFixture = createFixture;
```

#### 4. 工具層 (`js/utils/`)

##### `storage.js` - 狀態管理

**職責:**
- 管理 LocalStorage
- 客戶狀態管理
- Token 管理

```javascript
/**
 * 客戶狀態管理
 */
const CustomerState = {
  getCurrentCustomer() {
    return localStorage.getItem('current_customer');
  },
  
  setCurrentCustomer(customerId) {
    localStorage.setItem('current_customer', customerId);
    window.dispatchEvent(new CustomEvent('customer-changed', { 
      detail: { customerId } 
    }));
  },
  
  clearCurrentCustomer() {
    localStorage.removeItem('current_customer');
  },
  
  getCachedCustomers() {
    const cached = localStorage.getItem('customers_list');
    return cached ? JSON.parse(cached) : null;
  },
  
  cacheCustomers(customers) {
    localStorage.setItem('customers_list', JSON.stringify(customers));
  }
};

/**
 * Token 管理
 */
const TokenManager = {
  getToken() {
    return localStorage.getItem('auth_token');
  },
  
  setToken(token) {
    localStorage.setItem('auth_token', token);
  },
  
  removeToken() {
    localStorage.removeItem('auth_token');
  }
};

// 匯出到全域
window.CustomerState = CustomerState;
window.TokenManager = TokenManager;
```

##### `utils.js` - 通用工具

```javascript
/**
 * 顯示 Toast 通知
 */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

/**
 * 格式化日期
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('zh-TW');
}

/**
 * 下載 CSV
 */
function downloadCSV(filename, data) {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// 匯出到全域
window.showToast = showToast;
window.formatDate = formatDate;
window.downloadCSV = downloadCSV;
```

##### `ui-render.js` - UI 渲染

```javascript
/**
 * 渲染治具表格
 */
function renderFixtureTable(fixtures) {
  const tbody = document.getElementById('fixtureTableBody');
  tbody.innerHTML = '';
  
  fixtures.forEach(fixture => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${fixture.id}</td>
      <td>${fixture.fixture_name}</td>
      <td>${fixture.status}</td>
      <td>${fixture.self_purchased_qty}</td>
      <td>
        <button onclick="editFixture('${fixture.id}')">編輯</button>
        <button onclick="deleteFixture('${fixture.id}')">刪除</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// 匯出到全域
window.renderFixtureTable = renderFixtureTable;
```

##### `calculations.js` - 計算邏輯

```javascript
/**
 * 計算更換狀態
 */
function calculateReplacementStatus(fixture) {
  const { total_uses, replacement_cycle, cycle_unit } = fixture;
  
  if (!replacement_cycle) return '正常';
  
  if (cycle_unit === 'uses') {
    const percent = (total_uses / replacement_cycle) * 100;
    if (percent >= 100) return '需更換';
    if (percent >= 80) return '即將更換';
    return '正常';
  }
  
  return '正常';
}

/**
 * 計算開站數
 */
function calculateAvailableStations(fixture, requirement) {
  return Math.floor(fixture.available_qty / requirement.required_qty);
}

// 匯出到全域
window.calculateReplacementStatus = calculateReplacementStatus;
window.calculateAvailableStations = calculateAvailableStations;
```

#### 5. 主控制器 (`app-main.js`)

**職責:**
- 初始化應用程式
- 分頁切換
- 客戶選擇器管理
- 時鐘更新
- 全域事件監聽

```javascript
/**
 * 初始化應用程式
 */
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthStatus();        // 檢查登入狀態
  await initCustomerSelector();   // 初始化客戶選擇器
  startClock();                   // 啟動時鐘
  initTabs();                     // 初始化分頁
});

/**
 * 初始化客戶選擇器
 */
async function initCustomerSelector() {
  try {
    const customers = await apiGetCustomers(true);
    const select = document.getElementById('customerSelect');
    
    select.innerHTML = '<option value="">請選擇客戶...</option>';
    
    customers.forEach(customer => {
      const option = document.createElement('option');
      option.value = customer.id;
      option.textContent = customer.customer_abbr || customer.id;
      select.appendChild(option);
    });
    
    // 恢復上次選擇
    const currentCustomer = CustomerState.getCurrentCustomer();
    if (currentCustomer) {
      select.value = currentCustomer;
    }
  } catch (error) {
    showToast('載入客戶列表失敗', 'error');
  }
}

/**
 * 處理客戶切換
 */
async function handleCustomerChange(customerId) {
  if (!customerId) {
    CustomerState.clearCurrentCustomer();
    return;
  }
  
  CustomerState.setCurrentCustomer(customerId);
  
  // 重新載入當前頁面資料
  const activeTab = document.querySelector('.tab-active');
  if (activeTab) {
    await loadTabData(activeTab.dataset.tab);
  }
  
  showToast(`已切換到客戶: ${customerId}`, 'success');
}

/**
 * 初始化分頁系統
 */
function initTabs() {
  const tabs = document.querySelectorAll('button[data-tab]');
  const sections = document.querySelectorAll('[id^="tab-"]');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      
      // 更新按鈕樣式
      tabs.forEach(t => t.classList.remove('tab-active'));
      tab.classList.add('tab-active');
      
      // 顯示對應內容
      sections.forEach(s => {
        s.style.display = s.id === `tab-${target}` ? 'block' : 'none';
      });
      
      // 載入對應資料
      loadTabData(target);
    });
  });
}
```

---

## 🗄 資料庫架構

### 資料表關係圖

```
customers (客戶主檔)
    ├─── fixtures (治具主檔)
    │      ├─── fixture_serials (序號表)
    │      │      └─── deployment_history (部署歷史)
    │      ├─── fixture_deployments (治具部署)
    │      └─── inventory_snapshots (庫存快照)
    │
    ├─── material_transactions (收退料交易)
    │      └─── material_transaction_details (交易明細)
    │
    ├─── machine_models (機種主檔)
    │      └─── model_stations (機種-站點綁定)
    │             └─── fixture_requirements (治具需求)
    │
    ├─── stations (站點主檔)
    │
    ├─── usage_logs (使用記錄)
    │
    └─── replacement_logs (更換記錄)

users (使用者)

owners (負責人 - 可跨客戶)
```

### 核心資料表詳解

#### 1. `customers` - 客戶主檔

**主鍵:** `id VARCHAR(50)` (客戶名稱)

```sql
CREATE TABLE customers (
    id VARCHAR(50) PRIMARY KEY,
    customer_abbr VARCHAR(50),
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**索引:**
- PRIMARY KEY: `id`
- INDEX: `is_active`

#### 2. `fixtures` - 治具主檔

**主鍵:** `id VARCHAR(50)` (治具編號)
**外鍵:** `customer_id` → `customers(id)`

```sql
CREATE TABLE fixtures (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    fixture_name VARCHAR(255) NOT NULL,
    fixture_type VARCHAR(50),
    self_purchased_qty INT DEFAULT 0,
    customer_supplied_qty INT DEFAULT 0,
    available_qty INT DEFAULT 0,
    deployed_qty INT DEFAULT 0,
    maintenance_qty INT DEFAULT 0,
    scrapped_qty INT DEFAULT 0,
    returned_qty INT DEFAULT 0,
    storage_location VARCHAR(100),
    replacement_cycle DECIMAL(10,2),
    cycle_unit ENUM('days', 'uses', 'none') DEFAULT 'uses',
    status ENUM('正常', '返還', '報廢') DEFAULT '正常',
    last_replacement_date DATE,
    owner_id INT,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE SET NULL
);
```

**索引:**
- PRIMARY KEY: `id`
- INDEX: `customer_id`
- INDEX: `customer_id, status`
- INDEX: `fixture_type`
- INDEX: `owner_id`

**數量欄位說明:**
- `self_purchased_qty`: 自購數量 (總計)
- `customer_supplied_qty`: 客供數量 (總計)
- `available_qty`: 可用數量 (由觸發器自動維護)
- `deployed_qty`: 已部署數量 (由觸發器自動維護)
- `maintenance_qty`: 維護中數量 (由觸發器自動維護)
- `scrapped_qty`: 報廢數量 (由觸發器自動維護)
- `returned_qty`: 已返還數量 (由觸發器自動維護)

#### 3. `fixture_serials` - 序號表

**主鍵:** `id INT AUTO_INCREMENT`
**外鍵:** `customer_id`, `fixture_id`, `current_station_id`

```sql
CREATE TABLE fixture_serials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    fixture_id VARCHAR(50) NOT NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    source_type ENUM('self_purchased', 'customer_supplied') NOT NULL,
    status ENUM('available', 'deployed', 'maintenance', 'scrapped', 'returned') DEFAULT 'available',
    current_station_id VARCHAR(50),
    receipt_date DATE,
    last_use_date DATE,
    total_uses INT DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE,
    FOREIGN KEY (current_station_id) REFERENCES stations(id) ON DELETE SET NULL
);
```

**索引:**
- PRIMARY KEY: `id`
- UNIQUE KEY: `serial_number`
- INDEX: `customer_id`
- INDEX: `fixture_id, status`
- INDEX: `current_station_id`

#### 4. `material_transactions` - 收退料交易

**主鍵:** `id INT AUTO_INCREMENT`
**外鍵:** `customer_id`, `fixture_id`, `created_by`

```sql
CREATE TABLE material_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_type ENUM('receipt', 'return', 'adjustment') NOT NULL,
    transaction_date DATE NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    order_no VARCHAR(100),
    fixture_id VARCHAR(50) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    operator VARCHAR(100),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
```

**索引:**
- PRIMARY KEY: `id`
- INDEX: `customer_id`
- INDEX: `fixture_id, transaction_date`
- INDEX: `transaction_type, transaction_date`

#### 5. `material_transaction_details` - 交易明細

**主鍵:** `id INT AUTO_INCREMENT`
**外鍵:** `transaction_id`

```sql
CREATE TABLE material_transaction_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    serial_number VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_transaction_serial (transaction_id, serial_number),
    FOREIGN KEY (transaction_id) REFERENCES material_transactions(id) ON DELETE CASCADE
);
```

### 觸發器

#### 1. 序號狀態更新時自動更新治具統計

```sql
CREATE TRIGGER trg_serial_status_update
AFTER UPDATE ON fixture_serials
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        UPDATE fixtures SET
            available_qty = (SELECT COUNT(*) FROM fixture_serials 
                           WHERE fixture_id = NEW.fixture_id AND status = 'available'),
            deployed_qty = (SELECT COUNT(*) FROM fixture_serials 
                          WHERE fixture_id = NEW.fixture_id AND status = 'deployed'),
            maintenance_qty = (SELECT COUNT(*) FROM fixture_serials 
                             WHERE fixture_id = NEW.fixture_id AND status = 'maintenance'),
            scrapped_qty = (SELECT COUNT(*) FROM fixture_serials 
                          WHERE fixture_id = NEW.fixture_id AND status = 'scrapped'),
            returned_qty = (SELECT COUNT(*) FROM fixture_serials 
                          WHERE fixture_id = NEW.fixture_id AND status = 'returned'),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.fixture_id;
    END IF;
END;
```

#### 2. 記錄部署歷史

```sql
CREATE TRIGGER trg_record_deployment
AFTER UPDATE ON fixture_serials
FOR EACH ROW
BEGIN
    -- 記錄部署動作
    IF OLD.status != 'deployed' AND NEW.status = 'deployed' THEN
        INSERT INTO deployment_history (serial_id, station_id, action, created_at)
        VALUES (NEW.id, NEW.current_station_id, 'deploy', CURRENT_TIMESTAMP);
    END IF;
    
    -- 記錄取消部署動作
    IF OLD.status = 'deployed' AND NEW.status != 'deployed' THEN
        INSERT INTO deployment_history (serial_id, station_id, action, created_at)
        VALUES (NEW.id, OLD.current_station_id, 'undeploy', CURRENT_TIMESTAMP);
    END IF;
END;
```

### 存儲過程

#### 1. `sp_material_receipt` - 收料業務邏輯

```sql
DELIMITER $$
CREATE PROCEDURE sp_material_receipt(
    IN p_customer_id VARCHAR(50),
    IN p_fixture_id VARCHAR(50),
    IN p_transaction_date DATE,
    IN p_order_no VARCHAR(100),
    IN p_source_type ENUM('self_purchased', 'customer_supplied'),
    IN p_serials TEXT,
    IN p_operator VARCHAR(100),
    IN p_note TEXT,
    IN p_user_id INT,
    OUT p_transaction_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    -- 業務邏輯
    -- 1. 檢查客戶和治具是否存在
    -- 2. 建立交易記錄
    -- 3. 批量新增序號
    -- 4. 更新庫存數量
END$$
DELIMITER ;
```

### 視圖

#### `view_fixture_status` - 治具狀態視圖

```sql
CREATE VIEW view_fixture_status AS
SELECT
    f.id AS fixture_id,
    f.customer_id,
    f.fixture_name,
    f.fixture_type,
    f.storage_location,
    f.status,
    f.self_purchased_qty,
    f.customer_supplied_qty,
    f.available_qty,
    f.deployed_qty,
    f.maintenance_qty,
    f.scrapped_qty,
    f.returned_qty,
    (f.self_purchased_qty + f.customer_supplied_qty) AS total_qty,
    f.last_replacement_date,
    f.replacement_cycle,
    f.cycle_unit,
    CASE
        WHEN f.cycle_unit = 'uses' THEN
            CASE
                WHEN (SELECT SUM(total_uses) FROM fixture_serials WHERE fixture_id = f.id) >= f.replacement_cycle 
                THEN '需更換'
                ELSE '正常'
            END
        WHEN f.cycle_unit = 'days' AND f.last_replacement_date IS NOT NULL THEN
            CASE
                WHEN DATEDIFF(CURDATE(), f.last_replacement_date) >= f.replacement_cycle 
                THEN '需更換'
                ELSE '正常'
            END
        ELSE '正常'
    END AS replacement_status,
    o.primary_owner,
    o.secondary_owner,
    f.note
FROM fixtures f
LEFT JOIN owners o ON f.owner_id = o.id;
```

---

## 💾 狀態管理

### 前端狀態存儲

**位置:** `LocalStorage` (瀏覽器本地存儲)

**管理模組:** `web/js/utils/storage.js`

#### 狀態項目

| Key | 類型 | 說明 | 範例 |
|-----|------|------|------|
| `auth_token` | String | JWT Token | `eyJhbGci...` |
| `current_customer` | String | 當前選擇的客戶 ID | `'勤誠'` |
| `customers_list` | JSON Array | 客戶列表緩存 | `[{id:'勤誠',...}]` |
| `user_info` | JSON Object | 使用者資訊 | `{id:1, username:'admin'}` |

#### 狀態生命週期

```
1. 登入成功 
   → 儲存 auth_token
   → 儲存 user_info

2. 選擇客戶
   → 儲存 current_customer
   → 觸發 'customer-changed' 事件
   → 重新載入資料

3. 登出
   → 清除 auth_token
   → 清除 user_info
   → 清除 current_customer
   → 跳轉登入頁
```

#### 狀態同步機制

```javascript
// 監聽客戶切換事件
window.addEventListener('customer-changed', async (event) => {
  const { customerId } = event.detail;
  console.log('客戶已切換:', customerId);
  
  // 重新載入所有資料
  await reloadAllData();
});

// 監聽 LocalStorage 變化 (跨分頁同步)
window.addEventListener('storage', (event) => {
  if (event.key === 'auth_token') {
    // Token 變更,重新檢查登入狀態
    checkAuthStatus();
  }
});
```

### 後端狀態存儲

**位置:** `MySQL Database`

**無狀態設計:**
- 後端 API 不維護 Session
- 每次請求透過 JWT Token 識別使用者
- 所有狀態存儲於資料庫

**臨時狀態:**
- 上傳檔案暫存於 `backend/uploads/`
- 使用完畢後自動清理

---

## 🔗 服務連接

### 連接流程圖

```
Browser
   │
   ├─── HTTP Request (with JWT Token)
   │
   ▼
FastAPI Server (main.py)
   │
   ├─── CORS Middleware (處理跨域)
   │
   ├─── Authentication Middleware (驗證 Token)
   │      │
   │      ├─── dependencies.py: get_current_user()
   │      │      │
   │      │      └─── auth.py: decode_access_token()
   │      │             │
   │      │             └─── 解析 JWT Token
   │      │
   │      └─── 驗證通過 → 注入 current_user
   │
   ├─── Router (處理請求)
   │      │
   │      ├─── Pydantic Model (驗證資料)
   │      │
   │      ├─── Business Logic (業務邏輯)
   │      │
   │      └─── Database Layer (資料操作)
   │             │
   │             └─── database.py: execute_query()
   │                    │
   │                    └─── PyMySQL
   │                           │
   │                           ▼
   │                        MySQL Database
   │                           │
   │                           ├─── Execute Query
   │                           ├─── Trigger Execution (如有)
   │                           └─── Return Results
   │
   └─── JSON Response
          │
          ▼
      Browser
```

### 認證流程

```
1. 使用者登入
   User → POST /api/v2/auth/login
   ↓
   routers/auth.py: login()
   ↓
   檢查帳號密碼
   ↓
   auth.py: create_token_for_user()
   ↓
   回傳 JWT Token + 使用者資訊

2. 後續請求
   User → GET /api/v2/fixtures?customer_id=xxx
   Header: Authorization: Bearer <token>
   ↓
   dependencies.py: get_current_user()
   ↓
   auth.py: decode_access_token()
   ↓
   驗證 Token 有效性
   ↓
   取得使用者資訊
   ↓
   routers/fixtures.py: list_fixtures()
   ↓
   執行業務邏輯
   ↓
   回傳結果
```

### 資料查詢流程

```
1. 前端發起查詢
   app-fixtures.js: loadFixtures()
   ↓
   CustomerState.getCurrentCustomer()  // 取得當前客戶
   ↓
   api-fixtures.js: apiListFixtures({customer_id, ...})
   ↓
   fetch('/api/v2/fixtures?customer_id=xxx', {
     headers: { Authorization: 'Bearer <token>' }
   })

2. 後端處理查詢
   routers/fixtures.py: list_fixtures()
   ↓
   驗證 customer_id 必填
   ↓
   database.py: execute_query(
     "SELECT * FROM fixtures WHERE customer_id = %s",
     (customer_id,)
   )
   ↓
   PyMySQL → MySQL
   ↓
   回傳結果 (List[Dict])

3. 前端渲染
   api-fixtures.js 回傳 JSON
   ↓
   app-fixtures.js: renderFixtureTable(data)
   ↓
   ui-render.js: 生成 HTML
   ↓
   更新 DOM
```

### 批量操作流程 (收料範例)

```
1. Excel 上傳
   User 選擇檔案
   ↓
   app-receipts.js: handleExcelImport()
   ↓
   XLSX.js 解析 Excel
   ↓
   轉換為 JSON 格式
   [{fixture_id, serial_start, serial_end, ...}, ...]
   ↓
   api-receipts.js: apiImportReceipts(rows)

2. 後端處理
   routers/receipts.py: import_receipts()
   ↓
   for row in rows:
     ├─── 驗證客戶和治具
     ├─── serial_tools.expand_serial_range()  // 展開序號
     ├─── 呼叫存儲過程 sp_material_receipt()
     │      ├─── 新增 material_transactions
     │      ├─── 新增 material_transaction_details
     │      ├─── 新增 fixture_serials
     │      └─── 觸發器自動更新 fixtures 數量
     └─── 收集結果
   ↓
   回傳 {success_count, fail_count, skipped_rows}

3. 前端顯示結果
   app-receipts.js: 顯示匯入結果
   ↓
   showToast('成功匯入 50 筆')
   ↓
   重新載入收料列表
```

### 客戶切換流程

```
1. 使用者切換客戶
   User 選擇客戶下拉選單
   ↓
   app-main.js: handleCustomerChange(customerId)
   ↓
   storage.js: CustomerState.setCurrentCustomer(customerId)
   ↓
   localStorage.setItem('current_customer', customerId)
   ↓
   觸發事件: window.dispatchEvent('customer-changed')

2. 監聽器響應
   app-main.js 監聽 'customer-changed'
   ↓
   取得當前分頁
   ↓
   loadTabData(currentTab)
   ↓
   呼叫對應的 app-*.js 載入函數
   ↓
   所有 API 請求自動帶入新的 customer_id

3. 後端過濾
   所有 API 端點檢查 customer_id
   ↓
   SQL 查詢自動加入 WHERE customer_id = ?
   ↓
   回傳該客戶的資料
```

---

## 📊 資料流向

### 完整資料流向圖

```
┌─────────────────────────────────────────────────────────────┐
│                           使用者                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ 1. 互動 (點擊、輸入)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      前端 UI Layer                           │
│                      (index.html)                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ 2. 事件處理
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  前端 App Controller Layer                   │
│                      (app-*.js)                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - 取得表單資料                                       │   │
│  │  - 取得當前客戶 (CustomerState)                      │   │
│  │  - 呼叫 API 服務層                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ 3. API 請求 (附帶 Token)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  前端 API Service Layer                      │
│                      (api-*.js)                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - 構建 URL 和參數                                   │   │
│  │  - 從 LocalStorage 取得 Token                       │   │
│  │  - fetch() HTTP 請求                                │   │
│  │  - 處理錯誤                                          │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ 4. HTTP Request (JSON + JWT Token)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   後端 FastAPI Server                        │
│                      (main.py)                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Middleware                                          │   │
│  │  - CORS                                              │   │
│  │  - Authentication (驗證 Token)                       │   │
│  └──────────────┬───────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  │ 5. 路由分發
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      後端 Router Layer                       │
│                      (routers/*.py)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - 接收請求參數                                      │   │
│  │  - Pydantic 模型驗證                                 │   │
│  │  - 執行業務邏輯                                      │   │
│  └──────────────┬───────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  │ 6. 資料操作
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   後端 Database Layer                        │
│                      (database.py)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - 取得資料庫連接                                    │   │
│  │  - 構建 SQL 查詢                                     │   │
│  │  - execute_query() / execute_update()               │   │
│  └──────────────┬───────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  │ 7. SQL 執行 (PyMySQL)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      MySQL Database                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - 執行 SQL                                          │   │
│  │  - 觸發器自動執行 (如有)                             │   │
│  │  - 回傳結果                                          │   │
│  └──────────────┬───────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  │ 8. 回傳資料 (List[Dict])
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   後端 Database Layer                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - 格式化結果                                        │   │
│  │  - 錯誤處理                                          │   │
│  └──────────────┬───────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  │ 9. 回傳業務結果
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      後端 Router Layer                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - Pydantic 模型序列化                               │   │
│  │  - 包裝成 JSON Response                              │   │
│  └──────────────┬───────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  │ 10. HTTP Response (JSON)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  前端 API Service Layer                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - 解析 JSON                                         │   │
│  │  - 錯誤檢查                                          │   │
│  │  - 回傳 JavaScript 物件                              │   │
│  └──────────────┬───────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  │ 11. 資料回傳
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  前端 App Controller Layer                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - 處理回傳資料                                      │   │
│  │  - 呼叫渲染函數                                      │   │
│  │  - 顯示 Toast 通知                                   │   │
│  └──────────────┬───────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  │ 12. UI 更新
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      前端 UI Layer                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  - 渲染 HTML                                         │   │
│  │  - 更新 DOM                                          │   │
│  │  - 顯示結果                                          │   │
│  └──────────────┬───────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  │ 13. 使用者看到結果
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                           使用者                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 部署架構

### 開發環境

```
開發者電腦
├── Python 虛擬環境
│   └── FastAPI 開發伺服器 (uvicorn)
│       └── http://localhost:8000
│
├── MySQL Server (本機)
│   └── localhost:3306
│
└── 瀏覽器
    └── http://localhost:8000/web/index.html
```

**啟動命令:**
```bash
# 啟動 FastAPI
python main.py
# 或
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 啟動 MySQL
mysql.server start  # macOS
service mysql start # Linux
```

### 生產環境 (建議)

```
┌────────────────────────────────────────┐
│         Load Balancer (Nginx)          │
│         https://example.com            │
└────────────┬───────────────────────────┘
             │
             ├─── /api/v2/* → FastAPI Server
             │
             └─── /* → Static Files (Web)
                       │
                       ├─── index.html
                       ├─── js/
                       └─── favicon.ico

┌────────────────────────────────────────┐
│      FastAPI Application Server        │
│      (Gunicorn + Uvicorn Workers)      │
│                                         │
│  Worker 1 (Port 8001)                  │
│  Worker 2 (Port 8002)                  │
│  Worker 3 (Port 8003)                  │
│  Worker 4 (Port 8004)                  │
└────────────┬───────────────────────────┘
             │
             │ PyMySQL Connection Pool
             ▼
┌────────────────────────────────────────┐
│         MySQL Database Server          │
│         (Port 3306)                    │
│                                         │
│  - Master-Slave Replication            │
│  - Daily Backup                        │
│  - Monitoring                          │
└────────────────────────────────────────┘
```

**生產環境配置:**

1. **Nginx 配置** (`/etc/nginx/sites-available/fixture-management`)
```nginx
server {
    listen 80;
    server_name example.com;
    
    # 靜態檔案
    location / {
        root /var/www/fixture-management/web;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理
    location /api/v2 {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

2. **Gunicorn 配置** (`gunicorn.conf.py`)
```python
bind = "127.0.0.1:8000"
workers = 4
worker_class = "uvicorn.workers.UvicornWorker"
accesslog = "/var/log/fixture-management/access.log"
errorlog = "/var/log/fixture-management/error.log"
loglevel = "info"
```

3. **Systemd 服務** (`/etc/systemd/system/fixture-management.service`)
```ini
[Unit]
Description=Fixture Management System
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/fixture-management
Environment="PATH=/var/www/fixture-management/venv/bin"
ExecStart=/var/www/fixture-management/venv/bin/gunicorn -c gunicorn.conf.py main:app

[Install]
WantedBy=multi-user.target
```

### Docker 部署 (可選)

```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY web/ ./web/
COPY main.py config.py ./

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DB_HOST=db
      - DB_USER=root
      - DB_PASS=password
      - DB_NAME=fixture_management
    depends_on:
      - db
    restart: always

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=fixture_management
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/init_database.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"
    restart: always

volumes:
  mysql_data:
```

---

## 📝 總結

### 系統特點

1. **清晰的分層架構**
   - 前端: UI → Controller → API Service → Utils
   - 後端: Router → Business Logic → Database Layer → MySQL

2. **完整的資料隔離**
   - 多客戶支援
   - 每個 API 都有 customer_id 過濾
   - JWT 認證確保安全性

3. **模組化設計**
   - 前後端職責明確
   - 每個模組獨立運作
   - 易於維護和擴展

4. **狀態管理**
   - 前端: LocalStorage
   - 後端: MySQL + 無狀態 API
   - 觸發器自動維護統計數據

5. **服務連接**
   - RESTful API 標準
   - JWT Token 認證
   - JSON 資料格式

### 開發建議

1. **新增功能時:**
   - 後端: 新增 Router → 定義 Pydantic 模型 → 實作業務邏輯
   - 前端: 新增 API 服務 → 新增 App 控制器 → 更新 UI

2. **除錯時:**
   - 後端: 查看 Uvicorn 日誌
   - 前端: 使用瀏覽器開發者工具
   - 資料庫: 檢查 SQL 執行計畫

3. **效能優化:**
   - 加入適當的索引
   - 使用連接池
   - 前端快取客戶列表


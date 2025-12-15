"""
使用記錄資料模型 (v4.0)
Usage Log Data Models

對應資料表:
- usage_logs            (使用明細，含 fixture / serial 雙層級)
- fixture_usage_summary (治具層級統計)
- serial_usage_summary  (序號層級統計)

v4.0 特點:
- 支援 record_level: fixture / serial
- 改用 serial_number (字串) 而非 serial_id
- 保留 use_count (一次紀錄可代表多次使用)
- 支援 fixture-level (datecode) 與 serial-level (batch / individual)
"""

from typing import Optional, List, Union
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


# ============================================================
# ENUM: 紀錄層級
# ============================================================

class RecordLevel(str, Enum):
    FIXTURE = "fixture"  # 以治具為單位 (datecode 模式)
    SERIAL = "serial"    # 以序號為單位 (batch / individual)


class UsageType(str, Enum):
    """前端提交用的類型標記 (方便區分 UI 流程)"""
    FIXTURE = "fixture"   # 治具層級 (不帶 serials)
    SERIAL = "serial"     # 個別序號
    BATCH = "batch"       # 批量序號 (前端展開後仍是 SERIAL 層級)


# ============================================================
# 建立使用記錄 - 通用基底
# ============================================================

class UsageBase(BaseModel):
    """建立使用記錄共用欄位 (不含 serials / type)"""

    customer_id: str = Field(
        ...,
        max_length=50,
        description="客戶 ID"
    )
    fixture_id: str = Field(
        ...,
        max_length=50,
        description="治具 ID"
    )
    station_id: str = Field(
        ...,
        max_length=50,
        description="站點代碼"
    )
    model_id: Optional[str] = Field(
        None,
        max_length=50,
        description="機種 ID (可選)"
    )
    operator: Optional[str] = Field(
        None,
        max_length=100,
        description="操作人員 (預設為登入帳號，可覆蓋)"
    )
    use_count: int = Field(
        default=1,
        ge=1,
        description="使用次數，一筆紀錄代表的使用次數 (>=1)"
    )
    note: Optional[str] = Field(
        None,
        description="備註"
    )


# ============================================================
# 建立使用記錄 - fixture 層級 (datecode 對應)
# ============================================================

class UsageCreateFixture(UsageBase):
    """
    fixture 層級使用記錄:
    - 不帶 serials / serial_number
    - record_level = fixture
    """
    type: UsageType = Field(
        default=UsageType.FIXTURE,
        description="使用記錄類型：fixture-level"
    )


# ============================================================
# 建立使用記錄 - serial 層級 (individual / batch)
# ============================================================

class UsageCreateSerial(UsageBase):
    """
    serial 層級使用記錄:
    - 接受 serials (字串或陣列)，前端可用 individual / batch 模式輸入
    - 後端會展開為多筆 usage_logs
    """
    type: UsageType = Field(
        default=UsageType.SERIAL,
        description="使用記錄類型：serial / batch"
    )
    serials: Union[str, List[str]] = Field(
        ...,
        description="序號清單，逗號分隔字串或字串陣列"
    )


# ============================================================
# 建立使用記錄 - 通用入口 (前端可直接用這個)
# ============================================================

class UsageCreate(BaseModel):
    """
    前端提交使用記錄時可使用此模型：
    - type = fixture → 使用 fixture-level 欄位
    - type = serial / batch → 使用 serial-level + serials
    """
    type: UsageType = Field(
        ...,
        description="使用紀錄類型: fixture / serial / batch"
    )
    fixture_id: str = Field(
        ...,
        max_length=50,
        description="治具 ID"
    )
    station_id: str = Field(
        ...,
        max_length=50,
        description="站點代碼"
    )
    customer_id: Optional[str] = Field(
        None,
        max_length=50,
        description="客戶 ID (若未提供由後端 Query 帶入)"
    )
    model_id: Optional[str] = Field(
        None,
        max_length=50,
        description="機種 ID (可選)"
    )
    operator: Optional[str] = Field(
        None,
        max_length=100,
        description="操作人員 (預設為登入帳號，可覆蓋)"
    )
    use_count: int = Field(
        default=1,
        ge=1,
        description="使用次數 (預設為 1)"
    )
    note: Optional[str] = Field(
        None,
        description="備註"
    )
    # serial / batch 專用
    serials: Optional[Union[str, List[str]]] = Field(
        default=None,
        description="序號清單 (serial / batch 模式使用)"
    )


# ============================================================
# 使用記錄 - 單筆回傳模型 (對應 usage_logs)
# ============================================================

class UsageRecord(BaseModel):
    """對應 usage_logs 單筆資料"""

    id: int = Field(..., description="使用記錄 ID (AUTO_INCREMENT)")
    customer_id: str
    fixture_id: str
    serial_number: Optional[str] = Field(
        None,
        description="序號 (fixture-level 時為 NULL)"
    )
    record_level: RecordLevel
    station_id: Optional[str] = None
    use_count: int = 1
    abnormal_status: Optional[str] = None
    operator: Optional[str] = None
    note: Optional[str] = None
    used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UsageListResponse(BaseModel):
    """列表回傳用，若未做 total，可以只用 List[UsageRecord]"""

    records: List[UsageRecord]


# ============================================================
# 治具使用摘要 - fixture_usage_summary
# ============================================================

class FixtureUsageSummary(BaseModel):
    """對應 fixture_usage_summary 表"""

    fixture_id: str
    customer_id: str
    total_uses: int = Field(
        ...,
        description="總使用次數 (含 fixture + serial)"
    )
    total_serial_uses: int = Field(
        ...,
        description="序號層級使用次數 (serial-level 加總)"
    )
    first_used_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    last_station_id: Optional[str] = None
    last_model_id: Optional[str] = None
    last_operator: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================
# 序號使用摘要 - serial_usage_summary
# ============================================================

class SerialUsageSummary(BaseModel):
    """對應 serial_usage_summary 表"""

    serial_number: str
    fixture_id: str
    customer_id: str
    total_uses: int
    first_used_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    last_station_id: Optional[str] = None
    last_model_id: Optional[str] = None
    last_operator: Optional[str] = None

    class Config:
        from_attributes = True

"""
治具更換記錄資料模型 (v4.0)
Replacement Log Data Models

對應資料表: replacement_logs

v4.0 新增：
- record_level: fixture / serial
- serial_number: 若 record_level = serial 必填
- usage_before: 更換前此治具/序號的使用次數
- usage_after: 更換後（初始化為 0）
"""

from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


# ============================================================
# 基礎欄位 (與資料庫欄位對應)
# ============================================================

class ReplacementBase(BaseModel):
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

    # v4.0 新增：fixture / serial
    record_level: str = Field(
        ...,
        description="更換層級：fixture / serial",
        example="fixture"
    )

    # record_level = serial 時需要
    serial_number: Optional[str] = Field(
        None,
        max_length=100,
        description="序號（record_level = serial 時必填）"
    )

    replacement_date: datetime = Field(
        ...,
        description="更換日期"
    )

    reason: Optional[str] = Field(
        None,
        description="更換原因"
    )

    executor: Optional[str] = Field(
        None,
        max_length=50,
        description="執行人員"
    )

    note: Optional[str] = Field(
        None,
        description="備註"
    )


# ============================================================
# 建立記錄
# ============================================================

class ReplacementCreate(ReplacementBase):
    """
    新增更換記錄
    - SP 自動填入 usage_before / usage_after
    """
    pass


# ============================================================
# 更新記錄 (只能修改說明性欄位)
# ============================================================

class ReplacementUpdate(BaseModel):
    replacement_date: Optional[datetime] = None
    reason: Optional[str] = None
    executor: Optional[str] = None
    note: Optional[str] = None


# ============================================================
# 回傳模型（含 id / usage_before / usage_after）
# ============================================================

class ReplacementResponse(ReplacementBase):
    id: int = Field(..., description="更換記錄 ID")

    # v4.0 新增欄位
    usage_before: Optional[int] = Field(
        None, description="更換前使用次數"
    )
    usage_after: Optional[int] = Field(
        None, description="更換後使用次數（通常為 0）"
    )

    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
# 進階回傳模型（JOIN fixture 取得治具名稱）
# ============================================================

class ReplacementWithDetails(ReplacementResponse):
    fixture_name: Optional[str] = Field(
        None,
        description="治具名稱 (JOIN fixtures 後取得)"
    )

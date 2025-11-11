"""
治具資料模型
Fixture Data Models

提供治具相關的 Pydantic 模型，用於 API 請求/回應的資料驗證
"""

from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, Field, validator
from enum import Enum


class CycleUnit(str, Enum):
    """週期單位列舉"""
    DAYS = "days"      # 天數
    USES = "uses"      # 使用次數
    NONE = "none"      # 無週期


class FixtureStatus(str, Enum):
    """治具狀態列舉"""
    NORMAL = "正常"
    RETURNED = "返還"
    SCRAPPED = "報廢"


class FixtureBase(BaseModel):
    """治具基礎模型"""
    fixture_id: str = Field(
        ...,
        max_length=50,
        description="治具編號 (主鍵)",
        example="L-00017"
    )
    fixture_name: str = Field(
        ...,
        max_length=255,
        description="治具名稱",
        example="主板測試治具 A"
    )
    fixture_type: Optional[str] = Field(
        None,
        max_length=50,
        description="治具類型",
        example="測試治具"
    )
    serial_number: Optional[str] = Field(
        None,
        max_length=100,
        description="序號 (唯一值)",
        example="SN20251107001"
    )
    self_purchased_qty: int = Field(
        default=0,
        ge=0,
        description="自購數量",
        example=100
    )
    customer_supplied_qty: int = Field(
        default=0,
        ge=0,
        description="客供數量",
        example=50
    )
    storage_location: Optional[str] = Field(
        None,
        max_length=100,
        description="儲存位置",
        example="倉庫 A-01"
    )
    replacement_cycle: Optional[float] = Field(
        None,
        ge=0,
        description="更換週期 (天數或次數)",
        example=30.0
    )
    cycle_unit: CycleUnit = Field(
        default=CycleUnit.USES,
        description="週期單位 (days/uses/none)"
    )
    status: FixtureStatus = Field(
        default=FixtureStatus.NORMAL,
        description="治具狀態 (正常/返還/報廢)"
    )
    owner_id: Optional[int] = Field(
        None,
        description="負責人 ID",
        example=1
    )
    note: Optional[str] = Field(
        None,
        description="備註",
        example="定期保養中"
    )

    @validator('fixture_id')
    def validate_fixture_id(cls, v):
        """驗證治具編號格式"""
        if not v.strip():
            raise ValueError('治具編號不能為空白')
        v = v.strip().upper()  # 統一轉大寫
        # 治具編號允許英數字、連字號、底線
        allowed_chars = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_')
        if not all(c in allowed_chars for c in v):
            raise ValueError('治具編號只能包含英數字、連字號或底線')
        return v

    @validator('fixture_name')
    def validate_fixture_name(cls, v):
        """驗證治具名稱"""
        if not v.strip():
            raise ValueError('治具名稱不能為空白')
        return v.strip()

    @validator('serial_number')
    def validate_serial_number(cls, v):
        """驗證序號"""
        if v is not None:
            return v.strip() if v.strip() else None
        return v

    @validator('self_purchased_qty', 'customer_supplied_qty')
    def validate_quantities(cls, v):
        """驗證數量"""
        if v < 0:
            raise ValueError('數量不能為負數')
        return v

    @validator('replacement_cycle')
    def validate_cycle(cls, v, values):
        """驗證更換週期"""
        if v is not None:
            if v < 0:
                raise ValueError('更換週期不能為負數')
            # 如果週期單位是 none，則週期應該為 None 或 0
            if 'cycle_unit' in values and values['cycle_unit'] == CycleUnit.NONE:
                if v > 0:
                    raise ValueError('週期單位為 none 時，更換週期應為 0')
        return v


class FixtureCreate(FixtureBase):
    """建立治具模型"""
    pass


class FixtureUpdate(BaseModel):
    """更新治具模型 (所有欄位都是可選的)"""
    fixture_name: Optional[str] = Field(
        None,
        max_length=255,
        description="治具名稱"
    )
    fixture_type: Optional[str] = Field(
        None,
        max_length=50,
        description="治具類型"
    )
    serial_number: Optional[str] = Field(
        None,
        max_length=100,
        description="序號"
    )
    self_purchased_qty: Optional[int] = Field(
        None,
        ge=0,
        description="自購數量"
    )
    customer_supplied_qty: Optional[int] = Field(
        None,
        ge=0,
        description="客供數量"
    )
    storage_location: Optional[str] = Field(
        None,
        max_length=100,
        description="儲存位置"
    )
    replacement_cycle: Optional[float] = Field(
        None,
        ge=0,
        description="更換週期"
    )
    cycle_unit: Optional[CycleUnit] = Field(
        None,
        description="週期單位"
    )
    status: Optional[FixtureStatus] = Field(
        None,
        description="治具狀態"
    )
    owner_id: Optional[int] = Field(
        None,
        description="負責人 ID"
    )
    note: Optional[str] = Field(
        None,
        description="備註"
    )

    @validator('fixture_name')
    def validate_fixture_name(cls, v):
        """驗證治具名稱"""
        if v is not None and not v.strip():
            raise ValueError('治具名稱不能為空白')
        return v.strip() if v else v

    @validator('serial_number')
    def validate_serial_number(cls, v):
        """驗證序號"""
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class FixtureResponse(FixtureBase):
    """治具回應模型 (API 回傳用)"""
    total_qty: int = Field(
        ...,
        description="總數量 (自購 + 客供)",
        example=150
    )
    last_replacement_date: Optional[date] = Field(
        None,
        description="最近更換日期"
    )
    last_notification_time: Optional[datetime] = Field(
        None,
        description="最後通知時間"
    )
    created_at: Optional[datetime] = Field(
        None,
        description="建立時間"
    )
    updated_at: Optional[datetime] = Field(
        None,
        description="更新時間"
    )

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "fixture_id": "L-00017",
                "fixture_name": "主板測試治具 A",
                "fixture_type": "測試治具",
                "serial_number": "SN20251107001",
                "self_purchased_qty": 100,
                "customer_supplied_qty": 50,
                "total_qty": 150,
                "storage_location": "倉庫 A-01",
                "replacement_cycle": 30.0,
                "cycle_unit": "uses",
                "status": "正常",
                "owner_id": 1,
                "note": "定期保養中",
                "last_replacement_date": "2025-10-01",
                "last_notification_time": "2025-11-07T10:30:00",
                "created_at": "2025-01-01T09:00:00",
                "updated_at": "2025-11-07T10:30:00"
            }
        }


class FixtureWithOwner(FixtureResponse):
    """治具模型 (含負責人資訊)"""
    owner_name: Optional[str] = Field(
        None,
        description="負責人姓名"
    )
    owner_email: Optional[str] = Field(
        None,
        description="負責人 Email"
    )

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "fixture_id": "L-00017",
                "fixture_name": "主板測試治具 A",
                "fixture_type": "測試治具",
                "serial_number": "SN20251107001",
                "self_purchased_qty": 100,
                "customer_supplied_qty": 50,
                "total_qty": 150,
                "storage_location": "倉庫 A-01",
                "replacement_cycle": 30.0,
                "cycle_unit": "uses",
                "status": "正常",
                "owner_id": 1,
                "owner_name": "張三",
                "owner_email": "zhang@example.com",
                "note": "定期保養中",
                "last_replacement_date": "2025-10-01",
                "created_at": "2025-01-01T09:00:00",
                "updated_at": "2025-11-07T10:30:00"
            }
        }


class FixtureListResponse(BaseModel):
    """治具列表回應模型"""
    total: int = Field(..., description="總筆數")
    fixtures: List[FixtureWithOwner] = Field(..., description="治具列表")

    class Config:
        json_schema_extra = {
            "example": {
                "total": 2,
                "fixtures": [
                    {
                        "fixture_id": "L-00017",
                        "fixture_name": "主板測試治具 A",
                        "fixture_type": "測試治具",
                        "serial_number": "SN001",
                        "self_purchased_qty": 100,
                        "customer_supplied_qty": 50,
                        "total_qty": 150,
                        "storage_location": "倉庫 A-01",
                        "replacement_cycle": 30.0,
                        "cycle_unit": "uses",
                        "status": "正常",
                        "owner_id": 1,
                        "owner_name": "張三",
                        "owner_email": "zhang@example.com",
                        "note": "定期保養",
                        "created_at": "2025-01-01T09:00:00"
                    }
                ]
            }
        }


class FixtureSimple(BaseModel):
    """簡化的治具模型 (用於下拉選單等)"""
    fixture_id: str = Field(..., description="治具編號")
    fixture_name: str = Field(..., description="治具名稱")
    total_qty: int = Field(..., description="總數量")
    status: FixtureStatus = Field(..., description="治具狀態")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "fixture_id": "L-00017",
                "fixture_name": "主板測試治具 A",
                "total_qty": 150,
                "status": "正常"
            }
        }


class FixtureStatus_View(BaseModel):
    """治具狀態視圖模型 (對應 view_fixture_status)"""
    fixture_id: str = Field(..., description="治具編號")
    fixture_name: str = Field(..., description="治具名稱")
    serial_number: Optional[str] = Field(None, description="序號")
    storage_location: Optional[str] = Field(None, description="儲存位置")
    status: str = Field(..., description="治具狀態")
    deployed_stations: Optional[str] = Field(
        None,
        description="部署站點列表 (逗號分隔)"
    )
    total_uses: int = Field(
        default=0,
        description="累計使用次數"
    )
    last_replacement_date: Optional[date] = Field(
        None,
        description="最近更換日期"
    )
    last_notification_time: Optional[datetime] = Field(
        None,
        description="最後通知時間"
    )
    replacement_cycle: Optional[float] = Field(
        None,
        description="更換週期"
    )
    cycle_unit: Optional[str] = Field(
        None,
        description="週期單位"
    )
    replacement_status: str = Field(
        ...,
        description="更換狀態 (需更換/正常)"
    )
    owner: Optional[str] = Field(
        None,
        description="負責人"
    )
    note: Optional[str] = Field(
        None,
        description="備註"
    )

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "fixture_id": "L-00017",
                "fixture_name": "主板測試治具 A",
                "serial_number": "SN001",
                "storage_location": "倉庫 A-01",
                "status": "正常",
                "deployed_stations": "T1_MP,T2_STD,T3_MAC",
                "total_uses": 25,
                "last_replacement_date": "2025-10-01",
                "last_notification_time": "2025-11-07T10:30:00",
                "replacement_cycle": 30.0,
                "cycle_unit": "uses",
                "replacement_status": "正常",
                "owner": "張三",
                "note": "定期保養中"
            }
        }


class FixtureDeployment(BaseModel):
    """治具部署模型"""
    id: Optional[int] = Field(None, description="部署 ID")
    fixture_id: str = Field(..., description="治具編號")
    station_id: int = Field(..., description="站點 ID")
    deployed_qty: int = Field(
        default=0,
        ge=0,
        description="部署數量"
    )

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "fixture_id": "L-00017",
                "station_id": 1,
                "deployed_qty": 8
            }
        }


class FixtureRequirement(BaseModel):
    """治具需求模型"""
    id: Optional[int] = Field(None, description="需求 ID")
    model_id: str = Field(..., description="機種編號")
    station_id: int = Field(..., description="站點 ID")
    fixture_id: str = Field(..., description="治具編號")
    required_qty: int = Field(
        default=1,
        ge=1,
        description="需求數量"
    )

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "model_id": "EDS-518A-SS-SC-80",
                "station_id": 1,
                "fixture_id": "L-00017",
                "required_qty": 8
            }
        }


class FixtureStatistics(BaseModel):
    """治具統計資訊"""
    total_fixtures: int = Field(..., description="治具總數")
    active_fixtures: int = Field(..., description="正常狀態治具數")
    returned_fixtures: int = Field(..., description="返還狀態治具數")
    scrapped_fixtures: int = Field(..., description="報廢狀態治具數")
    need_replacement: int = Field(..., description="需要更換的治具數")
    total_quantity: int = Field(..., description="治具總數量")
    self_purchased_total: int = Field(..., description="自購總數量")
    customer_supplied_total: int = Field(..., description="客供總數量")

    class Config:
        json_schema_extra = {
            "example": {
                "total_fixtures": 100,
                "active_fixtures": 85,
                "returned_fixtures": 10,
                "scrapped_fixtures": 5,
                "need_replacement": 8,
                "total_quantity": 5000,
                "self_purchased_total": 3000,
                "customer_supplied_total": 2000
            }
        }
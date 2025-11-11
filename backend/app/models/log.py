"""
記錄資料模型
Log Data Models

提供使用記錄和更換記錄相關的 Pydantic 模型，用於 API 請求/回應的資料驗證
"""

from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, Field, validator


# ==================== 使用記錄模型 ====================

class UsageLogBase(BaseModel):
    """使用記錄基礎模型"""
    fixture_id: str = Field(
        ...,
        max_length=50,
        description="治具編號",
        example="L-00017"
    )
    station_id: Optional[int] = Field(
        None,
        description="站點 ID",
        example=1
    )
    use_count: int = Field(
        default=1,
        ge=1,
        description="使用次數",
        example=1
    )
    abnormal_status: Optional[str] = Field(
        None,
        max_length=255,
        description="異常狀態",
        example="治具破損"
    )
    operator: Optional[str] = Field(
        None,
        max_length=100,
        description="操作人員 (預設為登入用戶)",
        example="user001"
    )
    note: Optional[str] = Field(
        None,
        description="備註",
        example="正常使用"
    )

    @validator('fixture_id')
    def validate_fixture_id(cls, v):
        """驗證治具編號"""
        if not v.strip():
            raise ValueError('治具編號不能為空白')
        return v.strip().upper()

    @validator('use_count')
    def validate_use_count(cls, v):
        """驗證使用次數"""
        if v < 1:
            raise ValueError('使用次數至少為 1')
        return v

    @validator('abnormal_status', 'note')
    def validate_text_fields(cls, v):
        """驗證文字欄位"""
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class UsageLogCreate(UsageLogBase):
    """建立使用記錄模型"""
    pass


class UsageLogBatchCreate(BaseModel):
    """批量建立使用記錄模型"""
    fixture_id: str = Field(
        ...,
        max_length=50,
        description="治具編號"
    )
    station_id: Optional[int] = Field(
        None,
        description="站點 ID"
    )
    use_count: int = Field(
        default=1,
        ge=1,
        description="每次使用次數"
    )
    record_count: int = Field(
        ...,
        ge=1,
        le=1000,
        description="記錄筆數 (1-1000)",
        example=10
    )
    abnormal_status: Optional[str] = Field(
        None,
        max_length=255,
        description="異常狀態"
    )
    operator: Optional[str] = Field(
        None,
        max_length=100,
        description="操作人員"
    )
    note: Optional[str] = Field(
        None,
        description="備註"
    )

    @validator('fixture_id')
    def validate_fixture_id(cls, v):
        """驗證治具編號"""
        if not v.strip():
            raise ValueError('治具編號不能為空白')
        return v.strip().upper()

    @validator('record_count')
    def validate_record_count(cls, v):
        """驗證記錄筆數"""
        if v < 1:
            raise ValueError('記錄筆數至少為 1')
        if v > 1000:
            raise ValueError('記錄筆數最多為 1000')
        return v


class UsageLogResponse(BaseModel):
    """使用記錄回應模型"""
    log_id: int = Field(..., description="記錄 ID")
    fixture_id: str = Field(..., description="治具編號")
    station_id: Optional[int] = Field(None, description="站點 ID")
    station_code: Optional[str] = Field(None, description="站點代碼")
    station_name: Optional[str] = Field(None, description="站點名稱")
    use_count: int = Field(..., description="使用次數")
    abnormal_status: Optional[str] = Field(None, description="異常狀態")
    operator: Optional[str] = Field(None, description="操作人員")
    note: Optional[str] = Field(None, description="備註")
    used_at: Optional[datetime] = Field(None, description="使用時間")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "log_id": 1,
                "fixture_id": "L-00017",
                "station_id": 1,
                "station_code": "T1_MP",
                "station_name": "T1 主板測試站",
                "use_count": 1,
                "abnormal_status": None,
                "operator": "user001",
                "note": "正常使用",
                "used_at": "2025-11-07T10:30:00"
            }
        }


class UsageLogListResponse(BaseModel):
    """使用記錄列表回應模型"""
    total: int = Field(..., description="總筆數")
    logs: List[UsageLogResponse] = Field(..., description="使用記錄列表")

    class Config:
        json_schema_extra = {
            "example": {
                "total": 2,
                "logs": [
                    {
                        "log_id": 1,
                        "fixture_id": "L-00017",
                        "station_id": 1,
                        "station_code": "T1_MP",
                        "station_name": "T1 主板測試站",
                        "use_count": 1,
                        "abnormal_status": None,
                        "operator": "user001",
                        "note": "正常使用",
                        "used_at": "2025-11-07T10:30:00"
                    },
                    {
                        "log_id": 2,
                        "fixture_id": "L-33-14",
                        "station_id": 2,
                        "station_code": "T2_STD",
                        "station_name": "T2 標準溫度測試站",
                        "use_count": 1,
                        "abnormal_status": "治具破損",
                        "operator": "user002",
                        "note": "需要維修",
                        "used_at": "2025-11-07T11:00:00"
                    }
                ]
            }
        }


class UsageLogSummary(BaseModel):
    """使用記錄摘要"""
    fixture_id: str = Field(..., description="治具編號")
    fixture_name: str = Field(..., description="治具名稱")
    total_uses: int = Field(..., description="總使用次數")
    normal_uses: int = Field(..., description="正常使用次數")
    abnormal_uses: int = Field(..., description="異常使用次數")
    last_used_at: Optional[datetime] = Field(None, description="最後使用時間")

    class Config:
        json_schema_extra = {
            "example": {
                "fixture_id": "L-00017",
                "fixture_name": "主板測試治具 A",
                "total_uses": 150,
                "normal_uses": 145,
                "abnormal_uses": 5,
                "last_used_at": "2025-11-07T10:30:00"
            }
        }


# ==================== 更換記錄模型 ====================

class ReplacementLogBase(BaseModel):
    """更換記錄基礎模型"""
    fixture_id: str = Field(
        ...,
        max_length=50,
        description="治具編號",
        example="L-00017"
    )
    replacement_date: date = Field(
        ...,
        description="更換日期",
        example="2025-11-07"
    )
    reason: Optional[str] = Field(
        None,
        description="更換原因",
        example="達到使用壽命"
    )
    executor: Optional[str] = Field(
        None,
        max_length=100,
        description="執行人員 (預設為登入用戶)",
        example="user001"
    )
    note: Optional[str] = Field(
        None,
        description="備註",
        example="已更換新治具"
    )

    @validator('fixture_id')
    def validate_fixture_id(cls, v):
        """驗證治具編號"""
        if not v.strip():
            raise ValueError('治具編號不能為空白')
        return v.strip().upper()

    @validator('replacement_date')
    def validate_replacement_date(cls, v):
        """驗證更換日期"""
        # 不能是未來的日期
        if v > date.today():
            raise ValueError('更換日期不能是未來的日期')
        return v

    @validator('reason', 'note')
    def validate_text_fields(cls, v):
        """驗證文字欄位"""
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class ReplacementLogCreate(ReplacementLogBase):
    """建立更換記錄模型"""
    pass


class ReplacementLogUpdate(BaseModel):
    """更新更換記錄模型"""
    replacement_date: Optional[date] = Field(
        None,
        description="更換日期"
    )
    reason: Optional[str] = Field(
        None,
        description="更換原因"
    )
    executor: Optional[str] = Field(
        None,
        max_length=100,
        description="執行人員"
    )
    note: Optional[str] = Field(
        None,
        description="備註"
    )

    @validator('replacement_date')
    def validate_replacement_date(cls, v):
        """驗證更換日期"""
        if v is not None and v > date.today():
            raise ValueError('更換日期不能是未來的日期')
        return v

    @validator('reason', 'note')
    def validate_text_fields(cls, v):
        """驗證文字欄位"""
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class ReplacementLogResponse(BaseModel):
    """更換記錄回應模型"""
    replacement_id: int = Field(..., description="更換記錄 ID")
    fixture_id: str = Field(..., description="治具編號")
    fixture_name: Optional[str] = Field(None, description="治具名稱")
    replacement_date: date = Field(..., description="更換日期")
    reason: Optional[str] = Field(None, description="更換原因")
    executor: Optional[str] = Field(None, description="執行人員")
    note: Optional[str] = Field(None, description="備註")
    created_at: Optional[datetime] = Field(None, description="記錄建立時間")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "replacement_id": 1,
                "fixture_id": "L-00017",
                "fixture_name": "主板測試治具 A",
                "replacement_date": "2025-11-07",
                "reason": "達到使用壽命",
                "executor": "user001",
                "note": "已更換新治具",
                "created_at": "2025-11-07T10:30:00"
            }
        }


class ReplacementLogListResponse(BaseModel):
    """更換記錄列表回應模型"""
    total: int = Field(..., description="總筆數")
    logs: List[ReplacementLogResponse] = Field(..., description="更換記錄列表")

    class Config:
        json_schema_extra = {
            "example": {
                "total": 2,
                "logs": [
                    {
                        "replacement_id": 1,
                        "fixture_id": "L-00017",
                        "fixture_name": "主板測試治具 A",
                        "replacement_date": "2025-11-07",
                        "reason": "達到使用壽命",
                        "executor": "user001",
                        "note": "已更換新治具",
                        "created_at": "2025-11-07T10:30:00"
                    },
                    {
                        "replacement_id": 2,
                        "fixture_id": "L-33-14",
                        "fixture_name": "測試治具 B",
                        "replacement_date": "2025-11-06",
                        "reason": "治具損壞",
                        "executor": "user002",
                        "note": "緊急更換",
                        "created_at": "2025-11-06T15:00:00"
                    }
                ]
            }
        }


class ReplacementLogSummary(BaseModel):
    """更換記錄摘要"""
    fixture_id: str = Field(..., description="治具編號")
    fixture_name: str = Field(..., description="治具名稱")
    replacement_count: int = Field(..., description="更換次數")
    last_replacement_date: Optional[date] = Field(
        None,
        description="最後更換日期"
    )
    days_since_last_replacement: Optional[int] = Field(
        None,
        description="距上次更換天數"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "fixture_id": "L-00017",
                "fixture_name": "主板測試治具 A",
                "replacement_count": 5,
                "last_replacement_date": "2025-10-01",
                "days_since_last_replacement": 37
            }
        }


# ==================== 統計模型 ====================

class FixtureUsageStatistics(BaseModel):
    """治具使用統計"""
    fixture_id: str = Field(..., description="治具編號")
    fixture_name: str = Field(..., description="治具名稱")
    total_uses: int = Field(..., description="總使用次數")
    replacement_count: int = Field(..., description="更換次數")
    average_uses_per_replacement: Optional[float] = Field(
        None,
        description="平均每次更換的使用次數"
    )
    last_used_at: Optional[datetime] = Field(None, description="最後使用時間")
    last_replacement_date: Optional[date] = Field(
        None,
        description="最後更換日期"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "fixture_id": "L-00017",
                "fixture_name": "主板測試治具 A",
                "total_uses": 150,
                "replacement_count": 5,
                "average_uses_per_replacement": 30.0,
                "last_used_at": "2025-11-07T10:30:00",
                "last_replacement_date": "2025-10-01"
            }
        }


class StationUsageStatistics(BaseModel):
    """站點使用統計"""
    station_id: int = Field(..., description="站點 ID")
    station_code: str = Field(..., description="站點代碼")
    station_name: Optional[str] = Field(None, description="站點名稱")
    total_uses: int = Field(..., description="總使用次數")
    fixture_count: int = Field(..., description="使用的治具種類數")
    abnormal_count: int = Field(..., description="異常記錄數")

    class Config:
        json_schema_extra = {
            "example": {
                "station_id": 1,
                "station_code": "T1_MP",
                "station_name": "T1 主板測試站",
                "total_uses": 500,
                "fixture_count": 15,
                "abnormal_count": 5
            }
        }


class LogStatisticsSummary(BaseModel):
    """記錄統計摘要"""
    total_usage_logs: int = Field(..., description="總使用記錄數")
    total_replacement_logs: int = Field(..., description="總更換記錄數")
    total_uses: int = Field(..., description="總使用次數")
    abnormal_logs: int = Field(..., description="異常記錄數")
    fixtures_need_replacement: int = Field(
        ...,
        description="需要更換的治具數"
    )
    today_usage_logs: int = Field(..., description="今日使用記錄數")
    today_replacement_logs: int = Field(..., description="今日更換記錄數")

    class Config:
        json_schema_extra = {
            "example": {
                "total_usage_logs": 5000,
                "total_replacement_logs": 250,
                "total_uses": 5000,
                "abnormal_logs": 50,
                "fixtures_need_replacement": 8,
                "today_usage_logs": 120,
                "today_replacement_logs": 3
            }
        }


class DateRangeQuery(BaseModel):
    """日期範圍查詢模型"""
    start_date: Optional[date] = Field(
        None,
        description="開始日期",
        example="2025-01-01"
    )
    end_date: Optional[date] = Field(
        None,
        description="結束日期",
        example="2025-12-31"
    )

    @validator('end_date')
    def validate_date_range(cls, v, values):
        """驗證日期範圍"""
        if v is not None and 'start_date' in values and values['start_date'] is not None:
            if v < values['start_date']:
                raise ValueError('結束日期不能早於開始日期')
        return v
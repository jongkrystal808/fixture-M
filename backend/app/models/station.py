"""
站點資料模型
Station Data Models

提供站點相關的 Pydantic 模型，用於 API 請求/回應的資料驗證
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, validator


class StationBase(BaseModel):
    """站點基礎模型"""
    station_code: str = Field(
        ...,
        max_length=50,
        description="站點代碼",
        example="T1_MP"
    )
    station_name: Optional[str] = Field(
        None,
        max_length=100,
        description="站點名稱",
        example="T1 主板測試站"
    )
    note: Optional[str] = Field(
        None,
        description="備註",
        example="主板測試第一站"
    )

    @validator('station_code')
    def validate_station_code(cls, v):
        """驗證站點代碼格式"""
        if not v.strip():
            raise ValueError('站點代碼不能為空白')
        # 站點代碼只允許英數字、底線、連字號、括號
        v = v.strip()
        allowed_chars = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-()（）')
        if not all(c.upper() in allowed_chars for c in v):
            raise ValueError('站點代碼只能包含英數字、底線、連字號或括號')
        return v.upper()  # 統一轉大寫

    @validator('station_name', 'note')
    def validate_text_fields(cls, v):
        """驗證文字欄位"""
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class StationCreate(StationBase):
    """建立站點模型"""
    pass


class StationUpdate(BaseModel):
    """更新站點模型 (所有欄位都是可選的)"""
    station_code: Optional[str] = Field(
        None,
        max_length=50,
        description="站點代碼"
    )
    station_name: Optional[str] = Field(
        None,
        max_length=100,
        description="站點名稱"
    )
    note: Optional[str] = Field(
        None,
        description="備註"
    )

    @validator('station_code')
    def validate_station_code(cls, v):
        """驗證站點代碼格式"""
        if v is not None:
            if not v.strip():
                raise ValueError('站點代碼不能為空白')
            v = v.strip()
            allowed_chars = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-()（）')
            if not all(c.upper() in allowed_chars for c in v):
                raise ValueError('站點代碼只能包含英數字、底線、連字號或括號')
            return v.upper()
        return v

    @validator('station_name', 'note')
    def validate_text_fields(cls, v):
        """驗證文字欄位"""
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class StationResponse(StationBase):
    """站點回應模型 (API 回傳用)"""
    station_id: int = Field(..., description="站點 ID")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "station_id": 1,
                "station_code": "T1_MP",
                "station_name": "T1 主板測試站",
                "note": "主板測試第一站"
            }
        }


class StationListResponse(BaseModel):
    """站點列表回應模型"""
    total: int = Field(..., description="總筆數")
    stations: list[StationResponse] = Field(..., description="站點列表")

    class Config:
        json_schema_extra = {
            "example": {
                "total": 6,
                "stations": [
                    {
                        "station_id": 1,
                        "station_code": "T1_MP",
                        "station_name": "T1 主板測試站",
                        "note": "主板測試"
                    },
                    {
                        "station_id": 2,
                        "station_code": "T2_STD",
                        "station_name": "T2 標準溫度測試站",
                        "note": "標準溫度測試"
                    },
                    {
                        "station_id": 3,
                        "station_code": "T2_WIDE",
                        "station_name": "T2 寬溫測試站",
                        "note": "寬溫測試"
                    },
                    {
                        "station_id": 4,
                        "station_code": "T3_MAC",
                        "station_name": "T3 MAC 燒錄站",
                        "note": "MAC 位址燒錄"
                    },
                    {
                        "station_id": 5,
                        "station_code": "T3_ASQC",
                        "station_name": "T3 ASQC 檢驗站",
                        "note": "品質檢驗"
                    },
                    {
                        "station_id": 6,
                        "station_code": "T3_STG",
                        "station_name": "T3 老化測試站",
                        "note": "老化測試"
                    }
                ]
            }
        }


class StationSimple(BaseModel):
    """簡化的站點模型 (用於下拉選單等)"""
    station_id: int = Field(..., description="站點 ID")
    station_code: str = Field(..., description="站點代碼")
    station_name: Optional[str] = Field(None, description="站點名稱")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "station_id": 1,
                "station_code": "T1_MP",
                "station_name": "T1 主板測試站"
            }
        }


class StationWithDeployment(StationResponse):
    """站點模型 (含部署統計資訊)"""
    deployed_fixture_count: int = Field(
        default=0,
        description="部署的治具種類數量"
    )
    total_deployed_qty: int = Field(
        default=0,
        description="部署的治具總數量"
    )

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "station_id": 1,
                "station_code": "T1_MP",
                "station_name": "T1 主板測試站",
                "note": "主板測試",
                "deployed_fixture_count": 15,
                "total_deployed_qty": 120
            }
        }


class StationWithRequirements(StationResponse):
    """站點模型 (含治具需求資訊)"""
    required_fixture_count: int = Field(
        default=0,
        description="需要的治具種類數量"
    )
    model_count: int = Field(
        default=0,
        description="關聯的機種數量"
    )

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "station_id": 1,
                "station_code": "T1_MP",
                "station_name": "T1 主板測試站",
                "note": "主板測試",
                "required_fixture_count": 8,
                "model_count": 12
            }
        }


class StationStatistics(BaseModel):
    """站點統計資訊"""
    station: StationResponse = Field(..., description="站點資訊")
    fixture_types: int = Field(..., description="治具種類數")
    total_fixtures: int = Field(..., description="治具總數")
    active_fixtures: int = Field(..., description="正常治具數")
    models_using: int = Field(..., description="使用此站點的機種數")

    class Config:
        json_schema_extra = {
            "example": {
                "station": {
                    "station_id": 1,
                    "station_code": "T1_MP",
                    "station_name": "T1 主板測試站",
                    "note": "主板測試"
                },
                "fixture_types": 15,
                "total_fixtures": 120,
                "active_fixtures": 115,
                "models_using": 25
            }
        }
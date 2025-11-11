"""
收退料資料模型
Receipt and Return Data Models

提供收料和退料相關的 Pydantic 模型，用於 API 請求/回應的資料驗證
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum


class ReceiptType(str, Enum):
    """收退料類型列舉"""
    BATCH = "batch"  # 批量 (流水號起訖)
    INDIVIDUAL = "individual"  # 少量 (逗號分隔)


class ReceiptBase(BaseModel):
    """收料基礎模型"""
    receipt_type: ReceiptType = Field(
        ...,
        description="收料類型 (batch/individual)"
    )
    vendor: str = Field(
        ...,
        max_length=100,
        description="廠商",
        example="ABC 供應商"
    )
    order_no: str = Field(
        ...,
        max_length=100,
        description="單號",
        example="PO20251107001"
    )
    fixture_code: str = Field(
        ...,
        max_length=50,
        description="治具編號",
        example="L-00017"
    )
    operator: Optional[str] = Field(
        None,
        max_length=100,
        description="收料人員 (預設為登入用戶)",
        example="user001"
    )
    note: Optional[str] = Field(
        None,
        description="備註",
        example="品質良好"
    )

    @validator('vendor', 'order_no', 'fixture_code')
    def validate_required_fields(cls, v):
        """驗證必填欄位"""
        if not v.strip():
            raise ValueError('此欄位不能為空白')
        return v.strip()

    @validator('note')
    def validate_note(cls, v):
        """驗證備註"""
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class ReceiptBatchCreate(ReceiptBase):
    """批量收料模型 (流水號起訖)"""
    receipt_type: ReceiptType = Field(
        default=ReceiptType.BATCH,
        description="收料類型 (固定為 batch)"
    )
    serial_start: str = Field(
        ...,
        max_length=100,
        description="流水號起始",
        example="001"
    )
    serial_end: str = Field(
        ...,
        max_length=100,
        description="流水號結束",
        example="010"
    )

    @validator('serial_start', 'serial_end')
    def validate_serials(cls, v):
        """驗證流水號"""
        if not v.strip():
            raise ValueError('流水號不能為空白')
        return v.strip()

    @validator('serial_end')
    def validate_serial_range(cls, v, values):
        """驗證流水號範圍"""
        if 'serial_start' in values:
            start = values['serial_start']
            end = v
            # 如果是純數字，檢查範圍
            if start.isdigit() and end.isdigit():
                if int(end) < int(start):
                    raise ValueError('結束流水號不能小於起始流水號')
        return v


class ReceiptIndividualCreate(ReceiptBase):
    """少量收料模型 (逗號分隔序號)"""
    receipt_type: ReceiptType = Field(
        default=ReceiptType.INDIVIDUAL,
        description="收料類型 (固定為 individual)"
    )
    serials: str = Field(
        ...,
        description="序號 (多個序號用逗號分隔)",
        example="A001, A002, A003"
    )

    @validator('serials')
    def validate_serials(cls, v):
        """驗證序號列表"""
        if not v.strip():
            raise ValueError('序號不能為空白')
        # 檢查是否包含逗號
        serials_list = [s.strip() for s in v.split(',') if s.strip()]
        if len(serials_list) == 0:
            raise ValueError('至少需要一個序號')
        return v.strip()


class ReceiptCreate(BaseModel):
    """通用收料建立模型 (支援批量和少量)"""
    receipt_type: ReceiptType = Field(
        ...,
        description="收料類型 (batch/individual)"
    )
    vendor: str = Field(
        ...,
        max_length=100,
        description="廠商"
    )
    order_no: str = Field(
        ...,
        max_length=100,
        description="單號"
    )
    fixture_code: str = Field(
        ...,
        max_length=50,
        description="治具編號"
    )
    # 批量收料欄位 (可選)
    serial_start: Optional[str] = Field(
        None,
        max_length=100,
        description="流水號起始 (批量收料用)"
    )
    serial_end: Optional[str] = Field(
        None,
        max_length=100,
        description="流水號結束 (批量收料用)"
    )
    # 少量收料欄位 (可選)
    serials: Optional[str] = Field(
        None,
        description="序號列表 (少量收料用，逗號分隔)"
    )
    operator: Optional[str] = Field(
        None,
        max_length=100,
        description="收料人員"
    )
    note: Optional[str] = Field(
        None,
        description="備註"
    )

    @validator('receipt_type')
    def validate_receipt_type_fields(cls, v, values):
        """驗證收料類型與對應欄位"""
        # 這個驗證會在所有欄位都設定後執行
        return v

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "description": "批量收料範例",
                    "value": {
                        "receipt_type": "batch",
                        "vendor": "ABC 供應商",
                        "order_no": "PO20251107001",
                        "fixture_code": "L-00017",
                        "serial_start": "001",
                        "serial_end": "010",
                        "operator": "user001",
                        "note": "品質良好"
                    }
                },
                {
                    "description": "少量收料範例",
                    "value": {
                        "receipt_type": "individual",
                        "vendor": "ABC 供應商",
                        "order_no": "PO20251107002",
                        "fixture_code": "L-00017",
                        "serials": "A001, A002, A003",
                        "operator": "user001",
                        "note": "少量補貨"
                    }
                }
            ]
        }


class ReceiptResponse(BaseModel):
    """收料回應模型"""
    id: int = Field(..., description="收料記錄 ID")
    receipt_type: str = Field(..., description="收料類型")
    vendor: str = Field(..., description="廠商")
    order_no: str = Field(..., description="單號")
    fixture_code: str = Field(..., description="治具編號")
    serial_start: Optional[str] = Field(None, description="流水號起始")
    serial_end: Optional[str] = Field(None, description="流水號結束")
    serials: Optional[str] = Field(None, description="序號列表")
    operator: Optional[str] = Field(None, description="收料人員")
    note: Optional[str] = Field(None, description="備註")
    created_at: Optional[datetime] = Field(None, description="收料時間")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "receipt_type": "batch",
                "vendor": "ABC 供應商",
                "order_no": "PO20251107001",
                "fixture_code": "L-00017",
                "serial_start": "001",
                "serial_end": "010",
                "serials": None,
                "operator": "user001",
                "note": "品質良好",
                "created_at": "2025-11-07T10:30:00"
            }
        }


class ReceiptListResponse(BaseModel):
    """收料列表回應模型"""
    total: int = Field(..., description="總筆數")
    receipts: List[ReceiptResponse] = Field(..., description="收料記錄列表")

    class Config:
        json_schema_extra = {
            "example": {
                "total": 2,
                "receipts": [
                    {
                        "id": 1,
                        "receipt_type": "batch",
                        "vendor": "ABC 供應商",
                        "order_no": "PO001",
                        "fixture_code": "L-00017",
                        "serial_start": "001",
                        "serial_end": "010",
                        "serials": None,
                        "operator": "user001",
                        "note": "批量收料",
                        "created_at": "2025-11-07T10:30:00"
                    },
                    {
                        "id": 2,
                        "receipt_type": "individual",
                        "vendor": "XYZ 供應商",
                        "order_no": "PO002",
                        "fixture_code": "L-33-14",
                        "serial_start": None,
                        "serial_end": None,
                        "serials": "A001, A002, A003",
                        "operator": "user002",
                        "note": "少量補貨",
                        "created_at": "2025-11-07T11:00:00"
                    }
                ]
            }
        }


# ==================== 退料模型 ====================

class ReturnBase(BaseModel):
    """退料基礎模型"""
    return_type: ReceiptType = Field(
        ...,
        description="退料類型 (batch/individual)"
    )
    vendor: str = Field(
        ...,
        max_length=100,
        description="廠商",
        example="ABC 供應商"
    )
    order_no: str = Field(
        ...,
        max_length=100,
        description="單號",
        example="RT20251107001"
    )
    fixture_code: str = Field(
        ...,
        max_length=50,
        description="治具編號",
        example="L-00017"
    )
    operator: Optional[str] = Field(
        None,
        max_length=100,
        description="退料人員 (預設為登入用戶)",
        example="user001"
    )
    note: Optional[str] = Field(
        None,
        description="備註",
        example="品質不良退回"
    )

    @validator('vendor', 'order_no', 'fixture_code')
    def validate_required_fields(cls, v):
        """驗證必填欄位"""
        if not v.strip():
            raise ValueError('此欄位不能為空白')
        return v.strip()

    @validator('note')
    def validate_note(cls, v):
        """驗證備註"""
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class ReturnBatchCreate(ReturnBase):
    """批量退料模型 (流水號起訖)"""
    return_type: ReceiptType = Field(
        default=ReceiptType.BATCH,
        description="退料類型 (固定為 batch)"
    )
    serial_start: str = Field(
        ...,
        max_length=100,
        description="流水號起始",
        example="001"
    )
    serial_end: str = Field(
        ...,
        max_length=100,
        description="流水號結束",
        example="010"
    )

    @validator('serial_start', 'serial_end')
    def validate_serials(cls, v):
        """驗證流水號"""
        if not v.strip():
            raise ValueError('流水號不能為空白')
        return v.strip()


class ReturnIndividualCreate(ReturnBase):
    """少量退料模型 (逗號分隔序號)"""
    return_type: ReceiptType = Field(
        default=ReceiptType.INDIVIDUAL,
        description="退料類型 (固定為 individual)"
    )
    serials: str = Field(
        ...,
        description="序號 (多個序號用逗號分隔)",
        example="A001, A002, A003"
    )

    @validator('serials')
    def validate_serials(cls, v):
        """驗證序號列表"""
        if not v.strip():
            raise ValueError('序號不能為空白')
        serials_list = [s.strip() for s in v.split(',') if s.strip()]
        if len(serials_list) == 0:
            raise ValueError('至少需要一個序號')
        return v.strip()


class ReturnCreate(BaseModel):
    """通用退料建立模型 (支援批量和少量)"""
    return_type: ReceiptType = Field(
        ...,
        description="退料類型 (batch/individual)"
    )
    vendor: str = Field(
        ...,
        max_length=100,
        description="廠商"
    )
    order_no: str = Field(
        ...,
        max_length=100,
        description="單號"
    )
    fixture_code: str = Field(
        ...,
        max_length=50,
        description="治具編號"
    )
    # 批量退料欄位 (可選)
    serial_start: Optional[str] = Field(
        None,
        max_length=100,
        description="流水號起始 (批量退料用)"
    )
    serial_end: Optional[str] = Field(
        None,
        max_length=100,
        description="流水號結束 (批量退料用)"
    )
    # 少量退料欄位 (可選)
    serials: Optional[str] = Field(
        None,
        description="序號列表 (少量退料用，逗號分隔)"
    )
    operator: Optional[str] = Field(
        None,
        max_length=100,
        description="退料人員"
    )
    note: Optional[str] = Field(
        None,
        description="備註"
    )

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "description": "批量退料範例",
                    "value": {
                        "return_type": "batch",
                        "vendor": "ABC 供應商",
                        "order_no": "RT20251107001",
                        "fixture_code": "L-00017",
                        "serial_start": "001",
                        "serial_end": "010",
                        "operator": "user001",
                        "note": "品質不良退回"
                    }
                },
                {
                    "description": "少量退料範例",
                    "value": {
                        "return_type": "individual",
                        "vendor": "ABC 供應商",
                        "order_no": "RT20251107002",
                        "fixture_code": "L-00017",
                        "serials": "A001, A002, A003",
                        "operator": "user001",
                        "note": "瑕疵品退回"
                    }
                }
            ]
        }


class ReturnResponse(BaseModel):
    """退料回應模型"""
    id: int = Field(..., description="退料記錄 ID")
    return_type: str = Field(..., description="退料類型")
    vendor: str = Field(..., description="廠商")
    order_no: str = Field(..., description="單號")
    fixture_code: str = Field(..., description="治具編號")
    serial_start: Optional[str] = Field(None, description="流水號起始")
    serial_end: Optional[str] = Field(None, description="流水號結束")
    serials: Optional[str] = Field(None, description="序號列表")
    operator: Optional[str] = Field(None, description="退料人員")
    note: Optional[str] = Field(None, description="備註")
    created_at: Optional[datetime] = Field(None, description="退料時間")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "return_type": "batch",
                "vendor": "ABC 供應商",
                "order_no": "RT20251107001",
                "fixture_code": "L-00017",
                "serial_start": "001",
                "serial_end": "010",
                "serials": None,
                "operator": "user001",
                "note": "品質不良退回",
                "created_at": "2025-11-07T10:30:00"
            }
        }


class ReturnListResponse(BaseModel):
    """退料列表回應模型"""
    total: int = Field(..., description="總筆數")
    returns: List[ReturnResponse] = Field(..., description="退料記錄列表")

    class Config:
        json_schema_extra = {
            "example": {
                "total": 2,
                "returns": [
                    {
                        "id": 1,
                        "return_type": "batch",
                        "vendor": "ABC 供應商",
                        "order_no": "RT001",
                        "fixture_code": "L-00017",
                        "serial_start": "001",
                        "serial_end": "010",
                        "serials": None,
                        "operator": "user001",
                        "note": "批量退料",
                        "created_at": "2025-11-07T10:30:00"
                    },
                    {
                        "id": 2,
                        "return_type": "individual",
                        "vendor": "XYZ 供應商",
                        "order_no": "RT002",
                        "fixture_code": "L-33-14",
                        "serial_start": None,
                        "serial_end": None,
                        "serials": "A001, A002",
                        "operator": "user002",
                        "note": "瑕疵品退回",
                        "created_at": "2025-11-07T11:00:00"
                    }
                ]
            }
        }
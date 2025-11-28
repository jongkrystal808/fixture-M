# backend/app/routers/transactions.py

from fastapi import APIRouter, Depends
from backend.app.routers import receipts, returns
from backend.app.dependencies import get_current_user

router = APIRouter(prefix="/transactions", tags=["通用交易 Transaction Wrapper"])


@router.post("/{typ}/list")
async def list_transactions(typ: str, payload: dict, user=Depends(get_current_user)):
    if typ == "receipt":
        return receipts.list_receipts(**payload, user=user)
    if typ == "return":
        return returns.list_returns(**payload, user=user)
    return {"rows": [], "total": 0}


@router.post("/{typ}/create")
async def create_transactions(typ: str, payload: dict, user=Depends(get_current_user)):
    if typ == "receipt":
        return receipts.create_receipt(payload, payload["customer_id"], user)
    if typ == "return":
        return returns.create_return(payload, payload["customer_id"], user)
    raise Exception("Unknown transaction type")


@router.delete("/{typ}/{id}")
async def delete_transactions(typ: str, id: int, user=Depends(get_current_user)):
    if typ == "receipt":
        return receipts.delete_receipt(id, payload["customer_id"], user)
    if typ == "return":
        return returns.delete_return(id, payload["customer_id"], user)
    raise Exception("Unknown transaction type")


@router.get("/{typ}/{id}/export")
async def export_transactions(typ: str, id: int, user=Depends(get_current_user)):
    if typ == "receipt":
        return receipts.export_receipt_csv(id, payload["customer_id"], user)
    if typ == "return":
        return returns.export_return_csv(id, payload["customer_id"], user)
    raise Exception("Unknown transaction type")

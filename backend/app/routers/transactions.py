# backend/app/routers/transactions.py

from fastapi import APIRouter, Depends, Query
from backend.app.routers import receipts, returns
from backend.app.dependencies import get_current_user
from typing import Optional
from backend.app.database import db

router = APIRouter(prefix="/transactions", tags=["通用交易 Transaction Wrapper"])


# ============================================================
# 收料 / 退料共用列表 API
# ============================================================
@router.post("/{typ}/list")
async def list_transactions(typ: str, payload: dict, user=Depends(get_current_user)):
    if typ == "receipt":
        return receipts.list_receipts(**payload, user=user)
    if typ == "return":
        return returns.list_returns(**payload, user=user)
    return {"rows": [], "total": 0}


# ============================================================
# 收料 / 退料 create 包裝 (★ 含庫存自動更新)
# ============================================================
@router.post("/{typ}/create")
async def create_transactions(typ: str, payload: dict, user=Depends(get_current_user)):
    customer_id = payload["customer_id"]

    # 收料直接呼叫 receipts (不在這裡更新庫存)
    if typ == "receipt":
        return receipts.create_receipt(payload, customer_id, user)

    # 退料直接呼叫 returns (不在這裡更新庫存)
    if typ == "return":
        return returns.create_return(payload, customer_id, user)

    raise Exception("Unknown transaction type")



# ============================================================
# 刪除交易（receipt / return）
# ============================================================
@router.delete("/{typ}/{id}")
async def delete_transactions(typ: str, id: int, customer_id: str = Query(...), user=Depends(get_current_user)):

    if typ == "receipt":
        return receipts.delete_receipt(id, customer_id, user)

    if typ == "return":
        return returns.delete_return(id, customer_id, user)

    raise Exception("Unknown transaction type")


# ============================================================
# 匯出（receipt / return）
# ============================================================
@router.get("/{typ}/{id}/export")
async def export_transactions(typ: str, id: int, customer_id: str = Query(...), user=Depends(get_current_user)):

    if typ == "receipt":
        return receipts.export_receipt_csv(id, customer_id, user)

    if typ == "return":
        return returns.export_return_csv(id, customer_id, user)

    raise Exception("Unknown transaction type")


# ============================================================
# ★ 收退料總檢視
# ============================================================
@router.get("/view-all", summary="收退料總檢視（收料 + 退料統一查詢）")
async def view_all_transactions(
    customer_id: str = Query(...),
    fixture_id: Optional[str] = Query(None),
    datecode: Optional[str] = Query(None),
    operator: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(200),
    user=Depends(get_current_user)
):

    where = ["t.customer_id = %s"]
    params = [customer_id]

    if fixture_id and fixture_id != "undefined":
        where.append("t.fixture_id LIKE %s")
        params.append(f"%{fixture_id}%")

    if datecode and datecode != "undefined":
        where.append("t.datecode LIKE %s")
        params.append(f"%{datecode}%")

    if operator and operator != "undefined":
        where.append("t.operator LIKE %s")
        params.append(f"%{operator}%")

    if type in ("receipt", "return"):
        where.append("t.transaction_type = %s")
        params.append(type)

    where_sql = " AND ".join(where)

    sql = f"""
        SELECT 
            t.id,
            t.transaction_date,
            t.transaction_type,
            t.fixture_id,
            t.customer_id,
            t.source_type,
            t.datecode,
            t.quantity,
            t.operator,
            t.note
        FROM material_transactions t
        WHERE {where_sql}
        ORDER BY t.transaction_date DESC, t.id DESC
        LIMIT %s OFFSET %s
    """

    rows = db.execute_query(sql, tuple(params + [limit, skip]))

    count_sql = f"SELECT COUNT(*) AS total FROM material_transactions t WHERE {where_sql}"
    total = db.execute_query(count_sql, tuple(params))[0]["total"]

    return {"total": total, "rows": rows}

"""
收料 Receipts Router (v3.6 增加 source_type)
- v3.6: 增加 source_type 欄位支援（自購/客供）
- 所有 API 的 customer_id 一律使用 Query(...)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response
from typing import Optional, List, Dict, Any
from datetime import datetime
import csv
import io

from backend.app.database import db
from backend.app.dependencies import get_current_user, get_current_username
from backend.app.utils.serial_tools import expand_serial_range, normalise_serial_list

router = APIRouter(prefix="/receipts", tags=["收料 Receipts"])


# -------------------------------
# Helper
# -------------------------------
def ensure_fixture_exists(fixture_id: str, customer_id: str):
    row = db.execute_query(
        "SELECT id FROM fixtures WHERE id=%s AND customer_id=%s",
        (fixture_id, customer_id)
    )
    if not row:
        raise HTTPException(400, f"治具 {fixture_id} 不存在或不屬於客戶 {customer_id}")


# ============================================================
# 列表
# GET /receipts?customer_id=xxx&skip=0...
# ============================================================
@router.get("", summary="查詢收料紀錄")
def list_receipts(
    customer_id: str = Query(...),
    fixture_id: Optional[str] = None,
    order_no: Optional[str] = None,
    operator: Optional[str] = None,
    source_type: Optional[str] = None,  # ★ 新增：來源類型篩選
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    serial: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user=Depends(get_current_user)
):
    where = ["t.transaction_type='receipt'", "t.customer_id=%s"]
    params = [customer_id]

    # 動態 where 組裝
    if fixture_id:
        where.append("t.fixture_id LIKE %s")
        params.append(f"%{fixture_id}%")
    if order_no:
        where.append("t.order_no LIKE %s")
        params.append(f"%{order_no}%")
    if operator:
        where.append("t.operator LIKE %s")
        params.append(f"%{operator}%")

    # ★ 新增：來源類型篩選
    if source_type:
        where.append("t.source_type = %s")
        params.append(source_type)

    if date_from:
        where.append("t.transaction_date >= %s")
        params.append(date_from)
    if date_to:
        where.append("t.transaction_date <= %s")
        params.append(date_to)

    # 序號搜尋：JOIN details 找 serial_number
    if serial:
        where.append("""
            t.id IN (
                SELECT transaction_id
                FROM material_transaction_details
                WHERE serial_number LIKE %s
            )
        """)
        params.append(f"%{serial}%")

    # ★ 查詢包含 source_type
    sql = f"""
        SELECT 
            t.*,
            GROUP_CONCAT(d.serial_number ORDER BY d.serial_number SEPARATOR ',') AS serial_list
        FROM material_transactions t
        LEFT JOIN material_transaction_details d
            ON d.transaction_id = t.id
        WHERE {' AND '.join(where)}
        GROUP BY t.id
        ORDER BY t.created_at DESC
        LIMIT %s OFFSET %s
    """

    params_page = params + [limit, skip]
    rows = db.execute_query(sql, tuple(params_page))

    # 計算總筆數
    count_sql = f"""
        SELECT COUNT(*) AS cnt
        FROM (
            SELECT t.id
            FROM material_transactions t
            LEFT JOIN material_transaction_details d ON d.transaction_id=t.id
            WHERE {' AND '.join(where)}
            GROUP BY t.id
        ) AS x
    """

    total = db.execute_query(count_sql, tuple(params))[0]["cnt"]

    return {"total": total, "receipts": rows}


# ============================================================
# 取得單筆
# GET /receipts/{id}?customer_id=xxx
# ============================================================
@router.get("/{receipt_id}", summary="取得收料單")
def get_receipt(
    receipt_id: int,
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    row = db.execute_query(
        "SELECT * FROM material_transactions WHERE id=%s AND customer_id=%s AND transaction_type='receipt'",
        (receipt_id, customer_id)
    )
    if not row:
        raise HTTPException(404, "收料單不存在")

    receipt = row[0]
    details = db.execute_query(
        "SELECT id, serial_number, created_at FROM material_transaction_details WHERE transaction_id=%s",
        (receipt_id,)
    )
    receipt["details"] = details
    return receipt


# ============================================================
# 新增收料 (增加 source_type 支援)
# POST /receipts?customer_id=xxx
# ============================================================
@router.post("", summary="新增收料")
def create_receipt(
    data: Dict[str, Any],
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    fixture_id = data.get("fixture_id")
    if not fixture_id:
        raise HTTPException(400, "缺少 fixture_id")

    ensure_fixture_exists(fixture_id, customer_id)

    # ★ 新增：來源類型（預設為客供）
    source_type = data.get("source_type", "customer_supplied")
    if source_type not in ["self_purchased", "customer_supplied"]:
        raise HTTPException(400, "source_type 必須為 self_purchased 或 customer_supplied")

    typ = data.get("type", "individual")

    if typ == "batch":
        serials = expand_serial_range(data.get("serial_start", ""), data.get("serial_end", ""))
    else:
        s = data.get("serials", "")
        if isinstance(s, list):
            serials = normalise_serial_list(s)
        else:
            serials = normalise_serial_list([x.strip() for x in str(s).split(",") if x.strip()])

    if not serials:
        raise HTTPException(400, "沒有提供任何序號")

    qty = len(serials)
    now = datetime.now()
    created_by = user["id"]
    operator = data.get("operator") or user["username"]

    # ★ 使用存儲過程 sp_material_receipt
    try:
        # 將序號列表轉為逗號分隔字串
        serials_str = ",".join(serials)

        # 呼叫存儲過程
        result = db.execute_query(
            """
            CALL sp_material_receipt(
                %s, %s, %s, %s, %s, %s, %s, %s, %s,
                @transaction_id, @message
            )
            """,
            (
                customer_id,           # p_customer_id
                fixture_id,            # p_fixture_id
                now.date(),            # p_transaction_date
                data.get("order_no"),  # p_order_no
                source_type,           # p_source_type ★
                serials_str,           # p_serials
                operator,              # p_operator
                data.get("note"),      # p_note
                created_by             # p_user_id
            )
        )

        # 取得輸出參數
        output = db.execute_query("SELECT @transaction_id AS id, @message AS message")

        if not output or output[0]["id"] is None:
            msg = output[0]["message"] if output else "收料失敗"
            raise HTTPException(500, msg)

        trans_id = output[0]["id"]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"建立收料失敗: {e}")

    return {
        "id": trans_id,
        "fixture_id": fixture_id,
        "source_type": source_type,  # ★ 返回來源類型
        "quantity": qty,
        "serials": serials
    }


# ============================================================
# 新增明細
# POST /receipts/{id}/details?customer_id=xxx
# ============================================================
@router.post("/{receipt_id}/details", summary="新增序號到收料單")
def add_receipt_details(
    receipt_id: int,
    data: Dict[str, Any],
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    serials = data.get("serials", [])
    if not serials or not isinstance(serials, list):
        raise HTTPException(400, "請提供 serials 陣列")

    # ★ 取得收料單的 source_type
    row = db.execute_query(
        "SELECT id, fixture_id, source_type FROM material_transactions WHERE id=%s AND customer_id=%s AND transaction_type='receipt'",
        (receipt_id, customer_id)
    )
    if not row:
        raise HTTPException(404, "收料單不存在")

    source_type = row[0]["source_type"]
    fixture_id = row[0]["fixture_id"]

    try:
        # 新增序號到 material_transaction_details
        for sn in serials:
            db.execute_update(
                "INSERT INTO material_transaction_details (transaction_id, serial_number) VALUES (%s, %s)",
                (receipt_id, sn)
            )

            # ★ 同步新增到 fixture_serials
            db.execute_update(
                """
                INSERT INTO fixture_serials 
                    (customer_id, fixture_id, serial_number, source_type, status, receipt_date, receipt_transaction_id)
                VALUES (%s, %s, %s, %s, 'available', CURDATE(), %s)
                """,
                (customer_id, fixture_id, sn, source_type, receipt_id)
            )

        # 更新數量
        db.execute_update(
            "UPDATE material_transactions SET quantity = quantity + %s WHERE id=%s",
            (len(serials), receipt_id)
        )
    except Exception as e:
        raise HTTPException(500, f"新增序號失敗: {e}")

    return {"id": receipt_id, "added": len(serials)}


# ============================================================
# 刪除序號
# DELETE /receipts/details/{detail_id}?customer_id=xxx
# ============================================================
@router.delete("/details/{detail_id}", summary="刪除收料序號")
def delete_receipt_detail(
    detail_id: int,
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    # ★ 查詢序號資訊
    row = db.execute_query(
        """
        SELECT d.transaction_id, d.serial_number, t.customer_id, t.fixture_id
        FROM material_transaction_details d
        JOIN material_transactions t ON t.id=d.transaction_id
        WHERE d.id=%s
        """,
        (detail_id,)
    )
    if not row:
        raise HTTPException(404, "明細不存在")
    if row[0]["customer_id"] != customer_id:
        raise HTTPException(403, "沒有權限刪除此序號")

    trans_id = row[0]["transaction_id"]
    serial_number = row[0]["serial_number"]
    fixture_id = row[0]["fixture_id"]

    try:
        # 刪除 material_transaction_details
        db.execute_update("DELETE FROM material_transaction_details WHERE id=%s", (detail_id,))

        # ★ 同步刪除 fixture_serials（如果存在）
        db.execute_update(
            "DELETE FROM fixture_serials WHERE serial_number=%s AND fixture_id=%s AND receipt_transaction_id=%s",
            (serial_number, fixture_id, trans_id)
        )

        # 更新數量
        db.execute_update(
            "UPDATE material_transactions SET quantity = GREATEST(quantity-1, 0) WHERE id=%s",
            (trans_id,)
        )
    except Exception as e:
        raise HTTPException(500, f"刪除序號失敗: {e}")

    return {"deleted_detail_id": detail_id}


# ============================================================
# 刪除收料單
# DELETE /receipts/{id}?customer_id=xxx
# ============================================================
@router.delete("/{receipt_id}", summary="刪除收料單")
def delete_receipt(
    receipt_id: int,
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    row = db.execute_query(
        "SELECT id, fixture_id FROM material_transactions WHERE id=%s AND customer_id=%s AND transaction_type='receipt'",
        (receipt_id, customer_id)
    )
    if not row:
        raise HTTPException(404, "收料單不存在")

    fixture_id = row[0]["fixture_id"]

    try:
        # ★ 刪除 fixture_serials 中對應的序號
        db.execute_update(
            "DELETE FROM fixture_serials WHERE receipt_transaction_id=%s AND fixture_id=%s",
            (receipt_id, fixture_id)
        )

        # 刪除 material_transaction_details
        db.execute_update("DELETE FROM material_transaction_details WHERE transaction_id=%s", (receipt_id,))

        # 刪除 material_transactions
        db.execute_update("DELETE FROM material_transactions WHERE id=%s", (receipt_id,))
    except Exception as e:
        raise HTTPException(500, f"刪除收料單失敗: {e}")

    return {"deleted_id": receipt_id}


# ============================================================
# 匯出收料記錄 CSV
# GET /receipts/export/csv?customer_id=xxx
# ============================================================
@router.get("/export/csv", summary="匯出收料記錄 CSV")
def export_receipts_csv(
    customer_id: str = Query(...),
    fixture_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user=Depends(get_current_user)
):
    where = ["transaction_type='receipt'", "customer_id=%s"]
    params = [customer_id]

    if fixture_id:
        where.append("fixture_id LIKE %s")
        params.append(f"%{fixture_id}%")
    if date_from:
        where.append("transaction_date >= %s")
        params.append(date_from)
    if date_to:
        where.append("transaction_date <= %s")
        params.append(date_to)

    sql = f"""
        SELECT 
            transaction_date, fixture_id, customer_id, order_no, 
            source_type, quantity, operator, note
        FROM material_transactions
        WHERE {' AND '.join(where)}
        ORDER BY transaction_date DESC, id DESC
    """

    rows = db.execute_query(sql, tuple(params))

    # 生成 CSV
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "transaction_date", "fixture_id", "customer_id", "order_no",
        "source_type", "quantity", "operator", "note"
    ])
    writer.writeheader()
    writer.writerows(rows)

    csv_content = output.getvalue()
    output.close()

    return Response(
        content=csv_content.encode("utf-8-sig"),  # BOM for Excel
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=receipts_{customer_id}_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )
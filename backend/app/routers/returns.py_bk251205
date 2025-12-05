"""
退料 Returns Router (v3.6 增加 source_type 支援)
- v3.6: 使用存儲過程 sp_material_return，自動識別來源類型
- 列表 API 返回來源資訊
- 所有 API 的 customer_id 一律使用 Query(...)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response
from typing import Optional, List, Dict, Any
from datetime import datetime
import csv
import io

from backend.app.database import db
from backend.app.dependencies import get_current_user
from backend.app.utils.serial_tools import expand_serial_range, normalise_serial_list

router = APIRouter(prefix="/returns", tags=["退料 Returns"])


# -------------------------------
# Helper：確認治具存在且隸屬客戶
# -------------------------------
def ensure_fixture_exists(fixture_id: str, customer_id: str):
    row = db.execute_query(
        "SELECT id FROM fixtures WHERE id=%s AND customer_id=%s",
        (fixture_id, customer_id)
    )
    if not row:
        raise HTTPException(400, f"治具 {fixture_id} 不存在或不屬於客戶 {customer_id}")


# -------------------------------
# Helper：計算退料的來源類型資訊
# -------------------------------
def get_return_source_info(return_id: int):
    """
    查詢退料記錄涉及的序號來源類型
    返回 source_type（單一來源）或 source_type_summary（混合來源）
    """
    # 查詢該退料單的所有序號及其來源類型
    sql = """
        SELECT 
            fs.source_type,
            COUNT(*) as count
        FROM material_transaction_details mtd
        LEFT JOIN fixture_serials fs 
            ON mtd.serial_number = fs.serial_number
            AND fs.return_transaction_id = %s
        WHERE mtd.transaction_id = %s
        GROUP BY fs.source_type
    """

    rows = db.execute_query(sql, (return_id, return_id))

    if not rows:
        return None

    # 統計各來源類型數量
    source_counts = {}
    for row in rows:
        if row["source_type"]:
            source_counts[row["source_type"]] = row["count"]

    if len(source_counts) == 0:
        return None
    elif len(source_counts) == 1:
        # 單一來源
        return {"source_type": list(source_counts.keys())[0]}
    else:
        # 混合來源，生成統計字串
        summary_parts = []
        if "self_purchased" in source_counts:
            summary_parts.append(f"自購: {source_counts['self_purchased']}")
        if "customer_supplied" in source_counts:
            summary_parts.append(f"客供: {source_counts['customer_supplied']}")

        return {"source_type_summary": ", ".join(summary_parts)}


# ============================================================
# 列表
# GET /returns?customer_id=xxx&skip=0...
# ============================================================
@router.get("", summary="查詢退料紀錄")
def list_returns(
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
    where = ["t.transaction_type='return'", "t.customer_id=%s"]
    params = [customer_id]

    if fixture_id:
        where.append("t.fixture_id LIKE %s")
        params.append(f"%{fixture_id}%")
    if order_no:
        where.append("t.order_no LIKE %s")
        params.append(f"%{order_no}%")
    if operator:
        where.append("t.operator LIKE %s")
        params.append(f"%{operator}%")

    # ★ 新增：來源類型篩選（通過 JOIN fixture_serials）
    if source_type:
        where.append("""
            t.id IN (
                SELECT DISTINCT mtd.transaction_id
                FROM material_transaction_details mtd
                JOIN fixture_serials fs ON mtd.serial_number = fs.serial_number
                WHERE fs.return_transaction_id = t.id
                  AND fs.source_type = %s
            )
        """)
        params.append(source_type)

    if date_from:
        where.append("t.transaction_date >= %s")
        params.append(date_from)
    if date_to:
        where.append("t.transaction_date <= %s")
        params.append(date_to)

    # 序號搜尋
    if serial:
        where.append("""
            t.id IN (
                SELECT transaction_id
                FROM material_transaction_details
                WHERE serial_number LIKE %s
            )
        """)
        params.append(f"%{serial}%")

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

    # ★ 為每筆退料記錄增加來源資訊
    for row in rows:
        source_info = get_return_source_info(row["id"])
        if source_info:
            row.update(source_info)

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

    return {"total": total, "returns": rows}


# ============================================================
# 取得單筆
# GET /returns/{id}?customer_id=xxx
# ============================================================
@router.get("/{return_id}", summary="取得退料單")
def get_return(
    return_id: int,
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    row = db.execute_query(
        "SELECT * FROM material_transactions WHERE id=%s AND customer_id=%s AND transaction_type='return'",
        (return_id, customer_id)
    )
    if not row:
        raise HTTPException(404, "退料單不存在")

    ret_data = row[0]

    # 取得明細
    details = db.execute_query(
        "SELECT id, serial_number, created_at FROM material_transaction_details WHERE transaction_id=%s",
        (return_id,)
    )
    ret_data["details"] = details

    # ★ 增加來源資訊
    source_info = get_return_source_info(return_id)
    if source_info:
        ret_data.update(source_info)

    return ret_data


# ============================================================
# 新增退料（使用存儲過程）
# POST /returns?customer_id=xxx
# ============================================================
@router.post("", summary="新增退料")
def create_return(
    data: Dict[str, Any],
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    fixture_id = data.get("fixture_id")
    if not fixture_id:
        raise HTTPException(400, "缺少 fixture_id")

    ensure_fixture_exists(fixture_id, customer_id)

    typ = data.get("type", "individual")

    if typ == "batch":
        serials = expand_serial_range(
            data.get("serial_start", ""),
            data.get("serial_end", "")
        )
    else:
        s = data.get("serials", "")
        if isinstance(s, list):
            serials = normalise_serial_list(s)
        else:
            serials = normalise_serial_list(
                [x.strip() for x in str(s).split(",") if x.strip()]
            )

    if not serials:
        raise HTTPException(400, "沒有提供任何序號")

    qty = len(serials)
    now = datetime.now()
    operator = data.get("operator") or user["username"]
    created_by = user["id"]

    # ★ 使用存儲過程 sp_material_return
    try:
        # 將序號列表轉為逗號分隔字串
        serials_str = ",".join(serials)

        # 呼叫存儲過程
        result = db.execute_query(
            """
            CALL sp_material_return(
                %s, %s, %s, %s, %s, %s, %s, %s,
                @transaction_id, @message
            )
            """,
            (
                customer_id,           # p_customer_id
                fixture_id,            # p_fixture_id
                now.date(),            # p_transaction_date
                data.get("order_no"),  # p_order_no
                serials_str,           # p_serials
                operator,              # p_operator
                data.get("note"),      # p_note
                created_by             # p_user_id
            )
        )

        # 取得輸出參數
        output = db.execute_query("SELECT @transaction_id AS id, @message AS message")

        if not output or output[0]["id"] is None:
            msg = output[0]["message"] if output else "退料失敗"
            raise HTTPException(500, msg)

        return_id = output[0]["id"]
        message = output[0]["message"]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"建立退料失敗: {e}")

    # ★ 取得來源資訊並返回
    source_info = get_return_source_info(return_id)

    result = {
        "id": return_id,
        "fixture_id": fixture_id,
        "quantity": qty,
        "serials": serials,
        "message": message  # 包含來源統計的訊息
    }

    if source_info:
        result.update(source_info)

    return result


# ============================================================
# 新增明細（同步更新 fixture_serials）
# POST /returns/{id}/details?customer_id=xxx
# ============================================================
@router.post("/{return_id}/details", summary="新增序號到退料單")
def add_return_details(
    return_id: int,
    data: Dict[str, Any],
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    serials = data.get("serials", [])
    if not serials or not isinstance(serials, list):
        raise HTTPException(400, "請提供 serials 陣列")

    row = db.execute_query(
        "SELECT id, fixture_id FROM material_transactions WHERE id=%s AND customer_id=%s AND transaction_type='return'",
        (return_id, customer_id)
    )
    if not row:
        raise HTTPException(404, "退料單不存在")

    fixture_id = row[0]["fixture_id"]

    try:
        for sn in serials:
            # 新增到 material_transaction_details
            db.execute_update(
                "INSERT INTO material_transaction_details (transaction_id, serial_number) VALUES (%s, %s)",
                (return_id, sn)
            )

            # ★ 同步更新 fixture_serials 狀態
            db.execute_update(
                """
                UPDATE fixture_serials
                SET status = 'returned',
                    return_date = CURDATE(),
                    return_transaction_id = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE serial_number = %s
                  AND fixture_id = %s
                  AND customer_id = %s
                  AND status = 'available'
                ORDER BY receipt_date DESC, id DESC
                LIMIT 1
                """,
                (return_id, sn, fixture_id, customer_id)
            )

        # 更新數量
        db.execute_update(
            "UPDATE material_transactions SET quantity = quantity + %s WHERE id=%s",
            (len(serials), return_id)
        )
    except Exception as e:
        raise HTTPException(500, f"新增序號失敗: {e}")

    return {"id": return_id, "added": len(serials)}


# ============================================================
# 刪除序號（同步更新 fixture_serials）
# DELETE /returns/details/{detail_id}?customer_id=xxx
# ============================================================
@router.delete("/details/{detail_id}", summary="刪除退料序號")
def delete_return_detail(
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

    return_id = row[0]["transaction_id"]
    serial_number = row[0]["serial_number"]
    fixture_id = row[0]["fixture_id"]

    try:
        # 刪除 material_transaction_details
        db.execute_update("DELETE FROM material_transaction_details WHERE id=%s", (detail_id,))

        # ★ 同步恢復 fixture_serials 狀態
        db.execute_update(
            """
            UPDATE fixture_serials
            SET status = 'available',
                return_date = NULL,
                return_transaction_id = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE serial_number = %s
              AND fixture_id = %s
              AND customer_id = %s
              AND return_transaction_id = %s
            """,
            (serial_number, fixture_id, customer_id, return_id)
        )

        # 更新數量
        db.execute_update(
            "UPDATE material_transactions SET quantity = GREATEST(quantity-1, 0) WHERE id=%s",
            (return_id,)
        )
    except Exception as e:
        raise HTTPException(500, f"刪除序號失敗: {e}")

    return {"deleted_detail_id": detail_id}


# ============================================================
# 刪除退料單（同步清理 fixture_serials）
# DELETE /returns/{id}?customer_id=xxx
# ============================================================
@router.delete("/{return_id}", summary="刪除退料單")
def delete_return(
    return_id: int,
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    row = db.execute_query(
        "SELECT id, fixture_id FROM material_transactions WHERE id=%s AND customer_id=%s AND transaction_type='return'",
        (return_id, customer_id)
    )
    if not row:
        raise HTTPException(404, "退料單不存在")

    fixture_id = row[0]["fixture_id"]

    try:
        # ★ 恢復 fixture_serials 狀態（將 returned 改回 available）
        db.execute_update(
            """
            UPDATE fixture_serials
            SET status = 'available',
                return_date = NULL,
                return_transaction_id = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE return_transaction_id = %s
              AND fixture_id = %s
              AND customer_id = %s
            """,
            (return_id, fixture_id, customer_id)
        )

        # 刪除 material_transaction_details
        db.execute_update("DELETE FROM material_transaction_details WHERE transaction_id=%s", (return_id,))

        # 刪除 material_transactions
        db.execute_update("DELETE FROM material_transactions WHERE id=%s", (return_id,))
    except Exception as e:
        raise HTTPException(500, f"刪除退料單失敗: {e}")

    return {"deleted_id": return_id}


# ============================================================
# 匯出退料記錄 CSV
# GET /returns/export/csv?customer_id=xxx
# ============================================================
@router.get("/export/csv", summary="匯出退料記錄 CSV")
def export_returns_csv(
    customer_id: str = Query(...),
    fixture_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user=Depends(get_current_user)
):
    where = ["transaction_type='return'", "customer_id=%s"]
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
            id, transaction_date, fixture_id, customer_id, order_no, 
            quantity, operator, note
        FROM material_transactions
        WHERE {' AND '.join(where)}
        ORDER BY transaction_date DESC, id DESC
    """

    rows = db.execute_query(sql, tuple(params))

    # ★ 為每筆記錄增加來源資訊
    for row in rows:
        source_info = get_return_source_info(row["id"])
        if source_info:
            if "source_type" in source_info:
                row["source_type"] = source_info["source_type"]
            elif "source_type_summary" in source_info:
                row["source_type"] = source_info["source_type_summary"]
        else:
            row["source_type"] = "-"

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
            "Content-Disposition": f"attachment; filename=returns_{customer_id}_{datetime.now().strftime('%Y%m%d')}.csv"
        }
    )
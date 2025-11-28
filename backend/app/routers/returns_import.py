from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from datetime import datetime, date
import pandas as pd

from backend.app.database import db
from backend.app.dependencies import get_current_user

router = APIRouter(prefix="/returns", tags=["退料匯入"])


@router.post("/import")
async def import_returns(
    file: UploadFile = File(...),
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    """
    匯入退料 Excel：vendor=customer_id、type=batch/individual
    """
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(400, "請使用 .xlsx 匯入")

    try:
        df = pd.read_excel(file.file)
    except Exception as e:
        raise HTTPException(400, f"匯入格式錯誤：{str(e)}")

    required = ["vendor", "order_no", "fixture_id", "type",
                "serial_start", "serial_end", "note"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise HTTPException(400, f"缺少欄位：{missing}")

    total = 0
    messages = []

    for _, row in df.iterrows():
        fixture_id = str(row["fixture_id"]).strip()
        if not fixture_id:
            continue

        vendor = str(row["vendor"]).strip() or customer_id  # vendor = customer_id
        order_no = str(row.get("order_no", "")).strip()
        note = str(row.get("note", "")).strip()
        typ = str(row["type"]).strip().lower()

        # 序號處理
        if typ == "batch":
            start = row.get("serial_start")
            end = row.get("serial_end")
            try:
                serials = [str(i) for i in range(int(start), int(end) + 1)]
            except:
                raise HTTPException(400, f"序號起訖格式錯誤：{start}~{end}")
        else:
            continue  # 若需要 individual 可再擴充

        if not serials:
            continue

        # 建立退料單
        try:
            with db.get_cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO material_transactions
                      (transaction_type, transaction_date, customer_id, order_no,
                       fixture_id, quantity, operator, note, created_by)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (
                        'return',
                        date.today(),
                        vendor,  # vendor=customer_id
                        order_no,
                        fixture_id,
                        len(serials),
                        user["username"],
                        note,
                        user["id"]
                    )
                )
                return_id = cursor.lastrowid

                # 明細
                for sn in serials:
                    cursor.execute(
                        """
                        INSERT INTO material_transaction_details (transaction_id, serial_number)
                        VALUES (%s,%s)
                        """,
                        (return_id, sn)
                    )

        except Exception as e:
            raise HTTPException(500, f"匯入失敗：{e}")

        total += 1
        messages.append(f"{fixture_id}: {len(serials)} 序號匯入成功")

    return {"count": total, "messages": messages}

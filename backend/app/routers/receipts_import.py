from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from datetime import datetime, date
import pandas as pd

from backend.app.database import db
from backend.app.dependencies import get_current_user

router = APIRouter(prefix="/receipts", tags=["Receipts Import"])


@router.post("/import")
async def import_receipts(
    file: UploadFile = File(...),
    customer_id: str = "",
    user=Depends(get_current_user)
):
    """
    匯入收料 Excel — 對應前端「廠商(customer_id) + batch/individual」格式
    """
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(400, "請使用 .xlsx 匯入")

    # 讀取 Excel
    try:
        df = pd.read_excel(file.file)
    except Exception as e:
        raise HTTPException(400, f"匯入格式錯誤：{str(e)}")

    # 前端 UI 格式
    required_cols = ["vendor", "order_no", "fixture_id",
                     "type", "serial_start", "serial_end", "note"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise HTTPException(400, f"缺少欄位：{missing}")

    total_created = 0
    messages = []

    for _, row in df.iterrows():
        # 1. customer_id = vendor 欄位
        customer_id = str(row["vendor"]).strip()
        if not customer_id:
            continue

        fixture_id = str(row["fixture_id"]).strip()
        if not fixture_id:
            continue

        order_no = str(row.get("order_no", "")).strip()
        note = str(row.get("note", "")).strip()

        # 2. 決定序號列表
        typ = str(row["type"]).strip().lower()
        serials = ""

        if typ == "batch":
            start = row.get("serial_start")
            end = row.get("serial_end")
            try:
                serials = ",".join(str(i) for i in range(int(start), int(end) + 1))
            except Exception:
                raise HTTPException(400, f"序號起迄格式錯誤：{start}~{end}")
        else:  # individual (少量序號) → 目前你的 UI 沒有 serials 欄位
            # 若未來需要少量序號可增加 columns
            continue

        if not serials:
            continue

        # 3. source_type 固定：自購（可改成 customer_supplied）
        source_type = "customer_supplied"

        try:
            with db.get_cursor() as cursor:
                cursor.execute(
                    """
                    CALL sp_material_receipt(
                        %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        @tid, @msg
                    )
                    """,
                    (
                        customer_id,
                        fixture_id,
                        date.today(),
                        order_no,
                        source_type,
                        serials,
                        user["username"],
                        note,
                        user["id"],
                    )
                )

                cursor.execute("SELECT @tid")
                tid = (cursor.fetchone() or {}).get("@tid")

                cursor.execute("SELECT @msg")
                msg = (cursor.fetchone() or {}).get("@msg")

            messages.append(msg)

            if tid:
                total_created += 1

        except Exception as e:
            raise HTTPException(500, f"匯入失敗：{str(e)}")

    return {
        "count": total_created,
        "messages": messages
    }

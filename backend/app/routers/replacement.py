"""
治具更換記錄 API (v4.0)
Replacement Logs API

對應資料表: replacement_logs
- v4.0: 串接 Stored Procedure
  - sp_insert_replacement_log
  - sp_delete_replacement_log
- 支援 fixture / serial 兩種層級:
  - record_level: 'fixture' | 'serial'
  - serial_number: 僅 serial 模式需要
- 自動搭配 usage summary:
  - fixture_usage_summary
  - serial_usage_summary
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional

from backend.app.dependencies import (
    get_current_user,
    get_current_admin,
    get_current_username,
)
from backend.app.database import db

from backend.app.models.replacement import (
    ReplacementCreate,
    ReplacementUpdate,
    ReplacementResponse,
    ReplacementWithDetails,
)

router = APIRouter(
    prefix="/replacement",
    tags=["更換記錄 Replacement Logs"],
)


# ============================================================
# 工具：檢查治具是否屬於該客戶
# ============================================================


def ensure_fixture_exists(fixture_id: str, customer_id: str):
    sql = """
        SELECT id, fixture_name
        FROM fixtures
        WHERE id=%s AND customer_id=%s
    """
    rows = db.execute_query(sql, (fixture_id, customer_id))
    if not rows:
        raise HTTPException(
            status_code=400,
            detail=f"治具 {fixture_id} 不存在或不屬於客戶 {customer_id}",
        )
    return rows[0]


# ============================================================
# 1️⃣ 建立更換記錄（v4.0：改用 SP）
# ============================================================


@router.post(
    "",
    response_model=ReplacementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="新增治具更換記錄",
)
async def create_replacement_log(
    data: ReplacementCreate,
    username: str = Depends(get_current_username),
):
    """
    新增更換記錄，實際寫入由 sp_insert_replacement_log 完成：
    - 自動寫入 replacement_logs
    - 自動讀取 usage_before
    - 自動重置 usage summary (usage_after = 0)
    """
    # 1) 檢查治具存在
    ensure_fixture_exists(data.fixture_id, data.customer_id)

    # 2) record_level / serial 檢查
    record_level = getattr(data, "record_level", "fixture")
    serial_number = getattr(data, "serial_number", None)

    if record_level not in ("fixture", "serial"):
        raise HTTPException(400, "record_level 必須為 fixture 或 serial")

    if record_level == "serial" and not serial_number:
        raise HTTPException(400, "序號模式需要提供 serial_number")

    # 3) 執行 Stored Procedure
    executor = data.executor or username

    try:
        # 呼叫 SP，最後兩個參數使用 session 變數接 OUT
        db.execute_query(
            """
            CALL sp_insert_replacement_log(
                %s, %s, %s, %s, %s, %s, %s, %s,
                @replacement_id, @message
            )
            """,
            (
                data.customer_id,
                data.fixture_id,
                record_level,
                serial_number,
                data.replacement_date,
                data.reason,
                executor,
                data.note,
            ),
        )

        output = db.execute_query(
            "SELECT @replacement_id AS id, @message AS message"
        )
        if not output:
            raise HTTPException(500, "新增更換記錄失敗（無回傳資料）")

        out = output[0]
        rep_id = out.get("id")
        msg = out.get("message") or "新增更換記錄失敗"

        if rep_id is None:
            # SP 執行失敗（例如 fixture / serial 不存在）
            raise HTTPException(status_code=400, detail=msg)

    except HTTPException:
        # 直接往外丟
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"建立更換記錄失敗: {e}",
        )

    # 4) 回查完整資料（含 fixture_name 等）
    row = db.execute_query(
        """
        SELECT
            rl.*,
            f.fixture_name
        FROM replacement_logs rl
        JOIN fixtures f
          ON rl.fixture_id = f.id
         AND rl.customer_id = f.customer_id
        WHERE rl.id = %s
        """,
        (rep_id,),
    )

    if not row:
        # 理論上不會發生，保險處理
        raise HTTPException(500, "新增成功但無法讀取更換記錄資料")

    return ReplacementResponse(**row[0])


# ============================================================
# 2️⃣ 更新更換記錄（僅允許修改說明類欄位）
# ============================================================


@router.put(
    "/{log_id}",
    response_model=ReplacementResponse,
    summary="更新更換記錄",
)
async def update_replacement_log(
    log_id: int,
    data: ReplacementUpdate,
    admin=Depends(get_current_admin),
):
    """
    v4.0：只允許修改「描述類」欄位：
    - replacement_date
    - reason
    - executor
    - note

    不允許修改：
    - customer_id / fixture_id
    - record_level / serial_number
    - usage_before / usage_after
    """
    # 查詢是否存在
    exists = db.execute_query(
        "SELECT id FROM replacement_logs WHERE id=%s",
        (log_id,),
    )
    if not exists:
        raise HTTPException(404, "更換記錄不存在")

    update_fields = []
    params = []

    if data.replacement_date is not None:
        update_fields.append("replacement_date=%s")
        params.append(data.replacement_date)

    if data.reason is not None:
        update_fields.append("reason=%s")
        params.append(data.reason)

    if data.executor is not None:
        update_fields.append("executor=%s")
        params.append(data.executor)

    if data.note is not None:
        update_fields.append("note=%s")
        params.append(data.note)

    if update_fields:
        sql = f"""
            UPDATE replacement_logs
            SET {', '.join(update_fields)}
            WHERE id=%s
        """
        params.append(log_id)
        db.execute_update(sql, tuple(params))

    # 回查
    row = db.execute_query(
        """
        SELECT rl.*, f.fixture_name
        FROM replacement_logs rl
        JOIN fixtures f
          ON rl.fixture_id = f.id
         AND rl.customer_id = f.customer_id
        WHERE rl.id=%s
        """,
        (log_id,),
    )[0]

    return ReplacementResponse(**row)


# ============================================================
# 3️⃣ 查詢單筆更換記錄
# ============================================================


@router.get(
    "/{log_id}",
    response_model=ReplacementWithDetails,
    summary="取得單筆更換記錄",
)
async def get_replacement_log(
    log_id: int,
    current_user=Depends(get_current_user),
):
    row = db.execute_query(
        """
        SELECT rl.*, f.fixture_name
        FROM replacement_logs rl
        JOIN fixtures f
          ON rl.fixture_id = f.id
         AND rl.customer_id = f.customer_id
        WHERE rl.id=%s
        """,
        (log_id,),
    )

    if not row:
        raise HTTPException(404, "更換記錄不存在")

    return ReplacementWithDetails(**row[0])


# ============================================================
# 4️⃣ 列表查詢（支援 fixture / executor / 日期篩選 / record_level / serial）
# ============================================================


@router.get(
    "",
    response_model=List[ReplacementWithDetails],
    summary="查詢更換記錄列表",
)
async def list_replacement_logs(
    customer_id: str = Query(...),
    fixture_id: Optional[str] = None,
    executor: Optional[str] = None,
    serial_number: Optional[str] = None,
    record_level: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user=Depends(get_current_user),
):
    where = ["rl.customer_id = %(customer_id)s"]
    params = {"customer_id": customer_id}

    if fixture_id:
        where.append("rl.fixture_id = %(fixture_id)s")
        params["fixture_id"] = fixture_id

    if executor:
        where.append("rl.executor LIKE %(executor)s")
        params["executor"] = f"%{executor}%"

    if serial_number:
        where.append("rl.serial_number = %(serial_number)s")
        params["serial_number"] = serial_number

    if record_level:
        where.append("rl.record_level = %(record_level)s")
        params["record_level"] = record_level

    if date_from:
        where.append("rl.replacement_date >= %(date_from)s")
        params["date_from"] = date_from

    if date_to:
        where.append("rl.replacement_date <= %(date_to)s")
        params["date_to"] = date_to

    where_sql = " AND ".join(where)

    sql = f"""
        SELECT rl.*, f.fixture_name
        FROM replacement_logs rl
        JOIN fixtures f
          ON rl.fixture_id = f.id
         AND rl.customer_id = f.customer_id
        WHERE {where_sql}
        ORDER BY rl.replacement_date DESC, rl.created_at DESC
        LIMIT %(limit)s OFFSET %(skip)s
    """

    params["limit"] = limit
    params["skip"] = skip

    rows = db.execute_query(sql, params)
    return [ReplacementWithDetails(**row) for row in rows]


# ============================================================
# 5️⃣ 刪除紀錄（v4.0：改用 SP，回復 usage summary）
# ============================================================


@router.delete(
    "/{log_id}",
    status_code=204,
    summary="刪除更換記錄",
)
async def delete_replacement_log(
    log_id: int,
    admin=Depends(get_current_admin),
):
    """
    v4.0：
    - 先確認記錄存在
    - 呼叫 sp_delete_replacement_log
      → 自動回復 usage summary 的 total_use_count
    - 再回傳 204
    """
    exists = db.execute_query(
        "SELECT id FROM replacement_logs WHERE id=%s",
        (log_id,),
    )
    if not exists:
        raise HTTPException(404, "更換記錄不存在")

    try:
        db.execute_query(
            "CALL sp_delete_replacement_log(%s, @message)",
            (log_id,),
        )
        # 如需要可讀取訊息（目前只 log 用，不回前端）
        out = db.execute_query("SELECT @message AS message")
        msg = out[0].get("message") if out else None
        if msg:
            # debug 時你可以 print / log
            print(f"[sp_delete_replacement_log] {msg}")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"刪除更換記錄失敗: {e}",
        )

    return None

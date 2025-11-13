"""
更換記錄 API 路由
Replacement Logs API Routes

提供治具更換記錄的 CRUD 與批量建立功能
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from datetime import date
from backend.app.dependencies import get_current_user, get_current_username
from backend.app.database import db
from backend.app.models.log import (
    ReplacementLogCreate,
    ReplacementLogUpdate,
    ReplacementLogResponse,
    ReplacementLogListResponse
)

router = APIRouter(
    prefix="/logs/replacement",
    tags=["更換記錄 Replacement Logs"]
)


# ==================== 建立單筆更換記錄 ====================

@router.post("/", response_model=ReplacementLogResponse, summary="建立更換記錄")
async def create_replacement_log(
    log_data: ReplacementLogCreate,
    current_username: str = Depends(get_current_username)
):
    """
    建立單筆更換記錄
    """
    try:
        fixture_check = "SELECT fixture_id, fixture_name FROM fixtures WHERE fixture_id = %s"
        fixture_result = db.execute_query(fixture_check, (log_data.fixture_id,))
        if not fixture_result:
            raise HTTPException(status_code=400, detail=f"治具編號 {log_data.fixture_id} 不存在")

        if log_data.replacement_date > date.today():
            raise HTTPException(status_code=400, detail="更換日期不能是未來")

        executor = log_data.executor or current_username

        insert_query = """
            INSERT INTO replacement_logs (fixture_id, replacement_date, reason, executor, note)
            VALUES (%s, %s, %s, %s, %s)
        """
        replacement_id = db.insert(insert_query, (
            log_data.fixture_id,
            log_data.replacement_date,
            log_data.reason,
            executor,
            log_data.note
        ))

        return ReplacementLogResponse(
            replacement_id=replacement_id,
            fixture_id=log_data.fixture_id,
            fixture_name=fixture_result[0]["fixture_name"],
            replacement_date=log_data.replacement_date,
            reason=log_data.reason,
            executor=executor,
            note=log_data.note,
            created_at=None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"建立更換記錄失敗: {e}")


# ==================== 批量建立更換記錄 ====================

@router.post("/batch", summary="批量建立更換記錄")
async def create_replacement_logs_batch(
    fixture_id: str,
    replacement_date: date,
    reason: str,
    count: int = Query(1, ge=1, le=1000, description="批量建立筆數"),
    executor: Optional[str] = None,
    note: Optional[str] = None,
    current_username: str = Depends(get_current_username)
):
    """
    批量建立多筆更換記錄
    - fixture_id: 治具編號
    - replacement_date: 更換日期
    - reason: 更換原因
    - count: 批量建立筆數
    - executor: 執行人員（預設登入者）
    """
    try:
        fixture_check = "SELECT fixture_id FROM fixtures WHERE fixture_id = %s"
        fixture_result = db.execute_query(fixture_check, (fixture_id,))
        if not fixture_result:
            raise HTTPException(status_code=400, detail=f"治具編號 {fixture_id} 不存在")

        if replacement_date > date.today():
            raise HTTPException(status_code=400, detail="更換日期不能是未來")

        executor = executor or current_username

        insert_query = """
            INSERT INTO replacement_logs (fixture_id, replacement_date, reason, executor, note)
            VALUES (%s, %s, %s, %s, %s)
        """
        for _ in range(count):
            db.insert(insert_query, (fixture_id, replacement_date, reason, executor, note))

        return {"message": f"成功建立 {count} 筆更換記錄", "fixture_id": fixture_id, "created_count": count}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量建立更換記錄失敗: {e}")


# ==================== 查詢單筆更換記錄 ====================

@router.get("/{replacement_id}", response_model=ReplacementLogResponse, summary="取得更換記錄")
async def get_replacement_log(replacement_id: int):
    """
    根據 ID 取得單筆更換記錄
    """
    try:
        query = """
            SELECT rl.replacement_id, rl.fixture_id, f.fixture_name,
                   rl.replacement_date, rl.reason, rl.executor,
                   rl.note, rl.created_at
            FROM replacement_logs rl
            LEFT JOIN fixtures f ON rl.fixture_id = f.fixture_id
            WHERE rl.replacement_id = %s
        """
        result = db.execute_query(query, (replacement_id,))
        if not result:
            raise HTTPException(status_code=404, detail=f"更換記錄 {replacement_id} 不存在")

        row = result[0]
        return ReplacementLogResponse(
            replacement_id=row["replacement_id"],
            fixture_id=row["fixture_id"],
            fixture_name=row["fixture_name"],
            replacement_date=row["replacement_date"],
            reason=row["reason"],
            executor=row["executor"],
            note=row["note"],
            created_at=row["created_at"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查詢更換記錄失敗: {e}")


# ==================== 查詢更換記錄列表 ====================

@router.get("/", response_model=ReplacementLogListResponse, summary="查詢更換記錄列表")
async def list_replacement_logs(
    skip: int = Query(0, ge=0, description="略過筆數"),
    limit: int = Query(30, ge=1, le=500, description="每頁筆數"),
    fixture_id: Optional[str] = Query(None, description="治具編號"),
    executor: Optional[str] = Query(None, description="執行人員"),
    start_date: Optional[date] = Query(None, description="開始日期"),
    end_date: Optional[date] = Query(None, description="結束日期")
):
    """
    查詢更換記錄列表（支援篩選與分頁）
    """
    try:
        where_clauses = []
        params = {}

        if fixture_id:
            where_clauses.append("rl.fixture_id = %(fixture_id)s")
            params["fixture_id"] = fixture_id

        if executor:
            where_clauses.append("rl.executor LIKE %(executor)s")
            params["executor"] = f"%{executor}%"

        if start_date:
            where_clauses.append("rl.replacement_date >= %(start_date)s")
            params["start_date"] = start_date

        if end_date:
            where_clauses.append("rl.replacement_date <= %(end_date)s")
            params["end_date"] = end_date

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        # 查總筆數
        count_sql = f"SELECT COUNT(*) AS total FROM replacement_logs rl {where_sql}"
        total_result = db.execute_query(count_sql, params)
        total = total_result[0]["total"] if total_result else 0

        # 查列表
        query = f"""
            SELECT rl.replacement_id, rl.fixture_id, f.fixture_name,
                   rl.replacement_date, rl.reason, rl.executor,
                   rl.note, rl.created_at
            FROM replacement_logs rl
            LEFT JOIN fixtures f ON rl.fixture_id = f.fixture_id
            {where_sql}
            ORDER BY rl.replacement_date DESC
            LIMIT %(limit)s OFFSET %(skip)s
        """
        params["limit"] = limit
        params["skip"] = skip

        result = db.execute_query(query, params)

        logs = []
        for row in result:
            logs.append(ReplacementLogResponse(
                replacement_id=row["replacement_id"],
                fixture_id=row["fixture_id"],
                fixture_name=row["fixture_name"],
                replacement_date=row["replacement_date"],
                reason=row["reason"],
                executor=row["executor"],
                note=row["note"],
                created_at=row["created_at"]
            ))

        return ReplacementLogListResponse(total=total, logs=logs)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查詢更換記錄列表失敗: {e}")


# ==================== 更新更換記錄 ====================

@router.put("/{replacement_id}", response_model=ReplacementLogResponse, summary="更新更換記錄")
async def update_replacement_log(
    replacement_id: int,
    log_data: ReplacementLogUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    更新指定的更換記錄（只更新提供的欄位）
    """
    try:
        check = db.execute_query(
            "SELECT replacement_id FROM replacement_logs WHERE replacement_id = %s",
            (replacement_id,)
        )
        if not check:
            raise HTTPException(status_code=404, detail=f"更換記錄 {replacement_id} 不存在")

        update_fields = []
        params = {}

        if log_data.replacement_date is not None:
            update_fields.append("replacement_date = %(replacement_date)s")
            params["replacement_date"] = log_data.replacement_date
        if log_data.reason is not None:
            update_fields.append("reason = %(reason)s")
            params["reason"] = log_data.reason
        if log_data.executor is not None:
            update_fields.append("executor = %(executor)s")
            params["executor"] = log_data.executor
        if log_data.note is not None:
            update_fields.append("note = %(note)s")
            params["note"] = log_data.note

        if not update_fields:
            raise HTTPException(status_code=400, detail="沒有提供要更新的欄位")

        params["replacement_id"] = replacement_id
        sql = f"""
            UPDATE replacement_logs
            SET {', '.join(update_fields)}
            WHERE replacement_id = %(replacement_id)s
        """
        db.execute_update(sql, params)

        # 重新查詢更新後結果
        return await get_replacement_log(replacement_id)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新更換記錄失敗: {e}")


# ==================== 刪除更換記錄 ====================

@router.delete("/{replacement_id}", summary="刪除更換記錄")
async def delete_replacement_log(
    replacement_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    刪除指定的更換記錄
    """
    try:
        check = db.execute_query(
            "SELECT replacement_id FROM replacement_logs WHERE replacement_id = %s",
            (replacement_id,)
        )
        if not check:
            raise HTTPException(status_code=404, detail=f"更換記錄 {replacement_id} 不存在")

        db.execute_update("DELETE FROM replacement_logs WHERE replacement_id = %s", (replacement_id,))
        return {"message": "更換記錄刪除成功", "replacement_id": replacement_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"刪除更換記錄失敗: {e}")

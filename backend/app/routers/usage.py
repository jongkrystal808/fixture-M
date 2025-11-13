"""
使用記錄 API 路由
Usage Logs API Routes

提供治具使用記錄的 CRUD 功能
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from backend.app.dependencies import get_current_user, get_current_username
from backend.app.database import db
from backend.app.models.log import (
    UsageLogCreate,
    UsageLogBatchCreate,
    UsageLogResponse,
    UsageLogListResponse
)

router = APIRouter(
    prefix="/logs/usage",
    tags=["使用記錄 Usage Logs"]
)


# ==================== 建立使用記錄 ====================

@router.post("/", response_model=UsageLogResponse, summary="建立使用記錄")
async def create_usage_log(
    log_data: UsageLogCreate,
    current_username: str = Depends(get_current_username)
):
    """
    建立單筆使用記錄
    """
    try:
        # 檢查治具是否存在
        fixture_check = "SELECT fixture_id FROM fixtures WHERE fixture_id = %s"
        fixture_exists = db.execute_query(fixture_check, (log_data.fixture_id,))
        if not fixture_exists:
            raise HTTPException(status_code=400, detail=f"治具編號 {log_data.fixture_id} 不存在")

        # 檢查站點
        if log_data.station_id:
            station_check = "SELECT station_id FROM stations WHERE station_id = %s"
            station_exists = db.execute_query(station_check, (log_data.station_id,))
            if not station_exists:
                raise HTTPException(status_code=400, detail=f"站點 ID {log_data.station_id} 不存在")

        operator = log_data.operator or current_username

        insert_query = """
            INSERT INTO usage_logs (fixture_id, station_id, use_count, abnormal_status, operator, note)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        log_id = db.insert(insert_query, (
            log_data.fixture_id,
            log_data.station_id,
            log_data.use_count,
            log_data.abnormal_status,
            operator,
            log_data.note
        ))

        return UsageLogResponse(
            log_id=log_id,
            fixture_id=log_data.fixture_id,
            station_id=log_data.station_id,
            station_code=None,
            station_name=None,
            use_count=log_data.use_count,
            abnormal_status=log_data.abnormal_status,
            operator=operator,
            note=log_data.note,
            used_at=None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"建立使用記錄失敗: {e}")


# ==================== 批量建立使用記錄 ====================

@router.post("/batch", summary="批量建立使用記錄")
async def create_usage_logs_batch(
    batch_data: UsageLogBatchCreate,
    current_username: str = Depends(get_current_username)
):
    """
    批量建立相同內容的使用記錄
    """
    try:
        fixture_check = "SELECT fixture_id FROM fixtures WHERE fixture_id = %s"
        fixture_exists = db.execute_query(fixture_check, (batch_data.fixture_id,))
        if not fixture_exists:
            raise HTTPException(status_code=400, detail=f"治具編號 {batch_data.fixture_id} 不存在")

        operator = batch_data.operator or current_username

        insert_query = """
            INSERT INTO usage_logs (fixture_id, station_id, use_count, abnormal_status, operator, note)
            VALUES (%s, %s, %s, %s, %s, %s)
        """

        for _ in range(batch_data.record_count):
            db.insert(insert_query, (
                batch_data.fixture_id,
                batch_data.station_id,
                batch_data.use_count,
                batch_data.abnormal_status,
                operator,
                batch_data.note
            ))

        return {
            "message": f"成功建立 {batch_data.record_count} 筆使用記錄",
            "fixture_id": batch_data.fixture_id,
            "created_count": batch_data.record_count
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量建立使用記錄失敗: {e}")


# ==================== 查詢單筆使用記錄 ====================

@router.get("/{log_id}", response_model=UsageLogResponse, summary="取得使用記錄")
async def get_usage_log(log_id: int):
    """
    根據 ID 取得單筆使用記錄
    """
    try:
        query = """
            SELECT ul.log_id, ul.fixture_id, ul.station_id,
                   s.station_code, s.station_name,
                   ul.use_count, ul.abnormal_status,
                   ul.operator, ul.note, ul.used_at
            FROM usage_logs ul
            LEFT JOIN stations s ON ul.station_id = s.station_id
            WHERE ul.log_id = %s
        """
        result = db.execute_query(query, (log_id,))
        if not result:
            raise HTTPException(status_code=404, detail=f"使用記錄 {log_id} 不存在")

        row = result[0]
        return UsageLogResponse(
            log_id=row["log_id"],
            fixture_id=row["fixture_id"],
            station_id=row["station_id"],
            station_code=row["station_code"],
            station_name=row["station_name"],
            use_count=row["use_count"],
            abnormal_status=row["abnormal_status"],
            operator=row["operator"],
            note=row["note"],
            used_at=row["used_at"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查詢使用記錄失敗: {e}")


# ==================== 查詢使用記錄列表 ====================

@router.get("/", response_model=UsageLogListResponse, summary="查詢使用記錄列表")
async def list_usage_logs(
    skip: int = Query(0, ge=0, description="略過筆數"),
    limit: int = Query(30, ge=1, le=500, description="每頁筆數"),
    fixture_id: Optional[str] = Query(None, description="治具編號篩選"),
    station_id: Optional[int] = Query(None, description="站點 ID 篩選"),
    operator: Optional[str] = Query(None, description="操作人員篩選"),
    has_abnormal: Optional[bool] = Query(None, description="是否有異常")
):
    """
    查詢使用記錄列表（支援篩選與分頁）
    """
    try:
        where_clauses = []
        params = {}

        if fixture_id:
            where_clauses.append("ul.fixture_id = %(fixture_id)s")
            params["fixture_id"] = fixture_id

        if station_id is not None:
            where_clauses.append("ul.station_id = %(station_id)s")
            params["station_id"] = station_id

        if operator:
            where_clauses.append("ul.operator LIKE %(operator)s")
            params["operator"] = f"%{operator}%"

        if has_abnormal is not None:
            where_clauses.append(
                "ul.abnormal_status IS NOT NULL" if has_abnormal else "ul.abnormal_status IS NULL"
            )

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        # 查總筆數
        count_sql = f"SELECT COUNT(*) AS total FROM usage_logs ul {where_sql}"
        total_result = db.execute_query(count_sql, params)
        total = total_result[0]["total"] if total_result else 0

        # 查列表
        query = f"""
            SELECT ul.log_id, ul.fixture_id, ul.station_id,
                   s.station_code, s.station_name,
                   ul.use_count, ul.abnormal_status,
                   ul.operator, ul.note, ul.used_at
            FROM usage_logs ul
            LEFT JOIN stations s ON ul.station_id = s.station_id
            {where_sql}
            ORDER BY ul.used_at DESC
            LIMIT %(limit)s OFFSET %(skip)s
        """
        params["limit"] = limit
        params["skip"] = skip

        result = db.execute_query(query, params)

        logs = []
        for row in result:
            logs.append(UsageLogResponse(
                log_id=row["log_id"],
                fixture_id=row["fixture_id"],
                station_id=row["station_id"],
                station_code=row["station_code"],
                station_name=row["station_name"],
                use_count=row["use_count"],
                abnormal_status=row["abnormal_status"],
                operator=row["operator"],
                note=row["note"],
                used_at=row["used_at"]
            ))

        return UsageLogListResponse(total=total, logs=logs)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查詢使用記錄列表失敗: {e}")


# ==================== 刪除使用記錄 ====================

@router.delete("/{log_id}", summary="刪除使用記錄")
async def delete_usage_log(
    log_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    刪除指定的使用記錄
    """
    try:
        check = db.execute_query("SELECT log_id FROM usage_logs WHERE log_id = %s", (log_id,))
        if not check:
            raise HTTPException(status_code=404, detail=f"使用記錄 {log_id} 不存在")

        db.execute_update("DELETE FROM usage_logs WHERE log_id = %s", (log_id,))
        return {"message": "使用記錄刪除成功", "log_id": log_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"刪除使用記錄失敗: {e}")

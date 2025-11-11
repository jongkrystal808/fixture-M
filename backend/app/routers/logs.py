"""
使用/更換記錄 API 路由
Usage and Replacement Logs API Routes

提供使用記錄和更換記錄相關的 API 端點
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from datetime import date

from backend.app.models.log import (
    UsageLogCreate,
    UsageLogBatchCreate,
    UsageLogResponse,
    UsageLogListResponse,
    UsageLogSummary,
    ReplacementLogCreate,
    ReplacementLogUpdate,
    ReplacementLogResponse,
    ReplacementLogListResponse,
    ReplacementLogSummary,
    FixtureUsageStatistics,
    StationUsageStatistics,
    LogStatisticsSummary,
    DateRangeQuery
)
from backend.app.dependencies import get_current_user, get_current_username
from backend.app.database import db

# 建立路由器
router = APIRouter(
    prefix="/logs",
    tags=["記錄管理 Logs"]
)


# ==================== 使用記錄 API ====================

@router.post("/usage", response_model=UsageLogResponse, summary="建立使用記錄")
async def create_usage_log(
        log_data: UsageLogCreate,
        current_username: str = Depends(get_current_username)
):
    """
    建立使用記錄

    - **fixture_id**: 治具編號
    - **station_id**: 站點 ID (可選)
    - **use_count**: 使用次數 (預設 1)
    - **abnormal_status**: 異常狀態 (可選)
    - **operator**: 操作人員 (預設為登入用戶)
    - **note**: 備註

    需要登入
    """
    try:
        # 檢查治具是否存在
        fixture_check = "SELECT fixture_id FROM fixtures WHERE fixture_id = %s"
        fixture_exists = db.execute_query(fixture_check, (log_data.fixture_id,))

        if not fixture_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"治具編號 {log_data.fixture_id} 不存在"
            )

        # 如果指定了 station_id，檢查是否存在
        if log_data.station_id:
            station_check = "SELECT station_id FROM stations WHERE station_id = %s"
            station_exists = db.execute_query(station_check, (log_data.station_id,))
            if not station_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"站點 ID {log_data.station_id} 不存在"
                )

        # 設定操作人員
        operator = log_data.operator or current_username

        # 插入使用記錄
        insert_query = """
                       INSERT INTO usage_logs (fixture_id, station_id, use_count, \
                                               abnormal_status, operator, note) \
                       VALUES (%s, %s, %s, %s, %s, %s) \
                       """

        log_id = db.insert(
            insert_query,
            (
                log_data.fixture_id,
                log_data.station_id,
                log_data.use_count,
                log_data.abnormal_status,
                operator,
                log_data.note
            )
        )

        # 查詢剛建立的記錄
        return await get_usage_log(log_id)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"建立使用記錄失敗: {str(e)}"
        )


@router.post("/usage/batch", summary="批量建立使用記錄")
async def create_usage_logs_batch(
        batch_data: UsageLogBatchCreate,
        current_username: str = Depends(get_current_username)
):
    """
    批量建立使用記錄

    - **fixture_id**: 治具編號
    - **station_id**: 站點 ID (可選)
    - **use_count**: 每次使用次數
    - **record_count**: 記錄筆數 (1-1000)
    - **operator**: 操作人員 (預設為登入用戶)

    一次建立多筆相同的使用記錄

    需要登入
    """
    try:
        # 檢查治具是否存在
        fixture_check = "SELECT fixture_id FROM fixtures WHERE fixture_id = %s"
        fixture_exists = db.execute_query(fixture_check, (batch_data.fixture_id,))

        if not fixture_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"治具編號 {batch_data.fixture_id} 不存在"
            )

        # 設定操作人員
        operator = batch_data.operator or current_username

        # 批量插入
        insert_query = """
                       INSERT INTO usage_logs (fixture_id, station_id, use_count, \
                                               abnormal_status, operator, note) \
                       VALUES (%s, %s, %s, %s, %s, %s) \
                       """

        created_count = 0
        for _ in range(batch_data.record_count):
            db.insert(
                insert_query,
                (
                    batch_data.fixture_id,
                    batch_data.station_id,
                    batch_data.use_count,
                    batch_data.abnormal_status,
                    operator,
                    batch_data.note
                )
            )
            created_count += 1

        return {
            "message": f"成功建立 {created_count} 筆使用記錄",
            "fixture_id": batch_data.fixture_id,
            "created_count": created_count
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量建立使用記錄失敗: {str(e)}"
        )


@router.get("/usage/{log_id}", response_model=UsageLogResponse, summary="取得使用記錄")
async def get_usage_log(log_id: int):
    """
    根據 ID 取得使用記錄

    - **log_id**: 使用記錄 ID
    """
    try:
        query = """
                SELECT ul.log_id, \
                       ul.fixture_id, \
                       ul.station_id, \
                       s.station_code, \
                       s.station_name, \
                       ul.use_count, \
                       ul.abnormal_status, \
                       ul.operator, \
                       ul.note, \
                       ul.used_at
                FROM usage_logs ul
                         LEFT JOIN stations s ON ul.station_id = s.station_id
                WHERE ul.log_id = %s \
                """

        result = db.execute_query(query, (log_id,))

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"使用記錄 {log_id} 不存在"
            )

        row = result[0]

        return UsageLogResponse(
            log_id=row[0],
            fixture_id=row[1],
            station_id=row[2],
            station_code=row[3],
            station_name=row[4],
            use_count=row[5],
            abnormal_status=row[6],
            operator=row[7],
            note=row[8],
            used_at=row[9]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢使用記錄失敗: {str(e)}"
        )


@router.get("/usage", response_model=UsageLogListResponse, summary="查詢使用記錄列表")
async def list_usage_logs(
        skip: int = Query(0, ge=0, description="略過筆數"),
        limit: int = Query(100, ge=1, le=1000, description="每頁筆數"),
        fixture_id: Optional[str] = Query(None, description="治具編號篩選"),
        station_id: Optional[int] = Query(None, description="站點 ID 篩選"),
        operator: Optional[str] = Query(None, description="操作人員篩選"),
        has_abnormal: Optional[bool] = Query(None, description="是否有異常")
):
    """
    查詢使用記錄列表

    - **skip**: 略過筆數（分頁用）
    - **limit**: 每頁筆數（最多 1000）
    - **fixture_id**: 治具編號篩選
    - **station_id**: 站點 ID 篩選
    - **operator**: 操作人員篩選
    - **has_abnormal**: 是否有異常

    回傳使用記錄列表和總筆數
    """
    try:
        # 建立 WHERE 條件
        where_conditions = []
        params = []

        if fixture_id:
            where_conditions.append("ul.fixture_id = %s")
            params.append(fixture_id)

        if station_id is not None:
            where_conditions.append("ul.station_id = %s")
            params.append(station_id)

        if operator:
            where_conditions.append("ul.operator LIKE %s")
            params.append(f"%{operator}%")

        if has_abnormal is not None:
            if has_abnormal:
                where_conditions.append("ul.abnormal_status IS NOT NULL")
            else:
                where_conditions.append("ul.abnormal_status IS NULL")

        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)

        # 查詢總筆數
        count_query = f"""
            SELECT COUNT(*)
            FROM usage_logs ul
            {where_clause}
        """

        count_result = db.execute_query(count_query, tuple(params))
        total = count_result[0][0] if count_result else 0

        # 查詢使用記錄列表
        query = f"""
            SELECT 
                ul.log_id, ul.fixture_id, ul.station_id,
                s.station_code, s.station_name,
                ul.use_count, ul.abnormal_status,
                ul.operator, ul.note, ul.used_at
            FROM usage_logs ul
            LEFT JOIN stations s ON ul.station_id = s.station_id
            {where_clause}
            ORDER BY ul.used_at DESC
            LIMIT %s OFFSET %s
        """

        params.extend([limit, skip])
        result = db.execute_query(query, tuple(params))

        logs = []
        for row in result:
            logs.append(UsageLogResponse(
                log_id=row[0],
                fixture_id=row[1],
                station_id=row[2],
                station_code=row[3],
                station_name=row[4],
                use_count=row[5],
                abnormal_status=row[6],
                operator=row[7],
                note=row[8],
                used_at=row[9]
            ))

        return UsageLogListResponse(
            total=total,
            logs=logs
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢使用記錄列表失敗: {str(e)}"
        )


@router.delete("/usage/{log_id}", summary="刪除使用記錄")
async def delete_usage_log(
        log_id: int,
        current_user: dict = Depends(get_current_user)
):
    """
    刪除使用記錄

    - **log_id**: 使用記錄 ID

    需要登入
    """
    try:
        # 檢查記錄是否存在
        check_query = "SELECT log_id FROM usage_logs WHERE log_id = %s"
        existing = db.execute_query(check_query, (log_id,))

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"使用記錄 {log_id} 不存在"
            )

        # 刪除記錄
        delete_query = "DELETE FROM usage_logs WHERE log_id = %s"
        db.execute_update(delete_query, (log_id,))

        return {
            "message": "使用記錄刪除成功",
            "log_id": log_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"刪除使用記錄失敗: {str(e)}"
        )


# ==================== 更換記錄 API ====================

@router.post("/replacement", response_model=ReplacementLogResponse, summary="建立更換記錄")
async def create_replacement_log(
        log_data: ReplacementLogCreate,
        current_username: str = Depends(get_current_username)
):
    """
    建立更換記錄

    - **fixture_id**: 治具編號
    - **replacement_date**: 更換日期 (不能是未來)
    - **reason**: 更換原因
    - **executor**: 執行人員 (預設為登入用戶)
    - **note**: 備註

    需要登入

    注意：建立更換記錄後，會自動觸發更新治具的 last_replacement_date
    """
    try:
        # 檢查治具是否存在
        fixture_check = """
                        SELECT fixture_id, fixture_name
                        FROM fixtures
                        WHERE fixture_id = %s \
                        """
        fixture_result = db.execute_query(fixture_check, (log_data.fixture_id,))

        if not fixture_result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"治具編號 {log_data.fixture_id} 不存在"
            )

        fixture_name = fixture_result[0][1]

        # 設定執行人員
        executor = log_data.executor or current_username

        # 插入更換記錄
        insert_query = """
                       INSERT INTO replacement_logs (fixture_id, replacement_date, reason, executor, note) \
                       VALUES (%s, %s, %s, %s, %s) \
                       """

        replacement_id = db.insert(
            insert_query,
            (
                log_data.fixture_id,
                log_data.replacement_date,
                log_data.reason,
                executor,
                log_data.note
            )
        )

        # 查詢剛建立的記錄
        return await get_replacement_log(replacement_id)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"建立更換記錄失敗: {str(e)}"
        )


@router.get("/replacement/{replacement_id}", response_model=ReplacementLogResponse, summary="取得更換記錄")
async def get_replacement_log(replacement_id: int):
    """
    根據 ID 取得更換記錄

    - **replacement_id**: 更換記錄 ID
    """
    try:
        query = """
                SELECT rl.replacement_id, \
                       rl.fixture_id, \
                       f.fixture_name, \
                       rl.replacement_date, \
                       rl.reason, \
                       rl.executor, \
                       rl.note, \
                       rl.created_at
                FROM replacement_logs rl
                         LEFT JOIN fixtures f ON rl.fixture_id = f.fixture_id
                WHERE rl.replacement_id = %s \
                """

        result = db.execute_query(query, (replacement_id,))

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"更換記錄 {replacement_id} 不存在"
            )

        row = result[0]

        return ReplacementLogResponse(
            replacement_id=row[0],
            fixture_id=row[1],
            fixture_name=row[2],
            replacement_date=row[3],
            reason=row[4],
            executor=row[5],
            note=row[6],
            created_at=row[7]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢更換記錄失敗: {str(e)}"
        )


@router.get("/replacement", response_model=ReplacementLogListResponse, summary="查詢更換記錄列表")
async def list_replacement_logs(
        skip: int = Query(0, ge=0, description="略過筆數"),
        limit: int = Query(100, ge=1, le=1000, description="每頁筆數"),
        fixture_id: Optional[str] = Query(None, description="治具編號篩選"),
        executor: Optional[str] = Query(None, description="執行人員篩選"),
        start_date: Optional[date] = Query(None, description="開始日期"),
        end_date: Optional[date] = Query(None, description="結束日期")
):
    """
    查詢更換記錄列表

    - **skip**: 略過筆數（分頁用）
    - **limit**: 每頁筆數（最多 1000）
    - **fixture_id**: 治具編號篩選
    - **executor**: 執行人員篩選
    - **start_date**: 開始日期
    - **end_date**: 結束日期

    回傳更換記錄列表和總筆數
    """
    try:
        # 建立 WHERE 條件
        where_conditions = []
        params = []

        if fixture_id:
            where_conditions.append("rl.fixture_id = %s")
            params.append(fixture_id)

        if executor:
            where_conditions.append("rl.executor LIKE %s")
            params.append(f"%{executor}%")

        if start_date:
            where_conditions.append("rl.replacement_date >= %s")
            params.append(start_date)

        if end_date:
            where_conditions.append("rl.replacement_date <= %s")
            params.append(end_date)

        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)

        # 查詢總筆數
        count_query = f"""
            SELECT COUNT(*)
            FROM replacement_logs rl
            {where_clause}
        """

        count_result = db.execute_query(count_query, tuple(params))
        total = count_result[0][0] if count_result else 0

        # 查詢更換記錄列表
        query = f"""
            SELECT 
                rl.replacement_id, rl.fixture_id,
                f.fixture_name,
                rl.replacement_date, rl.reason,
                rl.executor, rl.note, rl.created_at
            FROM replacement_logs rl
            LEFT JOIN fixtures f ON rl.fixture_id = f.fixture_id
            {where_clause}
            ORDER BY rl.replacement_date DESC, rl.created_at DESC
            LIMIT %s OFFSET %s
        """

        params.extend([limit, skip])
        result = db.execute_query(query, tuple(params))

        logs = []
        for row in result:
            logs.append(ReplacementLogResponse(
                replacement_id=row[0],
                fixture_id=row[1],
                fixture_name=row[2],
                replacement_date=row[3],
                reason=row[4],
                executor=row[5],
                note=row[6],
                created_at=row[7]
            ))

        return ReplacementLogListResponse(
            total=total,
            logs=logs
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢更換記錄列表失敗: {str(e)}"
        )


@router.put("/replacement/{replacement_id}", response_model=ReplacementLogResponse, summary="更新更換記錄")
async def update_replacement_log(
        replacement_id: int,
        log_data: ReplacementLogUpdate,
        current_user: dict = Depends(get_current_user)
):
    """
    更新更換記錄

    - **replacement_id**: 更換記錄 ID

    所有欄位都是可選的，只更新提供的欄位

    需要登入
    """
    try:
        # 檢查記錄是否存在
        check_query = "SELECT replacement_id FROM replacement_logs WHERE replacement_id = %s"
        existing = db.execute_query(check_query, (replacement_id,))

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"更換記錄 {replacement_id} 不存在"
            )

        # 建立更新語句
        update_fields = []
        params = []

        if log_data.replacement_date is not None:
            update_fields.append("replacement_date = %s")
            params.append(log_data.replacement_date)

        if log_data.reason is not None:
            update_fields.append("reason = %s")
            params.append(log_data.reason)

        if log_data.executor is not None:
            update_fields.append("executor = %s")
            params.append(log_data.executor)

        if log_data.note is not None:
            update_fields.append("note = %s")
            params.append(log_data.note)

        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="沒有提供要更新的欄位"
            )

        # 執行更新
        update_query = f"""
            UPDATE replacement_logs
            SET {', '.join(update_fields)}
            WHERE replacement_id = %s
        """
        params.append(replacement_id)

        db.execute_update(update_query, tuple(params))

        # 回傳更新後的記錄
        return await get_replacement_log(replacement_id)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新更換記錄失敗: {str(e)}"
        )


@router.delete("/replacement/{replacement_id}", summary="刪除更換記錄")
async def delete_replacement_log(
        replacement_id: int,
        current_user: dict = Depends(get_current_user)
):
    """
    刪除更換記錄

    - **replacement_id**: 更換記錄 ID

    需要登入

    注意：刪除更換記錄後，會自動觸發重新計算治具的 last_replacement_date
    """
    try:
        # 檢查記錄是否存在
        check_query = "SELECT replacement_id FROM replacement_logs WHERE replacement_id = %s"
        existing = db.execute_query(check_query, (replacement_id,))

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"更換記錄 {replacement_id} 不存在"
            )

        # 刪除記錄
        delete_query = "DELETE FROM replacement_logs WHERE replacement_id = %s"
        db.execute_update(delete_query, (replacement_id,))

        return {
            "message": "更換記錄刪除成功",
            "replacement_id": replacement_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"刪除更換記錄失敗: {str(e)}"
        )


# ==================== 統計 API ====================

@router.get("/statistics/summary", response_model=LogStatisticsSummary, summary="記錄統計摘要")
async def get_logs_statistics():
    """
    取得記錄統計摘要

    包含：
    - 總使用/更換記錄數
    - 異常記錄數
    - 需要更換的治具數
    - 今日記錄數
    """
    try:
        # 使用記錄統計
        usage_query = """
                      SELECT COUNT(*)                                                     as total_usage_logs, \
                             SUM(use_count)                                               as total_uses, \
                             SUM(CASE WHEN abnormal_status IS NOT NULL THEN 1 ELSE 0 END) as abnormal_logs, \
                             SUM(CASE WHEN DATE (used_at) = CURDATE() THEN 1 ELSE 0 END)  as today_usage_logs
                      FROM usage_logs \
                      """

        usage_result = db.execute_query(usage_query)
        usage_row = usage_result[0]

        # 更換記錄統計
        replacement_query = """
                            SELECT COUNT(*)                                                       as total_replacement_logs, \
                                   SUM(CASE WHEN DATE (created_at) = CURDATE() THEN 1 ELSE 0 END) as today_replacement_logs
                            FROM replacement_logs \
                            """

        replacement_result = db.execute_query(replacement_query)
        replacement_row = replacement_result[0]

        # 需要更換的治具數
        need_replacement_query = """
                                 SELECT COUNT(*)
                                 FROM view_fixture_status
                                 WHERE replacement_status = '需更換' \
                                 """

        need_replacement_result = db.execute_query(need_replacement_query)
        need_replacement = need_replacement_result[0][0] if need_replacement_result else 0

        return LogStatisticsSummary(
            total_usage_logs=usage_row[0] or 0,
            total_replacement_logs=replacement_row[0] or 0,
            total_uses=usage_row[1] or 0,
            abnormal_logs=usage_row[2] or 0,
            fixtures_need_replacement=need_replacement,
            today_usage_logs=usage_row[3] or 0,
            today_replacement_logs=replacement_row[1] or 0
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢統計資料失敗: {str(e)}"
        )
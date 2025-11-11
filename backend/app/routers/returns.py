"""
退料 API 路由
Return API Routes

提供退料相關的 API 端點
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

from backend.app.models.receipt import (
    ReturnCreate,
    ReturnResponse,
    ReturnListResponse,
    ReceiptType
)
from backend.app.dependencies import get_current_user, get_current_username
from backend.app.database import db
from backend.app.utils.validators import parse_serial_list

# 建立路由器
router = APIRouter(
    prefix="/returns",
    tags=["退料管理 Returns"]
)


@router.post("", response_model=ReturnResponse, summary="建立退料記錄")
async def create_return(
        return_data: ReturnCreate,
        current_username: str = Depends(get_current_username)
):
    """
    建立退料記錄

    支援兩種模式：
    1. **批量退料** (return_type=batch): 使用流水號起訖
       - serial_start: 流水號起始
       - serial_end: 流水號結束

    2. **少量退料** (return_type=individual): 使用逗號分隔序號
       - serials: 序號列表 (逗號分隔)

    - **vendor**: 廠商
    - **order_no**: 單號
    - **fixture_code**: 治具編號
    - **operator**: 退料人員 (預設為登入用戶)
    - **note**: 備註

    需要登入
    """
    try:
        # 檢查治具是否存在
        fixture_check = "SELECT fixture_id FROM fixtures WHERE fixture_id = %s"
        fixture_exists = db.execute_query(fixture_check, (return_data.fixture_code,))

        if not fixture_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"治具編號 {return_data.fixture_code} 不存在"
            )

        # 驗證退料類型和對應欄位
        if return_data.return_type == ReceiptType.BATCH:
            if not return_data.serial_start or not return_data.serial_end:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="批量退料需要提供 serial_start 和 serial_end"
                )
        elif return_data.return_type == ReceiptType.INDIVIDUAL:
            if not return_data.serials:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="少量退料需要提供 serials"
                )
            # 驗證序號格式
            try:
                serial_list = parse_serial_list(return_data.serials)
                if not serial_list:
                    raise ValueError("序號列表為空")
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"序號格式錯誤: {str(e)}"
                )

        # 設定操作人員（如果未提供，使用當前登入用戶）
        operator = return_data.operator or current_username

        # 插入退料記錄
        insert_query = """
                       INSERT INTO returns_table (type, vendor, order_no, fixture_code, \
                                                  serial_start, serial_end, serials, \
                                                  operator, note) \
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) \
                       """

        return_id = db.insert(
            insert_query,
            (
                return_data.return_type.value,
                return_data.vendor,
                return_data.order_no,
                return_data.fixture_code,
                return_data.serial_start,
                return_data.serial_end,
                return_data.serials,
                operator,
                return_data.note
            )
        )

        # 查詢剛建立的退料記錄
        return await get_return(return_id)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"建立退料記錄失敗: {str(e)}"
        )


@router.get("/{return_id}", response_model=ReturnResponse, summary="取得退料記錄")
async def get_return(return_id: int):
    """
    根據 ID 取得退料記錄

    - **return_id**: 退料記錄 ID
    """
    try:
        query = """
                SELECT id, \
                       type, \
                       vendor, \
                       order_no, \
                       fixture_code, \
                       serial_start, \
                       serial_end, \
                       serials, \
                       operator, \
                       note, \
                       created_at
                FROM returns_table
                WHERE id = %s \
                """

        result = db.execute_query(query, (return_id,))

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"退料記錄 {return_id} 不存在"
            )

        row = result[0]

        return ReturnResponse(
            id=row[0],
            return_type=row[1],
            vendor=row[2],
            order_no=row[3],
            fixture_code=row[4],
            serial_start=row[5],
            serial_end=row[6],
            serials=row[7],
            operator=row[8],
            note=row[9],
            created_at=row[10]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢退料記錄失敗: {str(e)}"
        )


@router.get("", response_model=ReturnListResponse, summary="查詢退料記錄列表")
async def list_returns(
        skip: int = Query(0, ge=0, description="略過筆數"),
        limit: int = Query(100, ge=1, le=1000, description="每頁筆數"),
        fixture_code: Optional[str] = Query(None, description="治具編號篩選"),
        vendor: Optional[str] = Query(None, description="廠商篩選"),
        order_no: Optional[str] = Query(None, description="單號篩選"),
        return_type: Optional[ReceiptType] = Query(None, description="退料類型篩選")
):
    """
    查詢退料記錄列表

    - **skip**: 略過筆數（分頁用）
    - **limit**: 每頁筆數（最多 1000）
    - **fixture_code**: 治具編號篩選
    - **vendor**: 廠商篩選
    - **order_no**: 單號篩選
    - **return_type**: 退料類型篩選 (batch/individual)

    回傳退料記錄列表和總筆數
    """
    try:
        # 建立 WHERE 條件
        where_conditions = []
        params = []

        if fixture_code:
            where_conditions.append("fixture_code = %s")
            params.append(fixture_code)

        if vendor:
            where_conditions.append("vendor LIKE %s")
            params.append(f"%{vendor}%")

        if order_no:
            where_conditions.append("order_no LIKE %s")
            params.append(f"%{order_no}%")

        if return_type:
            where_conditions.append("type = %s")
            params.append(return_type.value)

        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)

        # 查詢總筆數
        count_query = f"""
            SELECT COUNT(*)
            FROM returns_table
            {where_clause}
        """

        count_result = db.execute_query(count_query, tuple(params))
        total = count_result[0][0] if count_result else 0

        # 查詢退料記錄列表
        query = f"""
            SELECT 
                id, type, vendor, order_no, fixture_code,
                serial_start, serial_end, serials,
                operator, note, created_at
            FROM returns_table
            {where_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """

        params.extend([limit, skip])
        result = db.execute_query(query, tuple(params))

        returns = []
        for row in result:
            returns.append(ReturnResponse(
                id=row[0],
                return_type=row[1],
                vendor=row[2],
                order_no=row[3],
                fixture_code=row[4],
                serial_start=row[5],
                serial_end=row[6],
                serials=row[7],
                operator=row[8],
                note=row[9],
                created_at=row[10]
            ))

        return ReturnListResponse(
            total=total,
            returns=returns
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢退料記錄列表失敗: {str(e)}"
        )


@router.delete("/{return_id}", summary="刪除退料記錄")
async def delete_return(
        return_id: int,
        current_user: dict = Depends(get_current_user)
):
    """
    刪除退料記錄

    - **return_id**: 退料記錄 ID

    需要登入
    """
    try:
        # 檢查退料記錄是否存在
        check_query = "SELECT id FROM returns_table WHERE id = %s"
        existing = db.execute_query(check_query, (return_id,))

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"退料記錄 {return_id} 不存在"
            )

        # 刪除退料記錄
        delete_query = "DELETE FROM returns_table WHERE id = %s"
        db.execute_update(delete_query, (return_id,))

        return {
            "message": "退料記錄刪除成功",
            "return_id": return_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"刪除退料記錄失敗: {str(e)}"
        )


@router.get("/statistics/summary", summary="退料統計摘要")
async def get_returns_statistics():
    """
    取得退料統計摘要

    包含：
    - 總退料記錄數
    - 批量退料數
    - 少量退料數
    - 今日退料數
    - 本月退料數
    """
    try:
        query = """
                SELECT COUNT(*)                                                                                                       as total_returns, \
                       SUM(CASE WHEN type = 'batch' THEN 1 ELSE 0 END)                                                                as batch_returns, \
                       SUM(CASE WHEN type = 'individual' THEN 1 ELSE 0 END)                                                           as individual_returns, \
                       SUM(CASE WHEN DATE (created_at) = CURDATE() THEN 1 ELSE 0 END)                                                 as today_returns, \
                       SUM(CASE WHEN YEAR ( created_at) = YEAR(CURDATE()) 
                    AND MONTH(created_at) = MONTH(CURDATE()) THEN 1 ELSE 0 END) as month_returns
                FROM returns_table \
                """

        result = db.execute_query(query)
        row = result[0]

        return {
            "total_returns": row[0] or 0,
            "batch_returns": row[1] or 0,
            "individual_returns": row[2] or 0,
            "today_returns": row[3] or 0,
            "month_returns": row[4] or 0
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢統計資料失敗: {str(e)}"
        )


@router.get("/recent/list", response_model=ReturnListResponse, summary="最近退料記錄")
async def get_recent_returns(
        limit: int = Query(10, ge=1, le=100, description="記錄數")
):
    """
    取得最近的退料記錄

    - **limit**: 記錄數（預設 10，最多 100）

    用於儀表板顯示
    """
    try:
        query = """
                SELECT id, \
                       type, \
                       vendor, \
                       order_no, \
                       fixture_code, \
                       serial_start, \
                       serial_end, \
                       serials, \
                       operator, \
                       note, \
                       created_at
                FROM returns_table
                ORDER BY created_at DESC
                    LIMIT %s \
                """

        result = db.execute_query(query, (limit,))

        returns = []
        for row in result:
            returns.append(ReturnResponse(
                id=row[0],
                return_type=row[1],
                vendor=row[2],
                order_no=row[3],
                fixture_code=row[4],
                serial_start=row[5],
                serial_end=row[6],
                serials=row[7],
                operator=row[8],
                note=row[9],
                created_at=row[10]
            ))

        return ReturnListResponse(
            total=len(returns),
            returns=returns
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢最近退料記錄失敗: {str(e)}"
        )
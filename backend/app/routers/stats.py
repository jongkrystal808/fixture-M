"""
統計與儀表板 API
Stats & Dashboard API Routes
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import Dict, List, Any
from datetime import datetime
from backend.app.database import db
from backend.app.dependencies import get_current_user
from backend.app.models.log import LogStatisticsSummary

router = APIRouter(prefix="/stats", tags=["統計 Stats"])


# ==================== 公用工具 ====================

def _scalar_int(sql: str, params: tuple | None = None, key: str = "count") -> int:
    """安全取回單一整數（查不到回 0）"""
    try:
        row = db.execute_query(sql, params or ())
        if not row:
            return 0
        # DictCursor：以欄位名取值
        v = list(row[0].values())[0] if key not in row[0] else row[0][key]
        return int(v or 0)
    except Exception:
        return 0


def _recent_list(sql: str, params: tuple | None = None, limit: int = 5) -> List[Dict[str, Any]]:
    """取得最近清單"""
    try:
        return db.execute_query(sql + " LIMIT %s", (*(params or ()), limit))
    except Exception:
        return []


# ==================== 儀表板統計總覽 ====================

@router.get("/summary")
async def get_summary(current_user=Depends(get_current_user)) -> Dict[str, Any]:
    """
    儀表板統計總覽（給 /api/v2/stats/summary）
    """
    try:
        # 基本統計
        total_fixtures = _scalar_int("SELECT COUNT(*) AS count FROM fixtures")
        active_fixtures = _scalar_int(
            "SELECT COUNT(*) AS count FROM fixtures WHERE status='正常'"
        )

        # 需更換（若沒有視圖 view_fixture_status，回傳 0）
        need_replacement = _scalar_int(
            "SELECT COUNT(*) AS count FROM view_fixture_status WHERE replacement_status='需更換'"
        )

        # 收/退料統計
        today_receipts = _scalar_int(
            "SELECT COUNT(*) AS count FROM receipts WHERE DATE(created_at)=CURDATE()"
        )
        month_receipts = _scalar_int(
            "SELECT COUNT(*) AS count FROM receipts "
            "WHERE YEAR(created_at)=YEAR(CURDATE()) AND MONTH(created_at)=MONTH(CURDATE())"
        )

        today_returns = _scalar_int(
            "SELECT COUNT(*) AS count FROM returns_table WHERE DATE(created_at)=CURDATE()"
        )
        month_returns = _scalar_int(
            "SELECT COUNT(*) AS count FROM returns_table "
            "WHERE YEAR(created_at)=YEAR(CURDATE()) AND MONTH(created_at)=MONTH(CURDATE())"
        )

        # 最近清單（給首頁卡片使用）
        recent_receipts = _recent_list(
            "SELECT id, type, vendor, order_no, fixture_code, serial_start, serial_end, serials, "
            "operator, note, created_at FROM receipts ORDER BY created_at DESC",
            limit=5
        )
        recent_returns = _recent_list(
            "SELECT id, vendor, order_no, fixture_code, serials, operator, note, created_at "
            "FROM returns_table ORDER BY created_at DESC",
            limit=5
        )

        # 即將到期需更換（若沒有視圖欄位則忽略）
        try:
            upcoming_replacements = db.execute_query(
                "SELECT fixture_id, fixture_name, last_replacement_date, cycle_unit, replacement_cycle "
                "FROM view_fixture_status "
                "WHERE replacement_status='即將更換' "
                "ORDER BY last_replacement_date ASC LIMIT 10"
            )
        except Exception:
            upcoming_replacements = []

        return {
            "totals": {
                "fixtures": total_fixtures,
                "active": active_fixtures,
                "need_replacement": need_replacement,
            },
            "receipts": {
                "today": today_receipts,
                "month": month_receipts,
                "recent": recent_receipts,
            },
            "returns": {
                "today": today_returns,
                "month": month_returns,
                "recent": recent_returns,
            },
            "upcoming_replacements": upcoming_replacements,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"統計查詢失敗: {e}")


# ==================== 使用/更換記錄統計摘要 ====================

@router.get("/log-summary", response_model=LogStatisticsSummary, summary="記錄統計摘要")
async def get_logs_statistics():
    """
    取得使用與更換記錄統計摘要（給儀表板右側區塊）
    """
    try:
        # 使用記錄統計
        usage_query = """
            SELECT 
                COUNT(*) AS total_usage_logs,
                COALESCE(SUM(use_count), 0) AS total_uses,
                SUM(CASE WHEN abnormal_status IS NOT NULL THEN 1 ELSE 0 END) AS abnormal_logs,
                SUM(CASE WHEN DATE(used_at) = CURDATE() THEN 1 ELSE 0 END) AS today_usage_logs
            FROM usage_logs
        """
        usage_result = db.execute_query(usage_query)
        usage_row = usage_result[0] if usage_result else {
            "total_usage_logs": 0,
            "total_uses": 0,
            "abnormal_logs": 0,
            "today_usage_logs": 0
        }

        # 更換記錄統計
        replacement_query = """
            SELECT 
                COUNT(*) AS total_replacement_logs,
                SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS today_replacement_logs
            FROM replacement_logs
        """
        replacement_result = db.execute_query(replacement_query)
        replacement_row = replacement_result[0] if replacement_result else {
            "total_replacement_logs": 0,
            "today_replacement_logs": 0
        }

        # 需要更換的治具數
        need_replace_query = """
            SELECT COUNT(*) AS need_replace_count
            FROM view_fixture_status
            WHERE replacement_status = '需更換'
        """
        need_replace_result = db.execute_query(need_replace_query)
        need_replace = need_replace_result[0]["need_replace_count"] if need_replace_result else 0

        return LogStatisticsSummary(
            total_usage_logs=usage_row["total_usage_logs"] or 0,
            total_replacement_logs=replacement_row["total_replacement_logs"] or 0,
            total_uses=usage_row["total_uses"] or 0,
            abnormal_logs=usage_row["abnormal_logs"] or 0,
            fixtures_need_replacement=need_replace,
            today_usage_logs=usage_row["today_usage_logs"] or 0,
            today_replacement_logs=replacement_row["today_replacement_logs"] or 0
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢記錄統計資料失敗: {str(e)}"
        )

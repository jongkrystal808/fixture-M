"""Backend package exports for tests and application setup."""

from backend.config import settings
from backend.app.database import db


def check_database_ready() -> tuple[bool, str]:
    """
    確認資料庫連線與基本結構是否可用。

    Returns:
        tuple[bool, str]: (是否就緒, 訊息)
    """
    try:
        if not db.check_connection():
            return False, "資料庫連線失敗或未啟動"

        tables = db.get_table_list()
        if tables:
            return True, f"資料庫就緒，找到 {len(tables)} 個表格"
        return False, "資料庫連線成功但尚未建立任何表格"
    except Exception as exc:  # pragma: no cover - 防禦性錯誤訊息
        return False, f"資料庫檢查失敗: {exc}"


__all__ = ["settings", "db", "check_database_ready"]
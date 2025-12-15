"""
資料庫連接池（DBUtils + PyMySQL）
--------------------------------
支援：
- 自動重連
- 連線池 (PooledDB)
- Stored Procedure (CALL)
- SP OUT 參數讀取
- execute_query / insert / update / delete
"""

from dbutils.pooled_db import PooledDB
import pymysql
from typing import Any, Dict, List, Tuple, Optional
from backend.config import settings


class Database:
    def __init__(self):
        # 正式連線池（cursorclass 不能放這邊）
        self.pool = PooledDB(
            creator=pymysql,
            maxconnections=20,
            mincached=2,
            maxcached=5,
            blocking=True,
            ping=1,  # 1 = check connection before use
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASS,
            database=settings.DB_NAME,
            charset="utf8mb4",
            autocommit=False
        )

    # --------------------------------------------------------
    # 基礎方法：取得連線
    # --------------------------------------------------------
    def get_conn(self):
        return self.pool.connection()

    # --------------------------------------------------------
    # Query Methods
    # --------------------------------------------------------
    def execute_query(self, sql: str, params: Optional[Tuple] = None) -> List[Dict[str, Any]]:
        conn = self.get_conn()
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute(sql, params or ())
                return cursor.fetchall()
        finally:
            conn.close()

    def execute_one(self, sql: str, params: Optional[Tuple] = None) -> Optional[Dict[str, Any]]:
        conn = self.get_conn()
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute(sql, params or ())
                return cursor.fetchone()
        finally:
            conn.close()

    def execute_update(self, sql: str, params: Optional[Tuple] = None) -> int:
        conn = self.get_conn()
        try:
            with conn.cursor() as cursor:
                affected = cursor.execute(sql, params or ())
            conn.commit()
            return affected
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def execute_insert(self, sql: str, params: Optional[Tuple] = None) -> int:
        conn = self.get_conn()
        try:
            with conn.cursor() as cursor:
                cursor.execute(sql, params or ())
                new_id = cursor.lastrowid
            conn.commit()
            return new_id
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    # --------------------------------------------------------
    # Stored Procedure with OUT parameters
    # --------------------------------------------------------
    def call_sp_with_out(self, proc_name: str, args: list, out_names: list):
        """
        呼叫 SP，例如：
            CALL sp_insert_usage_log(%s,%s,...,@o_count,@o_msg)

        out_names = ["o_inserted_count", "o_message"]
        """
        conn = self.get_conn()
        try:
            cursor = conn.cursor(pymysql.cursors.DictCursor)

            # 初始化 OUT 參數
            for out_name in out_names:
                cursor.execute(f"SET @{out_name} = NULL;")

            # 組 CALL 語句
            placeholders = ",".join(["%s"] * len(args))
            out_placeholders = ",".join([f"@{name}" for name in out_names])
            call_sql = f"CALL {proc_name}({placeholders},{out_placeholders});"

            cursor.execute(call_sql, args)

            # 取得 OUT 參數
            out_sql = "SELECT " + ",".join([f"@{name} AS {name}" for name in out_names])
            cursor.execute(out_sql)
            out_data = cursor.fetchone()

            conn.commit()
            return out_data

        except Exception as e:
            conn.rollback()
            raise e

        finally:
            cursor.close()
            conn.close()

    def check_connection(self):
        """測試是否能成功取得連線（給 startup event 使用）"""
        try:
            conn = self.get_conn()
            conn.close()
            return True
        except Exception:
            return False


# 全域 DB 實例
db = Database()

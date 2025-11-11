"""
配置管理模組
負責載入環境變數和系統配置
"""
import os
from typing import Optional
from pathlib import Path


class Settings:
    """系統配置類別"""

    # 資料庫配置
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
    DB_NAME: str = os.getenv("DB_NAME", "fixture_management")
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASS: str = os.getenv("DB_PASS", "Chch1014")

    # API 配置
    API_TITLE: str = "治具管理系統 API"
    API_VERSION: str = "2.0.0"
    API_DESCRIPTION: str = "治具生命週期管理系統的後端 API"

    # CORS 配置
    CORS_ORIGINS: list = ["*"]  # 生產環境應改為具體域名

    # JWT 配置 (未來擴充用)
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # 檔案上傳配置
    UPLOAD_DIR: Path = Path(__file__).parent.parent / "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    # 分頁配置
    DEFAULT_PAGE_SIZE: int = 10
    MAX_PAGE_SIZE: int = 100

    # 資料庫連接配置
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600

    # 重試配置
    DB_RETRY_TIMES: int = 10
    DB_RETRY_DELAY: float = 2.0

    @property
    def DATABASE_URL(self) -> str:
        """獲取資料庫連接 URL"""
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASS}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"

    def __init__(self):
        """初始化時確保上傳目錄存在"""
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# 建立全域配置實例
settings = Settings()


def load_env_file(env_path: str = ".env"):
    print("DEBUG config.py __file__ =", __file__)
    """
    載入 .env 檔案

    Args:
        env_path: .env 檔案路徑
    """
    env_file = Path(__file__).parent / env_path
    print("DEBUG searching for .env at =", env_file)
    if not env_file.exists():
        print(f"⚠️  警告: 找不到 {env_path} 檔案")
        return

    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                try:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
                except ValueError:
                    continue

    print(f"✅ 已載入環境變數從 {env_path}")


# 自動載入 .env
load_env_file()
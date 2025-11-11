"""
密碼加密工具模組
提供密碼雜湊和驗證功能
"""
import hashlib
import secrets
from typing import Tuple


def hash_password(password: str) -> str:
    """
    使用 SHA-256 雜湊密碼

    Args:
        password: 明文密碼

    Returns:
        雜湊後的密碼 (hex 格式)
    """
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    驗證密碼是否正確

    Args:
        plain_password: 明文密碼
        hashed_password: 雜湊後的密碼

    Returns:
        是否匹配
    """
    return hash_password(plain_password) == hashed_password


def generate_random_password(length: int = 12) -> str:
    """
    生成隨機密碼

    Args:
        length: 密碼長度

    Returns:
        隨機密碼
    """
    # 包含大小寫字母和數字
    alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_token(length: int = 32) -> str:
    """
    生成隨機 token

    Args:
        length: token 長度 (位元組數)

    Returns:
        隨機 token (hex 格式)
    """
    return secrets.token_hex(length)


# 密碼強度檢查
def check_password_strength(password: str) -> Tuple[bool, str]:
    """
    檢查密碼強度

    Args:
        password: 要檢查的密碼

    Returns:
        (是否通過, 錯誤訊息)
    """
    if len(password) < 6:
        return False, "密碼長度至少需要 6 個字元"

    # 可以根據需求加入更多規則
    # has_upper = any(c.isupper() for c in password)
    # has_lower = any(c.islower() for c in password)
    # has_digit = any(c.isdigit() for c in password)

    return True, "密碼強度符合要求"
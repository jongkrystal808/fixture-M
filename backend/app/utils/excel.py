"""
資料驗證工具模組
提供常用的資料驗證函數
"""
import re
from typing import Optional, List
from datetime import datetime


def is_valid_email(email: str) -> bool:
    """
    驗證 Email 格式

    Args:
        email: Email 字串

    Returns:
        是否有效
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def is_valid_date(date_str: str, format: str = "%Y-%m-%d") -> bool:
    """
    驗證日期格式

    Args:
        date_str: 日期字串
        format: 日期格式

    Returns:
        是否有效
    """
    try:
        datetime.strptime(date_str, format)
        return True
    except ValueError:
        return False


def is_valid_fixture_id(fixture_id: str) -> bool:
    """
    驗證治具 ID 格式

    Args:
        fixture_id: 治具 ID

    Returns:
        是否有效
    """
    # 允許字母、數字、連字號和底線，長度 1-50
    pattern = r'^[A-Za-z0-9\-_]{1,50}$'
    return bool(re.match(pattern, fixture_id))


def is_valid_serial_range(start: str, end: str) -> bool:
    """
    驗證序號範圍是否有效

    Args:
        start: 起始序號
        end: 結束序號

    Returns:
        是否有效
    """
    try:
        # 提取數字部分進行比較
        start_num = int(re.search(r'\d+', start).group())
        end_num = int(re.search(r'\d+', end).group())
        return start_num <= end_num
    except:
        return False


def parse_serial_list(serials: str) -> List[str]:
    """
    解析序號列表字串

    Args:
        serials: 序號字串 (逗號分隔)

    Returns:
        序號列表
    """
    if not serials:
        return []

    # 分割並去除空白
    serial_list = [s.strip() for s in serials.split(',')]
    # 過濾空字串
    return [s for s in serial_list if s]


def generate_serial_range(prefix: str, start: int, end: int) -> List[str]:
    """
    生成序號範圍

    Args:
        prefix: 前綴
        start: 起始數字
        end: 結束數字

    Returns:
        序號列表
    """
    if start > end:
        return []

    # 計算需要的零填充長度
    width = len(str(end))
    return [f"{prefix}{str(i).zfill(width)}" for i in range(start, end + 1)]


def sanitize_string(text: str, max_length: Optional[int] = None) -> str:
    """
    清理字串 (移除危險字元)

    Args:
        text: 要清理的字串
        max_length: 最大長度

    Returns:
        清理後的字串
    """
    if not text:
        return ""

    # 移除控制字元
    cleaned = ''.join(char for char in text if ord(char) >= 32 or char == '\n')

    # 限制長度
    if max_length and len(cleaned) > max_length:
        cleaned = cleaned[:max_length]

    return cleaned.strip()


def is_positive_number(value: any) -> bool:
    """
    檢查是否為正數

    Args:
        value: 要檢查的值

    Returns:
        是否為正數
    """
    try:
        num = float(value)
        return num > 0
    except:
        return False


def is_non_negative_number(value: any) -> bool:
    """
    檢查是否為非負數

    Args:
        value: 要檢查的值

    Returns:
        是否為非負數
    """
    try:
        num = float(value)
        return num >= 0
    except:
        return False
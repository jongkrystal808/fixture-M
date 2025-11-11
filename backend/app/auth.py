"""
JWT 認證工具模組
JWT Authentication Utilities

提供 JWT Token 的生成、驗證和解析功能
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext

# JWT 設定
SECRET_KEY = "your-secret-key-here-please-change-in-production"  # 生產環境請更換
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 天

# 密碼加密上下文 (使用 bcrypt，比 SHA-256 更安全)
# 但為了兼容舊系統，我們也提供 SHA-256 的支援
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    驗證密碼

    Args:
        plain_password: 明文密碼
        hashed_password: 雜湊密碼

    Returns:
        bool: 密碼是否正確
    """
    try:
        # 先嘗試 bcrypt 驗證
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # 如果失敗，嘗試 SHA-256 驗證 (兼容舊系統)
        from backend.app.utils.password import verify_password as verify_sha256
        return verify_sha256(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    取得密碼雜湊值 (使用 bcrypt)

    Args:
        password: 明文密碼

    Returns:
        str: 雜湊密碼
    """
    return pwd_context.hash(password)


def create_access_token(
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
) -> str:
    """
    建立 JWT Access Token

    Args:
        data: 要編碼的資料 (通常包含 user_id, username, role)
        expires_delta: 過期時間增量 (可選)

    Returns:
        str: JWT Token

    Example:
        >>> token = create_access_token(
        ...     data={"sub": "user001", "user_id": 1, "role": "admin"}
        ... )
    """
    to_encode = data.copy()

    # 設定過期時間
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    # 編碼 JWT
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    驗證並解析 JWT Token

    Args:
        token: JWT Token

    Returns:
        Optional[Dict]: Token 中的資料，如果驗證失敗則返回 None

    Example:
        >>> payload = verify_token(token)
        >>> if payload:
        ...     user_id = payload.get("user_id")
        ...     username = payload.get("sub")
    """
    try:
        # 解碼 JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def decode_token(token: str) -> Dict[str, Any]:
    """
    解碼 JWT Token (不驗證)

    Args:
        token: JWT Token

    Returns:
        Dict: Token 中的資料

    Raises:
        JWTError: 如果 Token 格式錯誤
    """
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def get_token_username(token: str) -> Optional[str]:
    """
    從 Token 中取得使用者名稱

    Args:
        token: JWT Token

    Returns:
        Optional[str]: 使用者名稱，如果驗證失敗則返回 None
    """
    payload = verify_token(token)
    if payload:
        return payload.get("sub")
    return None


def get_token_user_id(token: str) -> Optional[int]:
    """
    從 Token 中取得使用者 ID

    Args:
        token: JWT Token

    Returns:
        Optional[int]: 使用者 ID，如果驗證失敗則返回 None
    """
    payload = verify_token(token)
    if payload:
        return payload.get("user_id")
    return None


def get_token_user_role(token: str) -> Optional[str]:
    """
    從 Token 中取得使用者角色

    Args:
        token: JWT Token

    Returns:
        Optional[str]: 使用者角色，如果驗證失敗則返回 None
    """
    payload = verify_token(token)
    if payload:
        return payload.get("role")
    return None


def is_token_expired(token: str) -> bool:
    """
    檢查 Token 是否過期

    Args:
        token: JWT Token

    Returns:
        bool: Token 是否過期
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = payload.get("exp")
        if exp:
            # 轉換 Unix timestamp 為 datetime
            exp_datetime = datetime.fromtimestamp(exp)
            return exp_datetime < datetime.utcnow()
        return True
    except JWTError:
        return True


def refresh_token(old_token: str) -> Optional[str]:
    """
    刷新 Token (重新生成新的 Token)

    Args:
        old_token: 舊的 JWT Token

    Returns:
        Optional[str]: 新的 JWT Token，如果舊 Token 無效則返回 None
    """
    payload = verify_token(old_token)
    if not payload:
        return None

    # 移除舊的過期時間
    payload.pop("exp", None)

    # 建立新 Token
    return create_access_token(data=payload)


# ==================== Token 提取工具 ====================

def extract_token_from_header(authorization: str) -> Optional[str]:
    """
    從 Authorization header 中提取 Token

    Args:
        authorization: Authorization header 值 (格式: "Bearer <token>")

    Returns:
        Optional[str]: Token，如果格式錯誤則返回 None

    Example:
        >>> token = extract_token_from_header("Bearer abc123...")
        >>> print(token)  # "abc123..."
    """
    if not authorization:
        return None

    parts = authorization.split()

    if len(parts) != 2:
        return None

    scheme, token = parts

    if scheme.lower() != "bearer":
        return None

    return token


# ==================== 管理員權限檢查 ====================

def is_admin(token: str) -> bool:
    """
    檢查 Token 是否為管理員

    Args:
        token: JWT Token

    Returns:
        bool: 是否為管理員
    """
    role = get_token_user_role(token)
    return role == "admin"


def require_admin(token: str) -> bool:
    """
    要求管理員權限 (如果不是管理員則拋出異常)

    Args:
        token: JWT Token

    Returns:
        bool: True (如果是管理員)

    Raises:
        PermissionError: 如果不是管理員
    """
    if not is_admin(token):
        raise PermissionError("需要管理員權限")
    return True


# ==================== Token 資訊類 ====================

class TokenData:
    """Token 資料類別"""

    def __init__(self, token: str):
        """
        初始化 Token 資料

        Args:
            token: JWT Token
        """
        self.token = token
        self.payload = verify_token(token)
        self.is_valid = self.payload is not None

    @property
    def username(self) -> Optional[str]:
        """取得使用者名稱"""
        if self.payload:
            return self.payload.get("sub")
        return None

    @property
    def user_id(self) -> Optional[int]:
        """取得使用者 ID"""
        if self.payload:
            return self.payload.get("user_id")
        return None

    @property
    def role(self) -> Optional[str]:
        """取得使用者角色"""
        if self.payload:
            return self.payload.get("role")
        return None

    @property
    def is_admin(self) -> bool:
        """是否為管理員"""
        return self.role == "admin"

    @property
    def expires_at(self) -> Optional[datetime]:
        """取得過期時間"""
        if self.payload:
            exp = self.payload.get("exp")
            if exp:
                return datetime.fromtimestamp(exp)
        return None

    @property
    def is_expired(self) -> bool:
        """是否過期"""
        if not self.is_valid:
            return True

        expires_at = self.expires_at
        if expires_at:
            return expires_at < datetime.utcnow()
        return True

    def to_dict(self) -> Dict[str, Any]:
        """轉換為字典"""
        return {
            "username": self.username,
            "user_id": self.user_id,
            "role": self.role,
            "is_admin": self.is_admin,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "is_expired": self.is_expired,
            "is_valid": self.is_valid
        }


# ==================== 使用範例 ====================

if __name__ == "__main__":
    # 測試密碼雜湊
    password = "admin123"
    hashed = get_password_hash(password)
    print(f"密碼雜湊: {hashed}")
    print(f"驗證結果: {verify_password(password, hashed)}")

    # 測試 Token 生成
    token = create_access_token(
        data={
            "sub": "admin",
            "user_id": 1,
            "role": "admin"
        }
    )
    print(f"\nToken: {token}")

    # 測試 Token 驗證
    payload = verify_token(token)
    print(f"\nToken Payload: {payload}")

    # 測試 TokenData 類別
    token_data = TokenData(token)
    print(f"\nToken Data:")
    print(f"  Username: {token_data.username}")
    print(f"  User ID: {token_data.user_id}")
    print(f"  Role: {token_data.role}")
    print(f"  Is Admin: {token_data.is_admin}")
    print(f"  Expires At: {token_data.expires_at}")
    print(f"  Is Expired: {token_data.is_expired}")
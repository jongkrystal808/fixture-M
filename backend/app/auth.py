"""
JWT 認證與密碼處理模組
Authentication and Password Utilities
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status

# ============================================
# JWT 基本設定
# ============================================
SECRET_KEY = "your-secret-key-here-please-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 天

# 密碼加密設定
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================
# 密碼處理
# ============================================
def get_password_hash(password: str) -> str:
    """取得密碼雜湊值 (bcrypt)"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """驗證密碼（同時支援 bcrypt 與舊版 SHA256）"""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # 舊版兼容：使用 SHA256
        from backend.app.utils.password import verify_password as verify_sha256
        return verify_sha256(plain_password, hashed_password)


# ✅ 向後相容名稱，讓其他模組可 import hash_password
hash_password = get_password_hash


# ============================================
# JWT Token 生成與驗證
# ============================================
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """建立 JWT Access Token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """驗證 JWT Token 並解析"""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def decode_token(token: str) -> Dict[str, Any]:
    """解碼 JWT Token（若無效會拋出例外）"""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


# ============================================
# Token 解析工具
# ============================================
def get_token_user(token: str) -> Optional[Dict[str, Any]]:
    """從 Token 解析出使用者資訊"""
    payload = verify_token(token)
    if not payload:
        return None
    return {
        "user_id": payload.get("user_id"),
        "username": payload.get("sub"),
        "role": payload.get("role"),
    }


# ============================================
# Admin 權限檢查
# ============================================
def get_token_user_role(token: str) -> Optional[str]:
    """從 Token 中取得角色"""
    payload = verify_token(token)
    if payload:
        return payload.get("role")
    return None


def is_admin(token: str) -> bool:
    """檢查是否為管理員"""
    role = get_token_user_role(token)
    return role == "admin"


def require_admin(token: str) -> bool:
    """
    檢查 Token 是否具管理員權限
    非 admin 時會直接 raise HTTP 403
    """
    if not is_admin(token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理員權限"
        )
    return True


# ============================================
# 工具：檢查 Token 是否過期
# ============================================
def is_token_expired(token: str) -> bool:
    """檢查 Token 是否過期"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = payload.get("exp")
        if exp:
            exp_datetime = datetime.fromtimestamp(exp)
            return exp_datetime < datetime.utcnow()
        return True
    except JWTError:
        return True


# ============================================
# 範例測試
# ============================================
if __name__ == "__main__":
    password = "admin123"
    hashed = get_password_hash(password)
    print(f"密碼雜湊: {hashed}")
    print(f"驗證結果: {verify_password(password, hashed)}")

    token = create_access_token({"sub": "admin", "user_id": 1, "role": "admin"})
    print(f"\nToken: {token}")

    payload = verify_token(token)
    print(f"\nToken Payload: {payload}")

    print(f"\n是否為管理員: {is_admin(token)}")

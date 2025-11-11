"""
基礎設施測試腳本
測試配置、資料庫連接和工具函數
"""
import sys
import os

# 添加 app 目錄到路徑
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from backend import settings
from backend import db, check_database_ready
from backend.app.utils import hash_password, verify_password, is_valid_email


def test_config():
    """測試配置"""
    print("\n" + "=" * 50)
    print("測試 1: 配置模組")
    print("=" * 50)

    print(f"✓ 資料庫主機: {settings.DB_HOST}")
    print(f"✓ 資料庫埠號: {settings.DB_PORT}")
    print(f"✓ 資料庫名稱: {settings.DB_NAME}")
    print(f"✓ 資料庫使用者: {settings.DB_USER}")
    print(f"✓ API 標題: {settings.API_TITLE}")
    print(f"✓ API 版本: {settings.API_VERSION}")
    print(f"✓ 上傳目錄: {settings.UPLOAD_DIR}")

    return True


def test_database():
    """測試資料庫連接"""
    print("\n" + "=" * 50)
    print("測試 2: 資料庫連接")
    print("=" * 50)

    try:
        # 測試查詢
        result = db.execute_one("SELECT VERSION() as version")
        if result:
            print(f"✓ MySQL 版本: {result['version']}")

        # 測試資料庫是否就緒
        is_ready, message = check_database_ready()
        if is_ready:
            print(f"✓ {message}")
        else:
            print(f"⚠️  {message}")
            print("   提示: 請先執行 init_database.sql 初始化資料庫")

        # 列出所有表格
        tables = db.execute_query("""
                                  SELECT table_name
                                  FROM information_schema.tables
                                  WHERE table_schema = %s
                                  ORDER BY table_name
                                  """, (settings.DB_NAME,))

        if tables:
            print(f"✓ 找到 {len(tables)} 個表格:")
            for table in tables:
                print(f"  - {table['table_name']}")

        return True

    except Exception as e:
        print(f"✗ 資料庫連接失敗: {e}")
        return False


def test_utils():
    """測試工具函數"""
    print("\n" + "=" * 50)
    print("測試 3: 工具函數")
    print("=" * 50)

    # 測試密碼加密
    password = "test123"
    hashed = hash_password(password)
    print(f"✓ 密碼加密: {password} -> {hashed[:20]}...")

    # 測試密碼驗證
    is_valid = verify_password(password, hashed)
    print(f"✓ 密碼驗證: {is_valid}")

    # 測試 Email 驗證
    test_emails = [
        ("test@example.com", True),
        ("invalid-email", False),
        ("user@domain.co.uk", True),
    ]

    print("✓ Email 驗證:")
    for email, expected in test_emails:
        result = is_valid_email(email)
        status = "✓" if result == expected else "✗"
        print(f"  {status} {email}: {result}")

    return True


def main():
    """執行所有測試"""
    print("\n" + "=" * 70)
    print(" " * 20 + "治具管理系統 - 基礎設施測試")
    print("=" * 70)

    results = []

    # 執行測試
    results.append(("配置模組", test_config()))
    results.append(("資料庫連接", test_database()))
    results.append(("工具函數", test_utils()))

    # 顯示總結
    print("\n" + "=" * 50)
    print("測試總結")
    print("=" * 50)

    for name, result in results:
        status = "✓ 通過" if result else "✗ 失敗"
        print(f"{status}: {name}")

    all_passed = all(result for _, result in results)

    if all_passed:
        print("\n🎉 所有測試通過！可以繼續開發下一階段。")
    else:
        print("\n⚠️  部分測試失敗，請檢查配置和資料庫連接。")

    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
# backend/app/routers/customers.py

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List, Any
from backend.app.database import db
from backend.app.dependencies import get_current_user

# ✔ 直接使用 models/customer.py 的正確模型
from backend.app.models.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse
)

router = APIRouter(
    prefix="/customers",
    tags=["客戶管理 Customers"]
)


# =======================
# API Endpoints
# =======================

@router.get("", response_model=List[CustomerResponse])
async def list_customers(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    user=Depends(get_current_user)
):
    """取得客戶列表"""

    base_sql = """
        SELECT 
            id, customer_abbr, contact_person, contact_phone,
            is_active, note, created_at, updated_at
        FROM customers
    """

    params: List[Any] = []

    if search:
        base_sql += """
        WHERE id LIKE %s OR customer_abbr LIKE %s OR contact_person LIKE %s
        """
        like = f"%{search}%"
        params.extend([like, like, like])

    base_sql += " ORDER BY id LIMIT %s OFFSET %s"
    params.extend([limit, skip])

    rows = db.execute_query(base_sql, tuple(params))
    return rows


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, user=Depends(get_current_user)):
    """取得單一客戶"""
    sql = """
        SELECT 
            id, customer_abbr, contact_person, contact_phone,
            is_active, note, created_at, updated_at
        FROM customers
        WHERE id = %s
    """
    rows = db.execute_query(sql, (customer_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="客戶不存在")
    return rows[0]


@router.post("", response_model=CustomerResponse)
async def create_customer(data: CustomerCreate, user=Depends(get_current_user)):
    """新增客戶"""
    # 檢查重複
    check = db.execute_query("SELECT id FROM customers WHERE id=%s", (data.id,))
    if check:
        raise HTTPException(status_code=400, detail="客戶 ID 已存在")

    sql = """
        INSERT INTO customers (id, customer_abbr, contact_person,
            contact_phone, is_active, note)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    db.execute_update(sql, (
        data.id, data.customer_abbr, data.contact_person,
        data.contact_phone, data.is_active, data.note
    ))
    return await get_customer(data.id)


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, data: CustomerUpdate, user=Depends(get_current_user)):
    """更新客戶"""
    # 檢查是否存在
    check = db.execute_query("SELECT id FROM customers WHERE id=%s", (customer_id,))
    if not check:
        raise HTTPException(status_code=404, detail="客戶不存在")

    fields = []
    params = []
    for key, value in data.dict(exclude_unset=True).items():
        fields.append(f"{key}=%s")
        params.append(value)

    if not fields:
        return await get_customer(customer_id)

    params.append(customer_id)
    sql = f"UPDATE customers SET {', '.join(fields)} WHERE id=%s"
    db.execute_update(sql, tuple(params))

    return await get_customer(customer_id)


@router.delete("/{customer_id}")
async def delete_customer(customer_id: str, user=Depends(get_current_user)):
    """停用客戶（軟刪除）"""
    sql = "UPDATE customers SET is_active=0 WHERE id=%s"
    result = db.execute_update(sql, (customer_id,))

    if result == 0:
        raise HTTPException(status_code=404, detail="客戶不存在")

    return {"message": "客戶已停用"}

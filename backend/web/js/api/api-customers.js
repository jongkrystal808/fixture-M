/**
 * 客戶 Customers API (v3.0)
 * api-customers.js
 *
 * 後端 routers/customers.py：
 *
 * GET    /customers
 * GET    /customers/{customer_id}
 * POST   /customers
 * PUT    /customers/{customer_id}
 * DELETE /customers/{customer_id}
 */

/* ============================================================
 * 查詢客戶清單（支援搜尋 / 分頁）
 * ============================================================ */

/**
 * 查詢客戶列表
 * @param {object} params
 * {
 *   page,
 *   pageSize,
 *   search
 * }
 */
async function apiListCustomers(params = {}) {
  const {
    page = 1,
    pageSize = 50,
    search = ""
  } = params;

  const query = new URLSearchParams();
  query.set("skip", String((page - 1) * pageSize));
  query.set("limit", String(pageSize));
  if (search) query.set("search", search);

  return api(`/customers?${query.toString()}`);
}

/* ============================================================
 * 查詢單一客戶
 * ============================================================ */

async function apiGetCustomer(customerId) {
  return api(`/customers/${encodeURIComponent(customerId)}`);
}

/* ============================================================
 * 新增客戶
 * ============================================================ */

/**
 * payload:
 * {
 *   customer_id: "",
 *   customer_name: "",
 *   note: ""
 * }
 */
async function apiCreateCustomer(payload) {
  return api("/customers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

/* ============================================================
 * 更新客戶
 * ============================================================ */

async function apiUpdateCustomer(customerId, payload) {
  return api(`/customers/${encodeURIComponent(customerId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

/* ============================================================
 * 刪除客戶
 * ============================================================ */

async function apiDeleteCustomer(customerId) {
  return api(`/customers/${encodeURIComponent(customerId)}`, {
    method: "DELETE"
  });
}

/* ============================================================
 * 導出全域
 * ============================================================ */

window.apiListCustomers = apiListCustomers;
window.apiGetCustomer = apiGetCustomer;
window.apiCreateCustomer = apiCreateCustomer;
window.apiUpdateCustomer = apiUpdateCustomer;
window.apiDeleteCustomer = apiDeleteCustomer;

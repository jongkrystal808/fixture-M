/**
 * 使用者管理 API (v3.0)
 * api-users.js
 *
 * 對應後端 routers/user.py：
 *
 * GET    /users
 * GET    /users/{id}
 * POST   /users
 * PUT    /users/{id}
 * DELETE /users/{id}
 * POST   /users/reset-password
 */

// ============================================================
// 取得使用者列表（支援搜尋 / 角色過濾 / 狀態過濾 / 分頁）
// ============================================================

/**
 * 查詢使用者清單
 * @param {object} params
 * {
 *   page,
 *   pageSize,
 *   search,      // username / full_name / email
 *   role,        // admin / user
 *   is_active,   // 1 or 0
 * }
 */
async function apiListUsers(params = {}) {
  const {
    page = 1,
    pageSize = 20,
    search = "",
    role = "",
    is_active = ""
  } = params;

  const query = new URLSearchParams();
  query.set("skip", String((page - 1) * pageSize));
  query.set("limit", String(pageSize));

  if (search) query.set("search", search);
  if (role) query.set("role", role);
  if (is_active !== "") query.set("is_active", is_active);

  return api(`/users?${query.toString()}`);
}

// ============================================================
// 查詢單一使用者
// ============================================================

async function apiGetUser(userId) {
  return api(`/users/${encodeURIComponent(userId)}`);
}

// ============================================================
// 新增使用者
// ============================================================

/**
 * payload 格式：
 * {
 *   username: "",
 *   full_name: "",
 *   email: "",
 *   role: "admin" | "user",
 *   password: "",
 *   is_active: true/false
 * }
 */
async function apiCreateUser(payload) {
  return api("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ============================================================
// 更新使用者
// ============================================================

async function apiUpdateUser(userId, payload) {
  return api(`/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

// ============================================================
// 刪除使用者
// ============================================================

async function apiDeleteUser(userId) {
  return api(`/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

// ============================================================
// 重設密碼
// ============================================================

/**
 * 後端格式：
 * {
 *   user_id: "",
 *   new_password: ""
 * }
 */
async function apiResetPassword(userId, newPassword) {
  return api("/users/reset-password", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      new_password: newPassword
    })
  });
}

// ============================================================
// 導出到全域
// ============================================================

window.apiListUsers = apiListUsers;
window.apiGetUser = apiGetUser;
window.apiCreateUser = apiCreateUser;
window.apiUpdateUser = apiUpdateUser;
window.apiDeleteUser = apiDeleteUser;
window.apiResetPassword = apiResetPassword;

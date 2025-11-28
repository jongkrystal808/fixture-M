/**
 * 認證 API (優化版)
 * - 自動略過 customer_id
 * - 錯誤傳遞更完整
 */

/* ============================================================
 * 登入
 * ============================================================ */

async function apiLogin(username, password) {
  return api("/auth/login", {
    method: "POST",
    body: { username, password },  // 讓 api() 自動 stringify
    skipCustomerId: true,          // 登入不能帶 customer_id
    skipAuth: true                 // 登入不需要 Bearer token
  });
}

/* ============================================================
 * 取得目前登入使用者
 * ============================================================ */

async function apiGetMe() {
  return api("/auth/me", {
    skipCustomerId: true   // /auth/me 不需要 customer_id
  });
}

/* ============================================================
 * 導出
 * ============================================================ */

window.apiLogin = apiLogin;
window.apiGetMe = apiGetMe;

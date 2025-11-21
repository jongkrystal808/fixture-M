/**
 * 認證 API (v3.0)
 * api-auth.js
 *
 * ✔ /auth/login
 * ✔ /auth/me
 * ✔ 自動處理 token 存取
 */

/* ============================================================
 * 登入
 * ============================================================ */

/**
 * 呼叫後端登入 API
 * @param {string} username
 * @param {string} password
 */
async function apiLogin(username, password) {
  const result = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  // 自動儲存 Token
  if (result && result.access_token) {
    localStorage.setItem('auth_token', result.access_token);
  }

  return result;
}

/* ============================================================
 * 取得目前登入使用者
 * ============================================================ */

async function apiGetMe() {
  return api('/auth/me');
}

/* ============================================================
 * 匯出到全域
 * ============================================================ */

window.apiLogin = apiLogin;
window.apiGetMe = apiGetMe;

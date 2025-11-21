/**
 * 前端登入與權限控制 (v3.0)
 * app-auth.js
 *
 * ✔ Login / Logout
 * ✔ 自動儲存 Token
 * ✔ 載入登入者資訊
 * ✔ 控制 admin 權限
 * ✔ 401 自動跳出登入視窗
 */

/* ============================================================
 * Login Modal 控制
 * ============================================================ */

function showLoginModal() {
  document.getElementById("loginModal").classList.remove("hidden");
}

function hideLoginModal() {
  document.getElementById("loginModal").classList.add("hidden");
}

/* ============================================================
 * Login
 * ============================================================ */

async function doLogin() {
  const username = document.getElementById("loginId").value.trim();
  const password = document.getElementById("loginPwd").value.trim();

  if (!username || !password) {
    return toast("請輸入帳號與密碼", "error");
  }

  try {
    const result = await apiLogin(username, password);

    if (result && result.access_token) {
      toast("登入成功");
      hideLoginModal();
      await loadCurrentUser();
    } else {
      toast("登入失敗，請確認帳號密碼", "error");
    }

  } catch (err) {
    console.error("Login error:", err);
    toast("登入失敗", "error");
  }
}

/* ============================================================
 * Logout
 * ============================================================ */

function doLogout() {
  localStorage.removeItem("auth_token");
  toast("已登出");
  showLoginModal();
}

/* ============================================================
 * 載入目前登入者資訊 (apiGetMe)
 * ============================================================ */

async function loadCurrentUser() {
  try {
    const me = await apiGetMe();

    // 顯示使用者名稱
    const nameBox = document.getElementById("currentUserDisplay");
    if (nameBox) nameBox.innerText = `${me.username} (${me.role})`;

    // 控制 admin 相關按鈕
    toggleAdminFeatures(me.role === "admin");

  } catch (err) {
    // 如果 token 失效 → 自動跳登入
    console.warn("未登入或 token 過期，自動跳出登入");
    showLoginModal();
  }
}

/* ============================================================
 * 控制後台管理 Tab
 * ============================================================ */

function toggleAdminFeatures(isAdmin) {
  const adminTab = document.querySelector('[data-tab="admin"]');
  if (!adminTab) return;

  if (isAdmin) {
    adminTab.classList.remove("hidden");
  } else {
    adminTab.classList.add("hidden");
  }
}

/* ============================================================
 * 初始載入
 * ============================================================ */

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("auth_token");

  if (!token) {
    // 沒有 token → 強制登入
    showLoginModal();
    return;
  }

  // token 存在 → 嘗試讀取使用者資訊
  await loadCurrentUser();
});

/* ============================================================
 * 401 自動跳出登入（需要與 api-config.js 整合）
 * ============================================================ */

/**
 * 請在 api-config.js 的全域 api() 裡加入：
 *
 * if (response.status === 401) {
 *     localStorage.removeItem('auth_token');
 *     showLoginModal();
 *     throw new Error("未登入");
 * }
 *
 * 這樣所有 API 都會自動處理未登入狀態。
 */

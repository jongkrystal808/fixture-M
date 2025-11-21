/**
 * API 配置與基礎請求函數 (v3.0)
 * 修正版：統一 Token、401 自動處理、Content-Type 自動判斷
 */

// ============================================
// 基礎設定
// ============================================

// 全域 API Base URL（可在 index.html 或部署環境覆蓋）
window.API_BASE = window.API_BASE || '';
const API_PREFIX = '/api/v2';

function getToken() {
  return localStorage.getItem('auth_token');
}

// ============================================
// 生成完整 URL
// ============================================

function apiURL(path) {
  return String(window.API_BASE || '') + API_PREFIX + path;
}

// ============================================
// 全域 API 函數
// ============================================

async function api(path, opts = {}) {
  const token = getToken();

  const headers = {
    ...(opts.headers || {}),
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const response = await fetch(apiURL(path), {
    ...opts,
    headers
  });

  // ---------- 401 Token 過期 / 未登入處理 ----------
  if (response.status === 401) {
    console.warn(`401 未授權: ${path}`);

    // 清 token
    localStorage.removeItem('auth_token');

    // 顯示登入 UI（來自 app-auth.js）
    if (typeof showLoginModal === 'function') {
      showLoginModal();
    }

    throw new Error("未登入或登入已過期");
  }

  // ---------- 4xx / 5xx 錯誤 ----------
  if (!response.ok) {
    const txt = await response.text().catch(() => '');
    throw new Error(`API ${path} failed: ${response.status} ${txt}`);
  }

  // ---------- 自動判斷回傳格式 ----------
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

// ============================================
// 舊版 JSON API（仍保留相容）
// ============================================

async function apiJson(path, opts = {}) {
  return api(path, opts); // 直接走 api()（已完整處理 Token / 401 / Content-Type）
}

// ============================================
// 導出
// ============================================

window.apiURL = apiURL;
window.api = api;
window.apiJson = apiJson;

/**
 * API 配置與基礎請求函數 (v3.5 最終版)
 * - 自動 Token / customer_id 注入
 * - 自動處理 params / body
 * - 錯誤結構統一
 * - 智能略過不需要 customer_id 的 API
 */

window.API_BASE = window.API_BASE || "";
const API_PREFIX = "/api/v2";

/* ============================================================
 * 工具：組出基礎 URL
 * ============================================================ */
function apiURL(path) {
  return String(window.API_BASE || "") + API_PREFIX + path;
}

function getToken() {
  return localStorage.getItem("auth_token");
}

function getCustomerId() {
  return (
    window.currentCustomerId ||
    localStorage.getItem("current_customer_id") ||
    null
  );
}

/* ============================================================
 * API 主函式
 * ============================================================ */

function api(path, options = {}) {
  const token = getToken();
  const customerId = getCustomerId();

  // ----------------------------------------
  // 1️⃣ URL + Query Params 構建
  // ----------------------------------------
  const fullUrl = apiURL(path);
  const url = new URL(fullUrl, window.location.origin);

  // options.params / options.query → 自動組 query string
  const params = options.params || options.query;
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null)
        url.searchParams.set(key, String(value));
    });
  }

  // ----------------------------------------
  // 2️⃣ 決定是否要跳過 customer_id
  // ----------------------------------------

  // 這些 API 永遠不應該帶 customer_id
  const ignoreCidAlways = [
    "/auth/",
    "/customers",   // 取得所有客戶
  ];

  const shouldSkipCid =
    options.skipCustomerId ||
    ignoreCidAlways.some((prefix) => path.startsWith(prefix));

  // 自動加入 customer_id
  if (!shouldSkipCid && customerId && !url.searchParams.has("customer_id")) {
    url.searchParams.set("customer_id", customerId);
  }

  // ----------------------------------------
  // 3️⃣ Header 設定
  // ----------------------------------------
  const headers = {
    ...(options.headers || {}),
  };

  // 自動帶 Content-Type（除非呼叫者要求 rawBody 或是 FormData）
  if (!(options.body instanceof FormData) && !options.rawBody) {
    headers["Content-Type"] = "application/json";
  }

  // 自動加入 Token
  if (!options.skipAuth && token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // ----------------------------------------
  // 4️⃣ Body 處理
  // ----------------------------------------
  let body = options.body;

  // 若是物件且不是 FormData → 自動 JSON.stringify
  if (
    body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !options.rawBody
  ) {
    body = JSON.stringify(body);
  }

  // 自動決定 method：有 body 就用 POST
  const method = options.method || (body ? "POST" : "GET");

  const fetchOptions = {
    ...options,
    method,
    headers,
    body,
  };

  // ----------------------------------------
  // 5️⃣ 發送請求
  // ----------------------------------------
  return fetch(url.toString(), fetchOptions).then(async (res) => {
    const text = await res.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text; // 非 JSON 回傳
      }
    }

    if (!res.ok) {
      console.error("API ERROR:", path, res.status, data);

      const err = new Error(
        `API ${path} failed: ${res.status} ${
          data?.detail || res.statusText || ""
        }`
      );
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  });
}

/* ============================================================
 * JSON 便利函式
 * ============================================================ */

function apiJson(path, data = {}, method = "POST", extra = {}) {
  return api(path, {
    ...extra,
    method,
    body: data,
  });
}

/* ============================================================
 * 導出到全域
 * ============================================================ */

window.api = api;
window.apiJson = apiJson;
window.apiURL = apiURL;

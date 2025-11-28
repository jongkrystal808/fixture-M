/**
 * api-returns.js (v3.1)
 * 退料 API
 * - 結構對齊 receipts
 * - 匯出改用原生 fetch 避免 JSON 解析錯誤
 */

async function apiListReturns(params = {}) {
  const q = new URLSearchParams();
  if (params.fixture_id) q.set("fixture_id", params.fixture_id);
  if (params.order_no) q.set("order_no", params.order_no);
  if (params.operator) q.set("operator", params.operator);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  if (params.skip !== undefined) q.set("skip", String(params.skip));
  if (params.limit !== undefined) q.set("limit", String(params.limit));
  return api(`/returns?${q.toString()}`);
}

async function apiGetReturn(id) {
  return api(`/returns/${encodeURIComponent(id)}`);
}

async function apiCreateReturn(payload) {
  return api("/returns", {
    method: "POST",
    // 交給 api-config 自己 JSON.stringify
    body: payload
  });
}

async function apiAddReturnDetails(returnId, serials) {
  return api(`/returns/${encodeURIComponent(returnId)}/details`, {
    method: "POST",
    body: { serials }
  });
}

async function apiDeleteReturnDetail(detailId) {
  return api(`/returns/details/${encodeURIComponent(detailId)}`, {
    method: "DELETE"
  });
}

async function apiDeleteReturn(id) {
  return api(`/returns/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

async function apiImportReturnsCsv(file) {
  const form = new FormData();
  form.append("file", file);

  const token = localStorage.getItem("auth_token");
  const customerId =
    window.currentCustomerId || localStorage.getItem("current_customer_id");

  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const url = new URL(apiURL("/returns/import"), window.location.origin);
  if (customerId) url.searchParams.set("customer_id", customerId);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: form
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Import failed: ${res.status} ${txt}`);
  }
  return res.json();
}

// 🔥 匯出 CSV：改用原生 fetch，避免被 api() 嘗試 JSON.parse
async function apiExportReturnCsv(returnId) {
  const token = localStorage.getItem("auth_token");
  const customerId =
    window.currentCustomerId || localStorage.getItem("current_customer_id");

  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const url = new URL(
    apiURL(`/returns/${encodeURIComponent(returnId)}/export`),
    window.location.origin
  );
  if (customerId) url.searchParams.set("customer_id", customerId);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Export failed: ${res.status} ${txt}`);
  }

  // 這裡回傳 blob，方便你在 app-returns.js 內組下載邏輯
  const blob = await res.blob();
  return blob;
}

window.apiListReturns = apiListReturns;
window.apiGetReturn = apiGetReturn;
window.apiCreateReturn = apiCreateReturn;
window.apiAddReturnDetails = apiAddReturnDetails;
window.apiDeleteReturnDetail = apiDeleteReturnDetail;
window.apiDeleteReturn = apiDeleteReturn;
window.apiImportReturnsCsv = apiImportReturnsCsv;
window.apiExportReturnCsv = apiExportReturnCsv;

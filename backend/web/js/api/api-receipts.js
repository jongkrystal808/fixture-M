/**
 * api-receipts.js (v3.0)
 * 與 backend /receipts/* 路由對應
 */

async function apiListReceipts(params = {}) {
  const q = new URLSearchParams();
  if (params.fixture_id) q.set("fixture_id", params.fixture_id);
  if (params.order_no) q.set("order_no", params.order_no);
  if (params.operator) q.set("operator", params.operator);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  if (params.skip !== undefined) q.set("skip", String(params.skip));
  if (params.limit !== undefined) q.set("limit", String(params.limit));
  return api(`/receipts?${q.toString()}`);
}

async function apiGetReceipt(id) {
  return api(`/receipts/${encodeURIComponent(id)}`);
}

async function apiCreateReceipt(payload) {
  // payload must include customer_id or api() will inject it
  return api("/receipts", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function apiAddReceiptDetails(receiptId, serials) {
  return api(`/receipts/${encodeURIComponent(receiptId)}/details`, {
    method: "POST",
    body: JSON.stringify({ serials })
  });
}

async function apiDeleteReceiptDetail(detailId) {
  return api(`/receipts/details/${encodeURIComponent(detailId)}`, {
    method: "DELETE"
  });
}

async function apiDeleteReceipt(id) {
  return api(`/receipts/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

// CSV 匯入（前端把檔案上傳）
async function apiImportReceiptsCsv(file) {
  const form = new FormData();
  form.append("file", file);
  const token = localStorage.getItem("auth_token");
  const customerId = window.currentCustomerId || localStorage.getItem("current_customer_id");
  // use fetch directly to send multipart
  const headers = token ? { "Authorization": `Bearer ${token}` } : {};
  const url = new URL(apiURL("/receipts/import"), window.location.origin);
  // ensure customer_id present in search (api() already does but here using fetch directly)
  if (customerId) url.searchParams.set("customer_id", customerId);
  const res = await fetch(url.toString(), { method: "POST", headers, body: form });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Import failed: ${res.status} ${txt}`);
  }
  return res.json();
}

async function apiExportReceiptCsv(receiptId) {
  return api(`/receipts/${encodeURIComponent(receiptId)}/export`);
}

window.apiListReceipts = apiListReceipts;
window.apiGetReceipt = apiGetReceipt;
window.apiCreateReceipt = apiCreateReceipt;
window.apiAddReceiptDetails = apiAddReceiptDetails;
window.apiDeleteReceiptDetail = apiDeleteReceiptDetail;
window.apiDeleteReceipt = apiDeleteReceipt;
window.apiImportReceiptsCsv = apiImportReceiptsCsv;
window.apiExportReceiptCsv = apiExportReceiptCsv;

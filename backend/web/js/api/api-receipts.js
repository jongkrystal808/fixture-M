/**
 * api-receipts.js (v3.5)
 * 完整對齊 returns API、統一 customer_id / 匯出 / 匯入行為
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
  return api("/receipts", {
    method: "POST",
    body: payload          // ❗不可 stringify，交給 api-config
  });
}

async function apiAddReceiptDetails(receiptId, serials) {
  return api(`/receipts/${encodeURIComponent(receiptId)}/details`, {
    method: "POST",
    body: { serials }      // ❗不可 stringify
  });
}

async function apiDeleteReceiptDetail(detailId) {
  return api(`/receipts/details/${encodeURIComponent(detailId)}`, {
    method: "DELETE"
  });
}


async function apiDeleteReceipt(id, customer_id) {
  return api(`/receipts/${id}?customer_id=${customer_id}`, {
    method: "DELETE"
  });
}



/* ============================================================
 * 匯入 receipts CSV / Excel
 * ============================================================ */
async function apiImportReceiptsCsv(file) {
  const form = new FormData();
  form.append("file", file);

  const token = localStorage.getItem("auth_token");
  const customerId = window.currentCustomerId || localStorage.getItem("current_customer_id");

  const headers = token ? { "Authorization": `Bearer ${token}` } : {};

  const url = new URL(apiURL("/receipts/import"), window.location.origin);
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

/* ============================================================
 * 匯出 receipts CSV（不可用 api()）
 * ============================================================ */
async function apiExportReceiptCsv(receiptId) {
  const token = localStorage.getItem("auth_token");
  const customerId = window.currentCustomerId || localStorage.getItem("current_customer_id");

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const url = new URL(
    apiURL(`/receipts/${encodeURIComponent(receiptId)}/export`),
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

  return await res.blob();   // ❗必須 blob
}

window.apiListReceipts = apiListReceipts;
window.apiGetReceipt = apiGetReceipt;
window.apiCreateReceipt = apiCreateReceipt;
window.apiAddReceiptDetails = apiAddReceiptDetails;
window.apiDeleteReceiptDetail = apiDeleteReceiptDetail;
window.apiDeleteReceipt = apiDeleteReceipt;
window.apiImportReceiptsCsv = apiImportReceiptsCsv;
window.apiExportReceiptCsv = apiExportReceiptCsv;


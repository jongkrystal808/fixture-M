/**
 * 收料 Receipts API (v3.0)
 * api-receipts.js
 *
 * ✔ 支援 batch / individual
 * ✔ 自動序號展開由後端處理
 * ✔ 不用傳 customer_id（後端從 Token 判斷）
 * ✔ 支援搜尋 / 分頁
 * ✔ 匯入功能 (Excel → JSON → API)
 */

// ================================
// 工具：搜尋 & 分頁
// ================================

/**
 * 查詢收料列表
 * @param {Object} options
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize=20]
 * @param {string} [options.fixtureId]
 * @param {string} [options.orderNo]
 * @param {string} [options.operator]
 * @returns {Promise<{total:number, receipts:Array}>}
 */
async function apiListReceipts(options = {}) {
  const {
    page = 1,
    pageSize = 20,
    fixtureId = "",
    orderNo = "",
    operator = ""
  } = options;

  const params = new URLSearchParams();
  params.set("skip", String((page - 1) * pageSize));
  params.set("limit", String(pageSize));

  if (fixtureId) params.set("fixture_id", fixtureId);
  if (orderNo) params.set("order_no", orderNo);
  if (operator) params.set("operator", operator);

  return api("/receipts?" + params.toString());
}

// ================================
// 查詢單筆收料
// ================================

async function apiGetReceipt(receiptId) {
  return api(`/receipts/${encodeURIComponent(receiptId)}`);
}

// ================================
// 新增收料（自動依 type 分流）
// ================================

/**
 * 新增收料
 * @param {Object} data - ReceiptCreate 格式
 * {
 *   type: "batch" | "individual",
 *   fixture_id: "L-00018",
 *   order_no: "",
 *   serial_start: "",
 *   serial_end: "",
 *   serials: "",
 *   operator: "",
 *   note: ""
 * }
 */
async function apiCreateReceipt(data) {
  return api("/receipts", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

// ================================
// 匯入收料（Excel → JSON）
// ================================

/**
 * 批量匯入收料
 * @param {Array<Object>} items - ReceiptCreate[] 格式
 */
async function apiImportReceipts(items) {
  return api("/receipts/import", {
    method: "POST",
    body: JSON.stringify(items)
  });
}

// ================================
// 刪除收料紀錄
// ================================

async function apiDeleteReceipt(id) {
  return api(`/receipts/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

// ================================
// 匯出 functions
// ================================

window.apiListReceipts = apiListReceipts;
window.apiGetReceipt = apiGetReceipt;
window.apiCreateReceipt = apiCreateReceipt;
window.apiImportReceipts = apiImportReceipts;
window.apiDeleteReceipt = apiDeleteReceipt;

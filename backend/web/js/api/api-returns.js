/**
 * 退料 Returns API (v3.0)
 * api-returns.js
 *
 * ✔ 完全對應後端 v3.0 returns router
 * ✔ vendor 已移除
 * ✔ fixture_code → fixture_id
 * ✔ 支援 batch / individual
 * ✔ 分頁查詢 (skip / limit)
 * ✔ 匯入 returns/import
 */

// ======================================================
// 列表查詢（分頁 + 搜尋）
// ======================================================

/**
 * 查詢退料列表
 * @param {Object} options
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize=20]
 * @param {string} [options.fixtureId]
 * @param {string} [options.orderNo]
 * @param {string} [options.operator]
 */
async function apiListReturns(options = {}) {
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

  return api("/returns?" + params.toString());
}

// ======================================================
// 查詢單筆退料紀錄
// ======================================================

async function apiGetReturn(returnId) {
  return api(`/returns/${encodeURIComponent(returnId)}`);
}

// ======================================================
// 新增退料（batch / individual）
// ======================================================

/**
 * 新增退料
 * @param {Object} data - ReturnCreate 格式
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
async function apiCreateReturn(data) {
  return api("/returns", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

// ======================================================
// 批量匯入退料（Excel → JSON → 後端）
// ======================================================

async function apiImportReturns(items) {
  return api("/returns/import", {
    method: "POST",
    body: JSON.stringify(items)
  });
}

// ======================================================
// 刪除退料紀錄
// ======================================================

async function apiDeleteReturn(id) {
  return api(`/returns/${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
}

// ======================================================
// Excel 匯入 by .xlsx 檔案
// ======================================================

async function apiImportReturnsXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const items = rawRows.map(r => {
          const type = (r.type || "batch").toLowerCase() === "individual"
            ? "individual"
            : "batch";

          return {
            type,
            fixture_id: (r.fixture_id || "").trim(),
            order_no: (r.order_no || "").trim() || null,
            serial_start: type === "batch" ? (r.serial_start || "").trim() || null : null,
            serial_end: type === "batch" ? (r.serial_end || "").trim() || null : null,
            serials: type === "individual" ? (r.serials || "").trim() || null : null,
            operator: (r.operator || "").trim() || null,
            note: (r.note || "").trim() || null
          };
        });

        // 呼叫後端批量匯入
        const result = await apiImportReturns(items);
        resolve(result);

      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

// ======================================================
// 導出到全域（給 app-returns.js 使用）
// ======================================================

window.apiListReturns = apiListReturns;
window.apiGetReturn = apiGetReturn;
window.apiCreateReturn = apiCreateReturn;
window.apiDeleteReturn = apiDeleteReturn;
window.apiImportReturns = apiImportReturns;
window.apiImportReturnsXlsx = apiImportReturnsXlsx;

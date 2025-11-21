/**
 * 使用紀錄 API (v3.0)
 * api-usage.js
 *
 * ✔ 完全對應後端 /api/v2/usage
 * ✔ station_id 需為字串（如 "T1_RF"）
 * ✔ 不需也不能傳 customer_id（由 Token 決定）
 * ✔ 支援 Excel 匯入 / 匯入批次
 * ✔ 支援分頁、搜尋 fixture_id / station_id / operator
 */

// ======================================================
// 查詢使用紀錄列表
// ======================================================

/**
 * 查詢使用紀錄
 * @param {object} params
 * {
 *   page,
 *   pageSize,
 *   fixtureId,
 *   stationId,
 *   operator
 * }
 */
async function apiListUsageLogs(params = {}) {
  const {
    page = 1,
    pageSize = 20,
    fixtureId = "",
    stationId = "",
    operator = ""
  } = params;

  const query = new URLSearchParams();
  query.set("skip", String((page - 1) * pageSize));
  query.set("limit", String(pageSize));

  if (fixtureId) query.set("fixture_id", fixtureId);
  if (stationId) query.set("station_id", stationId);
  if (operator) query.set("operator", operator);

  return api(`/usage?${query.toString()}`);
}

// ======================================================
// 新增單筆
// ======================================================

/**
 * 新增使用紀錄（v3.0）
 * 後端要求格式：
 * {
 *   fixture_id: "L-00018",
 *   station_id: "T1_RF",
 *   use_count: 1,
 *   abnormal_status: null,
 *   operator: "",
 *   note: "",
 *   used_at: "2025-11-20T10:00:00Z"
 * }
 */
async function apiCreateUsageLog(data) {
  return api("/usage", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

// ======================================================
// 批量新增（多筆）
// ======================================================

async function apiBatchUsageLogs(data) {
  return api("/usage/batch", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

// ======================================================
// 刪除使用紀錄
// ======================================================

async function apiDeleteUsageLog(id) {
  return api(`/usage/${id}`, {
    method: "DELETE"
  });
}

// ======================================================
// Excel 匯入
// ======================================================

/**
 * 匯入使用紀錄 (.xlsx)
 * Excel 欄位（v3.0）：
 *
 * fixture_id | station_id | use_count | abnormal_status | operator | note | used_at
 *
 */
async function apiImportUsageLogsXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const rows = rawRows.map(r => {
          return {
            fixture_id: (r.fixture_id || "").trim(),
            station_id: (r.station_id || "").trim(), // v3.0 為字串，如 T1_RF
            use_count: r.use_count !== "" ? Number(r.use_count) : 1,
            abnormal_status: r.abnormal_status || null,
            operator: r.operator || null,
            note: r.note || null,
            used_at: r.used_at ? new Date(r.used_at) : null
          };
        });

        const result = await api("/usage/import", {
          method: "POST",
          body: JSON.stringify(rows)
        });

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
// 導出
// ======================================================

window.apiListUsageLogs = apiListUsageLogs;
window.apiCreateUsageLog = apiCreateUsageLog;
window.apiBatchUsageLogs = apiBatchUsageLogs;
window.apiImportUsageLogsXlsx = apiImportUsageLogsXlsx;
window.apiDeleteUsageLog = apiDeleteUsageLog;

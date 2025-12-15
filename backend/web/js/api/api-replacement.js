/**
 * 治具更換紀錄 API (v4.0)
 * 完全對應後端 replacement_logs v4.0
 * ---------------------------------------
 * 必填欄位：
 * - record_level: "fixture" | "serial"
 * - serial_number（record_level = serial 時必填）
 * - reason
 * - executor
 */

window.apiListReplacementLogs = apiListReplacementLogs;
window.apiCreateReplacementLog = apiCreateReplacementLog;
window.apiBatchReplacementLogs = apiBatchReplacementLogs;
window.apiImportReplacementLogsXlsx = apiImportReplacementLogsXlsx;
window.apiDeleteReplacementLog = apiDeleteReplacementLog;


/* ============================================================
 * 查詢更換紀錄（skip/limit）
 * ============================================================ */

async function apiListReplacementLogs(params = {}) {
  const query = new URLSearchParams();

  if (params.customer_id) query.set("customer_id", params.customer_id);
  if (params.fixture_id) query.set("fixture_id", params.fixture_id);
  if (params.serial_number) query.set("serial_number", params.serial_number);
  if (params.executor) query.set("executor", params.executor);
  if (params.reason) query.set("reason", params.reason);
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);

  query.set("skip", params.skip ?? 0);
  query.set("limit", params.limit ?? 20);

  return api(`/replacement?${query.toString()}`);
}


/* ============================================================
 * 新增單筆更換紀錄
 * ============================================================ */
/**
 * data = {
 *   customer_id,
 *   fixture_id,
 *   record_level: "fixture" | "serial",
 *   serial_number: string | null,
 *   replacement_date: ISO string,
 *   reason,
 *   executor,
 *   note
 * }
 */
async function apiCreateReplacementLog(data) {
  return api("/replacement", {
    method: "POST",
    body: JSON.stringify(data),
  });
}


/* ============================================================
 * 批量新增（多筆）
 * ============================================================ */
async function apiBatchReplacementLogs(rows) {
  return api("/replacement/batch", {
    method: "POST",
    body: JSON.stringify(rows),
  });
}


/* ============================================================
 * 刪除
 * ============================================================ */

async function apiDeleteReplacementLog({ customer_id, id }) {
  return api(`/replacement/${id}?customer_id=${customer_id}`, {
    method: "DELETE",
  });
}


/* ============================================================
 * 匯入 Excel (.xlsx)
 * - 必須使用 v4.0 欄位：
 *   fixture_id | record_level | serial_number | replacement_date
 *   reason | executor | note
 * ============================================================ */

async function apiImportReplacementLogsXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        // 標準化 rows → 後端需要 v4.0 欄位
        const rows = rawRows.map(r => ({
          customer_id: r.customer_id || null,            // 可選，後端如需可覆蓋
          fixture_id: (r.fixture_id || "").trim(),
          record_level: (r.record_level || "fixture").trim(),
          serial_number: (r.serial_number || "").trim() || null,
          replacement_date: r.replacement_date ? new Date(r.replacement_date).toISOString() : null,
          reason: r.reason || null,
          executor: r.executor || null,
          note: r.note || null,
        }));

        const result = await api("/replacement/import", {
          method: "POST",
          body: JSON.stringify(rows),
        });

        resolve(result);

      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

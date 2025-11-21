/**
 * 序號工具 API (v3.0)
 * api-serials.js
 *
 * 後端 routers/serials.py：
 *
 * GET    /serials/expand?start=&end=
 * POST   /serials/normalize
 * POST   /serials/validate
 * POST   /serials/detect-prefix
 * POST   /serials/range
 */

/* ============================================================
 * 展開序號範圍 expand_serial_range()
 * ============================================================ */

/**
 * 展開序號區間
 * @param {string} start
 * @param {string} end
 * @returns {Promise<{serials: Array}>}
 */
async function apiExpandSerialRange(start, end) {
  const params = new URLSearchParams();
  params.set("start", start);
  params.set("end", end);

  return api(`/serials/expand?${params.toString()}`);
}

/* ============================================================
 * 正規化序號清單 normalise_serial_list()
 * ============================================================ */

/**
 * @param {Array<string>} serials
 * @returns {Promise<{serials: Array}>}
 */
async function apiNormalizeSerials(serials) {
  return api("/serials/normalize", {
    method: "POST",
    body: JSON.stringify({ serials })
  });
}

/* ============================================================
 * 驗證序號格式 validate_serial()
 * ============================================================ */

async function apiValidateSerials(serials) {
  return api("/serials/validate", {
    method: "POST",
    body: JSON.stringify({ serials })
  });
}

/* ============================================================
 * 偵測序號前綴 detect_prefix()
 * ============================================================ */

async function apiDetectSerialPrefix(serials) {
  return api("/serials/detect-prefix", {
    method: "POST",
    body: JSON.stringify({ serials })
  });
}

/* ============================================================
 * 計算範圍內總數 calculate_range_total()
 * ============================================================ */

async function apiCalculateSerialRange(start, end) {
  return api("/serials/range", {
    method: "POST",
    body: JSON.stringify({ start, end })
  });
}

/* ============================================================
 * 導出到全域
 * ============================================================ */

window.apiExpandSerialRange = apiExpandSerialRange;
window.apiNormalizeSerials = apiNormalizeSerials;
window.apiValidateSerials = apiValidateSerials;
window.apiDetectSerialPrefix = apiDetectSerialPrefix;
window.apiCalculateSerialRange = apiCalculateSerialRange;

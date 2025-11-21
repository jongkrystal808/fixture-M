/**
 * 統計 API (v3.0)
 * api-stats.js
 *
 * 對應 backend/app/routers/stats.py
 *
 * GET /stats/summary
 * GET /stats/max-stations?model_id=
 * GET /stats/fixture-status
 * GET /stats/fixture-usage?fixture_id=
 * GET /stats/model-requirements?model_id=
 */

/* ============================================================
 * 取得儀表板 Summary 統計
 * ============================================================ */

async function apiGetStatsSummary() {
  return api("/stats/summary");
}

/* ============================================================
 * 取得某機種的最大開站數
 * ============================================================ */

async function apiGetMaxStations(modelId) {
  const q = new URLSearchParams();
  q.set("model_id", modelId);

  return api(`/stats/max-stations?${q.toString()}`);
}

/* ============================================================
 * 取得治具狀態視圖（view_fixture_status）
 * ============================================================ */

async function apiGetFixtureStatus() {
  return api("/stats/fixture-status");
}

/* ============================================================
 * 取得單治具使用次數 / 更換次數 / 最近使用
 * ============================================================ */

async function apiGetFixtureUsageStats(fixtureId) {
  const q = new URLSearchParams();
  q.set("fixture_id", fixtureId);

  return api(`/stats/fixture-usage?${q.toString()}`);
}

/* ============================================================
 * 取得整個機種的治具需求總表
 * ============================================================ */

async function apiGetModelRequirements(modelId) {
  const q = new URLSearchParams();
  q.set("model_id", modelId);

  return api(`/stats/model-requirements?${q.toString()}`);
}

/* ============================================================
 * 導出到全域
 * ============================================================ */

window.apiGetStatsSummary = apiGetStatsSummary;
window.apiGetMaxStations = apiGetMaxStations;
window.apiGetFixtureStatus = apiGetFixtureStatus;
window.apiGetFixtureUsageStats = apiGetFixtureUsageStats;
window.apiGetModelRequirements = apiGetModelRequirements;

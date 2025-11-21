/**
 * 統計 Dashboard 前端控制 (v3.0)
 * app-stats.js
 *
 * ✔ 儀表板摘要
 * ✔ 治具狀態視圖
 * ✔ 機種最大開站數
 * ✔ 單治具使用統計
 * ✔ 機種治具需求
 */

/* ============================================================
 * 初始化
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  loadStatsSummary();
  loadFixtureStatusView();
});

/* ============================================================
 * 1. 儀表板統計摘要
 * ============================================================ */

async function loadStatsSummary() {
  try {
    const data = await apiGetStatsSummary();

    document.getElementById("sumFixtureTotal").innerText = data.total_fixtures;
    document.getElementById("sumUsedToday").innerText = data.used_today;
    document.getElementById("sumReplacedToday").innerText = data.replaced_today;
    document.getElementById("sumTotalUsage").innerText = data.total_usage;
    document.getElementById("sumTotalReplace").innerText = data.total_replacements;

    document.getElementById("sumCustomerCnt").innerText = data.customer_count;
    document.getElementById("sumModelCnt").innerText = data.model_count;
    document.getElementById("sumStationCnt").innerText = data.station_count;

  } catch (err) {
    console.error(err);
    toast("載入統計摘要失敗", "error");
  }
}

/* ============================================================
 * 2. 治具狀態視圖（view_fixture_status）
 * ============================================================ */

async function loadFixtureStatusView() {
  try {
    const rows = await apiGetFixtureStatus();
    renderFixtureStatusTable(rows);
  } catch (err) {
    console.error(err);
    toast("載入治具狀態視圖失敗", "error");
  }
}

function renderFixtureStatusTable(rows) {
  const tbody = document.getElementById("fixtureStatusTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6" class="text-center py-3 text-gray-400">無資料</td></tr>
    `;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.fixture_id}</td>
      <td>${r.fixture_name}</td>
      <td>${r.last_used_at || ""}</td>
      <td>${r.used_count}</td>
      <td>${r.replacement_due || ""}</td>
      <td>${r.status || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 3. 機種最大開站數
 * ============================================================ */

async function loadMaxStationsUI() {
  const modelId = document.getElementById("statsModelSelect").value;
  if (!modelId) return;

  try {
    const rows = await apiGetMaxStations(modelId);
    renderMaxStationsTable(rows);
  } catch (err) {
    console.error(err);
    toast("最大開站數讀取失敗", "error");
  }
}

function renderMaxStationsTable(rows) {
  const tbody = document.getElementById("maxStationsTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-gray-400">無資料</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.station_id}</td>
      <td>${r.max_open}</td>
      <td>${r.fixture_count}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 4. 單治具使用統計
 * ============================================================ */

async function loadFixtureUsageStatsUI() {
  const fixtureId = document.getElementById("statsFixtureId").value.trim();
  if (!fixtureId) return toast("請輸入治具編號");

  try {
    const data = await apiGetFixtureUsageStats(fixtureId);

    document.getElementById("fu_last_used").innerText = data.last_used_at || "—";
    document.getElementById("fu_used_count").innerText = data.used_count;
    document.getElementById("fu_replaced_count").innerText = data.replaced_count;

    renderFixtureUsageHistory(data.history);

  } catch (err) {
    console.error(err);
    toast("讀取治具統計失敗", "error");
  }
}

function renderFixtureUsageHistory(rows) {
  const tbody = document.getElementById("fixtureUsageHistoryTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-gray-400">無歷史使用紀錄</td></tr>`;
    return;
  }

  rows.forEach(h => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${h.used_at}</td>
      <td>${h.operator || ""}</td>
      <td>${h.action}</td>
      <td>${h.note || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 5. 機種治具需求總表
 * ============================================================ */

async function loadModelRequirementsUI() {
  const modelId = document.getElementById("statsModelReqSelect").value;
  if (!modelId) return;

  try {
    const rows = await apiGetModelRequirements(modelId);
    renderModelRequirementsTable(rows);
  } catch (err) {
    console.error(err);
    toast("讀取治具需求失敗", "error");
  }
}

function renderModelRequirementsTable(rows) {
  const tbody = document.getElementById("modelReqTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-400">無資料</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.station_id}</td>
      <td>${r.fixture_id}</td>
      <td>${r.required_qty}</td>
      <td>${r.note || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

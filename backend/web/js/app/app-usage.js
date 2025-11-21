/**
 * 使用紀錄前端控制 (v3.0)
 * app-usage.js
 *
 * ✔ 支援分頁 / 搜尋
 * ✔ 使用 fixture_id / station_id（字串）
 * ✔ 匯入 Excel (.xlsx)
 * ✔ 新增 / 刪除使用紀錄
 * ✔ 完全對應新版 API：api-usage.js
 */

/* ============================================================
 * 分頁狀態
 * ============================================================ */

let usagePage = 1;
let usagePageSize = 20;

/* ============================================================
 * 初始化
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  loadUsageLogs();
});

/* ============================================================
 * 載入使用紀錄列表
 * ============================================================ */

async function loadUsageLogs() {
  const fixtureId = document.getElementById("usageSearchFixture")?.value.trim() || "";
  const stationId = document.getElementById("usageSearchStation")?.value.trim() || "";
  const operator = document.getElementById("usageSearchOperator")?.value.trim() || "";

  const params = {
    page: usagePage,
    pageSize: usagePageSize,
  };

  if (fixtureId) params.fixtureId = fixtureId;
  if (stationId) params.stationId = stationId;
  if (operator) params.operator = operator;

  try {
    const result = await apiListUsageLogs(params);
    renderUsageTable(result.usage_logs);
    renderUsagePagination(result.total);
  } catch (err) {
    console.error(err);
    toast("載入使用紀錄失敗", "error");
  }
}

/* ============================================================
 * 表格渲染
 * ============================================================ */

function renderUsageTable(rows) {
  const tbody = document.getElementById("usageTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-3 text-gray-400">沒有資料</td>
      </tr>
    `;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${row.used_at || ""}</td>
      <td class="py-2 pr-4">${row.fixture_id}</td>
      <td class="py-2 pr-4">${row.station_id}</td>
      <td class="py-2 pr-4 text-right">${row.use_count}</td>
      <td class="py-2 pr-4">${row.abnormal_status || ""}</td>
      <td class="py-2 pr-4">${row.operator || ""}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost text-xs text-red-600"
                onclick="deleteUsageLog(${row.id})">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 分頁渲染
 * ============================================================ */

function renderUsagePagination(total) {
  const totalPages = Math.ceil(total / usagePageSize);
  const box = document.getElementById("usagePagination");
  box.innerHTML = "";

  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    box.innerHTML += `
      <button class="btn btn-sm ${i === usagePage ? "btn-primary" : "btn-outline"}"
              onclick="changeUsagePage(${i})">
        ${i}
      </button>
    `;
  }
}

function changeUsagePage(p) {
  usagePage = p;
  loadUsageLogs();
}

/* ============================================================
 * 新增使用紀錄（v3.0）
 * ============================================================ */

async function submitUsageLog() {
  const fixtureId = document.getElementById("usageAddFixture").value.trim();
  const stationId = document.getElementById("usageAddStation").value.trim();
  const count = Number(document.getElementById("usageAddCount").value);
  const abnormal = document.getElementById("usageAddAbnormal").value.trim();
  const operator = document.getElementById("usageAddOperator").value.trim();
  const note = document.getElementById("usageAddNote").value.trim();
  const usedAt = document.getElementById("usageAddTime").value;

  if (!fixtureId) return toast("治具 ID 不得為空");
  if (!stationId) return toast("站點不得為空");

  const payload = {
    fixture_id: fixtureId,
    station_id: stationId,
    use_count: count || 1,
    abnormal_status: abnormal || null,
    operator: operator || null,
    note: note || null,
    used_at: usedAt ? new Date(usedAt).toISOString() : null,
  };

  try {
    await apiCreateUsageLog(payload);
    toast("新增使用紀錄成功");
    loadUsageLogs();
    toggleUsageAdd(false);
  } catch (err) {
    console.error(err);
    toast("新增失敗", "error");
  }
}

/* ============================================================
 * 刪除使用紀錄
 * ============================================================ */

async function deleteUsageLog(id) {
  if (!confirm("確認刪除？")) return;

  try {
    await apiDeleteUsageLog(id);
    toast("刪除成功");
    loadUsageLogs();
  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}

/* ============================================================
 * 匯入 Excel (.xlsx)
 * ============================================================ */

async function handleUsageImport(input) {
  if (!input.files.length) return;

  try {
    toast("正在匯入...");
    const result = await apiImportUsageLogsXlsx(input.files[0]);

    toast(result.message || "匯入成功");
    loadUsageLogs();
  } catch (err) {
    console.error(err);
    toast("匯入失敗", "error");
  }

  input.value = "";
}

/* ============================================================
 * 顯示 / 隱藏新增表單
 * ============================================================ */

function toggleUsageAdd(show) {
  document.getElementById("usageAddForm").classList.toggle("hidden", !show);
}

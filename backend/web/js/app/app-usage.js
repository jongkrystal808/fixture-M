/**
 * 使用紀錄前端控制 (v3.5)
 * 完整修正版
 *
 * ✔ skip / limit 改正
 * ✔ fixture_id / station_id 正名
 * ✔ customer_id 注入
 * ✔ 分頁修正
 * ✔ 匯入 / 新增 / 刪除完整可用
 */

/* ============================================================
 * 分頁狀態
 * ============================================================ */

let usagePage = 1;
const usagePageSize = 20;

/* ============================================================
 * 初始化
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  loadUsageLogs();
});

/* 取 customer_id */
function getCurrentCustomerId() {
  return localStorage.getItem("current_customer_id");
}

/* ============================================================
 * 載入使用紀錄列表
 * ============================================================ */

async function loadUsageLogs() {
  const fixtureId = document.getElementById("usageSearchFixture")?.value.trim() || "";
  const stationId = document.getElementById("usageSearchStation")?.value.trim() || "";
  const operator = document.getElementById("usageSearchOperator")?.value.trim() || "";
  const from = document.getElementById("usageSearchFrom")?.value;
  const to = document.getElementById("usageSearchTo")?.value;

  const customer_id = getCurrentCustomerId();
  if (!customer_id) return console.warn("尚未選擇客戶");

  const params = {
    customer_id,
    skip: (usagePage - 1) * usagePageSize,
    limit: usagePageSize
  };

  if (fixtureId) params.fixture_id = fixtureId;
  if (stationId) params.station_id = stationId;
  if (operator) params.operator = operator;
  if (from) params.date_from = new Date(from).toISOString();
  if (to) params.date_to = new Date(to).toISOString();

  try {
    const result = await apiListUsageLogs(params); // {usage_logs, total}
    renderUsageTable(result.usage_logs || []);
    renderUsagePagination(result.total || 0);
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
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="7" class="text-center py-3 text-gray-400">
        沒有資料
      </td></tr>`;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${row.used_at || ""}</td>
      <td class="py-2 pr-4">${row.fixture_id}</td>
      <td class="py-2 pr-4">${row.station_id}</td>
      <td class="py-2 pr-4 text-right">${row.use_count}</td>
      <td class="py-2 pr-4">${row.abnormal_status || "-"}</td>
      <td class="py-2 pr-4">${row.operator || "-"}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost text-xs text-red-600"
                onclick="deleteUsageLog(${row.id})">
          刪除
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 分頁
 * ============================================================ */

function renderUsagePagination(total) {
  const box = document.getElementById("usagePagination");
  if (!box) return;

  const pages = Math.ceil(total / usagePageSize);
  box.innerHTML = "";

  if (pages <= 1) return;

  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${i === usagePage ? "btn-primary" : "btn-outline"}`;
    btn.textContent = i;
    btn.onclick = () => { usagePage = i; loadUsageLogs(); };
    box.appendChild(btn);
  }
}

/* ============================================================
 * 新增使用紀錄
 * ============================================================ */

async function submitUsageLog() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return toast("請先選擇客戶");

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
    customer_id,
    fixture_id: fixtureId,
    station_id: stationId,
    use_count: count || 1,
    abnormal_status: abnormal || null,
    operator: operator || null,
    note: note || null,
    used_at: usedAt ? new Date(usedAt).toISOString() : null
  };

  try {
    await apiCreateUsageLog(payload);
    toast("新增使用紀錄成功");
    toggleUsageAdd(false);
    loadUsageLogs();
  } catch (err) {
    console.error(err);
    toast("新增失敗", "error");
  }
}

/* ============================================================
 * 刪除
 * ============================================================ */

async function deleteUsageLog(id) {
  if (!confirm("確認刪除？")) return;

  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  try {
    await apiDeleteUsageLog({ customer_id, id });
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

  const customer_id = getCurrentCustomerId();
  if (!customer_id) return toast("請先選擇客戶");

  try {
    toast("正在匯入...");
    const result = await apiImportUsageLogsXlsx(input.files[0], customer_id);
    toast(result.message || "匯入成功");
    loadUsageLogs();
  } catch (err) {
    console.error(err);
    toast("匯入失敗", "error");
  }

  input.value = "";
}

/* ============================================================
 * 新增表單顯示/隱藏
 * ============================================================ */

function toggleUsageAdd(show) {
  document.getElementById("usageAddForm")?.classList.toggle("hidden", !show);
}

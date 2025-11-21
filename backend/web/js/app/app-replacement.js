/**
 * 治具更換紀錄前端控制 (v3.0)
 * app-replacement.js
 *
 * ✔ 支援分頁 / 搜尋
 * ✔ 使用 fixture_id、replace_reason、replaced_at
 * ✔ 匯入 Excel (.xlsx)
 * ✔ 新增 / 刪除更換紀錄
 * ✔ 完全對應新版 API：api-replacement.js
 */

/* ============================================================
 * 分頁狀態
 * ============================================================ */

let repPage = 1;
let repPageSize = 20;

/* ============================================================
 * 初始化
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  loadReplacementLogs();
});

/* ============================================================
 * 載入更換紀錄列表
 * ============================================================ */

async function loadReplacementLogs() {
  const fixtureId = document.getElementById("replaceSearchFixture")?.value.trim() || "";
  const operator = document.getElementById("replaceSearchOperator")?.value.trim() || "";
  const reason = document.getElementById("replaceSearchReason")?.value.trim() || "";

  const params = {
    page: repPage,
    pageSize: repPageSize
  };

  if (fixtureId) params.fixtureId = fixtureId;
  if (operator) params.operator = operator;
  if (reason) params.replaceReason = reason;

  try {
    const result = await apiListReplacementLogs(params);
    renderReplacementTable(result.replacement_logs);
    renderReplacementPagination(result.total);
  } catch (err) {
    console.error(err);
    toast("載入更換紀錄失敗", "error");
  }
}

/* ============================================================
 * 表格渲染
 * ============================================================ */

function renderReplacementTable(rows) {
  const tbody = document.getElementById("replaceTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-3 text-gray-400">沒有資料</td>
      </tr>`;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${row.replaced_at || ""}</td>
      <td class="py-2 pr-4">${row.fixture_id}</td>
      <td class="py-2 pr-4">${row.replace_reason || ""}</td>
      <td class="py-2 pr-4">${row.operator || ""}</td>
      <td class="py-2 pr-4">${row.note || ""}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost text-xs text-red-600"
                onclick="deleteReplacementLog(${row.id})">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 分頁渲染
 * ============================================================ */

function renderReplacementPagination(total) {
  const totalPages = Math.ceil(total / repPageSize);
  const box = document.getElementById("replacePagination");
  box.innerHTML = "";

  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    box.innerHTML += `
      <button class="btn btn-sm ${i === repPage ? "btn-primary" : "btn-outline"}"
              onclick="changeReplacePage(${i})">${i}</button>`;
  }
}

function changeReplacePage(p) {
  repPage = p;
  loadReplacementLogs();
}

/* ============================================================
 * 新增更換紀錄
 * ============================================================ */

async function submitReplacementLog() {
  const fixtureId = document.getElementById("replaceAddFixture").value.trim();
  const replacedAt = document.getElementById("replaceAddTime").value;
  const reason = document.getElementById("replaceAddReason").value.trim();
  const operator = document.getElementById("replaceAddOperator").value.trim();
  const note = document.getElementById("replaceAddNote").value.trim();

  if (!fixtureId) return toast("治具 ID 不得為空");
  if (!replacedAt) return toast("請輸入更換日期");

  const payload = {
    fixture_id: fixtureId,
    replaced_at: new Date(replacedAt).toISOString(),
    replace_reason: reason || null,
    operator: operator || null,
    note: note || null,
  };

  try {
    await apiCreateReplacementLog(payload);
    toast("新增更換紀錄成功");
    toggleReplaceAdd(false);
    loadReplacementLogs();
  } catch (err) {
    console.error(err);
    toast("新增失敗", "error");
  }
}

/* ============================================================
 * 刪除
 * ============================================================ */

async function deleteReplacementLog(id) {
  if (!confirm("確認刪除？")) return;

  try {
    await apiDeleteReplacementLog(id);
    toast("刪除成功");
    loadReplacementLogs();
  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}

/* ============================================================
 * 匯入 Excel (.xlsx)
 * ============================================================ */

async function handleReplacementImport(input) {
  if (!input.files.length) return;

  try {
    toast("正在匯入...");
    const result = await apiImportReplacementLogsXlsx(input.files[0]);

    toast(result.message || "匯入成功");
    loadReplacementLogs();
  } catch (err) {
    console.error(err);
    toast("匯入失敗", "error");
  }

  input.value = "";
}

/* ============================================================
 * 顯示 / 隱藏新增表單
 * ============================================================ */

function toggleReplaceAdd(show) {
  document.getElementById("replaceAddForm").classList.toggle("hidden", !show);
}

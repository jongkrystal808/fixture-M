/**
 * 治具更換紀錄前端控制 (v4.0)
 * ---------------------------------------------
 * 支援：
 * - record_level = fixture（不需序號）
 * - record_level = serial（需要序號）
 *
 * 後端 SP 自動：
 * - 查詢 usage_before
 * - 重置 usage_after = 0
 * - 更新 summary
 */

let repPage = 1;
const repPageSize = 20;

document.addEventListener("DOMContentLoaded", () => {
  loadReplacementLogs();
});

function getCurrentCustomerId() {
  return localStorage.getItem("current_customer_id");
}

/* ============================================================
 * 查詢更換記錄
 * ============================================================ */

async function loadReplacementLogs() {
  const fixtureId = document.getElementById("replaceSearchFixture")?.value.trim() || "";
  const serial = document.getElementById("replaceSearchSerial")?.value.trim() || "";
  const executor = document.getElementById("replaceSearchExecutor")?.value.trim() || "";
  const reason = document.getElementById("replaceSearchReason")?.value.trim() || "";
  const dateFrom = document.getElementById("replaceSearchFrom")?.value;
  const dateTo = document.getElementById("replaceSearchTo")?.value;

  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  const params = {
    customer_id,
    skip: (repPage - 1) * repPageSize,
    limit: repPageSize,
  };

  if (fixtureId) params.fixture_id = fixtureId;
  if (serial) params.serial_number = serial;
  if (executor) params.executor = executor;
  if (reason) params.reason = reason;
  if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
  if (dateTo) params.date_to = new Date(dateTo).toISOString();

  try {
    const result = await apiListReplacementLogs(params);
    renderReplacementTable(result.replacement_logs || []);
    renderReplacementPagination(result.total || 0);
  } catch (err) {
    console.error(err);
    toast("讀取更換紀錄失敗", "error");
  }
}

/* ============================================================
 * 渲染表格
 * ============================================================ */

function renderReplacementTable(rows) {
  const tbody = document.getElementById("replaceTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `<tr>
      <td colspan="8" class="text-center py-3 text-gray-400">沒有資料</td>
    </tr>`;
    return;
  }

  rows.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td class="py-2 pr-4">${r.replacement_date?.slice(0, 10) || ""}</td>
        <td class="py-2 pr-4">${r.record_level}</td>
        <td class="py-2 pr-4">${r.fixture_id}</td>
        <td class="py-2 pr-4">${r.serial_number ?? "-"}</td>
        <td class="py-2 pr-4">${r.usage_before ?? "-"}</td>
        <td class="py-2 pr-4">${r.reason ?? "-"}</td>
        <td class="py-2 pr-4">${r.executor ?? "-"}</td>
        <td class="py-2 pr-4">${r.note ?? "-"}</td>
        <td class="py-2 pr-4">
          <button class="btn btn-xs btn-error" onclick="deleteReplacementLog(${r.id})">
            刪除
          </button>
        </td>
      </tr>
    `;
  });
}

/* ============================================================
 * 分頁
 * ============================================================ */

function renderReplacementPagination(total) {
  const box = document.getElementById("replacePagination");
  if (!box) return;

  const pages = Math.ceil(total / repPageSize);
  box.innerHTML = "";

  if (pages <= 1) return;

  for (let p = 1; p <= pages; p++) {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${p === repPage ? "btn-primary" : "btn-outline"}`;
    btn.textContent = p;
    btn.onclick = () => {
      repPage = p;
      loadReplacementLogs();
    };
    box.appendChild(btn);
  }
}

/* ============================================================
 * 新增更換記錄
 * ============================================================ */

async function submitReplacementLog() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return toast("請先選擇客戶");

  const fixtureId = document.getElementById("replaceAddFixture").value.trim();
  const serial = document.getElementById("replaceAddSerial")?.value.trim() || null;
  const level = document.getElementById("replaceAddLevel").value;
  const date = document.getElementById("replaceAddTime").value;
  const reason = document.getElementById("replaceAddReason").value.trim();
  const executor = document.getElementById("replaceAddExecutor").value.trim();
  const note = document.getElementById("replaceAddNote").value.trim();

  if (!fixtureId) return toast("請輸入治具 ID");
  if (!date) return toast("請輸入更換日期");

  if (level === "serial" && !serial) {
    return toast("請輸入序號（record_level = serial）");
  }

  const payload = {
    customer_id,
    fixture_id: fixtureId,
    record_level: level,
    serial_number: serial || null,
    replacement_date: new Date(date).toISOString(),
    reason: reason || null,
    executor: executor || null,
    note: note || null,
  };

  try {
    await apiCreateReplacementLog(payload);
    toast("新增成功");
    toggleReplaceAdd(false);
    loadReplacementLogs();
  } catch (err) {
    console.error(err);
    toast("新增更換紀錄失敗", "error");
  }
}

/* ============================================================
 * 刪除
 * ============================================================ */

async function deleteReplacementLog(id) {
  if (!confirm("確定要刪除這筆更換紀錄？")) return;

  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  try {
    await apiDeleteReplacementLog({ customer_id, id });
    toast("刪除成功");
    loadReplacementLogs();
  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}

/* ============================================================
 * 匯入 Excel
 * ============================================================ */

async function handleReplacementImport(input) {
  if (!input.files.length) return;

  const customer_id = getCurrentCustomerId();
  if (!customer_id) return toast("請先選擇客戶");

  try {
    const res = await apiImportReplacementLogsXlsx(input.files[0], customer_id);
    toast(res.message || "匯入成功");
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
  document.getElementById("replaceAddForm")?.classList.toggle("hidden", !show);
}

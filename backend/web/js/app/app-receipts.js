/**
 * 收料登記前端控制 (v3.0)
 * app-receipts.js
 *
 * ✔ 支援 batch / individual
 * ✔ 使用 fixture_id（取代 fixture_code）
 * ✔ 移除 vendor（已被移除）
 * ✔ 支援分頁 / 搜尋
 * ✔ 支援 Excel 匯入
 * ✔ 依照新後端 receipts router 完全重寫
 */

/* ============================================================
 * 🔵 子分頁切換（收料 / 退料）
 * ============================================================ */

document.querySelectorAll("[data-rtab]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-rtab]").forEach(b => b.classList.remove("subtab-active"));
    btn.classList.add("subtab-active");

    const tab = btn.dataset.rtab;

    document.querySelectorAll("#rtab-receipts, #rtab-returns")
      .forEach(sec => sec.classList.add("hidden"));

    document.querySelector(`#rtab-${tab}`).classList.remove("hidden");
  });
});

/* ============================================================
 * 表單切換（批量 / 個別序號）
 * ============================================================ */

const receiptTypeSelect = document.getElementById("receiptAddType");
if (receiptTypeSelect) {
  receiptTypeSelect.addEventListener("change", () => {
    const type = receiptTypeSelect.value;
    document.getElementById("receiptBatchArea").classList.toggle("hidden", type !== "batch");
    document.getElementById("receiptIndividualArea").classList.toggle("hidden", type !== "individual");
  });
}

/* ============================================================
 * 收料：新增表單開關
 * ============================================================ */

function toggleReceiptAdd(show) {
  document.getElementById("receiptAddForm").classList.toggle("hidden", !show);
}

/* ============================================================
 * 收料：下載 Excel 範本 (v3.0)
 * ============================================================ */

function downloadReceiptTemplate() {
  const headers = [[
    "type",
    "fixture_id",
    "order_no",
    "serial_start",
    "serial_end",
    "serials",
    "operator",
    "note"
  ]];

  const ws = XLSX.utils.aoa_to_sheet(headers);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "receipt_template");
  XLSX.writeFile(wb, "receipt_template_v3.xlsx");
}

/* ============================================================
 * 收料：匯入 Excel (.xlsx)
 * ============================================================ */

async function handleReceiptImport(input) {
  if (!input.files.length) return;

  try {
    toast("正在匯入...");
    const result = await apiImportReceiptsXlsx(input.files[0]);

    toast(result.message);
    console.log("匯入結果：", result);

    loadReceipts();
  } catch (err) {
    console.error(err);
    toast("匯入失敗", "error");
  }

  input.value = "";
}

/* ============================================================
 * 🔵 分頁狀態
 * ============================================================ */

let receiptsPage = 1;
let receiptsPageSize = 20;

/* ============================================================
 * 收料：載入列表
 * ============================================================ */

async function loadReceipts() {
  const fixture = document.getElementById("receiptSearchFixture").value.trim();
  const order = document.getElementById("receiptSearchOrder").value.trim();
  const op = document.getElementById("receiptSearchOperator").value.trim();

  const params = {
    page: receiptsPage,
    pageSize: receiptsPageSize
  };
  if (fixture) params.fixtureId = fixture;
  if (order) params.orderNo = order;
  if (op) params.operator = op;

  const data = await apiListReceipts(params);

  renderReceiptsTable(data.receipts);
  renderReceiptsPagination(data.total);
}

/* ============================================================
 * 收料：表格渲染
 * ============================================================ */

function renderReceiptsTable(rows) {
  const tbody = document.getElementById("receiptTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7" class="text-center py-3 text-gray-400">沒有資料</td></tr>
    `;
    return;
  }

  rows.forEach(row => {
    const serialDisplay =
      row.type === "batch"
        ? `${row.serial_start} ~ ${row.serial_end}`
        : row.serials;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${row.created_at || ""}</td>
      <td class="py-2 pr-4">${row.fixture_id || ""}</td>
      <td class="py-2 pr-4">${row.order_no || ""}</td>
      <td class="py-2 pr-4">${serialDisplay || ""}</td>
      <td class="py-2 pr-4">${row.operator || ""}</td>
      <td class="py-2 pr-4">${row.note || ""}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost text-xs text-red-600"
                onclick="deleteReceipt(${row.id})">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 收料：分頁渲染
 * ============================================================ */

function renderReceiptsPagination(total) {
  const totalPages = Math.ceil(total / receiptsPageSize);
  const box = document.getElementById("receiptPagination");
  box.innerHTML = "";

  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    box.innerHTML += `
      <button class="btn btn-sm ${i === receiptsPage ? "btn-primary" : "btn-outline"}"
              onclick="changeReceiptPage(${i})">${i}</button>
    `;
  }
}

function changeReceiptPage(p) {
  receiptsPage = p;
  loadReceipts();
}

/* ============================================================
 * 收料：新增 submit (v3.0)
 * ============================================================ */

async function submitReceipt() {
  const fixture = document.getElementById("receiptAddFixture").value.trim();
  const order = document.getElementById("receiptAddOrder").value.trim();
  const type = document.getElementById("receiptAddType").value;

  const serialStart = document.getElementById("receiptAddStart").value.trim();
  const serialEnd = document.getElementById("receiptAddEnd").value.trim();
  const serials = document.getElementById("receiptAddSerials").value.trim();
  const note = document.getElementById("receiptAddNote").value.trim();

  if (!fixture) return toast("治具編號不得為空");

  const payload = {
    type: type,
    fixture_id: fixture,
    order_no: order || null,
    note: note || null,
    operator: null
  };

  if (type === "batch") {
    if (!serialStart || !serialEnd) return toast("批量模式需填序號起訖");
    payload.serial_start = serialStart;
    payload.serial_end = serialEnd;
  }

  if (type === "individual") {
    if (!serials) return toast("請輸入序號列表");
    payload.serials = serials;
  }

  try {
    await apiCreateReceipt(payload);
    toast("新增收料成功");
    toggleReceiptAdd(false);
    loadReceipts();
  } catch (err) {
    console.error(err);
    toast("新增失敗", "error");
  }
}

/* ============================================================
 * 收料：刪除
 * ============================================================ */

async function deleteReceipt(id) {
  if (!confirm("確認刪除？")) return;
  try {
    await apiDeleteReceipt(id);
    toast("刪除成功");
    loadReceipts();
  } catch (err) {
    toast("刪除失敗");
  }
}

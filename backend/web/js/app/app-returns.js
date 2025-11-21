/**
 * 退料登記前端控制邏輯 (v3.0)
 * app-returns.js
 *
 * ✔ 使用 fixture_id（取代 fixture_code）
 * ✔ 移除 vendor 欄位（v3.0 已刪除）
 * ✔ 分頁 / 搜尋
 * ✔ 匯入 Excel (.xlsx → JSON → API)
 * ✔ 完整支援 batch / individual
 * ✔ 與 api-returns.js v3.0 完整對應
 */

/* ============================================================
 * 🔵 表單切換（批量 / 個別序號）
 * ============================================================ */

const returnTypeSelect = document.getElementById("returnAddType");
if (returnTypeSelect) {
  returnTypeSelect.addEventListener("change", () => {
    const type = returnTypeSelect.value;
    document.getElementById("returnBatchArea").classList.toggle("hidden", type !== "batch");
    document.getElementById("returnIndividualArea").classList.toggle("hidden", type !== "individual");
  });
}

/* ============================================================
 * 🔵 新增表單顯示 / 隱藏
 * ============================================================ */

function toggleReturnAdd(show) {
  document.getElementById("returnAddForm").classList.toggle("hidden", !show);
}

/* ============================================================
 * 🔵 下載 Excel 範本 (v3.0)
 * ============================================================ */

function downloadReturnTemplate() {
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
  XLSX.utils.book_append_sheet(wb, ws, "return_template");
  XLSX.writeFile(wb, "return_template_v3.xlsx");
}

/* ============================================================
 * 🔵 匯入退料 Excel (.xlsx)
 * ============================================================ */

async function handleReturnImport(input) {
  if (!input.files.length) return;

  try {
    toast("正在匯入...");
    const result = await apiImportReturnsXlsx(input.files[0]);

    toast(result.message);
    console.log("退料匯入結果：", result);

    loadReturns();
  } catch (err) {
    console.error(err);
    toast("匯入失敗", "error");
  }

  input.value = "";
}

/* ============================================================
 * 🔵 分頁狀態
 * ============================================================ */

let returnsPage = 1;
let returnsPageSize = 20;

/* ============================================================
 * 🔵 載入退料記錄
 * ============================================================ */

async function loadReturns() {
  const fixture = document.getElementById("returnSearchFixture").value.trim();
  const order = document.getElementById("returnSearchOrder").value.trim();
  const op = document.getElementById("returnSearchOperator").value.trim();

  const params = {
    page: returnsPage,
    pageSize: returnsPageSize
  };

  if (fixture) params.fixtureId = fixture;
  if (order) params.orderNo = order;
  if (op) params.operator = op;

  const data = await apiListReturns(params);

  renderReturnsTable(data.returns);
  renderReturnsPagination(data.total);
}

/* ============================================================
 * 🔵 表格渲染
 * ============================================================ */

function renderReturnsTable(rows) {
  const tbody = document.getElementById("returnTable");
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
                onclick="deleteReturn(${row.id})">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 🔵 分頁渲染
 * ============================================================ */

function renderReturnsPagination(total) {
  const totalPages = Math.ceil(total / returnsPageSize);
  const box = document.getElementById("returnPagination");
  box.innerHTML = "";

  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    box.innerHTML = `
      <button class="btn btn-sm ${i === returnsPage ? "btn-primary" : "btn-outline"}"
              onclick="changeReturnPage(${i})">${i}</button>
    `;
  }
}

function changeReturnPage(p) {
  returnsPage = p;
  loadReturns();
}

/* ============================================================
 * 🔵 新增退料（批量 / 個別）
 * ============================================================ */

async function submitReturn() {
  const fixture = document.getElementById("returnAddFixture").value.trim();
  const order = document.getElementById("returnAddOrder").value.trim();
  const type = document.getElementById("returnAddType").value;

  const serialStart = document.getElementById("returnAddStart").value.trim();
  const serialEnd = document.getElementById("returnAddEnd").value.trim();
  const serials = document.getElementById("returnAddSerials").value.trim();
  const note = document.getElementById("returnAddNote").value.trim();

  if (!fixture) return toast("治具編號不得為空");

  const payload = {
    type: type,
    fixture_id: fixture,
    order_no: order || null,
    note: note || null,
    operator: null
  };

  if (type === "batch") {
    if (!serialStart || !serialEnd) return toast("批量模式需要序號起訖");
    payload.serial_start = serialStart;
    payload.serial_end = serialEnd;
  }

  if (type === "individual") {
    if (!serials) return toast("請輸入序號列表");
    payload.serials = serials;
  }

  try {
    await apiCreateReturn(payload);
    toast("新增退料成功");
    toggleReturnAdd(false);
    loadReturns();
  } catch (err) {
    console.error(err);
    toast("新增失敗", "error");
  }
}

/* ============================================================
 * 🔵 刪除退料記錄
 * ============================================================ */

async function deleteReturn(id) {
  if (!confirm("確認刪除？")) return;

  try {
    await apiDeleteReturn(id);
    toast("刪除成功");
    loadReturns();
  } catch (err) {
    toast("刪除失敗", "error");
  }
}

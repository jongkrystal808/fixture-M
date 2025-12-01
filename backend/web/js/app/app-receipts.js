/**
 * 收料 Receipts (Final v3.5)
 * 完整修正版（對應 index.html + api-receipts.js + v3.5）
 *
 * ✔ skip / limit
 * ✔ customer_id 必帶
 * ✔ fixture_id / order_no / operator
 * ✔ 修正 render（收料表格 7 欄位）
 * ✔ 匯入 API 正名：apiImportReceiptsXlsx
 * ✔ 刪除 API：apiDeleteReceipt({customer_id, id})
 * ✔ 新增收料完整可用
 */

/* ============================================================
 * 取得 customer_id
 * ============================================================ */

function getCurrentCustomerId() {
  return localStorage.getItem("current_customer_id");
}

/* ============================================================
 * 分頁狀態
 * ============================================================ */

let receiptsPage = 1;
const receiptsPageSize = 20;

/* ============================================================
 * 主列表載入
 * ============================================================ */

async function loadReceipts() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return console.warn("尚未選擇客戶");

  const fixture = document.getElementById("receiptSearchFixture")?.value.trim() || "";
  const order = document.getElementById("receiptSearchOrder")?.value.trim() || "";
  const operator = document.getElementById("receiptSearchOperator")?.value.trim() || "";

  const params = {
    customer_id,
    skip: (receiptsPage - 1) * receiptsPageSize,
    limit: receiptsPageSize
  };

  if (fixture) params.fixture_id = fixture;
  if (order) params.order_no = order;
  if (operator) params.operator = operator;

  try {
    const data = await apiListReceipts(params);
    renderReceiptTable(data.receipts || []);

    renderPagination(
      "receiptPagination",
      data.total || 0,
      receiptsPage,
      receiptsPageSize,
      (p) => {
        receiptsPage = p;
        loadReceipts();
      }
    );

  } catch (err) {
    console.error("loadReceipts error:", err);
    toast("收料資料載入失敗", "error");
  }
}

/* ============================================================
 * 渲染收料表格（不要使用共用版本 → 欄位不同）
 * ============================================================ */

function renderReceiptTable(rows) {
  const tbody = document.getElementById("receiptTable");
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="7" class="text-center py-3 text-gray-400">沒有資料</td></tr>
    `;
    return;
  }

  rows.forEach(r => {
    const serialText =
      r.serial_text ||
      (r.serial_start && r.serial_end ? `${r.serial_start}~${r.serial_end}` : "-");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${r.transaction_date || ""}</td>
      <td class="py-2 pr-4">${r.fixture_id}</td>
      <td class="py-2 pr-4">${r.vendor || "-"}</td>
      <td class="py-2 pr-4">${r.order_no || "-"}</td>
      <td class="py-2 pr-4">${serialText}</td>
      <td class="py-2 pr-4">${r.operator || "-"}</td>

      <td class="py-2 pr-4 text-red-600">
        <button class="btn btn-ghost text-xs"
                onclick="deleteReceipt(${r.id})">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 新增收料
 * ============================================================ */

async function submitReceipt() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return toast("請先選擇客戶");

  const fixture = document.getElementById("receiptAddFixture").value.trim();
  const vendor = document.getElementById("receiptAddVendor").value.trim();
  const order = document.getElementById("receiptAddOrder").value.trim();
  const type = document.getElementById("receiptAddType").value;
  const note = document.getElementById("receiptAddNote").value.trim();

  const serialStart = document.getElementById("receiptAddStart").value.trim();
  const serialEnd = document.getElementById("receiptAddEnd").value.trim();
  const serials = document.getElementById("receiptAddSerials").value.trim();

  if (!fixture) return toast("治具編號不得為空");

  const payload = {
    customer_id,
    fixture_id: fixture,
    vendor: vendor || null,
    order_no: order || null,
    type,
    note: note || null
  };

  if (type === "batch") {
    if (!serialStart || !serialEnd)
      return toast("批量模式需輸入序號起訖");

    payload.serial_start = serialStart;
    payload.serial_end = serialEnd;
  } else {
    if (!serials)
      return toast("請輸入序號列表（以逗號分隔）");

    payload.serials = serials;
  }

  try {
    await apiCreateReceipt(payload);
    toast("收料新增成功");

    document.getElementById("receiptAddForm").classList.add("hidden");
    loadReceipts();

  } catch (err) {
    console.error(err);
    toast("收料新增失敗", "error");
  }
}

/* ============================================================
 * 刪除收料
 * ============================================================ */
async function deleteReceipt(id) {
  if (!confirm("確認刪除收料記錄？")) return;

  const customer_id = localStorage.getItem("current_customer_id");

  try {
    // ★ 正確呼叫：只傳 id，customer_id 由 query string 自動加
    await apiDeleteReceipt(id, customer_id);

    toast("刪除成功");
    loadReceipts();

  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}


/* ============================================================
 * 匯出單筆收料 CSV
 * ============================================================ */

async function exportReceipt(id) {
  try {
    const blob = await apiExportReceiptCsv(id);
    exportCsvBlob(blob, `receipt_${id}.csv`);
  } catch (err) {
    toast("匯出失敗", "error");
  }
}

function exportCsvBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ============================================================
 * 類型切換（批量 / 個別）
 * ============================================================ */

function handleReceiptTypeChange() {
  const type = document.getElementById("receiptAddType").value;

  const batchArea = document.getElementById("receiptBatchArea");
  const individualArea = document.getElementById("receiptIndividualArea");

  if (type === "batch") {
    batchArea.classList.remove("hidden");
    individualArea.classList.add("hidden");
  } else {
    batchArea.classList.add("hidden");
    individualArea.classList.remove("hidden");
  }
}

document.getElementById("receiptAddType")
  ?.addEventListener("change", handleReceiptTypeChange);

window.handleReceiptTypeChange = handleReceiptTypeChange;

/* ============================================================
 * 下載 Excel 範本
 * ============================================================ */

function downloadReceiptTemplate() {
  const template = [
    {
      fixture_id: "C-00010",
      vendor: "MOXA",
      order_no: "PO123456",
      type: "batch",
      serial_start: 1,
      serial_end: 10,
      note: "示例備註"
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(template);
  XLSX.utils.book_append_sheet(wb, ws, "receipt_template");
  XLSX.writeFile(wb, "receipt_template.xlsx");
}

window.downloadReceiptTemplate = downloadReceiptTemplate;

/* ============================================================
 * 匯入 Excel/CSV
 * ============================================================ */

async function handleReceiptImport(input) {
  const file = input.files[0];
  if (!file) return alert("請選擇 Excel 或 CSV 檔案");

  const customer_id = getCurrentCustomerId();
  if (!customer_id) return alert("請先選擇客戶");

  try {
    toast("正在匯入...");
    const result = await apiImportReceiptsXlsx(file, customer_id);

    alert(`匯入成功，共 ${result.count || 0} 筆記錄`);
    loadReceipts();
  } catch (err) {
    console.error("匯入失敗：", err);
    alert(`匯入失敗：${err.message}`);
  } finally {
    input.value = "";
  }
}

window.handleReceiptImport = handleReceiptImport;

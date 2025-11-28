/* ============================================================
 * 收料 Receipts (Final v3.5)
 * - 使用 apiListReceipts / apiCreateReceipt / apiDeleteReceipt
 * - 使用共用 UI：renderTransactionTable / renderPagination / exportCsv
 * ============================================================ */

/* 🔵 分頁狀態 */
let receiptsPage = 1;
const receiptsPageSize = 20;

/* ============================================================
 * 主列表載入
 * ============================================================ */
async function loadReceipts() {
  const fixture = document.getElementById("receiptSearchFixture").value.trim();
  const order = document.getElementById("receiptSearchOrder").value.trim();
  const operator = document.getElementById("receiptSearchOperator").value.trim();

  const params = {
    skip: (receiptsPage - 1) * receiptsPageSize,
    limit: receiptsPageSize
  };

  if (fixture) params.fixture_id = fixture;
  if (order) params.order_no = order;
  if (operator) params.operator = operator;

  const data = await apiListReceipts(params);

  // 渲染表格（共用）
  renderTransactionTable(data.receipts, "receiptTable");

  // 渲染分頁（共用）
  renderPagination(
    "receiptPagination",
    data.total,
    receiptsPage,
    receiptsPageSize,
    (p) => {
      receiptsPage = p;
      loadReceipts();
    }
  );
}

/* ============================================================
 * 新增收料
 * ============================================================ */
async function submitReceipt() {
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

  await apiCreateReceipt(payload);

  toast("收料新增成功");
  document.getElementById("receiptAddForm").classList.add("hidden");
  loadReceipts();
}

/* ============================================================
 * 刪除收料
 * ============================================================ */
async function deleteReceipt(id) {
  if (!confirm("確認刪除收料記錄？")) return;

  await apiDeleteReceipt(id);
  toast("刪除成功");
  loadReceipts();
}

/* ============================================================
 * 匯出收料 CSV
 * ============================================================ */
async function exportReceipt(id) {
  try {
    const blob = await apiExportReceiptCsv(id);
    exportCsvBlob(blob, `receipt_${id}.csv`);
  } catch (err) {
    toast("匯出失敗", "error");
    console.error(err);
  }
}

/* 專門用於 Blob 下載 */
function exportCsvBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
// /web/js/app/app-returns.js

/**
 * 切換退料：批量 / 少量序號 UI 顯示
 */
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

// 綁定事件
document.getElementById("receiptAddType")
  .addEventListener("change", handleReceiptTypeChange);

// 讓 HTML onclick 可以呼叫（如果你之後有用到）
window.handleReceiptTypeChange = handleReceiptTypeChange;
window.downloadReceiptTemplate = downloadReceiptTemplate;


/********************************************
 * 收料：下載 Excel 範本
 ********************************************/
function downloadReceiptTemplate() {
  const template = [
    {
      vendor: "MOXA",            // = customer_id
      order_no: "PO123456",
      fixture_id: "C-00010",
      type: "batch",             // batch / individual
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


/**
 * 收料：匯入 Excel/CSV（使用後端 /receipts/import）
 */
async function handleReceiptImport(input) {
  const file = input.files[0];
  if (!file) {
    alert("請選擇 Excel 或 CSV 檔案");
    return;
  }

  try {
    // 直接交給後端處理，不需要前端解析
    const result = await apiImportReceiptsCsv(file);

    console.log("匯入結果：", result);
    alert(`匯入成功，共 ${result.count || 0} 筆記錄`);

    // 重整畫面
    if (typeof loadReceipts === "function") {
      loadReceipts();
    }

  } catch (err) {
    console.error("匯入失敗：", err);
    alert(`匯入失敗：${err.message}`);
  } finally {
    // 清空 input，不然同一檔案不會觸發 onchange
    input.value = "";
  }
}

window.handleReceiptImport = handleReceiptImport;

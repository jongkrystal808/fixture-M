/* ============================================================
 * 退料 Returns (Final v3.5)
 * - 使用 apiListReturns / apiCreateReturn / apiDeleteReturn
 * - 使用共用 UI：renderTransactionTable / renderPagination / exportCsv
 * ============================================================ */

/* 🟠 分頁狀態 */
let returnsPage = 1;
const returnsPageSize = 20;

/* ============================================================
 * 主列表載入
 * ============================================================ */
async function loadReturns() {
  const fixture = document.getElementById("returnSearchFixture").value.trim();
  const order = document.getElementById("returnSearchOrder").value.trim();
  const operator = document.getElementById("returnSearchOperator").value.trim();

  const params = {
    skip: (returnsPage - 1) * returnsPageSize,
    limit: returnsPageSize
  };

  if (fixture) params.fixture_id = fixture;
  if (order) params.order_no = order;
  if (operator) params.operator = operator;

  const data = await apiListReturns(params);

  // 渲染表格（共用）
  renderTransactionTable(data.returns, "returnTable");

  // 渲染分頁（共用）
  renderPagination(
    "returnPagination",
    data.total,
    returnsPage,
    returnsPageSize,
    (p) => {
      returnsPage = p;
      loadReturns();
    }
  );
}

/* ============================================================
 * 新增退料
 * ============================================================ */
async function submitReturn() {
  const fixture = document.getElementById("returnAddFixture").value.trim();
  const vendor = document.getElementById("returnAddVendor").value.trim();
  const order = document.getElementById("returnAddOrder").value.trim();
  const type = document.getElementById("returnAddType").value;
  const note = document.getElementById("returnAddNote").value.trim();

  const serialStart = document.getElementById("returnAddStart").value.trim();
  const serialEnd = document.getElementById("returnAddEnd").value.trim();
  const serials = document.getElementById("returnAddSerials").value.trim();

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

  await apiCreateReturn(payload);

  toast("退料新增成功");
  document.getElementById("returnAddForm").classList.add("hidden");
  loadReturns();
}

/* ============================================================
 * 刪除退料
 * ============================================================ */
async function deleteReturn(id) {
  if (!confirm("確認刪除退料記錄？")) return;

  await apiDeleteReturn(id);
  toast("刪除成功");
  loadReturns();
}


/********************************************
 * 收料：下載 Excel 範本
 ********************************************/
function downloadReturnTemplate() {
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

  XLSX.utils.book_append_sheet(wb, ws, "return_template");
  XLSX.writeFile(wb, "return_template.xlsx");
}

/**
 * 收料：匯入 Excel/CSV（使用後端 /receipts/import）
 */
async function handleReturnImport(input) {
  const file = input.files[0];
  if (!file) {
    alert("請選擇 Excel 或 CSV 檔案");
    return;
  }

  try {
    // 直接交給後端處理，不需要前端解析
    const result = await apiImportReturnCsv(file);

    console.log("匯入結果：", result);
    alert(`匯入成功，共 ${result.count || 0} 筆記錄`);

    // 重整畫面
    if (typeof loadReturns === "function") {
      loadReturns();
    }

  } catch (err) {
    console.error("匯入失敗：", err);
    alert(`匯入失敗：${err.message}`);
  } finally {
    // 清空 input，不然同一檔案不會觸發 onchange
    input.value = "";
  }
}

window.handleReturnImport = handleReturnImport;

/**
 * 切換「新增退料記錄」表單顯示/隱藏
 */
function toggleReturnAdd(show) {
  const form = document.getElementById("returnAddForm");

  if (!form) {
    console.error("returnAddForm 不存在！");
    return;
  }

  if (show) {
    form.classList.remove("hidden");

    // 預設類型為 batch
    const typeSel = document.getElementById("returnAddType");
    if (typeSel) typeSel.value = "batch";

    // 立即更新顯示模式（批量/少量）
    if (typeof handleReturnTypeChange === "function") {
      handleReturnTypeChange();
    }
  } else {
    form.classList.add("hidden");
  }
}

// ⚠ 必須掛到 window，HTML onclick 才能找到
window.toggleReturnAdd = toggleReturnAdd;


// 只留下唯一版本的切換函式
function handleReturnTypeChange() {
  const type = document.getElementById("returnAddType").value;

  const batchArea = document.getElementById("returnBatchArea");
  const individualArea = document.getElementById("returnIndividualArea");

  if (type === "batch") {
    batchArea.classList.remove("hidden");
    individualArea.classList.add("hidden");
  } else {
    batchArea.classList.add("hidden");
    individualArea.classList.remove("hidden");
  }
}

// 🟢️ 確保 DOM 生成後再綁定（100% 成功）
window.addEventListener("DOMContentLoaded", () => {
  const typeSel = document.getElementById("returnAddType");
  if (typeSel) {
    typeSel.addEventListener("change", handleReturnTypeChange);
  } else {
    console.error("找不到 returnAddType！");
  }
});

// 給 HTML 用
window.handleReturnTypeChange = handleReturnTypeChange;
window.downloadReturnTemplate = downloadReturnTemplate;
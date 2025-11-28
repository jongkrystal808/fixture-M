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

/* ============================================================
 * 匯出退料 CSV
 * ============================================================ */
async function exportReturn(id) {
  try {
    const blob = await apiExportReturnCsv(id);
    exportCsvBlob(blob, `return_${id}.csv`);
  } catch (err) {
    toast("匯出失敗", "error");
    console.error(err);
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

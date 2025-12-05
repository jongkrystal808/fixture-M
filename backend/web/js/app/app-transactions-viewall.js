// ======================================================
// ★ 收退料總檢視 (View All Transactions)
// ======================================================

// API 呼叫
async function apiViewAllTransactions(params = {}) {
  const q = new URLSearchParams(params).toString();
  return api(`/transactions/view-all?${q}`);
}

// 載入總檢視資料
async function loadTransactionViewAll() {

  const customerId = getCurrentCustomerId();
  if (!customerId) {
    console.warn("未選擇客戶，無法載入總檢視");
    return;
  }

  const fixtureId = document.getElementById("vaFixture").value.trim();
  const datecode = document.getElementById("vaDatecode").value.trim();
  const operator = document.getElementById("vaOperator").value.trim();
  const type = document.getElementById("vaType").value;

  const params = {
    customer_id: customerId,   // ★ MUST HAVE
    fixture_id: fixtureId || undefined,
    datecode: datecode || undefined,
    operator: operator || undefined,
    type: type || undefined,
    skip: 0,
    limit: 200
  };

  const res = await apiViewAllTransactions(params);

  renderViewAllTable(res.rows);
}

// 渲染表格
function renderViewAllTable(rows) {
  const tbody = document.getElementById("viewAllTableBody");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-gray-500">無資料</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.transaction_date}</td>
      <td>${r.transaction_type === "receipt" ? "收料" : "退料"}</td>
      <td>${r.fixture_id}</td>
      <td>${r.customer_id}</td>
      <td>${r.source_type === "self_purchased" ? "自購" : "客供"}</td>
      <td>${r.datecode || "-"}</td>
      <td>${r.quantity || "-"}</td>
      <td>${r.operator || "-"}</td>
      <td>${r.note || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}
// ============================================================
// 收料 / 退料 / 總檢視 TAB 切換控制
// ============================================================

function showTab(tabId) {

  // 1. 隱藏所有子頁面 (收料、退料、總檢視)
  document.querySelectorAll("#rtab-receipts, #rtab-returns, #viewAllTab")
          .forEach(el => el.classList.add("hidden"));

  // 2. 顯示目標頁
  const target = document.getElementById(tabId);
  if (target) target.classList.remove("hidden");

  // 3. 更新按鈕 active 樣式
  document.querySelectorAll(".subtab").forEach(btn => btn.classList.remove("subtab-active"));

  if (tabId === "rtab-receipts") {
    document.querySelector("[data-rtab='receipts']")?.classList.add("subtab-active");
  }
  else if (tabId === "rtab-returns") {
    document.querySelector("[data-rtab='returns']")?.classList.add("subtab-active");
  }
  else if (tabId === "viewAllTab") {
    // 顯示總檢視 TAB 時自動載入資料
    loadTransactionViewAll();
  }
}


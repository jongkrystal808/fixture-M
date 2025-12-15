/**
 * 客戶管理前端控制 (v3.0)
 * app-customers.js
 *
 * ✔ 搜尋 / 分頁
 * ✔ 新增 / 編輯 / 刪除
 * ✔ 與 api-customers.js 完整對應
 */

/* ============================================================
 * 分頁狀態
 * ============================================================ */

let customerPage = 1;
let customerPageSize = 20;

/* ============================================================
 * 初始化
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  // 🔥 若頁面中沒有 customerTable → 不啟動 customers 模組
  if (!document.getElementById("customerTable")) {
    console.warn("Customer table not found — skip customers module init");
    return;
  }

  loadCustomers();
});


/* ============================================================
 * 載入客戶列表
 * ============================================================ */

async function loadCustomers() {
  const search = document.getElementById("customerSearch")?.value.trim() || "";

  const params = {
    page: customerPage,
    pageSize: customerPageSize
  };

  if (search) params.search = search;

  try {
    const result = await apiListCustomers(params);
    renderCustomerTable(result.customers);
    renderCustomerPagination(result.total);
  } catch (err) {
    console.error(err);
    toast("載入客戶失敗", "error");
  }
}

/* ============================================================
 * 表格渲染
 * ============================================================ */

function renderCustomerTable(rows) {
  const tbody = document.getElementById("customerTable");
  if (!tbody) return;   // 避免 null crash
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4 text-gray-400">
          查無資料
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach(c => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="py-2 px-2">${c.customer_id}</td>
      <td class="py-2 px-2">${c.customer_name}</td>
      <td class="py-2 px-2">${c.note || ""}</td>
      <td class="py-2 px-2 text-right">
        <button class="btn btn-xs btn-outline" onclick="openCustomerEdit('${c.customer_id}')">編輯</button>
        <button class="btn btn-xs btn-error" onclick="deleteCustomer('${c.customer_id}')">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 分頁
 * ============================================================ */

function renderCustomerPagination(total) {
  const totalPages = Math.ceil(total / customerPageSize);
  const box = document.getElementById("customerPagination");

  box.innerHTML = "";
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${i === customerPage ? "btn-primary" : "btn-outline"}`;
    btn.innerText = i;
    btn.onclick = () => changeCustomerPage(i);
    box.appendChild(btn);
  }
}

function changeCustomerPage(p) {
  customerPage = p;
  loadCustomers();
}

/* ============================================================
 * 新增客戶
 * ============================================================ */

function openCustomerAdd() {
  document.getElementById("customerForm").reset();
  document.getElementById("customerFormMode").value = "add";
  document.getElementById("customerModalTitle").innerText = "新增客戶";
  customerModal.showModal();
}

async function submitCustomerForm() {
  const mode = document.getElementById("customerFormMode").value;

  const payload = {
    customer_id: document.getElementById("c_id").value.trim(),
    customer_name: document.getElementById("c_name").value.trim(),
    note: document.getElementById("c_note").value.trim() || null
  };

  if (!payload.customer_id) return toast("請輸入客戶代碼");
  if (!payload.customer_name) return toast("請輸入客戶名稱");

  try {
    if (mode === "add") {
      await apiCreateCustomer(payload);
      toast("新增客戶成功");
    } else {
      await apiUpdateCustomer(payload.customer_id, payload);
      toast("更新成功");
    }

    customerModal.close();
    loadCustomers();
  } catch (err) {
    console.error(err);
    toast("操作失敗", "error");
  }
}

/* ============================================================
 * 編輯客戶
 * ============================================================ */

async function openCustomerEdit(customerId) {
  const data = await apiGetCustomer(customerId);

  document.getElementById("customerFormMode").value = "edit";
  document.getElementById("customerModalTitle").innerText = "編輯客戶";

  document.getElementById("c_id").value = data.customer_id;
  document.getElementById("c_name").value = data.customer_name;
  document.getElementById("c_note").value = data.note || "";

  customerModal.showModal();
}

/* ============================================================
 * 刪除
 * ============================================================ */

async function deleteCustomer(id) {
  if (!confirm("確定要刪除這個客戶？\n刪除後無法復原！")) return;

  try {
    await apiDeleteCustomer(id);
    toast("已刪除");
    loadCustomers();
  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}

const activeTab =
  document.querySelector(".tab.tab-active")?.dataset.tab || null;

if (activeTab === "query") {
  const type = document.getElementById("queryType")?.value || "fixture";
  if (type === "fixture") loadFixturesQuery();
  else loadModelsQuery();
}

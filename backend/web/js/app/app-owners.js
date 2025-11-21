/**
 * 負責人管理 UI 控制 (v3.0)
 * app-owners.js
 *
 * ✔ 搜尋 / 分頁
 * ✔ 新增 / 編輯 / 刪除
 * ✔ 與 api-owners.js 完全整合
 */

/* ============================================================
 * 分頁狀態
 * ============================================================ */

let ownerPage = 1;
let ownerPageSize = 20;

/* ============================================================
 * 初始化
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  loadOwners();
});

/* ============================================================
 * 載入負責人列表
 * ============================================================ */

async function loadOwners() {
  const search = document.getElementById("ownerSearch")?.value.trim() || "";
  const active = document.getElementById("ownerFilterActive")?.value || "";

  const params = {
    page: ownerPage,
    pageSize: ownerPageSize
  };

  if (search) params.search = search;
  if (active !== "") params.is_active = active;

  try {
    const result = await apiListOwners(params);
    renderOwnerTable(result.owners);
    renderOwnerPagination(result.total);
  } catch (err) {
    console.error(err);
    toast("載入負責人失敗", "error");
  }
}

/* ============================================================
 * 表格渲染
 * ============================================================ */

function renderOwnerTable(rows) {
  const tbody = document.getElementById("ownerTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-gray-400">
          查無資料
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach(o => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="py-2 px-2">${o.primary_owner}</td>
      <td class="py-2 px-2">${o.secondary_owner || ""}</td>
      <td class="py-2 px-2">${o.email || ""}</td>
      <td class="py-2 px-2">${o.is_active ? "<span class='text-green-600'>啟用</span>" : "<span class='text-red-600'>停用</span>"}</td>
      <td class="py-2 px-2">${o.note || ""}</td>
      <td class="py-2 px-2 text-right">
        <button class="btn btn-xs btn-outline" onclick="openOwnerEdit(${o.id})">編輯</button>
        <button class="btn btn-xs btn-error" onclick="deleteOwner(${o.id})">刪除</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 分頁
 * ============================================================ */

function renderOwnerPagination(total) {
  const totalPages = Math.ceil(total / ownerPageSize);
  const box = document.getElementById("ownerPagination");

  box.innerHTML = "";
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${i === ownerPage ? "btn-primary" : "btn-outline"}`;
    btn.innerText = i;
    btn.onclick = () => changeOwnerPage(i);
    box.appendChild(btn);
  }
}

function changeOwnerPage(p) {
  ownerPage = p;
  loadOwners();
}

/* ============================================================
 * 新增負責人
 * ============================================================ */

function openOwnerAdd() {
  document.getElementById("ownerForm").reset();
  document.getElementById("ownerFormMode").value = "add";
  document.getElementById("ownerModalTitle").innerText = "新增負責人";
  ownerModal.showModal();
}

async function submitOwnerForm() {
  const mode = document.getElementById("ownerFormMode").value;

  const payload = {
    primary_owner: document.getElementById("o_primary").value.trim(),
    secondary_owner: document.getElementById("o_secondary").value.trim() || null,
    email: document.getElementById("o_email").value.trim() || null,
    is_active: document.getElementById("o_active").checked,
    note: document.getElementById("o_note").value.trim() || null
  };

  if (!payload.primary_owner) return toast("請輸入負責人姓名");

  try {
    if (mode === "add") {
      await apiCreateOwner(payload);
      toast("新增負責人成功");
    } else {
      const id = document.getElementById("ownerFormId").value;
      await apiUpdateOwner(id, payload);
      toast("更新成功");
    }

    ownerModal.close();
    loadOwners();

  } catch (err) {
    console.error(err);
    toast("操作失敗", "error");
  }
}

/* ============================================================
 * 編輯負責人
 * ============================================================ */

async function openOwnerEdit(id) {
  const data = await apiGetOwner(id);

  document.getElementById("ownerFormMode").value = "edit";
  document.getElementById("ownerFormId").value = id;

  document.getElementById("o_primary").value = data.primary_owner;
  document.getElementById("o_secondary").value = data.secondary_owner || "";
  document.getElementById("o_email").value = data.email || "";
  document.getElementById("o_active").checked = data.is_active;
  document.getElementById("o_note").value = data.note || "";

  document.getElementById("ownerModalTitle").innerText = "編輯負責人";
  ownerModal.showModal();
}

/* ============================================================
 * 刪除負責人
 * ============================================================ */

async function deleteOwner(id) {
  if (!confirm("確定要刪除該負責人？")) return;

  try {
    await apiDeleteOwner(id);
    toast("已刪除");
    loadOwners();
  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}

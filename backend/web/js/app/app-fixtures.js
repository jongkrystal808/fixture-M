/**
 * 治具管理前端控制 (v3.0)
 * app-fixtures.js
 *
 * ✔ 分頁、搜尋、篩選（owner / status）
 * ✔ 顯示所有治具數量欄位（v3.0）
 * ✔ 新增 / 編輯 / 刪除 modal
 * ✔ 自動載入 owner 下拉清單
 * ✔ Token 自動帶 customer_id
 * ✔ 與 api-fixtures.js 完全整合
 */

// ==============================
// UI DOM
// ==============================

const fxTableBody = document.querySelector("#fixtureTableBody");
const fxPagination = document.querySelector("#fixturePagination");

// Modal 元件
const fxModal = document.querySelector("#fixtureModal");
const fxModalTitle = document.querySelector("#fxModalTitle");
const fxForm = document.querySelector("#fixtureForm");

// 下拉 & 搜尋
const fxSearchInput = document.querySelector("#fxSearch");
const fxOwnerSelect = document.querySelector("#fxOwnerSelect");
const fxStatusSelect = document.querySelector("#fxStatusSelect");

// 新增按鈕
const btnAddFixture = document.querySelector("#btnAddFixture");


// ==============================
// 分頁狀態
// ==============================

let fxPage = 1;
let fxPageSize = 10;


// ==============================
// 初始化
// ==============================

async function initFixturesPage() {
  await loadOwnersDropDown();
  await loadFixtureList();
  setupFixtureUIEvents();
}

document.addEventListener("DOMContentLoaded", initFixturesPage);


// ==============================
// 載入 owner 下拉清單
// ==============================

async function loadOwnersDropDown() {
  try {
    const owners = await apiGetOwnersSimple(); // 需後端 /owners/active API

    fxOwnerSelect.innerHTML = `<option value="">全部負責人</option>`;

    owners.forEach(o => {
      fxOwnerSelect.innerHTML += `
        <option value="${o.id}">${o.primary_owner}</option>
      `;
    });

  } catch (err) {
    console.error("載入 owners 失敗：", err);
  }
}


// ==============================
// 載入治具列表
// ==============================

async function loadFixtureList() {
  const search = fxSearchInput.value.trim();
  const ownerId = fxOwnerSelect.value;
  const statusFilter = fxStatusSelect.value;

  const result = await apiListFixtures({
    page: fxPage,
    pageSize: fxPageSize,
    search,
    ownerId,
    statusFilter
  });

  renderFixtureTable(result.fixtures);
  renderFixturePagination(result.total);
}


// ==============================
// 表格渲染
// ==============================

function renderFixtureTable(rows) {
  fxTableBody.innerHTML = "";

  if (!rows || rows.length === 0) {
    fxTableBody.innerHTML = `
      <tr><td colspan="10" class="text-center py-6 text-gray-400">沒有資料</td></tr>
    `;
    return;
  }

  rows.forEach(f => {
    fxTableBody.innerHTML += `
      <tr class="hover:bg-gray-50">
        <td class="px-2 py-1">${f.id}</td>
        <td class="px-2 py-1">${f.fixture_name}</td>
        <td class="px-2 py-1">${f.owner_name ?? "-"}</td>
        <td class="px-2 py-1 text-right">${f.self_purchased_qty}</td>
        <td class="px-2 py-1 text-right">${f.customer_supplied_qty}</td>
        <td class="px-2 py-1 text-right">${f.available_qty}</td>
        <td class="px-2 py-1 text-right">${f.deployed_qty}</td>
        <td class="px-2 py-1 text-right">${f.maintenance_qty}</td>
        <td class="px-2 py-1">${f.status}</td>
        <td class="px-2 py-1 text-right">
          <button class="btn btn-xs btn-outline" onclick="openFixtureEdit('${f.id}')">編輯</button>
          <button class="btn btn-xs btn-error" onclick="deleteFixture('${f.id}')">刪除</button>
        </td>
      </tr>
    `;
  });
}


// ==============================
// 分頁渲染
// ==============================

function renderFixturePagination(total) {
  const totalPages = Math.ceil(total / fxPageSize);
  fxPagination.innerHTML = "";

  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    fxPagination.innerHTML += `
      <button 
        class="btn btn-sm ${i === fxPage ? "btn-primary" : "btn-outline"}"
        onclick="changeFixturePage(${i})">
        ${i}
      </button>
    `;
  }
}

function changeFixturePage(p) {
  fxPage = p;
  loadFixtureList();
}


// ==============================
// 新增治具
// ==============================

btnAddFixture.addEventListener("click", () => {
  fxModalTitle.textContent = "新增治具";
  fxForm.reset();
  fxForm.dataset.mode = "create";
  fxModal.showModal();
});


// ==============================
// 編輯治具
// ==============================

async function openFixtureEdit(fixtureId) {
  fxModalTitle.textContent = "編輯治具";
  fxForm.dataset.mode = "edit";
  fxForm.dataset.id = fixtureId;

  const data = await apiGetFixture(fixtureId);

  // 填入資料（符合 fixture schema）
  fxForm.fixture_id.value = data.id;
  fxForm.fixture_name.value = data.fixture_name;
  fxForm.owner_id.value = data.owner_id || "";
  fxForm.self_purchased_qty.value = data.self_purchased_qty;
  fxForm.customer_supplied_qty.value = data.customer_supplied_qty;
  fxForm.replacement_cycle.value = data.replacement_cycle;
  fxForm.cycle_unit.value = data.cycle_unit;
  fxForm.note.value = data.note ?? "";

  fxModal.showModal();
}


// ==============================
// 表單送出
// ==============================

fxForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = {
    fixture_id: fxForm.fixture_id.value.trim(),
    fixture_name: fxForm.fixture_name.value.trim(),
    owner_id: fxForm.owner_id.value || null,
    self_purchased_qty: Number(fxForm.self_purchased_qty.value) || 0,
    customer_supplied_qty: Number(fxForm.customer_supplied_qty.value) || 0,
    replacement_cycle: Number(fxForm.replacement_cycle.value) || 0,
    cycle_unit: fxForm.cycle_unit.value,
    note: fxForm.note.value.trim(),
  };

  try {
    if (fxForm.dataset.mode === "create") {
      await apiCreateFixture(formData);
      toast("新增成功");
    } else {
      const id = fxForm.dataset.id;
      await apiUpdateFixture(id, formData);
      toast("更新成功");
    }

    fxModal.close();
    await loadFixtureList();

  } catch (err) {
    console.error(err);
    toast("操作失敗", "error");
  }
});


// ==============================
// 刪除治具
// ==============================

async function deleteFixture(fixtureId) {
  if (!confirm(`確定要刪除治具「${fixtureId}」嗎？`)) return;

  try {
    await apiDeleteFixture(fixtureId);
    toast("刪除成功");
    loadFixtureList();
  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}


// ==============================
// 綁定 UI 控制事件
// ==============================

function setupFixtureUIEvents() {
  fxSearchInput.addEventListener("input", debounce(loadFixtureList, 300));
  fxOwnerSelect.addEventListener("change", loadFixtureList);
  fxStatusSelect.addEventListener("change", loadFixtureList);
}


/**
 * 小工具：防抖
 */
function debounce(fn, delay = 250) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
async function openModelDetail(modelId) {
  const drawer = document.getElementById("modelDetailDrawer");
  const box = document.getElementById("modelDetailContent");

  drawer.classList.remove("translate-x-full");
  box.innerHTML = `<div class="p-3 text-gray-400">載入中...</div>`;

  try {
    const data = await apiGetModelDetail(modelId);

    const m = data.model;
    const stations = data.stations;
    const reqs = data.fixture_requirements;
    const fixtures = data.fixtures;
    const summary = data.status_summary;

    box.innerHTML = `
      <!-- 基本資料 -->
      <section>
        <h3 class="font-semibold text-lg mb-2">基本資料</h3>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><strong>機種代碼：</strong>${m.id}</div>
          <div><strong>名稱：</strong>${m.model_name}</div>
          <div><strong>備註：</strong>${m.note || "-"}</div>
          <div><strong>建立時間：</strong>${m.created_at || "-"}</div>
        </div>
      </section>

      <!-- 綁定站點 -->
      <section>
        <h3 class="font-semibold text-lg mb-2">綁定站點</h3>
        ${renderModelStationsTable(stations)}
      </section>

      <!-- 治具需求 -->
      <section>
        <h3 class="font-semibold text-lg mb-2">治具需求</h3>
        ${renderFixtureReqTable(reqs)}
      </section>

      <!-- 所有治具 -->
      <section>
        <h3 class="font-semibold text-lg mb-2">旗下治具</h3>
        ${renderModelFixturesTable(fixtures)}
      </section>

      <!-- 狀態統計 -->
      <section>
        <h3 class="font-semibold text-lg mb-2">治具狀態統計</h3>
        ${renderStatusSummary(summary)}
      </section>
    `;

  } catch (err) {
    box.innerHTML = `<div class="text-red-500">載入失敗</div>`;
  }
}
function renderModelStationsTable(rows) {
  if (!rows || rows.length === 0)
    return `<div class="text-gray-400">沒有綁定任何站點</div>`;

  return `
    <table class="min-w-full text-sm">
      <thead><tr>
        <th class="py-1 pr-3">站點編號</th>
        <th class="py-1 pr-3">站點名稱</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td class="py-1 pr-3">${r.station_id}</td>
            <td class="py-1 pr-3">${r.station_name}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderFixtureReqTable(rows) {
  if (!rows || rows.length === 0)
    return `<div class="text-gray-400">無治具需求設定</div>`;

  return `
    <table class="min-w-full text-sm">
      <thead><tr>
        <th class="py-1 pr-3">站點</th>
        <th class="py-1 pr-3">治具</th>
        <th class="py-1 pr-3">需求量</th>
        <th class="py-1 pr-3">備註</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.station_id} - ${r.station_name}</td>
            <td>${r.fixture_id}</td>
            <td>${r.required_qty}</td>
            <td>${r.note || ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderModelFixturesTable(rows) {
  if (!rows || rows.length === 0)
    return `<div class="text-gray-400">沒有治具屬於此機種</div>`;

  return `
    <table class="min-w-full text-sm">
      <thead><tr>
        <th class="py-1 pr-3">治具編號</th>
        <th class="py-1 pr-3">狀態</th>
        <th class="py-1 pr-3">站點</th>
        <th class="py-1 pr-3">負責人</th>
        <th class="py-1 pr-3">更新時間</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.fixture_id}</td>
            <td>${r.status}</td>
            <td>${r.station_id || "-"}</td>
            <td>${r.owner_id || "-"}</td>
            <td>${r.updated_at || "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderStatusSummary(map) {
  const keys = Object.keys(map || {});
  if (keys.length === 0)
    return `<div class="text-gray-400">無治具統計資料</div>`;

  return `
    <ul class="list-disc pl-5 text-sm">
      ${keys.map(k => `<li>${k}: ${map[k]} 個</li>`).join("")}
    </ul>
  `;
}
function closeModelDetail() {
  document.getElementById("modelDetailDrawer")
    .classList.add("translate-x-full");
}


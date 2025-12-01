/* ============================================================
 * app-query.js  (v3.5)
 *
 * ✔ 完全對應 index.html 的查詢頁
 * ✔ 治具查詢 fixtureQueryArea
 * ✔ 機種查詢 modelQueryArea
 * ✔ Drawer 詳細資訊
 * ✔ 無舊版 UI / qtab / stationList / fixturePagination 等不存在 DOM
 * ✔ 使用 current_customer_id
 * ============================================================ */


/* ============================================================
 * 工具：簡易分頁（目前 UI 沒有分頁欄位，所以不顯示）
 * ============================================================ */
function renderPagination() {
  /* 保留空函式避免錯誤（index.html 無對應 DOM，因此不做任何事） */
}



/* ============================================================
 * 🔵 治具查詢 Fixtures
 * ============================================================ */

let fixtureQueryPage = 1;
const fixtureQueryPageSize = 50;

/* 🔥 debounce 避免輸入時狂打 API */
let fixturesQueryTimer = null;
function debounceLoadFixtures() {
  clearTimeout(fixturesQueryTimer);
  fixturesQueryTimer = setTimeout(loadFixturesQuery, 250);
}

async function loadFixturesQuery() {
  const searchEl = document.getElementById("fixtureSearch");
  const statusEl = document.getElementById("fixtureStatus");
  const tbody = document.getElementById("fixtureTable");

  if (!searchEl || !statusEl || !tbody) {
    console.warn("Query UI not ready");
    return;
  }

  const keyword = searchEl.value.trim();
  const status = statusEl.value;

  const params = {
    skip: (fixtureQueryPage - 1) * fixtureQueryPageSize,
    limit: fixtureQueryPageSize
  };

  if (keyword) params.search = keyword;
  if (status && status !== "全部") params.status = status;

  try {
    const data = await apiListFixtures(params);   // 回傳格式：{fixtures, total}
    renderFixturesTable(data.fixtures || []);
  } catch (err) {
    console.error("loadFixturesQuery() failed:", err);
  }
}

function renderFixturesTable(rows) {
  const tbody = document.getElementById("fixtureTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="9" class="text-center text-gray-400 py-3">沒有資料</td></tr>`;
    return;
  }

  rows.forEach(f => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 px-4">
          <span class="text-indigo-600 underline cursor-pointer"
                onclick="openFixtureDetail('${f.fixture_id}')">
            ${f.fixture_id}
          </span>
      </td>

      <td class="py-2 px-4">${f.fixture_name || "-"}</td>
      <td class="py-2 px-4">${f.customer_id || "-"}</td>
      <td class="py-2 px-4">${f.fixture_type || "-"}</td>

      <td class="py-2 px-4">
        ${(f.self_purchased_qty ?? 0)}
        /
        ${(f.customer_supplied_qty ?? 0)}
        /
        ${(f.total_qty ?? f.available_qty ?? 0)}
      </td>

      <td class="py-2 px-4">${f.status || "-"}</td>
      <td class="py-2 px-4">${f.storage_location || "-"}</td>
      <td class="py-2 px-4">${f.owner_name || "-"}</td>
      <td class="py-2 px-4">${f.note || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}



/* ============================================================
 * 🟦 Fixture Detail Drawer
 * ============================================================ */

function closeFixtureDetail() {
  document.getElementById("fixtureDetailDrawer")
    ?.classList.add("translate-x-full");
}

async function openFixtureDetail(fixtureId) {
  const drawer = document.getElementById("fixtureDetailDrawer");
  const box = document.getElementById("fixtureDetailContent");
  if (!drawer || !box) return;

  drawer.classList.remove("translate-x-full");
  box.innerHTML = `<div class="p-4 text-gray-400">載入中...</div>`;

  try {
    const data = await apiGetFixtureDetail(fixtureId);
    const f = data.fixture;

    box.innerHTML = `
      <section class="space-y-4">

        <div>
          <h3 class="text-lg font-semibold">基本資料</h3>
          <div class="grid grid-cols-2 gap-2 text-sm mt-2">
            <div><strong>治具編號：</strong>${f.fixture_id}</div>
            <div><strong>名稱：</strong>${f.fixture_name || "-"}</div>
            <div><strong>狀態：</strong>${f.status || "-"}</div>
            <div><strong>負責人：</strong>${f.owner_name || "-"}</div>
            <div><strong>儲位：</strong>${f.storage_location || "-"}</div>
          </div>
        </div>

        <div>
          <h3 class="font-semibold text-lg">最近交易</h3>
          <div class="text-sm space-y-1 mt-1">
            <div><strong>收料：</strong>${formatTrans(data.last_receipt)}</div>
            <div><strong>退料：</strong>${formatTrans(data.last_return)}</div>
          </div>
        </div>

        <div>
          <h3 class="font-semibold text-lg">使用紀錄</h3>
          ${renderUsageLogs(data.usage_logs)}
        </div>

        <div>
          <h3 class="font-semibold text-lg">更換紀錄</h3>
          ${renderReplacementLogs(data.replacement_logs)}
        </div>

      </section>
    `;
  } catch (err) {
    console.error(err);
    box.innerHTML = `<div class="text-red-500 p-3">讀取資料失敗</div>`;
  }
}

function formatTrans(t) {
  if (!t) return "-";
  return `${t.transaction_date || ""} / ${t.order_no || ""} / ${t.operator || ""}`;
}



/* ============================================================
 * 🟩 機種查詢 Models
 * ============================================================ */

let modelQueryPage = 1;
const modelQueryPageSize = 20;

async function loadModelsQuery() {
  const customer_id = localStorage.getItem("current_customer_id");  // ← 修正
  if (!customer_id) return;

  const keyword = document.getElementById("modelSearch")?.value.trim() || "";

  try {
    const list = await apiListMachineModels({
      customer_id,
      search: keyword,
      skip: 0,
      limit: 200
    });

    renderModelsQueryTable(list || []);
  } catch (err) {
    console.error("loadModelsQuery() failed:", err);
    renderModelsQueryTable([]);
  }
}
window.loadModelsQuery = loadModelsQuery;


function renderModelsQueryTable(list) {
  const tbody = document.getElementById("modelTable");
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-gray-400">沒有資料</td></tr>`;
    return;
  }

  list.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 px-4">${m.id}</td>
      <td class="py-2 px-4">${m.model_name || "-"}</td>
      <td class="py-2 px-4">${m.customer_id || "-"}</td>
      <td class="py-2 px-4">${m.note || "-"}</td>
      <td class="py-2 px-4">
        <button class="text-indigo-600 underline"
                onclick="openModelDetail('${m.id}')">
          詳情
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}



/* ============================================================
 * queryType 切換（只支援新版）
 * ============================================================ */
function switchQueryType() {
  const type = document.getElementById("queryType")?.value;
  if (!type) return;

  const fixtureArea = document.getElementById("fixtureQueryArea");
  const modelArea = document.getElementById("modelQueryArea");

  if (type === "fixture") {
    fixtureArea.classList.remove("hidden");
    modelArea.classList.add("hidden");
    loadFixturesQuery();
  } else {
    modelArea.classList.remove("hidden");
    fixtureArea.classList.add("hidden");
    loadModelsQuery();
  }
}
window.switchQueryType = switchQueryType;

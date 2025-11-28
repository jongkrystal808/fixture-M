/* ============================================================
 * Query Module v4.0（重構版）
 *
 * 支援：
 *  - 治具查詢 fixtures
 *  - 機種查詢 models
 *  - 分頁
 *  - Drawer 詳細資訊
 *  - 舊版 queryType UI
 *  - 防呆與錯誤保護
 * ============================================================ */


/* ============================================================
 * 工具：分頁元件
 * ============================================================ */
function renderPagination(targetId, total, page, pageSize, onClick) {
  const box = document.getElementById(targetId);
  if (!box) return;

  const totalPages = Math.ceil(total / pageSize);
  box.innerHTML = "";

  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${i === page ? "btn-primary" : "btn-outline"}`;
    btn.textContent = i;
    btn.onclick = () => onClick(i);
    box.appendChild(btn);
  }
}


/* ============================================================
 * 🔵 治具查詢 Fixtures
 * ============================================================ */

let fixtureQueryPage = 1;
const fixtureQueryPageSize = 20;

/* 🔥 debounce（避免打字時轟 API） */
let fixturesQueryTimer = null;
function debounceLoadFixtures() {
  clearTimeout(fixturesQueryTimer);
  fixturesQueryTimer = setTimeout(loadFixturesQuery, 300);
}

async function loadFixturesQuery() {
  const searchEl = document.getElementById("fixtureSearch");
  const statusEl = document.getElementById("fixtureStatus");
  const tbody = document.getElementById("fixtureTable");

  if (!searchEl || !statusEl || !tbody) {
    console.warn("Query UI elements not loaded");
    return;
  }

  const keyword = searchEl.value.trim();
  const status = statusEl.value;

  const params = {
    skip: (fixtureQueryPage - 1) * fixtureQueryPageSize,
    limit: fixtureQueryPageSize
  };

  if (keyword) params.search = keyword;
  if (status && status !== "全部") params.status = status; // ✔ FIX：status_filter → status

  try {
    const data = await apiListFixtures(params);

    renderFixturesTable(data.fixtures);
    renderPagination(
      "fixturePagination",
      data.total,
      fixtureQueryPage,
      fixtureQueryPageSize,
      (p) => {
        fixtureQueryPage = p;
        loadFixturesQuery();
      }
    );

  } catch (err) {
    console.error("loadFixturesQuery error:", err);
  }
}


function renderFixturesTable(rows) {
  const tbody = document.getElementById("fixtureTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center text-gray-400 py-3">沒有資料</td></tr>`;
    return;
  }

  rows.forEach(f => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 px-4">${f.fixture_id}</td>
      <td class="py-2 px-4">${f.fixture_name || ""}</td>
      <td class="py-2 px-4">${f.customer_id || ""}</td>
      <td class="py-2 px-4">${f.fixture_type || "-"}</td>

      <td class="py-2 px-4">
        ${f.self_purchased_qty || 0}
        /
        ${f.customer_supplied_qty || 0}
        /
        ${f.available_qty || 0}
      </td>

      <td class="py-2 px-4">${f.status || ""}</td>
      <td class="py-2 px-4">${f.storage_location || "-"}</td>
      <td class="py-2 px-4">${f.owner_name || "-"}</td>
      <td class="py-2 px-4">${f.note || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}


/* ============================================================
 * 🔶 Fixture Detail Drawer
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
  box.innerHTML = `<div class="p-3 text-gray-400">載入中...</div>`;

  try {
    const data = await apiGetFixtureDetail(fixtureId);
    const f = data.fixture;

    box.innerHTML = `
      <section>
        <h3 class="font-semibold text-lg mb-2">基本資料</h3>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><strong>治具編號：</strong>${f.fixture_id}</div>
          <div><strong>機種：</strong>${f.model_id || "-"}</div>
          <div><strong>站點：</strong>${f.station_id || "-"}</div>
          <div><strong>狀態：</strong>${f.status || "-"}</div>
          <div><strong>負責人：</strong>${f.owner_name || "-"}</div>
          <div><strong>上次更換：</strong>${f.last_replacement_date || "-"}</div>
        </div>
      </section>

      <section>
        <h3 class="font-semibold text-lg mb-2">最近交易</h3>
        <div class="space-y-1 text-sm">
          <div><strong>最近收料：</strong>${formatTrans(data.last_receipt)}</div>
          <div><strong>最近退料：</strong>${formatTrans(data.last_return)}</div>
        </div>
      </section>

      <section>
        <h3 class="font-semibold text-lg mb-2">使用紀錄</h3>
        ${renderUsageLogs(data.usage_logs)}
      </section>

      <section>
        <h3 class="font-semibold text-lg mb-2">更換紀錄</h3>
        ${renderReplacementLogs(data.replacement_logs)}
      </section>
    `;
  } catch (err) {
    console.error(err);
    box.innerHTML = `<div class="text-red-500">讀取資料失敗</div>`;
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
  const customerId = localStorage.getItem("current_customer");
  if (!customerId) return;  // 尚未選擇客戶不查

  try {
    const keyword = document.getElementById("modelSearch")?.value.trim() || "";

    // 使用正確的後端 API： /models
    const result = await apiListMachineModels({
      search: keyword,
      customer_id: customerId,
      skip: 0,
      limit: 200
    });

    // 後端回傳的是「純 array」
    renderModelsQueryTable(result);

  } catch (err) {
    console.error("loadModelsQuery() error:", err);
    renderModelsQueryTable([]);
  }
}
window.loadModelsQuery = loadModelsQuery;


function renderModelsQueryTable(list) {
  const tbody = document.getElementById("modelTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  list.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 px-4">${m.id}</td>
      <td class="py-2 px-4">${m.model_name || ""}</td>
      <td class="py-2 px-4">${m.customer_id || ""}</td>
      <td class="py-2 px-4">${m.note || ""}</td>
      <td class="py-2 px-4">
        <button class="text-indigo-600 underline" onclick="openModelDetail('${m.id}')">
          詳情
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}



/* ============================================================
 * 最終版：queryType 切換（新版 + 舊版 UI 都兼容）
 * ============================================================ */
function switchQueryType() {
  const type = document.getElementById("queryType")?.value;
  if (!type) return;

  // ================================
  // 🔵 新版 UI （你實際使用的）
  // ================================
  const fixtureArea = document.getElementById("fixtureQueryArea");
  const modelArea   = document.getElementById("modelQueryArea");

  if (fixtureArea && modelArea) {
    if (type === "fixture") {
      fixtureArea.classList.remove("hidden");
      modelArea.classList.add("hidden");
      loadFixturesQuery();     // 重要：切到治具 → 立即查詢
    } else {
      modelArea.classList.remove("hidden");
      fixtureArea.classList.add("hidden");
      loadModelsQuery();       // 切到機種 → 立即查詢
    }
  }

  // ================================
  // 🟠 舊版 UI（你貼出的 qtab-xxx）
  // ================================
  const oldFixture = document.getElementById("qtab-fixtures");
  const oldModel   = document.getElementById("qtab-models");

  if (oldFixture && oldModel) {
    oldFixture.classList.add("hidden");
    oldModel.classList.add("hidden");

    const showEl = document.getElementById(`qtab-${type}`);
    if (showEl) showEl.classList.remove("hidden");
  }
}
window.switchQueryType = switchQueryType;



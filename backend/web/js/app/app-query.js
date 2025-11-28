/* ============================================================
 * 查詢模塊（Query Module v3.6）
 *
 * 功能：
 *  - 治具查詢（fixtures）
 *  - 機種查詢（models）
 *  - 分頁
 *  - 治具詳細頁 Drawer
 *  - 機種詳細頁 Drawer
 * ============================================================ */


/* ============================================================
 * 工具：通用分頁
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
 * 🔵 治具查詢（Fixtures）
 * ============================================================ */
let fixtureQueryPage = 1;
const fixtureQueryPageSize = 20;

async function loadFixturesQuery() {
  const search = document.getElementById("fixtureQueryInput").value.trim();
  const status = document.getElementById("fixtureQueryStatus")?.value;

  const params = {
    skip: (fixtureQueryPage - 1) * fixtureQueryPageSize,
    limit: fixtureQueryPageSize
  };

  if (search) params.search = search;
  if (status) params.status = status;

  const data = await apiListFixtures(params);

  renderFixturesTable(data.items);
  renderPagination(
    "fixtureQueryPagination",
    data.total,
    fixtureQueryPage,
    fixtureQueryPageSize,
    (p) => {
      fixtureQueryPage = p;
      loadFixturesQuery();
    }
  );
}

function renderFixturesTable(rows) {
  const tbody = document.getElementById("fixtureQueryTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-gray-400 py-3">沒有資料</td></tr>`;
    return;
  }

  rows.forEach(f => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${f.id}</td>
      <td class="py-2 pr-4">${f.model_id || ""}</td>
      <td class="py-2 pr-4">${f.station_id || ""}</td>
      <td class="py-2 pr-4">${f.status || ""}</td>
      <td class="py-2 pr-4">${f.updated_at || ""}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost text-xs" onclick="openFixtureDetail('${f.id}')">
          查看
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}


/* ============================================================
 * 🔶 Fixture Detail Drawer（治具詳細頁）
 * ============================================================ */

function closeFixtureDetail() {
  document.getElementById("fixtureDetailDrawer")
    .classList.add("translate-x-full");
}

async function openFixtureDetail(fixtureId) {
  const drawer = document.getElementById("fixtureDetailDrawer");
  const box = document.getElementById("fixtureDetailContent");

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

      <section>
        <h3 class="font-semibold text-lg mb-2">更多操作</h3>
        <div class="flex gap-2 flex-wrap">
          <button class="btn btn-outline" onclick="gotoReceipts('${fixtureId}')">收料紀錄</button>
          <button class="btn btn-outline" onclick="gotoReturns('${fixtureId}')">退料紀錄</button>
          <button class="btn btn-outline" onclick="gotoUsageLogs('${fixtureId}')">使用紀錄</button>
          <button class="btn btn-outline" onclick="gotoReplacementLogs('${fixtureId}')">更換紀錄</button>
        </div>
      </section>
    `;
  } catch (err) {
    box.innerHTML = `<div class="text-red-500">讀取資料失敗</div>`;
  }
}

function formatTrans(t) {
  if (!t) return "-";
  return `${t.transaction_date || ""} / ${t.order_no || ""} / ${t.operator || ""}`;
}

function renderUsageLogs(rows) {
  if (!rows || rows.length === 0)
    return `<div class="text-gray-400 text-sm">無紀錄</div>`;

  return `
    <table class="min-w-full text-sm border">
      <thead><tr>
        <th class="p-1">時間</th>
        <th class="p-1">站點</th>
        <th class="p-1">人員</th>
        <th class="p-1">備註</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td class="p-1">${r.used_at || "-"}</td>
            <td class="p-1">${r.station_id || "-"}</td>
            <td class="p-1">${r.operator || "-"}</td>
            <td class="p-1">${r.note || "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderReplacementLogs(rows) {
  if (!rows || rows.length === 0)
    return `<div class="text-gray-400 text-sm">無紀錄</div>`;

  return `
    <table class="min-w-full text-sm border">
      <thead><tr>
        <th class="p-1">時間</th>
        <th class="p-1">舊序號</th>
        <th class="p-1">新序號</th>
        <th class="p-1">人員</th>
        <th class="p-1">備註</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td class="p-1">${r.replaced_at || "-"}</td>
            <td class="p-1">${r.old_serial || "-"}</td>
            <td class="p-1">${r.new_serial || "-"}</td>
            <td class="p-1">${r.operator || "-"}</td>
            <td class="p-1">${r.note || "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}


/* ============================================================
 * 🟩 機種查詢（Models）
 * ============================================================ */
let modelQueryPage = 1;
const modelQueryPageSize = 20;

async function loadModelsQuery() {
  const search = document.getElementById("modelQueryInput").value.trim();

  const params = {
    skip: (modelQueryPage - 1) * modelQueryPageSize,
    limit: modelQueryPageSize,
    search
  };

  const data = await apiListMachineModels(params);

  renderModelsQueryTable(data.items);
  renderPagination(
    "modelQueryPagination",
    data.total,
    modelQueryPage,
    modelQueryPageSize,
    (p) => {
      modelQueryPage = p;
      loadModelsQuery();
    }
  );
}

function renderModelsQueryTable(rows) {
  const tbody = document.getElementById("modelQueryTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-400 py-3">沒有資料</td></tr>`;
    return;
  }

  rows.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${m.id}</td>
      <td class="py-2 pr-4">${m.model_name || ""}</td>
      <td class="py-2 pr-4">${m.note || ""}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost text-xs" onclick="openModelDetail('${m.id}')">
          查看
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}


/* ============================================================
 * 🟨 Model Detail Drawer（機種詳細頁）
 * ============================================================ */

function closeModelDetail() {
  document.getElementById("modelDetailDrawer")
    .classList.add("translate-x-full");
}

async function openModelDetail(modelId) {
  const drawer = document.getElementById("modelDetailDrawer");
  const box = document.getElementById("modelDetailContent");

  drawer.classList.remove("translate-x-full");
  box.innerHTML = `<div class="p-3 text-gray-400">讀取中...</div>`;

  try {
    const data = await apiGetModelDetail(modelId);

    const m = data.model;
    const stations = data.stations;
    const reqs = data.fixture_requirements;
    const fixtures = data.fixtures;
    const summary = data.status_summary;

    box.innerHTML = `
      <section>
        <h3 class="font-semibold text-lg mb-2">基本資料</h3>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><strong>機種代碼：</strong>${m.id}</div>
          <div><strong>名稱：</strong>${m.model_name || "-"}</div>
          <div><strong>備註：</strong>${m.note || "-"}</div>
          <div><strong>建立時間：</strong>${m.created_at || "-"}</div>
        </div>
      </section>

      <section>
        <h3 class="font-semibold text-lg mb-2">綁定站點</h3>
        ${renderModelStationsTable(stations)}
      </section>

      <section>
        <h3 class="font-semibold text-lg mb-2">治具需求</h3>
        ${renderFixtureReqTable(reqs)}
      </section>

      <section>
        <h3 class="font-semibold text-lg mb-2">旗下治具</h3>
        ${renderModelFixturesTable(fixtures)}
      </section>

      <section>
        <h3 class="font-semibold text-lg mb-2">治具狀態統計</h3>
        ${renderStatusSummary(summary)}
      </section>
    `;
  } catch (err) {
    box.innerHTML = `<div class="text-red-500">讀取資料失敗</div>`;
  }
}

/* 渲染：機種綁定站點 */
function renderModelStationsTable(rows) {
  if (!rows || rows.length === 0)
    return `<div class="text-gray-400 text-sm">未綁定站點</div>`;

  return `
    <table class="min-w-full text-sm">
      <thead><tr>
        <th class="py-1 pr-3">站點編號</th>
        <th class="py-1 pr-3">站點名稱</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.station_id}</td>
            <td>${r.station_name}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

/* 渲染：治具需求 */
function renderFixtureReqTable(rows) {
  if (!rows || rows.length === 0)
    return `<div class="text-gray-400 text-sm">無需求設定</div>`;

  return `
    <table class="min-w-full text-sm">
      <thead><tr>
        <th class="py-1 pr-3">站點</th>
        <th class="py-1 pr-3">治具</th>
        <th class="py-1 pr-3">需求數</th>
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

/* 渲染：機種旗下治具 */
function renderModelFixturesTable(rows) {
  if (!rows || rows.length === 0)
    return `<div class="text-gray-400 text-sm">無治具</div>`;

  return `
    <table class="min-w-full text-sm">
      <thead><tr>
        <th class="py-1 pr-3">治具</th>
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

/* 渲染：狀態統計 */
function renderStatusSummary(map) {
  const keys = Object.keys(map || {});
  if (keys.length === 0)
    return `<div class="text-gray-400 text-sm">無統計資料</div>`;

  return `
    <ul class="list-disc pl-4 text-sm">
      ${keys.map(st => `<li>${st}：${map[st]} 個</li>`).join("")}
    </ul>
  `;
}


/* ============================================================
 * 🔁 跳轉：從詳細頁跳轉到收料/退料/使用/更換紀錄
 * ============================================================ */
function gotoReceipts(fixtureId) {
  location.hash = "receipts";
  setTimeout(() => {
    document.getElementById("receiptSearchFixture").value = fixtureId;
    loadReceipts();
  }, 200);
}

function gotoReturns(fixtureId) {
  location.hash = "returns";
  setTimeout(() => {
    document.getElementById("returnSearchFixture").value = fixtureId;
    loadReturns();
  }, 200);
}

function gotoUsageLogs(fixtureId) {
  location.hash = "logs";
  setTimeout(() => {
    document.getElementById("usageSearchFixture").value = fixtureId;
    loadUsageLogs();
  }, 200);
}

function gotoReplacementLogs(fixtureId) {
  location.hash = "logs";
  setTimeout(() => {
    document.getElementById("replacementSearchFixture").value = fixtureId;
    loadReplacementLogs();
  }, 200);
}

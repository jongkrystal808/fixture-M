/**
 * 機種 / 站點 / 綁定 / 治具需求 前端控制 (v3.0)
 * app-machine-models.js
 *
 * ✔ 滿足後端 v3.0 API
 * ✔ models + stations + model-stations + fixture-requirements
 * ✔ 分頁 / 搜尋 / CRUD / 綁定
 */

/* ============================================================
 * 狀態
 * ============================================================ */
let modelPage = 1;
let modelPageSize = 20;

let stationPage = 1;
let stationPageSize = 20;

let currentSelectedModel = null;
let currentSelectedStation = null;

/* ============================================================
 * 初始化
 * ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadModels();
  loadStations();
});

/* ============================================================
 * ========== 機種清單 Models ==========
 * ============================================================ */

async function loadModels() {
  const q = document.getElementById("modelSearch")?.value.trim() || "";
  const result = await apiListModels(q);

  renderModelTable(result);
}

function renderModelTable(models) {
  const tbody = document.getElementById("modelTable");
  tbody.innerHTML = "";

  if (!models || models.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3">沒有資料</td></tr>`;
    return;
  }

  models.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.model_id}</td>
      <td>${m.model_name}</td>
      <td>${m.note || ""}</td>
      <td class="text-right">
        <button class="btn btn-xs btn-outline" onclick="selectModel('${m.model_id}')">選取</button>
        <button class="btn btn-xs btn-primary" onclick="openModelEdit('${m.model_id}')">編輯</button>
        <button class="btn btn-xs btn-error" onclick="deleteModel('${m.model_id}')">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function selectModel(modelId) {
  currentSelectedModel = modelId;
  document.getElementById("selectedModelDisplay").innerText = modelId;

  loadModelStations();
  loadFixtureRequirements();
}

/* ------- 新增 / 編輯 Model ------- */

function openModelAdd() {
  document.getElementById("modelForm").reset();
  document.getElementById("modelFormMode").value = "add";
  document.getElementById("modelModalTitle").innerText = "新增機種";
  modelModal.showModal();
}

async function openModelEdit(modelId) {
  const data = await apiGetModel(modelId);

  document.getElementById("modelFormMode").value = "edit";
  document.getElementById("modelModalTitle").innerText = "編輯機種";

  document.getElementById("model_id").value = data.model_id;
  document.getElementById("model_name").value = data.model_name;
  document.getElementById("model_note").value = data.note || "";

  modelModal.showModal();
}

async function submitModelForm() {
  const mode = document.getElementById("modelFormMode").value;
  const model_id = document.getElementById("model_id").value.trim();
  const model_name = document.getElementById("model_name").value.trim();
  const note = document.getElementById("model_note").value.trim();

  const payload = {
    model_id,
    model_name,
    note: note || null
  };

  try {
    if (mode === "add") {
      await apiCreateModel(payload);
      toast("新增機種成功");
    } else {
      await apiUpdateModel(model_id, payload);
      toast("更新成功");
    }

    modelModal.close();
    loadModels();
  } catch (err) {
    console.error(err);
    toast("操作失敗", "error");
  }
}

async function deleteModel(id) {
  if (!confirm("確定刪除？")) return;

  await apiDeleteModel(id);
  toast("已刪除");
  loadModels();
}

/* ============================================================
 * ========== 站點 Stations ==========
 * ============================================================ */

async function loadStations() {
  const q = document.getElementById("stationSearch")?.value.trim() || "";
  const result = await apiListStations(q);

  renderStationsTable(result);
}

function renderStationsTable(stations) {
  const tbody = document.getElementById("stationTable");
  tbody.innerHTML = "";

  if (!stations || stations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3">沒有資料</td></tr>`;
    return;
  }

  stations.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.station_id}</td>
      <td>${s.station_name}</td>
      <td>${s.note || ""}</td>
      <td class="text-right">
        <button class="btn btn-xs btn-primary" onclick="openStationEdit('${s.station_id}')">編輯</button>
        <button class="btn btn-xs btn-error" onclick="deleteStation('${s.station_id}')">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openStationAdd() {
  document.getElementById("stationForm").reset();
  document.getElementById("stationFormMode").value = "add";
  stationModal.showModal();
}

async function openStationEdit(stationId) {
  const data = await apiGetStation(stationId);

  document.getElementById("stationFormMode").value = "edit";

  document.getElementById("station_id").value = data.station_id;
  document.getElementById("station_name").value = data.station_name;
  document.getElementById("station_note").value = data.note || "";

  stationModal.showModal();
}

async function submitStationForm() {
  const mode = document.getElementById("stationFormMode").value;
  const station_id = document.getElementById("station_id").value.trim();
  const station_name = document.getElementById("station_name").value.trim();
  const note = document.getElementById("station_note").value.trim();

  const payload = {
    station_id,
    station_name,
    note: note || null
  };

  try {
    if (mode === "add") {
      await apiCreateStation(payload);
      toast("新增站點成功");
    } else {
      await apiUpdateStation(station_id, payload);
      toast("更新成功");
    }

    stationModal.close();
    loadStations();
  } catch (err) {
    console.error(err);
    toast("站點操作失敗", "error");
  }
}

async function deleteStation(id) {
  if (!confirm("確定刪除？")) return;
  await apiDeleteStation(id);
  toast("已刪除");
  loadStations();
}

/* ============================================================
 * ========== 機種 ↔ 站點綁定 ==========
 * ============================================================ */

async function loadModelStations() {
  if (!currentSelectedModel) return;

  const list = await apiListModelStations(currentSelectedModel);
  const available = await apiListAvailableStationsForModel(currentSelectedModel);

  renderModelStations(list);
  renderAvailableStations(available);
}

function renderModelStations(rows) {
  const box = document.getElementById("modelStationList");
  box.innerHTML = "";

  rows.forEach(s => {
    box.innerHTML += `
      <div class="flex justify-between items-center py-1 border-b">
        <span>${s.station_id} - ${s.station_name}</span>
        <button class="btn btn-xs btn-error"
                onclick="unbindModelStation('${s.station_id}')">解除</button>
      </div>
    `;
  });
}

function renderAvailableStations(rows) {
  const box = document.getElementById("availableStationList");
  box.innerHTML = "";

  rows.forEach(s => {
    box.innerHTML += `
      <div class="flex justify-between items-center py-1 border-b">
        <span>${s.station_id} - ${s.station_name}</span>
        <button class="btn btn-xs btn-primary"
                onclick="bindModelStation('${s.station_id}')">綁定</button>
      </div>
    `;
  });
}

async function bindModelStation(stationId) {
  await apiBindStationToModel(currentSelectedModel, stationId);
  loadModelStations();
}

async function unbindModelStation(stationId) {
  await apiUnbindStationFromModel(currentSelectedModel, stationId);
  loadModelStations();
}

/* ============================================================
 * ========== 治具需求（fixture requirements） ==========
 * ============================================================ */

async function loadFixtureRequirements() {
  if (!currentSelectedModel || !currentSelectedStation) {
    document.getElementById("fixtureReqTable").innerHTML =
      `<tr><td colspan="4" class="text-center text-gray-400 py-2">
         請先選擇站點
       </td></tr>`;
    return;
  }

  const data = await apiListFixtureRequirements(
    currentSelectedModel,
    currentSelectedStation
  );

  renderFixtureRequirements(data);
}

function renderFixtureRequirements(rows) {
  const tbody = document.getElementById("fixtureReqTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-2 text-gray-400">沒有資料</td></tr>`;
    return;
  }

  rows.forEach(req => {
    tbody.innerHTML += `
      <tr>
        <td>${req.fixture_id}</td>
        <td>${req.required_qty}</td>
        <td>${req.note || ""}</td>
        <td class="text-right">
          <button class="btn btn-xs btn-primary"
                  onclick="openFixtureReqEdit(${req.id})">編輯</button>
          <button class="btn btn-xs btn-error"
                  onclick="deleteFixtureRequirement(${req.id})">刪除</button>
        </td>
      </tr>
    `;
  });
}

function openFixtureReqAdd() {
  if (!currentSelectedModel || !currentSelectedStation)
    return toast("請先選擇機種與站點");

  document.getElementById("fixtureReqFormMode").value = "add";
  document.getElementById("fixtureReqForm").reset();

  fixtureReqModal.showModal();
}

async function openFixtureReqEdit(id) {
  const rows = await apiListFixtureRequirements(currentSelectedModel, currentSelectedStation);
  const data = rows.find(x => x.id === id);

  document.getElementById("fixtureReqFormMode").value = "edit";
  document.getElementById("fixtureReqId").value = id;

  document.getElementById("req_fixture_id").value = data.fixture_id;
  document.getElementById("req_qty").value = data.required_qty;
  document.getElementById("req_note").value = data.note || "";

  fixtureReqModal.showModal();
}

async function submitFixtureReqForm() {
  const mode = document.getElementById("fixtureReqFormMode").value;
  const fixture_id = document.getElementById("req_fixture_id").value.trim();
  const required_qty = Number(document.getElementById("req_qty").value);
  const note = document.getElementById("req_note").value.trim();

  const payload = {
    fixture_id,
    required_qty,
    note: note || null
  };

  try {
    if (mode === "add") {
      await apiCreateFixtureRequirement(
        currentSelectedModel,
        currentSelectedStation,
        payload
      );
      toast("新增成功");
    } else {
      const reqId = document.getElementById("fixtureReqId").value;
      await apiUpdateFixtureRequirement(reqId, payload);
      toast("更新成功");
    }

    fixtureReqModal.close();
    loadFixtureRequirements();
  } catch (err) {
    console.error(err);
    toast("治具需求操作失敗", "error");
  }
}

async function deleteFixtureRequirement(id) {
  if (!confirm("確定刪除？")) return;
  await apiDeleteFixtureRequirement(id);
  toast("已刪除");
  loadFixtureRequirements();
}


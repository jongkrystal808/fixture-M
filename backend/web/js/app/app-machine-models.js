/* ============================================================
 * 站點綁定（新版三段式 UI 專用）
 * 對應 index.html:
 *   msBoundTable
 *   msAvailableTable
 *   msSelectedModelLabel
 * ============================================================ */

function getCurrentCustomerId() {
  return localStorage.getItem("current_customer_id");
}

/* 重新載入綁定站點（依照目前選取的機種） */
async function msReloadForCurrentModel() {
  if (!currentSelectedModel) {
    console.warn("尚未選擇機種");
    return;
  }

  const customer_id = getCurrentCustomerId();
  if (!customer_id) {
    console.warn("無 customer_id");
    return;
  }

  // 取得已綁定
  const bound = await apiListModelStations({
    customer_id,
    model_id: currentSelectedModel
  });

  // 取得可綁定
  const available = await apiListAvailableStationsForModel({
    customer_id,
    model_id: currentSelectedModel
  });

  renderBoundStationsTable(bound);
  renderAvailableStationsTable(available);

  // 顯示內容區
  document.getElementById("msNoModelHint")?.classList.add("hidden");
  document.getElementById("msContent")?.classList.remove("hidden");
}

/* 已綁定站點 */
function renderBoundStationsTable(rows) {
  const tbody = document.getElementById("msBoundTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="3" class="text-center py-1 text-gray-400">無資料</td></tr>`;
    return;
  }

  rows.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-1 px-2">${s.station_id}</td>
      <td class="py-1 px-2">${s.station_name || "-"}</td>
      <td class="py-1 px-2 text-right">
        <button class="btn btn-ghost btn-xs"
                onclick="msUnbindStation('${s.station_id}')">移除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* 可綁定站點 */
function renderAvailableStationsTable(rows) {
  const tbody = document.getElementById("msAvailableTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="3" class="text-center py-1 text-gray-400">無可綁定站點</td></tr>`;
    return;
  }

  rows.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-1 px-2">${s.id}</td>
      <td class="py-1 px-2">${s.station_name || "-"}</td>
      <td class="py-1 px-2 text-right">
        <button class="btn btn-primary btn-xs"
                onclick="msBindStation('${s.id}')">綁定</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* 綁定站點 */
async function msBindStation(stationId) {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  await apiBindStationToModel({
    customer_id,
    model_id: currentSelectedModel,
    station_id: stationId
  });

  msReloadForCurrentModel();
}

/* 解除綁定 */
async function msUnbindStation(stationId) {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  await apiUnbindStationFromModel({
    customer_id,
    model_id: currentSelectedModel,
    station_id: stationId
  });

  msReloadForCurrentModel();
}

/* 導出全域 */
window.msReloadForCurrentModel = msReloadForCurrentModel;
window.msBindStation = msBindStation;
window.msUnbindStation = msUnbindStation;

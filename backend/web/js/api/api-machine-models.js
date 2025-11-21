/**
 * 機種 / 站點 / 機種站點綁定 / 治具需求 API (v3.0)
 * api-machine-models.js
 *
 * 後端 Router:
 * - /models
 * - /stations
 * - /model-stations
 * - /fixture-requirements
 */

// ===================== 機種 machine_models =====================

async function apiListModels(q = '') {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  return api('/models' + (params.toString() ? `?${params.toString()}` : ''));
}

async function apiGetModel(modelId) {
  return api(`/models/${encodeURIComponent(modelId)}`);
}

async function apiCreateModel(payload) {
  return api('/models', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function apiUpdateModel(modelId, payload) {
  return api(`/models/${encodeURIComponent(modelId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

async function apiDeleteModel(modelId) {
  return api(`/models/${encodeURIComponent(modelId)}`, {
    method: 'DELETE'
  });
}

// ===================== 站點 stations =====================

async function apiListStations(q = '') {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  return api('/stations' + (params.toString() ? `?${params.toString()}` : ''));
}

async function apiGetStation(stationId) {
  return api(`/stations/${encodeURIComponent(stationId)}`);
}

async function apiCreateStation(payload) {
  return api('/stations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function apiUpdateStation(stationId, payload) {
  return api(`/stations/${encodeURIComponent(stationId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

async function apiDeleteStation(stationId) {
  return api(`/stations/${encodeURIComponent(stationId)}`, {
    method: 'DELETE'
  });
}

// ===================== 機種 ↔ 站點 綁定 (model_stations) =====================

async function apiListModelStations(modelId) {
  return api(`/model-stations/${encodeURIComponent(modelId)}`);
}

async function apiListAvailableStationsForModel(modelId) {
  return api(`/model-stations/${encodeURIComponent(modelId)}/available`);
}

async function apiBindStationToModel(modelId, stationId) {
  return api(`/model-stations/${encodeURIComponent(modelId)}`, {
    method: 'POST',
    body: JSON.stringify({ station_id: stationId })
  });
}

async function apiUnbindStationFromModel(modelId, stationId) {
  return api(`/model-stations/${encodeURIComponent(modelId)}/${encodeURIComponent(stationId)}`, {
    method: 'DELETE'
  });
}

// ===================== 治具需求 fixture_requirements =====================
// 後端路由 prefix: /fixture-requirements

async function apiListFixtureRequirements(modelId, stationId) {
  return api(`/fixture-requirements/${encodeURIComponent(modelId)}/${encodeURIComponent(stationId)}`);
}

async function apiCreateFixtureRequirement(modelId, stationId, payload) {
  return api(`/fixture-requirements/${encodeURIComponent(modelId)}/${encodeURIComponent(stationId)}`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function apiUpdateFixtureRequirement(reqId, payload) {
  return api(`/fixture-requirements/item/${reqId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

async function apiDeleteFixtureRequirement(reqId) {
  return api(`/fixture-requirements/item/${reqId}`, {
    method: 'DELETE'
  });
}

// ===================== 暴露到 window =====================

window.apiListModels = apiListModels;
window.apiGetModel = apiGetModel;
window.apiCreateModel = apiCreateModel;
window.apiUpdateModel = apiUpdateModel;
window.apiDeleteModel = apiDeleteModel;

window.apiListStations = apiListStations;
window.apiGetStation = apiGetStation;
window.apiCreateStation = apiCreateStation;
window.apiUpdateStation = apiUpdateStation;
window.apiDeleteStation = apiDeleteStation;

window.apiListModelStations = apiListModelStations;
window.apiListAvailableStationsForModel = apiListAvailableStationsForModel;
window.apiBindStationToModel = apiBindStationToModel;
window.apiUnbindStationFromModel = apiUnbindStationFromModel;

window.apiListFixtureRequirements = apiListFixtureRequirements;
window.apiCreateFixtureRequirement = apiCreateFixtureRequirement;
window.apiUpdateFixtureRequirement = apiUpdateFixtureRequirement;
window.apiDeleteFixtureRequirement = apiDeleteFixtureRequirement;

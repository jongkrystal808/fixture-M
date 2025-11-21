/**
 * 站點管理前端控制 (v3.0)
 * app-stations.js
 *
 * ✔ 搜尋 / 分頁
 * ✔ 新增 / 編輯 / 刪除
 * ✔ 與 api-stations.js 完整整合
 */

/* ============================================================
 * 分頁狀態
 * ============================================================ */

let stationPage = 1;
let stationPageSize = 20;

/* ============================================================
 * 初始化
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  loadStationsUI();
});

/* ============================================================
 * 讀取站點列表
 * ============================================================ */

async function loadStationsUI() {
  const search = document.getElementById("stationSearch")?.value.trim() || "";
  const active = document.getElementById("stationFilterActive")?.value || "";

  const params = {
    page: stationPage,
    pageSize: stationPageSize
  };

  if (search) params.search = search;
  if (active !== "") params.is_active = active;

  try {
    const result = await apiListStations(params);
    renderStationTable(result.stations);
    renderStationPagination(result.total);
  } catch (err) {
    console.error(err);
    toast("載入站點失敗", "error");
  }
}

/* ============================================================
 * 表格渲染
 * ============================================================ */

function renderStationTable(rows) {
  const tbody = document.getElementById("stationTable");
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

  rows.forEach(s => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="py-2 px-2">${s.station_id}</td>
      <td class="py-2 px-2">${s.station_name}</td>
      <td class="py-2 px-2">${s.is_active ? "<span class='text-green-600'>啟用</span>" : "<span class='text-red-600'>停用</span>"}</td>
      <td class="py-2 px-2">${s.note || ""}</td>
      <td class="py-2 px-2 text-right">
        <button class="btn btn-xs btn-outline" onclick="openStationEdit('${s.station_id}')">編輯</button>
        <button class="btn btn-xs btn-error" onclick="deleteStationUI('${s.station_id}')">刪除</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 分頁
 * ============================================================ */

function renderStationPagination(total) {
  const totalPages = Math.ceil(total / stationPageSize);
  const box = document.getElementById("stationPagination");

  box.innerHTML = "";
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${i === stationPage ? "btn-primary" : "btn-outline"}`;
    btn.innerText = i;
    btn.onclick = () => changeStationPage(i);
    box.appendChild(btn);
  }
}

function changeStationPage(p) {
  stationPage = p;
  loadStationsUI();
}

/* ============================================================
 * 新增站點
 * ============================================================ */

function openStationAdd() {
  document.getElementById("stationForm").reset();
  document.getElementById("stationFormMode").value = "add";
  document.getElementById("stationModalTitle").innerText = "新增站點";
  stationModal.showModal();
}

async function submitStationForm() {
  const mode = document.getElementById("stationFormMode").value;

  const payload = {
    station_id: document.getElementById("s_id").value.trim(),
    station_name: document.getElementById("s_name").value.trim(),
    note: document.getElementById("s_note").value.trim() || null,
    is_active: document.getElementById("s_active").checked
  };

  if (!payload.station_id) return toast("請輸入站點代碼");
  if (!payload.station_name) return toast("請輸入站點名稱");

  try {
    if (mode === "add") {
      await apiCreateStation(payload);
      toast("新增站點成功");
    } else {
      await apiUpdateStation(payload.station_id, payload);
      toast("更新完成");
    }

    stationModal.close();
    loadStationsUI();

  } catch (err) {
    console.error(err);
    toast("操作失敗", "error");
  }
}

/* ============================================================
 * 編輯站點
 * ============================================================ */

async function openStationEdit(id) {
  const data = await apiGetStation(id);

  document.getElementById("stationFormMode").value = "edit";

  document.getElementById("s_id").value = data.station_id;
  document.getElementById("s_name").value = data.station_name;
  document.getElementById("s_note").value = data.note || "";
  document.getElementById("s_active").checked = data.is_active;

  document.getElementById("stationModalTitle").innerText = "編輯站點";

  stationModal.showModal();
}

/* ============================================================
 * 刪除站點
 * ============================================================ */

async function deleteStationUI(id) {
  if (!confirm("確定要刪除此站點？")) return;

  try {
    await apiDeleteStation(id);
    toast("已刪除");
    loadStationsUI();
  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}

/**
 * 使用記錄前端控制 (v4.0 Final)
 * -----------------------------------------------------------
 * 支援:
 *  - fixture（治具層級，無序號）
 *  - individual（多序號）
 *  - batch（序號起訖展開）
 *
 * 後端 API:
 *  POST /api/v2/usage
 *  GET  /api/v2/usage
 *  DELETE /api/v2/usage/{id}
 * -----------------------------------------------------------
 */

////////////////////////////
// DOM 綁定
////////////////////////////

const fxInput        = document.getElementById("usageAddFixture");
const modelInput     = document.getElementById("usageAddModel");
const stationInput   = document.getElementById("usageAddStation");

const levelSelect    = document.getElementById("usageAddLevel");
const serialsInput   = document.getElementById("usageAddSerials");
const batchStart     = document.getElementById("usageAddSerialStart");
const batchEnd       = document.getElementById("usageAddSerialEnd");

const countInput     = document.getElementById("usageAddCount");
const operatorInput  = document.getElementById("usageAddOperator");
const usedAtInput    = document.getElementById("usageAddTime");
const noteInput      = document.getElementById("usageAddNote");

const usageTableBody = document.getElementById("usageTable");


////////////////////////////
// UI Mode 切換
////////////////////////////

function toggleUsageSerialInputs() {
    const mode = levelSelect.value;

    document.getElementById("usageSerialSingleField").classList.toggle(
        "hidden",
        mode !== "individual"
    );

    document.getElementById("usageSerialBatchField").classList.toggle(
        "hidden",
        mode !== "batch"
    );
}

levelSelect?.addEventListener("change", toggleUsageSerialInputs);
toggleUsageSerialInputs();


////////////////////////////
// 綁定站點帶入
////////////////////////////
async function loadStationsForFixture(fixtureId) {
    usageStationSelect.innerHTML = `<option value="">載入中...</option>`;

    try {
        const url = `/api/v2/model-details/stations-by-fixture/${fixtureId}`;
        const rows = await api(url);

        usageStationSelect.innerHTML = "";
        rows.forEach(r => {
            usageStationSelect.innerHTML += `
                <option value="${r.station_id}">
                    ${r.station_id} - ${r.station_name ?? ""}
                </option>
            `;
        });

        if (!rows.length) {
            usageStationSelect.innerHTML = `<option value="">無綁定站點</option>`;
        }
    } catch (err) {
        console.error(err);
        usageStationSelect.innerHTML = `<option value="">讀取失敗</option>`;
    }
}


fxInput?.addEventListener("change", () => {
    const fx = fxInput.value.trim();
    if (fx) loadStationsForFixture(fx);
});


////////////////////////////
// 序號解析工具
////////////////////////////

function parseIndividualSerials(text) {
    if (!text) return [];
    return text
        .split(/[\s,]+/)
        .map(s => s.trim())
        .filter(Boolean);
}

function expandBatchSerials(start, end) {
    const s = start.trim(), e = end.trim();
    if (!s || !e) return [];

    const prefixS = s.match(/^\D+/)?.[0] || "";
    const prefixE = e.match(/^\D+/)?.[0] || "";

    if (prefixS !== prefixE) throw new Error("批量序號前綴不一致");

    const numS = parseInt(s.replace(prefixS, ""));
    const numE = parseInt(e.replace(prefixE, ""));

    if (isNaN(numS) || isNaN(numE) || numE < numS)
        throw new Error("序號範圍無效");

    const width = Math.max(
        s.length - prefixS.length,
        e.length - prefixE.length
    );

    const out = [];
    for (let i = numS; i <= numE; i++) {
        out.push(prefixS + String(i).padStart(width, "0"));
    }
    return out;
}


////////////////////////////
// 新增使用紀錄 (POST)
////////////////////////////

async function submitUsageLog() {
    const fixture_id = fxInput.value.trim();
    const model_id   = modelInput.value.trim();
    const station_id = stationInput.value.trim();
    const level      = levelSelect.value;

    if (!fixture_id) return toast("請輸入治具編號");
    if (!model_id)   return toast("請輸入機種 ID");
    if (!station_id) return toast("請選擇站點");

    const use_count = Number(countInput.value) || 1;
    if (use_count <= 0) return toast("使用次數需大於 0");

    const operator = operatorInput.value.trim() || window.currentUserName;
    const used_at  = usedAtInput.value ? new Date(usedAtInput.value) : new Date();
    const note     = noteInput.value.trim();

    let serials = null;

    // 個別序號
    if (level === "individual") {
        serials = parseIndividualSerials(serialsInput.value);
        if (!serials.length) return toast("請輸入序號");
    }

    // 批量序號
    if (level === "batch") {
        try {
            serials = expandBatchSerials(batchStart.value, batchEnd.value);
        } catch (err) {
            console.error(err);
            return toast(err.message, "error");
        }
        if (!serials.length) return toast("批量序號解析失敗");
    }

    const payload = {
        record_level: level,   // ★ 改這裡
        fixture_id,
        model_id,
        station_id,
        use_count,
        operator,
        used_at,
        note,
        serials,
    };


    try {
        const res = await api("/usage", {
            method: "POST",
            body: payload,
        });

        toast("使用紀錄新增成功");
        loadUsageLogs();
        toggleUsageAdd(false);

    } catch (err) {
        console.error(err);
        toast("新增使用紀錄失敗", "error");
    }
}

window.submitUsageLog = submitUsageLog;


////////////////////////////
// 查詢使用紀錄
////////////////////////////

async function loadUsageLogs() {
    const fixture = document.getElementById("usageSearchFixture").value.trim();
    const serial  = document.getElementById("usageSearchSerial")?.value.trim();
    const station = document.getElementById("usageSearchStation")?.value.trim();
    const operator = document.getElementById("usageSearchOperator")?.value.trim();
    const model = document.getElementById("usageSearchModel")?.value.trim();

    const params = {};
    if (fixture) params.fixture_id = fixture;
    if (serial)  params.serial_number = serial;
    if (station) params.station_id = station;
    if (operator) params.operator = operator;
    if (model)   params.model_id = model;

    try {
        const rows = await api("/usage", { params });
        renderUsageTable(rows);
    } catch (err) {
        console.error(err);
        toast("查詢使用紀錄失敗", "error");
    }
}

window.loadUsageLogs = loadUsageLogs;


////////////////////////////
// 使用紀錄表格
////////////////////////////

function renderUsageTable(rows) {
    usageTableBody.innerHTML = "";

    if (!rows.length) {
        usageTableBody.innerHTML = `
            <tr><td colspan="9" class="text-center text-gray-400 py-3">沒有資料</td></tr>
        `;
        return;
    }

    rows.forEach(r => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td class="py-2 pr-4">${r.used_at || "-"}</td>
            <td class="py-2 pr-4">${r.fixture_id}</td>
            <td class="py-2 pr-4">${r.serial_number ?? "-"}</td>
            <td class="py-2 pr-4">${r.station_name ?? r.station_id ?? "-"}</td>
            <td class="py-2 pr-4">${r.model_name ?? r.model_id ?? "-"}</td>
            <td class="py-2 pr-4">${r.use_count}</td>
            <td class="py-2 pr-4">${r.operator}</td>
            <td class="py-2 pr-4">${r.note ?? "-"}</td>
            <td class="py-2 pr-4">
                <button class="btn btn-xs btn-error" onclick="deleteUsage(${r.id})">
                    刪除
                </button>
            </td>
        `;

        usageTableBody.appendChild(tr);
    });
}


////////////////////////////
// 刪除紀錄
////////////////////////////

async function deleteUsage(id) {
    if (!confirm("確定要刪除此使用紀錄？")) return;

    try {
        await api(`/usage/${id}`, {
            method: "DELETE",
            params: { delete_zero_summary: true }
        });

        toast("已刪除");
        loadUsageLogs();

    } catch (err) {
        console.error(err);
        toast("刪除失敗", "error");
    }
}

window.deleteUsage = deleteUsage;
/* ============================================================
   🔵 使用記錄 / 更換記錄 TAB 切換控制 (v4.0)
   ============================================================ */
document.querySelectorAll(".subtab").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.logtab;   // usage / replacement

    // 1️⃣ 切換 active 樣式
    document.querySelectorAll(".subtab").forEach(b =>
      b.classList.remove("subtab-active")
    );
    btn.classList.add("subtab-active");

    // 2️⃣ 切換顯示內容
    document.getElementById("logtab-usage").classList.add("hidden");
    document.getElementById("logtab-replacement").classList.add("hidden");

    if (target === "usage") {
      document.getElementById("logtab-usage").classList.remove("hidden");
    } else if (target === "replacement") {
      document.getElementById("logtab-replacement").classList.remove("hidden");
    }
  });
});

/* ============================================================
   🔵 使用記錄：新增表單顯示 / 隱藏
   ============================================================ */
function toggleUsageAdd(show) {
    const form = document.getElementById("usageAddForm");
    if (!form) return;

    if (show) {
        form.classList.remove("hidden");
    } else {
        form.classList.add("hidden");
    }
}

window.toggleUsageAdd = toggleUsageAdd;   // ← ★ 確保 onclick 能找到

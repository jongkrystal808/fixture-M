/**
 * 序號管理工具前端控制 (v3.0)
 * app-serials.js
 *
 * ✔ 序號區間展開
 * ✔ 序號正規化（排序 / 去重複）
 * ✔ 偵測前綴
 * ✔ 格式驗證
 * ✔ 計算範圍總數
 * ✔ UI 與其他模組一致
 */

/* ============================================================
 * 初始化
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // 若需要 tab 切換，可以在此監聽
});

/* ============================================================
 * 工具方法
 * ============================================================ */

function getSerialListFromTextarea() {
  const raw = document.getElementById("serialInput").value;
  return raw
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

function putSerialsToOutput(serials = []) {
  document.getElementById("serialOutput").value = serials.join("\n");
  document.getElementById("serialCount").innerText = `總數：${serials.length}`;
}

/* ============================================================
 * 1. 序號區間展開 expand
 * ============================================================ */

async function expandSerialRangeUI() {
  const start = document.getElementById("rangeStart").value.trim();
  const end = document.getElementById("rangeEnd").value.trim();

  if (!start || !end) return toast("請輸入起始與結束序號");

  try {
    const result = await apiExpandSerialRange(start, end);
    putSerialsToOutput(result.serials);
    toast("展開完成");
  } catch (error) {
    console.error(error);
    toast("展開序號失敗", "error");
  }
}

/* ============================================================
 * 2. 序號正規化 normalize（排序 / 去重複）
 * ============================================================ */

async function normalizeSerialListUI() {
  const serials = getSerialListFromTextarea();
  if (serials.length === 0) return toast("請輸入序號");

  try {
    const result = await apiNormalizeSerials(serials);
    putSerialsToOutput(result.serials);
    toast("已排序 / 去重複");
  } catch (err) {
    console.error(err);
    toast("正規化失敗", "error");
  }
}

/* ============================================================
 * 3. 偵測前綴 detect-prefix
 * ============================================================ */

async function detectPrefixUI() {
  const serials = getSerialListFromTextarea();
  if (serials.length === 0) return toast("請輸入序號");

  try {
    const result = await apiDetectSerialPrefix(serials);
    document.getElementById("serialPrefix").innerText =
      result.prefix ? `偵測到前綴：${result.prefix}` : "無前綴";
  } catch (err) {
    console.error(err);
    toast("偵測前綴失敗", "error");
  }
}

/* ============================================================
 * 4. 序號格式驗證 validate
 * ============================================================ */

async function validateSerialListUI() {
  const serials = getSerialListFromTextarea();
  if (serials.length === 0) return toast("請輸入序號");

  try {
    const result = await apiValidateSerials(serials);

    if (result.valid) {
      toast("序號格式全部正確");
    } else {
      toast(`格式錯誤：${result.error}`, "error");
    }

  } catch (err) {
    console.error(err);
    toast("驗證失敗", "error");
  }
}

/* ============================================================
 * 5. 計算範圍總數 range
 * ============================================================ */

async function calculateRangeUI() {
  const start = document.getElementById("rangeStart").value.trim();
  const end = document.getElementById("rangeEnd").value.trim();

  if (!start || !end) return toast("請輸入起始與結束序號");

  try {
    const result = await apiCalculateSerialRange(start, end);

    document.getElementById("serialRangeCount").innerText =
      `範圍總數：${result.total}`;

  } catch (err) {
    console.error(err);
    toast("計算失敗", "error");
  }
}

/* ============================================================
 * 6. 其他操作（清空 / 複製）
 * ============================================================ */

function clearSerialInput() {
  document.getElementById("serialInput").value = "";
  document.getElementById("serialOutput").value = "";
  document.getElementById("serialCount").innerText = "總數：0";
}

function copySerialOutput() {
  const text = document.getElementById("serialOutput").value;
  navigator.clipboard.writeText(text);
  toast("已複製到剪貼簿");
}

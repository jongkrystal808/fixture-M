/**
 * 主應用程式控制 (v3.0)
 * app-main.js
 *
 * ✔ 全站 Tab 切換
 * ✔ Admin 子分頁切換
 * ✔ 時鐘
 * ✔ 初始載入（含登入檢查，需搭配 app-auth.js）
 * ✔ 不再處理任何資料載入（依方案 A）
 */

// ============================================================
// 時鐘
// ============================================================

function startClock() {
  function updateClock() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const el = document.getElementById("clock");
    if (el) el.textContent = timeStr;
  }
  updateClock();
  setInterval(updateClock, 1000);
}

// ============================================================
// Tab 切換（主頁）
// ============================================================

function initTabs() {
  const tabs = document.querySelectorAll('button[data-tab]');
  const sections = document.querySelectorAll('[id^="tab-"]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      // 按鈕樣式
      tabs.forEach(t => t.classList.remove('tab-active'));
      tab.classList.add('tab-active');

      // 顯示對應分頁
      sections.forEach(s => {
        s.style.display = (s.id === `tab-${target}`) ? 'block' : 'none';
      });

      // 更新標題
      const title = document.getElementById("activeTabTitle");
      if (title) title.textContent = tab.textContent;

      // 📌 分頁切換時，不再做任何 loadXXX()
      //    各 app-xxx.js 自己在 DOMContentLoaded 或事件觸發時載入資料（方案 A）
    });
  });
}

// ============================================================
// Admin 子頁切換（data-subtab）
// ============================================================

function initAdminSubtabs() {
  document.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-subtab]");
    if (!btn) return;

    const subtab = btn.getAttribute("data-subtab");

    // tab active 樣式
    document.querySelectorAll('#tab-admin [data-subtab]')
      .forEach(b => b.classList.remove("subtab-active"));
    btn.classList.add("subtab-active");

    // 顯示子頁
    document.querySelectorAll('#tab-admin > div[id^="subtab-"]')
      .forEach(div => div.classList.add("hidden"));

    const target = document.getElementById(`subtab-${subtab}`);
    if (target) target.classList.remove("hidden");

    // 📌 子頁載入交由 app-*.js 自己負責（方案 A）
  });
}

// ============================================================
// App 初始化
// ============================================================

async function initApp() {
  startClock();
  initTabs();
  initAdminSubtabs();

  // 登入狀態（app-auth.js 提供）
  if (typeof loadCurrentUser === "function") {
    await loadCurrentUser();
  }

  // 預設顯示 dashboard
  const defaultTab = document.querySelector('button[data-tab="dashboard"]');
  if (defaultTab) defaultTab.click();
}

// ============================================================
// DOM Ready
// ============================================================

document.addEventListener("DOMContentLoaded", initApp);

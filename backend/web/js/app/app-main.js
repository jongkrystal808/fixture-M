// /web/js/app/app-main.js
// 簡易 hash router + 頁籤切換


(function () {
  const TAB_CONFIG = {
    dashboard: {
      sectionId: "tab-dashboard",
      title: "儀表板"
    },
    receipts: {
      sectionId: "tab-receipts",
      title: "收料 / 退料登記"
    },
    query: {
      sectionId: "tab-query",
      title: "治具 / 機種查詢"
    },
    logs: {
      sectionId: "tab-logs",
      title: "使用 / 更換記錄"
    },
    stats: {
      sectionId: "tab-stats",
      title: "治具情況統計"
    },
    admin: {
      sectionId: "tab-admin",
      title: "後台管理"
    }
  };

  const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
  const sections = {};
  Object.keys(TAB_CONFIG).forEach(key => {
    sections[key] = document.getElementById(TAB_CONFIG[key].sectionId);
  });

  const bannerTitle = document.getElementById("activeTabTitle");
  let currentTab = null;
  const loadedFlags = {}; // 每個頁面只載一次資料

  function normalizeHash(hash) {
    if (!hash) return "dashboard";
    return hash.replace(/^#/, "");
  }

  function setHash(hash) {
    if (location.hash.replace(/^#/, "") !== hash) {
      history.replaceState(null, "", "#" + hash);
    }
  }

  function showTab(tabKey, options = { updateHash: true }) {
    if (!TAB_CONFIG[tabKey]) tabKey = "dashboard";
    if (currentTab === tabKey) return;

    currentTab = tabKey;

    // 1) 切換 main section 顯示/隱藏
    Object.keys(TAB_CONFIG).forEach(key => {
      const sec = sections[key];
      if (!sec) return;
      if (key === tabKey) {
        sec.classList.remove("hidden");
      } else {
        sec.classList.add("hidden");
      }
    });

    // 2) 切換上方 tab 樣式
    tabButtons.forEach(btn => {
      const key = btn.dataset.tab;
      if (key === tabKey) {
        btn.classList.add("tab-active");
      } else {
        btn.classList.remove("tab-active");
      }
    });

    // 3) 更新標題
    if (bannerTitle) {
      bannerTitle.textContent = TAB_CONFIG[tabKey].title;
    }

    // 4) 更新 hash（如果需要）
    if (options.updateHash) {
      setHash(tabKey);
    }

    // 5) 第一次進入該頁時，自動載入資料（如果有對應函數）
    if (!loadedFlags[tabKey]) {
      loadedFlags[tabKey] = true;
      try {
        switch (tabKey) {
          case "dashboard":
            if (typeof window.loadDashboard === "function") {
              window.loadDashboard();
            }
            break;
          case "receipts":
            if (typeof window.loadReceipts === "function") {
              window.loadReceipts();
            }
            break;
          case "query":
            if (typeof window.loadFixturesQuery === "function") {
              window.loadFixturesQuery();
            }
            break;
          case "logs":
            if (typeof window.loadUsageLogs === "function") {
              window.loadUsageLogs();
            }
            if (typeof window.loadReplacementLogs === "function") {
              window.loadReplacementLogs();
            }
            break;
          case "stats":
            if (typeof window.loadStats === "function") {
              window.loadStats();
            }
            break;
          case "admin":
            // 這邊通常會有使用者 / 客戶等管理
            if (typeof window.loadUsers === "function") {
              window.loadUsers();
            }
            if (typeof window.loadCustomers === "function") {
              window.loadCustomers();
            }
            break;
        }
      } catch (e) {
        console.warn("init tab error:", tabKey, e);
      }
    }
  }

  // 監聽上方 tab 按鈕
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabKey = btn.dataset.tab;
      const hash = btn.dataset.hash || tabKey;
      showTab(tabKey, { updateHash: true });
      setHash(hash);
    });
  });

  // hash 改變時（例如手動改網址、瀏覽器返回）
  window.addEventListener("hashchange", () => {
    const tabKey = normalizeHash(location.hash);
    showTab(tabKey, { updateHash: false });
  });

  // 頁面載入初始化
  window.addEventListener("DOMContentLoaded", async () => {
    // 先處理登入 & 客戶選擇
    if (typeof window.loadCurrentUser === "function") {
      await window.loadCurrentUser();
    }

    const initialTab = normalizeHash(location.hash);
    showTab(initialTab, { updateHash: true });

    // 收料 / 退料 子分頁切換（沿用你原本 data-rtab 設計）
    const rtabButtons = document.querySelectorAll("[data-rtab]");
    rtabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        rtabButtons.forEach(b => b.classList.remove("subtab-active"));
        btn.classList.add("subtab-active");

        const tab = btn.dataset.rtab;
        document.querySelectorAll("#rtab-receipts, #rtab-returns")
          .forEach(sec => sec.classList.add("hidden"));
        const target = document.getElementById(`rtab-${tab}`);
        if (target) target.classList.remove("hidden");
      });
    });
    // Query 子分頁切換（fixtures / models）
    const qtabBtns = document.querySelectorAll("[data-qtab]");
    qtabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.qtab;

        qtabBtns.forEach(b => b.classList.remove("subtab-active"));
        btn.classList.add("subtab-active");

        document.getElementById("qtab-fixtures").classList.toggle("hidden", tab !== "fixtures");
        document.getElementById("qtab-models").classList.toggle("hidden", tab !== "models");
      });
    });

  });
})();

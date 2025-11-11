/**
 * 治具管理系統 - 前端 JavaScript
 * Version: 2.0.0
 */

// ============================================
// API 配置
// ============================================
window.API_BASE = window.API_BASE || '';
window.USE_API = (typeof window.USE_API === 'boolean') ? window.USE_API : true;

// API 基礎路徑 - 加上 /api/v2 前綴
const API_PREFIX = '/api/v2';

// ============================================
// API 請求函數
// ============================================
async function api(path, opts = {}) {
  const fullPath = API_PREFIX + path;
  const res = await fetch(String(window.API_BASE || '') + fullPath, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`API ${fullPath} failed: ${res.status} ${txt}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : res.text();
}

// ============================================
// 治具 API
// ============================================
async function apiListFixtures() { return api('/fixtures'); }
async function apiCreateFixture(fx) { return api('/fixtures', { method: 'POST', body: JSON.stringify(fx) }); }
async function apiUpdateFixture(fx) { return api(`/fixtures/${fx.id}`, { method: 'PUT', body: JSON.stringify(fx) }); }
async function apiDeleteFixture(id) { return api(`/fixtures/${id}`, { method: 'DELETE' }); }

// ============================================
// 收料 API
// ============================================
async function apiListReceipts() { return api('/receipts/receipts'); }
async function apiCreateReceipt(r) { 
  // 判斷是批量還是少量
  const endpoint = r.type === 'batch' ? '/receipts/receipts/batch' : '/receipts/receipts/individual';
  return api(endpoint, { method: 'POST', body: JSON.stringify(r) }); 
}
async function apiDeleteReceipt(id) { return api(`/receipts/receipts/${id}`, { method: 'DELETE' }); }

// ============================================
// 退料 API
// ============================================
async function apiListReturns() { return api('/receipts/returns'); }
async function apiCreateReturn(r) { 
  // 判斷是批量還是少量
  const endpoint = r.type === 'batch' ? '/receipts/returns/batch' : '/receipts/returns/individual';
  return api(endpoint, { method: 'POST', body: JSON.stringify(r) }); 
}
async function apiDeleteReturn(id) { return api(`/receipts/returns/${id}`, { method: 'DELETE' }); }

// ============================================
// 使用記錄 API
// ============================================
async function apiListUsageLogs() { return api('/logs/usage'); }
async function apiCreateUsageLog(log) { return api('/logs/usage', { method: 'POST', body: JSON.stringify(log) }); }
async function apiDeleteUsageLog(id) { return api(`/logs/usage/${id}`, { method: 'DELETE' }); }

// ============================================
// 更換記錄 API
// ============================================
async function apiListReplacementLogs() { return api('/logs/replacement'); }
async function apiCreateReplacementLog(log) { return api('/logs/replacement', { method: 'POST', body: JSON.stringify(log) }); }
async function apiDeleteReplacementLog(id) { return api(`/logs/replacement/${id}`, { method: 'DELETE' }); }

// ============================================
// 統計 API
// ============================================
async function apiGetSummary() { return api('/stats/summary'); }
async function apiGetMaxStations(modelId) { return api(`/stats/max-stations?model_id=${encodeURIComponent(modelId)}`); }

// ============================================
// 認證 API
// ============================================
async function apiLogin(username, password) {
  return api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

async function apiRegister(userData) {
  return api('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

async function apiGetMe() {
  return api('/auth/me');
}

// ============================================
// 使用者管理 API (後台)
// ============================================
async function apiListUsers() { return api('/users'); }
async function apiCreateUser(user) { return api('/users', { method: 'POST', body: JSON.stringify(user) }); }
async function apiUpdateUser(id, user) { return api(`/users/${id}`, { method: 'PUT', body: JSON.stringify(user) }); }
async function apiDeleteUser(id) { return api(`/users/${id}`, { method: 'DELETE' }); }

// ============================================
// 全局變數
// ============================================
window.authUser = null;
window.fixtures = [];
window.receipts = [];
window.returns = [];
window.logs = [];

// ============================================
// 時鐘更新
// ============================================
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('clock').textContent = timeStr;
}

setInterval(updateClock, 1000);
updateClock();

// ============================================
// 分頁切換
// ============================================
function initTabs() {
  const tabs = document.querySelectorAll('button[data-tab]');
  const sections = document.querySelectorAll('[id^="tab-"]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      // 更新按鈕樣式
      tabs.forEach(t => t.classList.remove('tab-active'));
      tab.classList.add('tab-active');

      // 顯示對應內容
      sections.forEach(s => {
        s.style.display = s.id === `tab-${target}` ? 'block' : 'none';
      });

      // 更新標題
      document.getElementById('activeTabTitle').textContent = tab.textContent;

      // 載入對應資料
      loadTabData(target);
    });
  });
}

async function loadTabData(tab) {
  try {
    switch (tab) {
      case 'dashboard':
        await loadDashboard();
        break;
      case 'receive':
      case 'return':
        await loadReceiptsAndReturns();
        break;
      case 'query':
        await loadFixtures();
        break;
      case 'stats':
        await loadStats();
        break;
      case 'logs':
        await loadLogs();
        break;
      case 'admin':
        await loadAdminData();
        break;
    }
  } catch (error) {
    console.error(`載入 ${tab} 資料失敗:`, error);
    toast(`載入資料失敗: ${error.message}`);
  }
}

// ============================================
// 登入/登出
// ============================================
function openLogin() {
  document.getElementById('loginModal').style.display = 'flex';
}

function closeLogin() {
  document.getElementById('loginModal').style.display = 'none';
  document.getElementById('loginMsg').textContent = '';
}

async function mockLogin() {
  const username = document.getElementById('loginId').value.trim();
  const password = document.getElementById('loginPwd').value;

  if (!username || !password) {
    document.getElementById('loginMsg').textContent = '請輸入帳號與密碼';
    return;
  }

  try {
    const response = await apiLogin(username, password);
    window.authUser = { username, token: response.access_token };

    // 儲存 token
    localStorage.setItem('auth_token', response.access_token);

    // 更新 UI
    document.getElementById('loginState').textContent = `您好，${username}`;
    const btn = document.getElementById('btnLogin');
    btn.textContent = '登出';
    btn.onclick = doLogout;

    closeLogin();
    toast('登入成功');

    // 刷新資料
    await loadDashboard();
  } catch (error) {
    document.getElementById('loginMsg').textContent = `登入失敗: ${error.message}`;
  }
}

async function doLogout() {
  window.authUser = null;
  localStorage.removeItem('auth_token');

  document.getElementById('loginState').textContent = '未登入';
  const btn = document.getElementById('btnLogin');
  btn.textContent = '登入';
  btn.onclick = openLogin;

  toast('已登出');
}

// ============================================
// 載入儀表板
// ============================================
async function loadDashboard() {
  try {
    const summary = await apiGetSummary();

    // 更新統計數字
    document.getElementById('todayIn').textContent = summary.recent_receipts?.length || 0;
    document.getElementById('todayOut').textContent = summary.recent_returns?.length || 0;

    // 更新收料清單
    const inList = document.getElementById('todayInList');
    inList.innerHTML = (summary.recent_receipts || []).slice(0, 5).map(r =>
      `<div class="text-xs text-gray-600">${r.fixture_code || '未知'} × ${r.serials?.split(',').length || 1}</div>`
    ).join('');

    // 更新退料清單
    const outList = document.getElementById('todayOutList');
    outList.innerHTML = (summary.recent_returns || []).slice(0, 5).map(r =>
      `<div class="text-xs text-gray-600">${r.fixture_code || '未知'} × ${r.serials?.split(',').length || 1}</div>`
    ).join('');

    // 更新即將更換治具
    const upcomingList = document.getElementById('upcomingList');
    upcomingList.innerHTML = '<div class="text-xs text-gray-500">功能開發中...</div>';

    // 載入治具清單
    await loadFixtures();
  } catch (error) {
    console.error('載入儀表板失敗:', error);
  }
}

// ============================================
// 載入治具清單
// ============================================
async function loadFixtures() {
  try {
    window.fixtures = await apiListFixtures();
    renderFixturesTable();
  } catch (error) {
    console.error('載入治具失敗:', error);
    toast(`載入治具失敗: ${error.message}`);
  }
}

function renderFixturesTable() {
  // 這裡需要根據您的 HTML 結構實作
  // 暫時留空，等待具體實作
  console.log('治具清單:', window.fixtures);
}

// ============================================
// 載入收退料記錄
// ============================================
async function loadReceiptsAndReturns() {
  try {
    window.receipts = await apiListReceipts();
    window.returns = await apiListReturns();
    // 更新 UI (根據您的 HTML 結構實作)
  } catch (error) {
    console.error('載入收退料記錄失敗:', error);
  }
}

// ============================================
// 載入統計資料
// ============================================
async function loadStats() {
  try {
    const summary = await apiGetSummary();
    // 更新統計 UI
  } catch (error) {
    console.error('載入統計失敗:', error);
  }
}

// ============================================
// 載入使用記錄
// ============================================
async function loadLogs() {
  try {
    const usageLogs = await apiListUsageLogs();
    const replacementLogs = await apiListReplacementLogs();
    // 更新 UI
  } catch (error) {
    console.error('載入記錄失敗:', error);
  }
}

// ============================================
// 載入後台資料
// ============================================
async function loadAdminData() {
  try {
    // 載入使用者清單等
  } catch (error) {
    console.error('載入後台資料失敗:', error);
  }
}

// ============================================
// 通知訊息
// ============================================
function toast(message) {
  // 簡單的通知實作
  const toastEl = document.createElement('div');
  toastEl.className = 'fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50';
  toastEl.textContent = message;
  document.body.appendChild(toastEl);

  setTimeout(() => {
    toastEl.remove();
  }, 3000);
}

// ============================================
// CSV 下載
// ============================================
function downloadCSV(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// ============================================
// 初始化
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  // 初始化分頁
  initTabs();

  // 檢查登入狀態
  const token = localStorage.getItem('auth_token');
  if (token) {
    try {
      window.authUser = await apiGetMe();
      document.getElementById('loginState').textContent = `您好，${authUser.username}`;
      const btn = document.getElementById('btnLogin');
      btn.textContent = '登出';
      btn.onclick = doLogout;
    } catch (error) {
      localStorage.removeItem('auth_token');
    }
  }

  // 載入初始資料
  await loadDashboard();
});

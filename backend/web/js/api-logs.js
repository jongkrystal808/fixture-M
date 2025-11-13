/**
 * 使用/更換記錄相關 API 服務
 * api-logs.js
 */

// ============================================
// 使用記錄 API
// ============================================


/**
 * 查詢使用記錄列表（更新對應新欄位）
 */
async function apiListUsageLogs() {
  return api('/logs/usage').then(list =>
    list.map(item => ({
      id: item.log_id,
      fixture_id: item.fixture_id,
      fixture_name: item.fixture_name || '',
      station_id: item.station_id,
      station_name: item.station_name || '',
      use_count: item.use_count,
      abnormal_status: item.abnormal_status || '',
      operator: item.operator || '',
      note: item.note || '',
      used_at: item.used_at
    }))
  );
}

/**
 * 建立使用記錄
 */
async function apiCreateUsageLog(log) {
  return api('/logs/usage', {
    method: 'POST',
    body: JSON.stringify({
      fixture_id: log.fixture_id,
      station_id: log.station_id || null,
      use_count: log.use_count || 1,
      abnormal_status: log.abnormal_status || null,
      operator: log.operator || null,
      note: log.note || null
    })
  });
}


/**
 * 刪除使用記錄
 * @param {number} id - 使用記錄 ID
 * @returns {Promise<Object>} 刪除結果
 */
async function apiDeleteUsageLog(id) {
  return api(`/logs/usage/${id}`, {
    method: 'DELETE'
  });
}

// ============================================
// 更換記錄 API
// ============================================

/**
 * 查詢更換記錄列表
 * @returns {Promise<Array>} 更換記錄列表
 */
async function apiListReplacementLogs() {
  return api('/logs/replacement').then(list =>
    list.map(item => ({
      fixture_id: item.fixture_id,
      fixture_name: item.fixture_name || '',
      replacement_date: item.replacement_date,
      reason: item.reason || '',
      executor: item.executor || '',
      note: item.note || '',
      created_at: item.created_at
    }))
  );
}

/**
 * 建立更換記錄
 * @param {Object} log - 更換記錄資料
 * @returns {Promise<Object>} 建立的更換記錄
 */
async function apiCreateReplacementLog(log) {
  return api('/logs/replacement', {
    method: 'POST',
    body: JSON.stringify({
      fixture_id: log.fixture_id,
      replacement_date: log.replacement_date,
      reason: log.reason || null,
      executor: log.executor || null,
      note: log.note || null
    })
  });
}


/**
 * 刪除更換記錄
 * @param {number} id - 更換記錄 ID
 * @returns {Promise<Object>} 刪除結果
 */
async function apiDeleteReplacementLog(id) {
  return api(`/logs/replacement/${id}`, {
    method: 'DELETE'
  });
}



/**
 * 通用查詢所有記錄（相容舊版）
 * @returns {Promise<Array>} 所有記錄
 */
async function apiListLogs() {
  const [usageLogs, replacementLogs] = await Promise.all([
    apiListUsageLogs(),
    apiListReplacementLogs()
  ]);

  const formatted = [
    ...usageLogs.map(u => ({
      type: '使用',
      date: u.used_at,
      fixture_id: u.fixture_id,
      station_id: u.station_id,
      operator: u.operator,
      note: u.note,
      abnormal_status: u.abnormal_status
    })),
    ...replacementLogs.map(r => ({
      type: '更換',
      date: r.replacement_date,
      fixture_id: r.fixture_id,
      executor: r.executor,
      reason: r.reason,
      note: r.note
    }))
  ];

  return formatted.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// 通用新增
async function apiCreateLog(log) {
  if (log.type === 'replacement') {
    return apiCreateReplacementLog(log);
  } else {
    return apiCreateUsageLog(log);
  }
}

// 通用刪除
async function apiDeleteLog(id, type) {
  if (type === 'replacement') {
    return apiDeleteReplacementLog(id);
  } else {
    return apiDeleteUsageLog(id);
  }
}



// 匯出函數
window.apiListUsageLogs = apiListUsageLogs;
window.apiCreateUsageLog = apiCreateUsageLog;
window.apiDeleteUsageLog = apiDeleteUsageLog;
window.apiListReplacementLogs = apiListReplacementLogs;
window.apiCreateReplacementLog = apiCreateReplacementLog;
window.apiDeleteReplacementLog = apiDeleteReplacementLog;
window.apiCreateLog = apiCreateLog;
window.apiListLogs = apiListLogs;
window.apiDeleteLog = apiDeleteLog;

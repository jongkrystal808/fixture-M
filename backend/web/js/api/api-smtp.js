/**
 * SMTP 設定 API (v1.0)
 *
 * GET  /smtp       → 取得目前 SMTP 設定
 * PUT  /smtp       → 儲存 SMTP 設定
 */

async function apiGetSmtpSettings() {
  return api("/smtp");
}

async function apiSaveSmtpSettings(payload) {
  return api("/smtp", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

window.apiGetSmtpSettings = apiGetSmtpSettings;
window.apiSaveSmtpSettings = apiSaveSmtpSettings;

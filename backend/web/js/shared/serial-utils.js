/**
 * serial-utils.js
 * 統一 Receipts / Returns 序號顯示邏輯
 */

function buildSerialDisplay(row) {
  if (!row.quantity || row.quantity === 0) return "—";
  if (row.quantity === 1) return row.first_serial || "";
  return `${row.quantity} 個序號`;
}

window.buildSerialDisplay = buildSerialDisplay;

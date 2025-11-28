/**
 * ui-table.js
 * 共用收料/退料表格渲染
 */

function renderTransactionTable(rows, targetId) {
  const tbody = document.getElementById(targetId);
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8" class="text-center py-3 text-gray-400">沒有資料</td></tr>
    `;
    return;
  }

  rows.forEach(row => {
    const serialDisplay = buildSerialDisplay(row);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${row.created_at || row.transaction_date || ""}</td>
      <td class="py-2 pr-4">${row.fixture_id || ""}</td>
      <td class="py-2 pr-4">${row.customer_id || ""}</td>
      <td class="py-2 pr-4">${row.order_no || ""}</td>
      <td class="py-2 pr-4">${serialDisplay}</td>
      <td class="py-2 pr-4">${row.operator || ""}</td>
      <td class="py-2 pr-4">${row.note || ""}</td>
      <td class="py-2 pr-4 action-buttons"></td>
    `;

    tbody.appendChild(tr);
  });
}

window.renderTransactionTable = renderTransactionTable;

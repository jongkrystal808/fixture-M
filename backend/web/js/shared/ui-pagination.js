/**
 * ui-pagination.js
 * Smart Pagination v2（共用）
 */

function renderPagination(containerId, total, page, pageSize, onPageChange) {
  const totalPages = Math.ceil(total / pageSize);
  const box = document.getElementById(containerId);
  box.innerHTML = "";
  if (totalPages <= 1) return;

  function btn(p, label = null, disabled = false, active = false) {
    const b = document.createElement("button");
    b.textContent = label || p;
    b.className = "btn btn-sm mx-1 " + (active ? "btn-primary" : "btn-outline");

    if (disabled) {
      b.disabled = true;
      b.classList.add("opacity-50", "cursor-not-allowed");
    } else {
      b.onclick = () => onPageChange(p);
    }

    return b;
  }

  // 上一頁
  box.appendChild(btn(page - 1, "‹", page === 1));

  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);

  for (let p = start; p <= end; p++) {
    box.appendChild(btn(p, String(p), false, p === page));
  }

  // 下一頁
  box.appendChild(btn(page + 1, "›", page === totalPages));
}

window.renderPagination = renderPagination;

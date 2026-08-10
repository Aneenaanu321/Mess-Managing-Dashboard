/* ==========================================================================
   Reusable UI components — Modal, Toast, Confirm, DataTable, Badges, Forms
   ========================================================================== */

const UI = (() => {
  const modalRoot = () => document.getElementById("modalRoot");
  const toastRoot = () => document.getElementById("toastRoot");

  const ICONS = {
    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    warning: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    clear: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  /* ---------------- Filter toolbar helpers ---------------- */
  function searchInput({ id, placeholder, value, label }) {
    const hasValue = !!(value && String(value).trim());
    return `<label class="filter-field filter-search${hasValue ? " is-active" : ""}">
      <span class="filter-label">${Utils.escapeHtml(label || "Search")}</span>
      <span class="search-wrap${hasValue ? " has-value" : ""}">
        <input type="text" class="input search-input" id="${id}" placeholder="${Utils.escapeHtml(placeholder || "Search...")}" value="${Utils.escapeHtml(value || "")}" autocomplete="off" />
        <button type="button" class="search-clear" data-search-clear="${id}" aria-label="Clear search" ${hasValue ? "" : "hidden"}>${ICONS.close}</button>
      </span>
    </label>`;
  }

  function filterSelect({ id, label, value, options, allLabel }) {
    const opts = (options || []).map((o) => {
      const optVal = typeof o === "object" ? o.value : o;
      const optLabel = typeof o === "object" ? o.label : o;
      return `<option value="${Utils.escapeHtml(String(optVal))}" ${String(value) === String(optVal) ? "selected" : ""}>${Utils.escapeHtml(optLabel)}</option>`;
    }).join("");
    const active = value ? " is-active" : "";
    return `<label class="filter-field${active}" data-filter-key="${id}">
      <span class="filter-label">${Utils.escapeHtml(label)}</span>
      <select class="select" id="${id}" data-filter-label="${Utils.escapeHtml(label)}"><option value="">${Utils.escapeHtml(allLabel || "All")}</option>${opts}</select>
    </label>`;
  }

  function dateRange({ fromId, toId, fromValue, toValue, fromLabel, toLabel }) {
    const fromActive = fromValue ? " is-active" : "";
    const toActive = toValue ? " is-active" : "";
    return `<div class="date-range">
      <label class="filter-field${fromActive}">
        <span class="filter-label">${Utils.escapeHtml(fromLabel || "From")}</span>
        <input type="date" class="input" id="${fromId}" value="${Utils.escapeHtml(fromValue || "")}" data-filter-label="${Utils.escapeHtml(fromLabel || "From")}" />
      </label>
      <label class="filter-field${toActive}">
        <span class="filter-label">${Utils.escapeHtml(toLabel || "To")}</span>
        <input type="date" class="input" id="${toId}" value="${Utils.escapeHtml(toValue || "")}" data-filter-label="${Utils.escapeHtml(toLabel || "To")}" />
      </label>
    </div>`;
  }

  function clearFiltersBtn(id, hasActive) {
    const refresh = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 3v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 16H3v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return `<button type="button" class="btn btn-reset" id="${id}" ${hasActive ? "" : "disabled"}>${refresh}<span>Reset</span></button>`;
  }

  function filterMeta() {
    return `<div class="filter-meta" data-filter-meta hidden>
      <div class="filter-chips" data-filter-chips></div>
      <div class="filter-count" data-filter-count></div>
    </div>`;
  }

  function hasActiveFilters(state, keys) {
    return (keys || Object.keys(state || {})).some((k) => {
      const v = state[k];
      return v !== undefined && v !== null && String(v).trim() !== "";
    });
  }

  function markActiveFilters(root) {
    if (!root) return;
    root.querySelectorAll(".filter-field").forEach((field) => {
      const control = field.querySelector("select, input");
      if (!control) return;
      field.classList.toggle("is-active", !!control.value);
    });
  }

  function updateFilterChrome(root, { state, labels, clearBtnId, resultCount, totalCount, onChipClear, searchId }) {
    if (!root) return;
    markActiveFilters(root);

    const clearBtn = clearBtnId ? root.querySelector("#" + clearBtnId) : null;
    if (clearBtn) clearBtn.disabled = !hasActiveFilters(state);

    if (searchId) {
      const field = root.querySelector(`#${searchId}`)?.closest(".filter-field");
      const wrap = root.querySelector(`#${searchId}`)?.closest(".search-wrap");
      const clearSearch = root.querySelector(`[data-search-clear="${searchId}"]`);
      const hasSearch = !!(state.search && String(state.search).trim());
      if (field) field.classList.toggle("is-active", hasSearch);
      if (wrap) wrap.classList.toggle("has-value", hasSearch);
      if (clearSearch) clearSearch.hidden = !hasSearch;
    }

    const meta = root.querySelector("[data-filter-meta]");
    const chipsEl = root.querySelector("[data-filter-chips]");
    const countEl = root.querySelector("[data-filter-count]");
    if (!meta || !chipsEl) return;

    const chips = [];
    Object.keys(labels || {}).forEach((key) => {
      const val = state[key];
      if (val === undefined || val === null || String(val).trim() === "") return;
      let display = String(val);
      if (key.toLowerCase().includes("month") && /^\d{4}-\d{2}$/.test(display)) {
        display = Utils.monthLabel(display);
      }
      chips.push({ key, label: labels[key], value: display });
    });

    const active = chips.length > 0;
    meta.hidden = !active && resultCount === undefined;
    if (!active && resultCount === undefined) return;

    chipsEl.innerHTML = chips.length
      ? `<span class="filter-chips-label">Filtered by</span>` + chips.map((c) => `
          <span class="filter-chip">
            <span class="filter-chip-key">${Utils.escapeHtml(c.label)}</span>
            <span class="filter-chip-val">${Utils.escapeHtml(c.value)}</span>
            <button type="button" data-chip-clear="${Utils.escapeHtml(c.key)}" aria-label="Remove ${Utils.escapeHtml(c.label)} filter">×</button>
          </span>`).join("")
      : "";

    if (countEl && resultCount !== undefined) {
      const total = totalCount !== undefined ? ` of ${totalCount}` : "";
      countEl.textContent = `Showing ${resultCount}${total} result${resultCount === 1 ? "" : "s"}`;
    }

    if (onChipClear) {
      chipsEl.querySelectorAll("[data-chip-clear]").forEach((btn) => {
        btn.addEventListener("click", () => onChipClear(btn.dataset.chipClear));
      });
    }
  }

  function bindSearchClear(root, searchId, onClear) {
    const btn = root.querySelector(`[data-search-clear="${searchId}"]`);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const input = root.querySelector("#" + searchId);
      if (input) input.value = "";
      onClear && onClear();
    });
  }

  /* ---------------- Toast ---------------- */
  function toast(message, type) {
    type = type || "success";
    const el = document.createElement("div");
    el.className = "toast " + type;
    const icon = type === "error" ? ICONS.error : type === "info" ? ICONS.info : ICONS.check;
    const color = type === "error" ? "var(--danger)" : type === "info" ? "var(--info)" : "var(--success)";
    el.innerHTML = `<div style="color:${color};flex-shrink:0;margin-top:1px;">${icon}</div><div>${Utils.escapeHtml(message)}</div>`;
    toastRoot().appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity .2s ease";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 200);
    }, 3200);
  }

  /* ---------------- Modal ---------------- */
  function closeModal() {
    modalRoot().innerHTML = "";
    document.removeEventListener("keydown", escHandler);
  }
  function escHandler(e) {
    if (e.key === "Escape") closeModal();
  }

  function openModal({ title, size, render, footer }) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) closeModal();
    });

    const box = document.createElement("div");
    box.className = "modal-box" + (size === "sm" ? " modal-sm" : size === "lg" ? " modal-lg" : "");

    const header = document.createElement("div");
    header.className = "modal-header";
    header.innerHTML = `<h3 class="modal-title">${Utils.escapeHtml(title || "")}</h3>`;
    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.innerHTML = ICONS.close;
    closeBtn.addEventListener("click", closeModal);
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.className = "modal-body";

    box.appendChild(header);
    box.appendChild(body);

    if (footer && footer.length) {
      const footerEl = document.createElement("div");
      footerEl.className = "modal-footer";
      footer.forEach((btnCfg) => {
        const btn = document.createElement("button");
        btn.type = btnCfg.type || "button";
        btn.className = "btn " + (btnCfg.variant ? "btn-" + btnCfg.variant : "btn-secondary");
        btn.textContent = btnCfg.text;
        btn.addEventListener("click", (e) => {
          if (btnCfg.onClick) btnCfg.onClick(e, { close: closeModal, body });
        });
        footerEl.appendChild(btn);
      });
      box.appendChild(footerEl);
    }

    overlay.appendChild(box);
    modalRoot().innerHTML = "";
    modalRoot().appendChild(overlay);
    document.addEventListener("keydown", escHandler);

    if (render) render(body);
    return { close: closeModal, body };
  }

  function confirmAction({ title, message, confirmText, onConfirm }) {
    openModal({
      title: title || "Confirm",
      size: "sm",
      render(body) {
        body.innerHTML = `
          <div class="confirm-icon">${ICONS.warning}</div>
          <p style="font-size:14px;color:var(--text);">${Utils.escapeHtml(message)}</p>
        `;
      },
      footer: [
        { text: "Cancel", variant: "secondary", onClick: (e, { close }) => close() },
        {
          text: confirmText || "Delete", variant: "danger",
          onClick: (e, { close }) => { close(); onConfirm && onConfirm(); },
        },
      ],
    });
  }

  /* ---------------- Badges ---------------- */
  const STATUS_COLORS = {
    Active: "green", Available: "green", Paid: "green", Delivered: "green",
    Inactive: "gray", Offline: "gray", Cancelled: "red", Expired: "red",
    Pending: "amber", "On Delivery": "blue", Assigned: "blue", "Out for Delivery": "blue",
    Unavailable: "red",
  };
  function badge(text, colorOverride) {
    const color = colorOverride || STATUS_COLORS[text] || "gray";
    return `<span class="badge badge-${color}"><span class="badge-dot"></span>${Utils.escapeHtml(text)}</span>`;
  }

  /* ---------------- Empty state ---------------- */
  function emptyStateHtml(message) {
    return `<div class="empty-state">${Utils.escapeHtml(message || "No records found")}</div>`;
  }

  /* ---------------- DataTable ---------------- */
  function createDataTable(container, opts) {
    const state = { page: 1, pageSize: opts.pageSize || 8 };

    function render() {
      const all = opts.getData();
      const totalItems = all.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / state.pageSize));
      if (state.page > totalPages) state.page = totalPages;
      const start = (state.page - 1) * state.pageSize;
      const pageItems = all.slice(start, start + state.pageSize);

      let html = '<div class="table-wrap"><div class="table-scroll"><table class="data-table"><thead><tr>';
      opts.columns.forEach((col) => { html += `<th>${Utils.escapeHtml(col.label)}</th>`; });
      html += "</tr></thead><tbody>";

      if (!pageItems.length) {
        html += `<tr><td colspan="${opts.columns.length}">${emptyStateHtml(opts.emptyMessage)}</td></tr>`;
      } else {
        pageItems.forEach((row) => {
          html += "<tr>";
          opts.columns.forEach((col) => {
            html += `<td>${col.render ? col.render(row) : Utils.escapeHtml(row[col.key] ?? "-")}</td>`;
          });
          html += "</tr>";
        });
      }
      html += "</tbody></table></div>";

      html += `<div class="table-footer">
        <div class="table-info">Showing ${pageItems.length ? start + 1 : 0}-${start + pageItems.length} of ${totalItems}</div>
        <div class="pagination" data-pagination></div>
      </div></div>`;

      container.innerHTML = html;

      const pagEl = container.querySelector("[data-pagination]");
      const prev = document.createElement("button");
      prev.className = "page-btn"; prev.textContent = "‹"; prev.disabled = state.page <= 1;
      prev.addEventListener("click", () => { state.page--; render(); });
      pagEl.appendChild(prev);

      const maxButtons = 5;
      let startPage = Math.max(1, state.page - 2);
      let endPage = Math.min(totalPages, startPage + maxButtons - 1);
      startPage = Math.max(1, endPage - maxButtons + 1);
      for (let p = startPage; p <= endPage; p++) {
        const b = document.createElement("button");
        b.className = "page-btn" + (p === state.page ? " active" : "");
        b.textContent = p;
        b.addEventListener("click", () => { state.page = p; render(); });
        pagEl.appendChild(b);
      }

      const next = document.createElement("button");
      next.className = "page-btn"; next.textContent = "›"; next.disabled = state.page >= totalPages;
      next.addEventListener("click", () => { state.page++; render(); });
      pagEl.appendChild(next);

      if (opts.afterRender) opts.afterRender(container, pageItems);
    }

    function resetPage() { state.page = 1; }

    return { render, resetPage, get page() { return state.page; } };
  }

  /* ---------------- Form field builders ---------------- */
  function field({ label, name, type, value, options, required, placeholder, full, hint, step, min }) {
    const req = required ? '<span class="req"> *</span>' : "";
    const val = value === undefined || value === null ? "" : value;
    let input = "";
    if (type === "select") {
      input = `<select class="select" name="${name}" ${required ? "required" : ""}>` +
        (options || []).map((o) => {
          const optVal = typeof o === "object" ? o.value : o;
          const optLabel = typeof o === "object" ? o.label : o;
          return `<option value="${Utils.escapeHtml(optVal)}" ${String(val) === String(optVal) ? "selected" : ""}>${Utils.escapeHtml(optLabel)}</option>`;
        }).join("") + "</select>";
    } else if (type === "textarea") {
      input = `<textarea class="textarea" name="${name}" placeholder="${Utils.escapeHtml(placeholder || "")}">${Utils.escapeHtml(val)}</textarea>`;
    } else {
      input = `<input class="input" type="${type || "text"}" name="${name}" value="${Utils.escapeHtml(val)}" placeholder="${Utils.escapeHtml(placeholder || "")}" ${required ? "required" : ""} ${step ? `step="${step}"` : ""} ${min !== undefined ? `min="${min}"` : ""} />`;
    }
    return `<div class="form-field ${full ? "full" : ""}">
      <label class="form-label">${Utils.escapeHtml(label)}${req}</label>
      ${input}
      ${hint ? `<div class="form-hint">${Utils.escapeHtml(hint)}</div>` : ""}
      <div class="form-error" data-error-for="${name}"></div>
    </div>`;
  }

  function formToObject(formEl) {
    const fd = new FormData(formEl);
    const obj = {};
    fd.forEach((value, key) => { obj[key] = value; });
    return obj;
  }

  function showFieldError(formEl, name, message) {
    const el = formEl.querySelector(`[data-error-for="${name}"]`);
    if (el) el.textContent = message || "";
  }
  function clearFieldErrors(formEl) {
    formEl.querySelectorAll("[data-error-for]").forEach((el) => (el.textContent = ""));
  }

  return {
    toast, openModal, closeModal, confirmAction, badge, STATUS_COLORS,
    createDataTable, emptyStateHtml, field, formToObject, showFieldError, clearFieldErrors,
    searchInput, filterSelect, dateRange, clearFiltersBtn, filterMeta,
    hasActiveFilters, markActiveFilters, updateFilterChrome, bindSearchClear,
    ICONS,
  };
})();

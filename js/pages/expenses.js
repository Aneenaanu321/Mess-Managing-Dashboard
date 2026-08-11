/* ==========================================================================
   Expense Management Page
   ========================================================================== */

const ExpensesPage = (() => {
  const CATEGORIES = ["Food", "Salary", "Transport", "Fuel", "Maintenance", "Electricity", "Gas", "Rent", "Other"];
  const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer"];

  let state = { search: "", category: "", dateFrom: "", dateTo: "" };
  let table = null;

  function getFiltered() {
    const all = Store.getAll("expenses");
    return all.filter((x) =>
      Utils.matchesSearch(x, ["expenseId", "description", "paidBy"], state.search) &&
      (!state.category || x.category === state.category) &&
      Utils.inDateRange(x.date, state.dateFrom, state.dateTo)
    ).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }

  function render(container) {
    const all = Store.getAll("expenses");
    const totalExpenses = Utils.sumBy(all, "amount");
    const thisMonth = Utils.todayISO().slice(0, 7);
    const thisMonthExpenses = Utils.sumBy(all.filter((x) => (x.date || "").slice(0, 7) === thisMonth), "amount");
    const foodExpenses = Utils.sumBy(all.filter((x) => x.category === "Food"), "amount");
    const salaryExpenses = Utils.sumBy(all.filter((x) => x.category === "Salary"), "amount");
    const otherExpenses = Utils.sumBy(all.filter((x) => !["Food", "Salary"].includes(x.category)), "amount");

    container.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-icon" style="background:var(--brand-light);color:var(--brand);">Σ</div><div class="stat-info"><div class="stat-value">${Utils.formatCurrency(totalExpenses)}</div><div class="stat-label">Total Expenses</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--info-bg);color:var(--info);">📅</div><div class="stat-info"><div class="stat-value">${Utils.formatCurrency(thisMonthExpenses)}</div><div class="stat-label">This Month</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--success-bg);color:var(--success);">🍽</div><div class="stat-info"><div class="stat-value">${Utils.formatCurrency(foodExpenses)}</div><div class="stat-label">Food Expenses</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--warning-bg);color:var(--warning);">💵</div><div class="stat-info"><div class="stat-value">${Utils.formatCurrency(salaryExpenses)}</div><div class="stat-label">Salary Expenses</div></div></div>
      </div>
      <div class="stat-grid" style="grid-template-columns:1fr;margin-top:-8px;">
        <div class="stat-card" style="max-width:280px;"><div class="stat-icon" style="background:var(--danger-bg);color:var(--danger);">•••</div><div class="stat-info"><div class="stat-value">${Utils.formatCurrency(otherExpenses)}</div><div class="stat-label">Other Expenses</div></div></div>
      </div>

      <div class="toolbar">
        <div class="toolbar-row">
          ${UI.searchInput({ id: "expSearch", placeholder: "ID, description...", value: state.search })}
          ${UI.filterSelect({ id: "expCatFilter", label: "Category", value: state.category, options: CATEGORIES, allLabel: "All" })}
          ${UI.dateRange({ fromId: "expDateFrom", toId: "expDateTo", fromValue: state.dateFrom, toValue: state.dateTo })}
          <div class="toolbar-actions">
            ${UI.clearFiltersBtn("expClearFilters", UI.hasActiveFilters(state))}
            <button class="btn btn-secondary" id="expExportBtn">Export Excel</button>
            <button class="btn btn-primary" id="expAddBtn">+ Add Expense</button>
          </div>
        </div>
        ${UI.filterMeta()}
      </div>
      <div id="expTableContainer"></div>
    `;

    const tableContainer = container.querySelector("#expTableContainer");
    table = UI.createDataTable(tableContainer, {
      pageSize: 8,
      emptyMessage: "No expenses found.",
      getData: getFiltered,
      columns: [
        { label: "Expense ID", key: "expenseId" },
        { label: "Date", render: (r) => Utils.formatDate(r.date) },
        { label: "Category", key: "category" },
        { label: "Description", render: (r) => `<span class="cell-muted">${Utils.escapeHtml(r.description)}</span>` },
        { label: "Amount", render: (r) => `<strong>${Utils.formatCurrency(r.amount)}</strong>` },
        { label: "Paid By", key: "paidBy" },
        { label: "Method", key: "paymentMethod" },
        {
          label: "Actions", render: (r) => `
          <div class="actions-cell">
            <button class="btn btn-secondary btn-sm btn-icon" data-edit="${r.id}" title="Edit">✎</button>
            <button class="btn btn-secondary btn-sm btn-icon" data-delete="${r.id}" title="Delete">🗑</button>
          </div>`,
        },
      ],
      afterRender(el) {
        el.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openForm(Store.getById("expenses", b.dataset.edit))));
        el.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", () => deleteExpense(b.dataset.delete)));
      },
    });
    table.render();

    const labels = { search: "Search", category: "Category", dateFrom: "From", dateTo: "To" };
    const refreshFilters = () => {
      UI.updateFilterChrome(container, {
        state, labels, clearBtnId: "expClearFilters", searchId: "expSearch",
        resultCount: getFiltered().length, totalCount: all.length,
        onChipClear: (key) => { state[key] = ""; render(container); },
      });
    };
    container.querySelector("#expSearch").addEventListener("input", Utils.debounce((e) => { state.search = e.target.value; table.resetPage(); table.render(); refreshFilters(); }, 200));
    UI.bindSearchClear(container, "expSearch", () => { state.search = ""; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#expCatFilter").addEventListener("change", (e) => { state.category = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#expDateFrom").addEventListener("change", (e) => { state.dateFrom = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#expDateTo").addEventListener("change", (e) => { state.dateTo = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#expClearFilters").addEventListener("click", () => {
      state = { search: "", category: "", dateFrom: "", dateTo: "" };
      render(container);
    });
    container.querySelector("#expAddBtn").addEventListener("click", () => openForm(null));
    container.querySelector("#expExportBtn").addEventListener("click", exportExcel);
    refreshFilters();
  }

  function exportExcel() {
    const rows = getFiltered().map((x) => ({
      "Expense ID": x.expenseId, "Date": Utils.formatDate(x.date), "Category": x.category, "Description": x.description,
      "Amount": x.amount, "Paid By": x.paidBy, "Payment Method": x.paymentMethod, "Notes": x.notes || "",
    }));
    Utils.downloadWorkbook({ Expenses: rows }, `Expenses_${Utils.fileTimestamp()}.xlsx`);
    UI.toast("Expenses exported to Excel");
  }

  function openForm(existing) {
    const isEdit = !!existing;
    const nextId = isEdit ? existing.expenseId : Utils.nextSequentialId(Store.getAll("expenses"), "EXP", "expenseId");

    UI.openModal({
      title: isEdit ? "Edit Expense" : "Add Expense",
      size: "lg",
      render(body) {
        body.innerHTML = `<form id="expForm">
          <div class="form-grid">
            ${UI.field({ label: "Expense ID", name: "expenseId", value: nextId, required: true })}
            ${UI.field({ label: "Date", name: "date", type: "date", value: existing?.date || Utils.todayISO(), required: true })}
            ${UI.field({ label: "Expense Category", name: "category", type: "select", value: existing?.category, options: CATEGORIES, required: true })}
            ${UI.field({ label: "Amount", name: "amount", type: "number", value: existing?.amount, required: true, min: 0 })}
            ${UI.field({ label: "Description", name: "description", value: existing?.description, required: true, full: true })}
            ${UI.field({ label: "Paid By", name: "paidBy", value: existing?.paidBy, required: true })}
            ${UI.field({ label: "Payment Method", name: "paymentMethod", type: "select", value: existing?.paymentMethod, options: PAYMENT_METHODS, required: true })}
            ${UI.field({ label: "Notes", name: "notes", type: "textarea", value: existing?.notes, full: true })}
          </div>
        </form>`;
      },
      footer: [
        { text: "Cancel", variant: "secondary", onClick: (e, { close }) => close() },
        {
          text: isEdit ? "Save Changes" : "Add Expense", variant: "primary",
          onClick: (e, { close, body }) => {
            const form = body.querySelector("#expForm");
            if (!form.reportValidity()) return;
            const data = UI.formToObject(form);
            data.amount = Number(data.amount) || 0;
            if (isEdit) {
              Store.update("expenses", existing.id, data);
              UI.toast("Expense updated");
            } else {
              Store.add("expenses", data);
              Store.logActivity("expense", `Expense added: ${data.description} - ${Utils.formatCurrency(data.amount)}`);
              UI.toast("Expense added");
            }
            close();
            table.render();
          },
        },
      ],
    });
  }

  function deleteExpense(id) {
    const x = Store.getById("expenses", id);
    if (!x) return;
    UI.confirmAction({
      title: "Delete Expense",
      message: `Are you sure you want to delete this record? Expense ${x.expenseId} will be permanently removed.`,
      onConfirm() {
        Store.remove("expenses", id);
        UI.toast("Expense deleted", "info");
        table.render();
      },
    });
  }

  return { render, CATEGORIES, PAYMENT_METHODS };
})();

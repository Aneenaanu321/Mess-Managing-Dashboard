/* ==========================================================================
   Salary Management Page
   ========================================================================== */

const SalaryPage = (() => {
  let state = { search: "", month: "", employeeId: "", status: "" };
  let table = null;

  function getFiltered() {
    const all = Store.getAll("salaries");
    return all.filter((s) =>
      Utils.matchesSearch(s, ["salaryId", "employeeId", "employeeName"], state.search) &&
      (!state.month || s.salaryMonth === state.month) &&
      (!state.employeeId || s.employeeId === state.employeeId) &&
      (!state.status || s.paymentStatus === state.status)
    ).sort((a, b) => (b.salaryMonth || "").localeCompare(a.salaryMonth || "") || a.salaryId.localeCompare(b.salaryId));
  }

  function render(container) {
    const employees = Store.getAll("employees");
    const allSalaries = Store.getAll("salaries");
    const months = [...new Set(allSalaries.map((s) => s.salaryMonth))].sort().reverse();

    const totalSalary = Utils.sumBy(allSalaries, "netSalary");
    const paidSalary = Utils.sumBy(allSalaries.filter((s) => s.paymentStatus === "Paid"), "netSalary");
    const pendingSalary = Utils.sumBy(allSalaries.filter((s) => s.paymentStatus === "Pending"), "netSalary");

    container.innerHTML = `
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="stat-card"><div class="stat-icon" style="background:var(--brand-light);color:var(--brand);">₹</div><div class="stat-info"><div class="stat-value">${Utils.formatCurrency(totalSalary)}</div><div class="stat-label">Total Salary</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--success-bg);color:var(--success);">✓</div><div class="stat-info"><div class="stat-value">${Utils.formatCurrency(paidSalary)}</div><div class="stat-label">Paid Salary</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:var(--warning-bg);color:var(--warning);">⏳</div><div class="stat-info"><div class="stat-value">${Utils.formatCurrency(pendingSalary)}</div><div class="stat-label">Pending Salary</div></div></div>
      </div>

      <div class="toolbar">
        <div class="toolbar-row">
          ${UI.searchInput({ id: "salSearch", placeholder: "salary ID, employee...", value: state.search })}
          ${UI.filterSelect({ id: "salMonthFilter", label: "Month", value: state.month, options: months.map((m) => ({ value: m, label: Utils.monthLabel(m) })), allLabel: "All" })}
          ${UI.filterSelect({ id: "salEmpFilter", label: "Employee", value: state.employeeId, options: employees.map((e) => ({ value: e.employeeId, label: e.name })), allLabel: "All" })}
          ${UI.filterSelect({ id: "salStatusFilter", label: "Payment", value: state.status, options: ["Paid", "Pending"], allLabel: "All" })}
          <div class="toolbar-actions">
            ${UI.clearFiltersBtn("salClearFilters", UI.hasActiveFilters(state))}
            <button class="btn btn-secondary" id="salExportBtn">Export Excel</button>
            <button class="btn btn-primary" id="salAddBtn">+ Add Salary</button>
          </div>
        </div>
        ${UI.filterMeta()}
      </div>
      <div id="salTableContainer"></div>
    `;

    const tableContainer = container.querySelector("#salTableContainer");
    table = UI.createDataTable(tableContainer, {
      pageSize: 8,
      emptyMessage: "No salary records found.",
      getData: getFiltered,
      columns: [
        { label: "Salary ID", key: "salaryId" },
        { label: "Employee ID", key: "employeeId" },
        { label: "Employee Name", render: (r) => `<strong>${Utils.escapeHtml(r.employeeName)}</strong>` },
        { label: "Designation", key: "designation" },
        { label: "Basic", render: (r) => Utils.formatCurrency(r.basicSalary) },
        { label: "Allowance", render: (r) => Utils.formatCurrency(r.allowance) },
        { label: "Deduction", render: (r) => Utils.formatCurrency(r.deduction) },
        { label: "Net Salary", render: (r) => `<strong>${Utils.formatCurrency(r.netSalary)}</strong>` },
        { label: "Month", render: (r) => Utils.monthLabel(r.salaryMonth) },
        { label: "Payment Date", render: (r) => Utils.formatDate(r.paymentDate) },
        { label: "Status", render: (r) => UI.badge(r.paymentStatus) },
        {
          label: "Actions", render: (r) => `
          <div class="actions-cell">
            ${r.paymentStatus !== "Paid" ? `<button class="btn btn-success btn-sm" data-markpaid="${r.id}">Mark Paid</button>` : ""}
            <button class="btn btn-secondary btn-sm btn-icon" data-edit="${r.id}" title="Edit">✎</button>
            <button class="btn btn-secondary btn-sm btn-icon" data-delete="${r.id}" title="Delete">🗑</button>
          </div>`,
        },
      ],
      afterRender(el) {
        el.querySelectorAll("[data-markpaid]").forEach((b) => b.addEventListener("click", () => markPaid(b.dataset.markpaid)));
        el.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openForm(Store.getById("salaries", b.dataset.edit))));
        el.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", () => deleteSalary(b.dataset.delete)));
      },
    });
    table.render();

    const labels = { search: "Search", month: "Month", employeeId: "Employee", status: "Payment" };
    const refreshFilters = () => {
      const chipState = { ...state };
      if (state.employeeId) {
        const e = employees.find((x) => x.employeeId === state.employeeId);
        chipState.employeeId = e ? e.name : state.employeeId;
      }
      UI.updateFilterChrome(container, {
        state: chipState, labels, clearBtnId: "salClearFilters", searchId: "salSearch",
        resultCount: getFiltered().length, totalCount: allSalaries.length,
        onChipClear: (key) => { state[key] = ""; render(container); },
      });
    };
    container.querySelector("#salSearch").addEventListener("input", Utils.debounce((e) => { state.search = e.target.value; table.resetPage(); table.render(); refreshFilters(); }, 200));
    UI.bindSearchClear(container, "salSearch", () => { state.search = ""; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#salMonthFilter").addEventListener("change", (e) => { state.month = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#salEmpFilter").addEventListener("change", (e) => { state.employeeId = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#salStatusFilter").addEventListener("change", (e) => { state.status = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#salClearFilters").addEventListener("click", () => {
      state = { search: "", month: "", employeeId: "", status: "" };
      render(container);
    });
    container.querySelector("#salAddBtn").addEventListener("click", () => openForm(null));
    container.querySelector("#salExportBtn").addEventListener("click", exportExcel);
    refreshFilters();
  }

  function exportExcel() {
    const rows = getFiltered().map((s) => ({
      "Salary ID": s.salaryId, "Employee ID": s.employeeId, "Employee Name": s.employeeName, "Designation": s.designation,
      "Basic Salary": s.basicSalary, "Allowance": s.allowance, "Deduction": s.deduction, "Net Salary": s.netSalary,
      "Salary Month": Utils.monthLabel(s.salaryMonth), "Payment Date": Utils.formatDate(s.paymentDate), "Payment Status": s.paymentStatus,
    }));
    Utils.downloadWorkbook({ Salaries: rows }, `Salaries_${Utils.fileTimestamp()}.xlsx`);
    UI.toast("Salary records exported to Excel");
  }

  function markPaid(id) {
    const s = Store.getById("salaries", id);
    Store.update("salaries", id, { paymentStatus: "Paid", paymentDate: Utils.todayISO() });
    Store.logActivity("salary", `Salary marked as Paid for ${s.employeeName} - ${Utils.monthLabel(s.salaryMonth)}`);
    UI.toast("Salary marked as Paid");
    table.render();
  }

  function openForm(existing) {
    const isEdit = !!existing;
    const employees = Store.getAll("employees");
    const nextId = isEdit ? existing.salaryId : Utils.nextSequentialId(Store.getAll("salaries"), "SAL", "salaryId");

    UI.openModal({
      title: isEdit ? "Edit Salary" : "Add Salary",
      size: "lg",
      render(body) {
        body.innerHTML = `<form id="salForm">
          <div class="form-grid">
            ${UI.field({ label: "Salary ID", name: "salaryId", value: nextId, required: true })}
            ${UI.field({ label: "Employee", name: "employeeId", type: "select", value: existing?.employeeId, required: true, options: employees.map((e) => ({ value: e.employeeId, label: `${e.name} (${e.employeeId})` })) })}
            ${UI.field({ label: "Basic Salary", name: "basicSalary", type: "number", value: existing?.basicSalary, required: true, min: 0 })}
            ${UI.field({ label: "Allowance", name: "allowance", type: "number", value: existing?.allowance ?? 0, min: 0 })}
            ${UI.field({ label: "Deduction", name: "deduction", type: "number", value: existing?.deduction ?? 0, min: 0 })}
            ${UI.field({ label: "Net Salary", name: "netSalaryDisplay", value: existing?.netSalary ?? 0, hint: "Auto-calculated: Basic + Allowance - Deduction" })}
            ${UI.field({ label: "Salary Month", name: "salaryMonth", type: "month", value: existing?.salaryMonth || new Date().toISOString().slice(0, 7), required: true })}
            ${UI.field({ label: "Payment Date", name: "paymentDate", type: "date", value: existing?.paymentDate })}
            ${UI.field({ label: "Payment Status", name: "paymentStatus", type: "select", value: existing?.paymentStatus || "Pending", options: ["Pending", "Paid"], required: true })}
          </div>
        </form>`;

        const form = body.querySelector("#salForm");
        const netDisplay = form.querySelector('[name="netSalaryDisplay"]');
        netDisplay.readOnly = true;
        netDisplay.style.background = "var(--neutral-bg)";

        function recalc() {
          const basic = Number(form.querySelector('[name="basicSalary"]').value) || 0;
          const allow = Number(form.querySelector('[name="allowance"]').value) || 0;
          const ded = Number(form.querySelector('[name="deduction"]').value) || 0;
          netDisplay.value = basic + allow - ded;
        }
        ["basicSalary", "allowance", "deduction"].forEach((n) => form.querySelector(`[name="${n}"]`).addEventListener("input", recalc));

        // Auto-fill basic salary when employee changes (only if not editing an existing custom value)
        form.querySelector('[name="employeeId"]').addEventListener("change", (e) => {
          const emp = employees.find((x) => x.employeeId === e.target.value);
          if (emp) {
            form.querySelector('[name="basicSalary"]').value = emp.salary;
            recalc();
          }
        });
      },
      footer: [
        { text: "Cancel", variant: "secondary", onClick: (e, { close }) => close() },
        {
          text: isEdit ? "Save Changes" : "Add Salary", variant: "primary",
          onClick: (e, { close, body }) => {
            const form = body.querySelector("#salForm");
            if (!form.reportValidity()) return;
            const data = UI.formToObject(form);
            const emp = employees.find((x) => x.employeeId === data.employeeId);
            const basic = Number(data.basicSalary) || 0;
            const allowance = Number(data.allowance) || 0;
            const deduction = Number(data.deduction) || 0;
            const record = {
              salaryId: data.salaryId,
              employeeId: data.employeeId,
              employeeName: emp ? emp.name : (existing?.employeeName || ""),
              designation: emp ? emp.designation : (existing?.designation || ""),
              basicSalary: basic, allowance, deduction,
              netSalary: basic + allowance - deduction,
              salaryMonth: data.salaryMonth,
              paymentDate: data.paymentDate,
              paymentStatus: data.paymentStatus,
            };

            if (isEdit) {
              Store.update("salaries", existing.id, record);
              Store.logActivity("salary", `Salary updated for ${record.employeeName} - ${Utils.monthLabel(record.salaryMonth)}`);
              UI.toast("Salary record updated");
            } else {
              Store.add("salaries", record);
              Store.logActivity("salary", `Salary added for ${record.employeeName} - ${Utils.monthLabel(record.salaryMonth)}`);
              UI.toast("Salary record added");
            }
            close();
            table.render();
          },
        },
      ],
    });
  }

  function deleteSalary(id) {
    const s = Store.getById("salaries", id);
    if (!s) return;
    UI.confirmAction({
      title: "Delete Salary Record",
      message: `Are you sure you want to delete this record? Salary ${s.salaryId} for ${s.employeeName} will be permanently removed.`,
      onConfirm() {
        Store.remove("salaries", id);
        UI.toast("Salary record deleted", "info");
        table.render();
      },
    });
  }

  return { render };
})();

/* ==========================================================================
   Employee Management Page
   ========================================================================== */

const EmployeesPage = (() => {
  const DEPARTMENTS = ["Kitchen", "Delivery", "Management", "Accounts", "Housekeeping", "Other"];
  const DESIGNATIONS = ["Head Chef", "Cook", "Helper", "Manager", "Accountant", "Delivery Executive", "Cleaner", "Supervisor", "Other"];

  let state = { search: "", department: "", designation: "", status: "" };
  let table = null;

  function getFiltered() {
    const all = Store.getAll("employees");
    return all.filter((e) =>
      Utils.matchesSearch(e, ["employeeId", "name", "phone", "email"], state.search) &&
      (!state.department || e.department === state.department) &&
      (!state.designation || e.designation === state.designation) &&
      (!state.status || e.status === state.status)
    ).sort((a, b) => a.employeeId.localeCompare(b.employeeId));
  }

  function render(container) {
    const active = UI.hasActiveFilters(state);
    container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-row">
          ${UI.searchInput({ id: "empSearch", placeholder: "name, ID, phone...", value: state.search })}
          ${UI.filterSelect({ id: "empDeptFilter", label: "Department", value: state.department, options: DEPARTMENTS, allLabel: "All" })}
          ${UI.filterSelect({ id: "empDesigFilter", label: "Designation", value: state.designation, options: DESIGNATIONS, allLabel: "All" })}
          ${UI.filterSelect({ id: "empStatusFilter", label: "Status", value: state.status, options: ["Active", "Inactive"], allLabel: "All" })}
          <div class="toolbar-actions">
            ${UI.clearFiltersBtn("empClearFilters", active)}
            <button class="btn btn-secondary" id="empExportBtn">Export Excel</button>
            <button class="btn btn-primary" id="empAddBtn">+ Add Employee</button>
          </div>
        </div>
        ${UI.filterMeta()}
      </div>
      <div id="empTableContainer"></div>
    `;

    const tableContainer = container.querySelector("#empTableContainer");
    table = UI.createDataTable(tableContainer, {
      pageSize: 8,
      emptyMessage: "No employees found. Click 'Add Employee' to create one.",
      getData: getFiltered,
      columns: [
        { label: "Employee ID", key: "employeeId" },
        { label: "Name", render: (r) => `<strong>${Utils.escapeHtml(r.name)}</strong>` },
        { label: "Phone", key: "phone" },
        { label: "Email", render: (r) => `<span class="cell-muted">${Utils.escapeHtml(r.email || "-")}</span>` },
        { label: "Designation", key: "designation" },
        { label: "Department", key: "department" },
        { label: "Joining Date", render: (r) => Utils.formatDate(r.joiningDate) },
        { label: "Salary", render: (r) => Utils.formatCurrency(r.salary) },
        { label: "Status", render: (r) => UI.badge(r.status) },
        {
          label: "Actions", render: (r) => `
          <div class="actions-cell">
            <button class="btn btn-secondary btn-sm btn-icon" data-view="${r.id}" title="View">👁</button>
            <button class="btn btn-secondary btn-sm btn-icon" data-edit="${r.id}" title="Edit">✎</button>
            <button class="btn btn-secondary btn-sm btn-icon" data-delete="${r.id}" title="Delete">🗑</button>
          </div>`,
        },
      ],
      afterRender(el) {
        el.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => viewEmployee(b.dataset.view)));
        el.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openForm(Store.getById("employees", b.dataset.edit))));
        el.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", () => deleteEmployee(b.dataset.delete)));
      },
    });
    table.render();

    const labels = { search: "Search", department: "Department", designation: "Designation", status: "Status" };
    const refreshFilters = () => {
      UI.updateFilterChrome(container, {
        state, labels, clearBtnId: "empClearFilters", searchId: "empSearch",
        resultCount: getFiltered().length, totalCount: Store.getAll("employees").length,
        onChipClear: (key) => { state[key] = ""; render(container); },
      });
    };
    container.querySelector("#empSearch").addEventListener("input", Utils.debounce((e) => {
      state.search = e.target.value; table.resetPage(); table.render(); refreshFilters();
    }, 200));
    UI.bindSearchClear(container, "empSearch", () => { state.search = ""; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#empDeptFilter").addEventListener("change", (e) => { state.department = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#empDesigFilter").addEventListener("change", (e) => { state.designation = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#empStatusFilter").addEventListener("change", (e) => { state.status = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#empClearFilters").addEventListener("click", () => {
      state = { search: "", department: "", designation: "", status: "" };
      render(container);
    });
    container.querySelector("#empAddBtn").addEventListener("click", () => openForm(null));
    container.querySelector("#empExportBtn").addEventListener("click", exportExcel);
    refreshFilters();
  }

  function exportExcel() {
    const filtered = getFiltered();
    const rows = filtered.map((e) => ({
      "Employee ID": e.employeeId, "Name": e.name, "Phone": e.phone, "Email": e.email || "",
      "Address": e.address || "", "Designation": e.designation, "Department": e.department,
      "Joining Date": Utils.formatDate(e.joiningDate), "Salary": e.salary, "Salary Date": e.salaryDate,
      "Bank Account": e.bankAccount || "", "Status": e.status,
    }));
    Utils.downloadWorkbook({ Employees: rows }, `Employees_${Utils.fileTimestamp()}.xlsx`);
    UI.toast("Employee list exported to Excel");
  }

  function viewEmployee(id) {
    const e = Store.getById("employees", id);
    if (!e) return;
    UI.openModal({
      title: "Employee Details",
      render(body) {
        body.innerHTML = `<div class="detail-grid">
          ${detail("Employee ID", e.employeeId)}
          ${detail("Full Name", e.name)}
          ${detail("Phone", e.phone)}
          ${detail("Email", e.email || "-")}
          ${detail("Address", e.address || "-", true)}
          ${detail("Designation", e.designation)}
          ${detail("Department", e.department)}
          ${detail("Joining Date", Utils.formatDate(e.joiningDate))}
          ${detail("Salary", Utils.formatCurrency(e.salary))}
          ${detail("Salary Date", "Day " + (e.salaryDate || "-") + " of month")}
          ${detail("Bank Account", e.bankAccount || "-")}
          ${detail("Status", "")}
        </div><div style="margin-top:6px;">${UI.badge(e.status)}</div>`;
      },
      footer: [{ text: "Close", variant: "secondary", onClick: (ev, { close }) => close() }],
    });
  }
  function detail(label, value, full) {
    if (!value && value !== 0) return "";
    return `<div class="detail-item ${full ? "full" : ""}"><div class="detail-label">${label}</div><div class="detail-value">${Utils.escapeHtml(String(value))}</div></div>`;
  }

  function openForm(existing) {
    const isEdit = !!existing;
    const nextId = isEdit ? existing.employeeId : Utils.nextSequentialId(Store.getAll("employees"), "EMP", "employeeId");

    UI.openModal({
      title: isEdit ? "Edit Employee" : "Add Employee",
      size: "lg",
      render(body) {
        body.innerHTML = `<form id="empForm">
          <div class="form-grid">
            ${UI.field({ label: "Employee ID", name: "employeeId", value: nextId, required: true })}
            ${UI.field({ label: "Full Name", name: "name", value: existing?.name, required: true })}
            ${UI.field({ label: "Phone", name: "phone", value: existing?.phone, required: true, placeholder: "10-digit number" })}
            ${UI.field({ label: "Email", name: "email", type: "email", value: existing?.email })}
            ${UI.field({ label: "Address", name: "address", type: "textarea", value: existing?.address, full: true })}
            ${UI.field({ label: "Designation", name: "designation", type: "select", value: existing?.designation, options: DESIGNATIONS, required: true })}
            ${UI.field({ label: "Department", name: "department", type: "select", value: existing?.department, options: DEPARTMENTS, required: true })}
            ${UI.field({ label: "Joining Date", name: "joiningDate", type: "date", value: existing?.joiningDate || Utils.todayISO(), required: true })}
            ${UI.field({ label: "Salary", name: "salary", type: "number", value: existing?.salary, required: true, min: 0 })}
            ${UI.field({ label: "Salary Date", name: "salaryDate", value: existing?.salaryDate || "5", hint: "Day of month, e.g. 5" })}
            ${UI.field({ label: "Bank Account", name: "bankAccount", value: existing?.bankAccount, hint: "Optional" })}
            ${UI.field({ label: "Status", name: "status", type: "select", value: existing?.status || "Active", options: ["Active", "Inactive"], required: true })}
          </div>
        </form>`;
      },
      footer: [
        { text: "Cancel", variant: "secondary", onClick: (e, { close }) => close() },
        {
          text: isEdit ? "Save Changes" : "Add Employee", variant: "primary",
          onClick: (e, { close, body }) => {
            const form = body.querySelector("#empForm");
            UI.clearFieldErrors(form);
            if (!form.reportValidity()) return;
            const data = UI.formToObject(form);
            if (!/^\d{7,15}$/.test(data.phone.replace(/\s/g, ""))) {
              UI.showFieldError(form, "phone", "Enter a valid phone number");
              return;
            }
            data.salary = Number(data.salary) || 0;

            if (isEdit) {
              Store.update("employees", existing.id, data);
              Store.logActivity("employee", `Employee ${data.name} details updated`);
              UI.toast("Employee updated successfully");
            } else {
              Store.add("employees", data);
              Store.logActivity("employee", `New employee ${data.name} added to ${data.department} department`);
              UI.toast("Employee added successfully");
            }
            close();
            table.render();
          },
        },
      ],
    });
  }

  function deleteEmployee(id) {
    const e = Store.getById("employees", id);
    if (!e) return;
    UI.confirmAction({
      title: "Delete Employee",
      message: `Are you sure you want to delete this record? "${e.name}" (${e.employeeId}) will be permanently removed.`,
      onConfirm() {
        Store.remove("employees", id);
        Store.logActivity("employee", `Employee ${e.name} was removed`);
        UI.toast("Employee deleted", "info");
        table.render();
      },
    });
  }

  return { render, DEPARTMENTS, DESIGNATIONS };
})();

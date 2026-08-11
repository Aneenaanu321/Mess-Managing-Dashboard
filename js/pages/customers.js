/* ==========================================================================
   Customer Management Page
   ========================================================================== */

const CustomersPage = (() => {
  const SUBSCRIPTION_TYPES = ["Daily", "Weekly", "Monthly"];
  const STATUS_OPTIONS = ["Active", "Expired", "Cancelled"];

  let state = { search: "", area: "", subscriptionType: "", status: "" };
  let table = null;

  function getFiltered() {
    const all = Store.getAll("customers");
    return all.filter((c) =>
      Utils.matchesSearch(c, ["customerId", "name", "phone", "email", "area"], state.search) &&
      (!state.subscriptionType || c.subscriptionType === state.subscriptionType) &&
      (!state.status || c.status === state.status)
    ).sort((a, b) => a.customerId.localeCompare(b.customerId));
  }

  function render(container) {
    const active = UI.hasActiveFilters(state, ["search", "subscriptionType", "status"]);
    container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-row">
          ${UI.searchInput({ id: "custSearch", placeholder: "name, ID, phone...", value: state.search })}
          ${UI.filterSelect({ id: "custSubFilter", label: "Subscription", value: state.subscriptionType, options: SUBSCRIPTION_TYPES, allLabel: "All" })}
          ${UI.filterSelect({ id: "custStatusFilter", label: "Status", value: state.status, options: STATUS_OPTIONS, allLabel: "All" })}
          <div class="toolbar-actions">
            ${UI.clearFiltersBtn("custClearFilters", active)}
            <button class="btn btn-secondary" id="custExportBtn">Export Excel</button>
            <button class="btn btn-primary" id="custAddBtn">+ Add Customer</button>
          </div>
        </div>
        ${UI.filterMeta()}
      </div>
      <div id="custTableContainer"></div>
    `;

    const tableContainer = container.querySelector("#custTableContainer");
    table = UI.createDataTable(tableContainer, {
      pageSize: 8,
      emptyMessage: "No customers found.",
      getData: getFiltered,
      columns: [
        { label: "Customer ID", key: "customerId" },
        { label: "Name", render: (r) => `<strong>${Utils.escapeHtml(r.name)}</strong>` },
        { label: "Phone", key: "phone" },
        { label: "Area", key: "area" },
        { label: "Subscription", key: "subscriptionType" },
        { label: "Start Date", render: (r) => Utils.formatDate(r.startDate) },
        { label: "End Date", render: (r) => Utils.formatDate(r.endDate) },
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
        el.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => viewCustomer(b.dataset.view)));
        el.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openForm(Store.getById("customers", b.dataset.edit))));
        el.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", () => deleteCustomer(b.dataset.delete)));
      },
    });
    table.render();

    const labels = { search: "Search", subscriptionType: "Subscription", status: "Status" };
    const refreshFilters = () => {
      UI.updateFilterChrome(container, {
        state, labels, clearBtnId: "custClearFilters", searchId: "custSearch",
        resultCount: getFiltered().length, totalCount: Store.getAll("customers").length,
        onChipClear: (key) => { state[key] = ""; render(container); },
      });
    };
    container.querySelector("#custSearch").addEventListener("input", Utils.debounce((e) => { state.search = e.target.value; table.resetPage(); table.render(); refreshFilters(); }, 200));
    UI.bindSearchClear(container, "custSearch", () => { state.search = ""; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#custSubFilter").addEventListener("change", (e) => { state.subscriptionType = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#custStatusFilter").addEventListener("change", (e) => { state.status = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#custClearFilters").addEventListener("click", () => {
      state = { search: "", area: "", subscriptionType: "", status: "" };
      render(container);
    });
    container.querySelector("#custAddBtn").addEventListener("click", () => openForm(null));
    container.querySelector("#custExportBtn").addEventListener("click", exportExcel);
    refreshFilters();
  }

  function exportExcel() {
    const rows = getFiltered().map((c) => ({
      "Customer ID": c.customerId, "Name": c.name, "Phone": c.phone, "Email": c.email || "", "Address": c.address || "",
      "Area": c.area, "Subscription Type": c.subscriptionType, "Start Date": Utils.formatDate(c.startDate),
      "End Date": Utils.formatDate(c.endDate), "Status": c.status,
    }));
    Utils.downloadWorkbook({ Customers: rows }, `Customers_${Utils.fileTimestamp()}.xlsx`);
    UI.toast("Customer list exported to Excel");
  }

  function viewCustomer(id) {
    const c = Store.getById("customers", id);
    if (!c) return;
    UI.openModal({
      title: "Customer Details",
      render(body) {
        body.innerHTML = `<div class="detail-grid">
          <div class="detail-item"><div class="detail-label">Customer ID</div><div class="detail-value">${Utils.escapeHtml(c.customerId)}</div></div>
          <div class="detail-item"><div class="detail-label">Name</div><div class="detail-value">${Utils.escapeHtml(c.name)}</div></div>
          <div class="detail-item"><div class="detail-label">Phone</div><div class="detail-value">${Utils.escapeHtml(c.phone)}</div></div>
          <div class="detail-item"><div class="detail-label">Email</div><div class="detail-value">${Utils.escapeHtml(c.email || "-")}</div></div>
          <div class="detail-item full"><div class="detail-label">Address</div><div class="detail-value">${Utils.escapeHtml(c.address || "-")}</div></div>
          <div class="detail-item"><div class="detail-label">Area</div><div class="detail-value">${Utils.escapeHtml(c.area)}</div></div>
          <div class="detail-item"><div class="detail-label">Subscription</div><div class="detail-value">${Utils.escapeHtml(c.subscriptionType)}</div></div>
          <div class="detail-item"><div class="detail-label">Start Date</div><div class="detail-value">${Utils.formatDate(c.startDate)}</div></div>
          <div class="detail-item"><div class="detail-label">End Date</div><div class="detail-value">${Utils.formatDate(c.endDate)}</div></div>
        </div><div style="margin-top:10px;">${UI.badge(c.status)}</div>`;
      },
      footer: [{ text: "Close", variant: "secondary", onClick: (e, { close }) => close() }],
    });
  }

  function openForm(existing) {
    const isEdit = !!existing;
    const nextId = isEdit ? existing.customerId : Utils.nextSequentialId(Store.getAll("customers"), "CUST", "customerId");

    UI.openModal({
      title: isEdit ? "Edit Customer" : "Add Customer",
      size: "lg",
      render(body) {
        body.innerHTML = `<form id="custForm">
          <div class="form-grid">
            ${UI.field({ label: "Customer ID", name: "customerId", value: nextId, required: true })}
            ${UI.field({ label: "Customer Name", name: "name", value: existing?.name, required: true })}
            ${UI.field({ label: "Phone", name: "phone", value: existing?.phone, required: true })}
            ${UI.field({ label: "Email", name: "email", type: "email", value: existing?.email })}
            ${UI.field({ label: "Address", name: "address", type: "textarea", value: existing?.address, full: true })}
            ${UI.field({ label: "Area", name: "area", value: existing?.area, required: true })}
            ${UI.field({ label: "Subscription Type", name: "subscriptionType", type: "select", value: existing?.subscriptionType, options: SUBSCRIPTION_TYPES, required: true })}
            ${UI.field({ label: "Start Date", name: "startDate", type: "date", value: existing?.startDate || Utils.todayISO(), required: true })}
            ${UI.field({ label: "End Date", name: "endDate", type: "date", value: existing?.endDate, required: true })}
            ${UI.field({ label: "Status", name: "status", type: "select", value: existing?.status || "Active", options: STATUS_OPTIONS, required: true })}
          </div>
        </form>`;
      },
      footer: [
        { text: "Cancel", variant: "secondary", onClick: (e, { close }) => close() },
        {
          text: isEdit ? "Save Changes" : "Add Customer", variant: "primary",
          onClick: (e, { close, body }) => {
            const form = body.querySelector("#custForm");
            if (!form.reportValidity()) return;
            const data = UI.formToObject(form);
            if (isEdit) {
              Store.update("customers", existing.id, data);
              UI.toast("Customer updated");
            } else {
              Store.add("customers", data);
              Store.logActivity("customer", `New customer ${data.name} subscribed (${data.subscriptionType})`);
              UI.toast("Customer added");
            }
            close();
            table.render();
          },
        },
      ],
    });
  }

  function deleteCustomer(id) {
    const c = Store.getById("customers", id);
    if (!c) return;
    UI.confirmAction({
      title: "Delete Customer",
      message: `Are you sure you want to delete this record? "${c.name}" (${c.customerId}) will be permanently removed.`,
      onConfirm() {
        Store.remove("customers", id);
        UI.toast("Customer deleted", "info");
        table.render();
      },
    });
  }

  return { render, SUBSCRIPTION_TYPES, STATUS_OPTIONS };
})();

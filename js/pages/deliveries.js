/* ==========================================================================
   Delivery Management Page
   ========================================================================== */

const DeliveriesPage = (() => {
  const STATUS_OPTIONS = ["Pending", "Assigned", "Out for Delivery", "Delivered", "Cancelled"];

  let state = { search: "", status: "", staffId: "", dateFrom: "", dateTo: "" };
  let table = null;

  function staffName(staffId) {
    const s = Store.getAll("deliveryStaff").find((x) => x.deliveryStaffId === staffId);
    return s ? s.name : "Unassigned";
  }

  function getFiltered() {
    const all = Store.getAll("deliveries");
    return all.filter((d) =>
      Utils.matchesSearch(d, ["deliveryId", "customerName", "customerPhone", "deliveryAddress"], state.search) &&
      (!state.status || d.status === state.status) &&
      (!state.staffId || d.assignedStaffId === state.staffId) &&
      Utils.inDateRange(d.orderDate, state.dateFrom, state.dateTo)
    ).sort((a, b) => (b.orderDate || "").localeCompare(a.orderDate || ""));
  }

  function render(container) {
    const staffList = Store.getAll("deliveryStaff");
    const active = UI.hasActiveFilters(state);
    container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-row">
          ${UI.searchInput({ id: "dlSearch", placeholder: "delivery ID, customer...", value: state.search })}
          ${UI.filterSelect({ id: "dlStatusFilter", label: "Status", value: state.status, options: STATUS_OPTIONS, allLabel: "All" })}
          ${UI.filterSelect({ id: "dlStaffFilter", label: "Staff", value: state.staffId, options: staffList.map((s) => ({ value: s.deliveryStaffId, label: s.name })), allLabel: "All" })}
          ${UI.dateRange({ fromId: "dlDateFrom", toId: "dlDateTo", fromValue: state.dateFrom, toValue: state.dateTo })}
          <div class="toolbar-actions">
            ${UI.clearFiltersBtn("dlClearFilters", active)}
            <button class="btn btn-secondary" id="dlExportBtn">Export Excel</button>
            <button class="btn btn-primary" id="dlAddBtn">+ Create Delivery</button>
          </div>
        </div>
        ${UI.filterMeta()}
      </div>
      <div id="dlTableContainer"></div>
    `;

    const tableContainer = container.querySelector("#dlTableContainer");
    table = UI.createDataTable(tableContainer, {
      pageSize: 8,
      emptyMessage: "No deliveries found.",
      getData: getFiltered,
      columns: [
        { label: "Delivery ID", key: "deliveryId" },
        { label: "Customer", render: (r) => `<strong>${Utils.escapeHtml(r.customerName)}</strong>` },
        { label: "Phone", key: "customerPhone" },
        { label: "Address", render: (r) => `<span class="cell-muted">${Utils.escapeHtml(r.deliveryAddress)}</span>` },
        { label: "Assigned Staff", render: (r) => Utils.escapeHtml(staffName(r.assignedStaffId)) },
        { label: "Order Date", render: (r) => Utils.formatDate(r.orderDate) },
        { label: "Delivery Time", key: "deliveryTime" },
        { label: "Status", render: (r) => UI.badge(r.status) },
        {
          label: "Actions", render: (r) => `
          <div class="actions-cell">
            <button class="btn btn-secondary btn-sm" data-status="${r.id}" title="Update Status">Status</button>
            <button class="btn btn-secondary btn-sm btn-icon" data-edit="${r.id}" title="Edit">✎</button>
            <button class="btn btn-secondary btn-sm btn-icon" data-delete="${r.id}" title="Delete">🗑</button>
          </div>`,
        },
      ],
      afterRender(el) {
        el.querySelectorAll("[data-status]").forEach((b) => b.addEventListener("click", () => openStatusForm(b.dataset.status)));
        el.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openForm(Store.getById("deliveries", b.dataset.edit))));
        el.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", () => deleteDelivery(b.dataset.delete)));
      },
    });
    table.render();

    const labels = { search: "Search", status: "Status", staffId: "Staff", dateFrom: "From", dateTo: "To" };
    const refreshFilters = () => {
      const chipState = { ...state };
      if (state.staffId) {
        const s = Store.getAll("deliveryStaff").find((x) => x.deliveryStaffId === state.staffId);
        chipState.staffId = s ? s.name : state.staffId;
      }
      UI.updateFilterChrome(container, {
        state: chipState, labels, clearBtnId: "dlClearFilters", searchId: "dlSearch",
        resultCount: getFiltered().length, totalCount: Store.getAll("deliveries").length,
        onChipClear: (key) => { state[key] = ""; render(container); },
      });
    };
    container.querySelector("#dlSearch").addEventListener("input", Utils.debounce((e) => { state.search = e.target.value; table.resetPage(); table.render(); refreshFilters(); }, 200));
    UI.bindSearchClear(container, "dlSearch", () => { state.search = ""; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#dlStatusFilter").addEventListener("change", (e) => { state.status = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#dlStaffFilter").addEventListener("change", (e) => { state.staffId = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#dlDateFrom").addEventListener("change", (e) => { state.dateFrom = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#dlDateTo").addEventListener("change", (e) => { state.dateTo = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#dlClearFilters").addEventListener("click", () => {
      state = { search: "", status: "", staffId: "", dateFrom: "", dateTo: "" };
      render(container);
    });
    container.querySelector("#dlAddBtn").addEventListener("click", () => openForm(null));
    container.querySelector("#dlExportBtn").addEventListener("click", exportExcel);
    refreshFilters();
  }

  function exportExcel() {
    const rows = getFiltered().map((d) => ({
      "Delivery ID": d.deliveryId, "Customer Name": d.customerName, "Customer Phone": d.customerPhone,
      "Delivery Address": d.deliveryAddress, "Assigned Staff": staffName(d.assignedStaffId),
      "Order Date": Utils.formatDate(d.orderDate), "Delivery Time": d.deliveryTime, "Status": d.status, "Notes": d.notes || "",
    }));
    Utils.downloadWorkbook({ Deliveries: rows }, "Deliveries.xlsx");
    UI.toast("Deliveries exported to Excel");
  }

  function openForm(existing, presetStaffId) {
    const isEdit = !!existing;
    const staffList = Store.getAll("deliveryStaff");
    const nextId = isEdit ? existing.deliveryId : Utils.nextSequentialId(Store.getAll("deliveries"), "DLV", "deliveryId");

    UI.openModal({
      title: isEdit ? "Edit Delivery" : "Create Delivery",
      size: "lg",
      render(body) {
        body.innerHTML = `<form id="dlForm">
          <div class="form-grid">
            ${UI.field({ label: "Delivery ID", name: "deliveryId", value: nextId, required: true })}
            ${UI.field({ label: "Customer Name", name: "customerName", value: existing?.customerName, required: true })}
            ${UI.field({ label: "Customer Phone", name: "customerPhone", value: existing?.customerPhone, required: true })}
            ${UI.field({ label: "Delivery Address", name: "deliveryAddress", type: "textarea", value: existing?.deliveryAddress, required: true, full: true })}
            ${UI.field({ label: "Assigned Delivery Staff", name: "assignedStaffId", type: "select", value: existing?.assignedStaffId || presetStaffId || "", options: [{ value: "", label: "-- Unassigned --" }, ...staffList.map((s) => ({ value: s.deliveryStaffId, label: s.name }))] })}
            ${UI.field({ label: "Order Date", name: "orderDate", type: "date", value: existing?.orderDate || Utils.todayISO(), required: true })}
            ${UI.field({ label: "Delivery Time", name: "deliveryTime", type: "time", value: existing?.deliveryTime, required: true })}
            ${UI.field({ label: "Status", name: "status", type: "select", value: existing?.status || "Pending", options: STATUS_OPTIONS, required: true })}
            ${UI.field({ label: "Notes", name: "notes", type: "textarea", value: existing?.notes, full: true })}
          </div>
        </form>`;
      },
      footer: [
        { text: "Cancel", variant: "secondary", onClick: (e, { close }) => close() },
        {
          text: isEdit ? "Save Changes" : "Create Delivery", variant: "primary",
          onClick: (e, { close, body }) => {
            const form = body.querySelector("#dlForm");
            if (!form.reportValidity()) return;
            const data = UI.formToObject(form);
            let status = data.status;
            if (data.assignedStaffId && status === "Pending") status = "Assigned";
            const record = {
              deliveryId: data.deliveryId, customerName: data.customerName, customerPhone: data.customerPhone,
              deliveryAddress: data.deliveryAddress, assignedStaffId: data.assignedStaffId || "",
              orderDate: data.orderDate, deliveryTime: data.deliveryTime, status, notes: data.notes,
            };
            if (isEdit) {
              Store.update("deliveries", existing.id, record);
              Store.logActivity("delivery", `Delivery ${record.deliveryId} updated`);
              UI.toast("Delivery updated");
            } else {
              Store.add("deliveries", record);
              Store.logActivity("delivery", `New delivery ${record.deliveryId} created for ${record.customerName}`);
              UI.toast("Delivery created");
            }
            close();
            table.render();
          },
        },
      ],
    });
  }

  function openStatusForm(id) {
    const d = Store.getById("deliveries", id);
    if (!d) return;
    const staffList = Store.getAll("deliveryStaff");
    UI.openModal({
      title: `Update Status - ${d.deliveryId}`,
      size: "sm",
      render(body) {
        body.innerHTML = `<form id="statusForm">
          <div class="form-grid">
            ${UI.field({ label: "Assigned Delivery Staff", name: "assignedStaffId", type: "select", value: d.assignedStaffId, full: true, options: [{ value: "", label: "-- Unassigned --" }, ...staffList.map((s) => ({ value: s.deliveryStaffId, label: s.name }))] })}
            ${UI.field({ label: "Delivery Status", name: "status", type: "select", value: d.status, required: true, full: true, options: STATUS_OPTIONS })}
          </div>
        </form>`;
      },
      footer: [
        { text: "Cancel", variant: "secondary", onClick: (e, { close }) => close() },
        {
          text: "Update", variant: "primary",
          onClick: (e, { close, body }) => {
            const form = body.querySelector("#statusForm");
            const data = UI.formToObject(form);
            Store.update("deliveries", id, { status: data.status, assignedStaffId: data.assignedStaffId || "" });
            if (data.status === "Delivered") {
              Store.logActivity("delivery", `Delivery ${d.deliveryId} marked as Delivered`);
            } else {
              Store.logActivity("delivery", `Delivery ${d.deliveryId} status changed to ${data.status}`);
            }
            UI.toast("Delivery status updated");
            close();
            table.render();
          },
        },
      ],
    });
  }

  function deleteDelivery(id) {
    const d = Store.getById("deliveries", id);
    if (!d) return;
    UI.confirmAction({
      title: "Delete Delivery",
      message: `Are you sure you want to delete this record? Delivery ${d.deliveryId} will be permanently removed.`,
      onConfirm() {
        Store.remove("deliveries", id);
        UI.toast("Delivery deleted", "info");
        table.render();
      },
    });
  }

  return { render, openCreateForm: (presetStaffId) => openForm(null, presetStaffId), STATUS_OPTIONS };
})();

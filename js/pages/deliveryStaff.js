/* ==========================================================================
   Delivery Staff Management Page
   ========================================================================== */

const DeliveryStaffPage = (() => {
  const VEHICLE_TYPES = ["Bike", "Scooter", "Van", "Cycle", "Car"];
  const STATUS_OPTIONS = ["Available", "On Delivery", "Offline"];

  let state = { search: "", status: "" };
  let table = null;

  function getFiltered() {
    const all = Store.getAll("deliveryStaff");
    return all.filter((s) =>
      Utils.matchesSearch(s, ["deliveryStaffId", "name", "phone", "assignedArea"], state.search) &&
      (!state.status || s.status === state.status)
    ).sort((a, b) => a.deliveryStaffId.localeCompare(b.deliveryStaffId));
  }

  function render(container) {
    const active = UI.hasActiveFilters(state);
    container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-row">
          ${UI.searchInput({ id: "dsSearch", placeholder: "name, ID, phone...", value: state.search })}
          ${UI.filterSelect({ id: "dsStatusFilter", label: "Status", value: state.status, options: STATUS_OPTIONS, allLabel: "All" })}
          <div class="toolbar-actions">
            ${UI.clearFiltersBtn("dsClearFilters", active)}
            <button class="btn btn-secondary" id="dsExportBtn">Export Excel</button>
            <button class="btn btn-primary" id="dsAddBtn">+ Add Delivery Staff</button>
          </div>
        </div>
        ${UI.filterMeta()}
      </div>
      <div id="dsTableContainer"></div>
    `;

    const tableContainer = container.querySelector("#dsTableContainer");
    table = UI.createDataTable(tableContainer, {
      pageSize: 8,
      emptyMessage: "No delivery staff found.",
      getData: getFiltered,
      columns: [
        { label: "Staff ID", key: "deliveryStaffId" },
        { label: "Name", render: (r) => `<strong>${Utils.escapeHtml(r.name)}</strong>` },
        { label: "Phone", key: "phone" },
        { label: "Vehicle No.", key: "vehicleNumber" },
        { label: "Vehicle Type", key: "vehicleType" },
        { label: "Assigned Area", key: "assignedArea" },
        { label: "Current Location", render: (r) => Utils.escapeHtml(r.currentLocation?.name || "-") },
        { label: "Status", render: (r) => UI.badge(r.status) },
        { label: "Last Updated", render: (r) => Utils.timeAgo(r.lastUpdated) },
        {
          label: "Actions", render: (r) => `
          <div class="actions-cell">
            <button class="btn btn-secondary btn-sm" data-assign="${r.deliveryStaffId}" title="Assign Delivery">Assign</button>
            <button class="btn btn-secondary btn-sm" data-location="${r.id}" title="Update Location">📍</button>
            <button class="btn btn-secondary btn-sm btn-icon" data-edit="${r.id}" title="Edit">✎</button>
            <button class="btn btn-secondary btn-sm btn-icon" data-delete="${r.id}" title="Delete">🗑</button>
          </div>`,
        },
      ],
      afterRender(el) {
        el.querySelectorAll("[data-assign]").forEach((b) => b.addEventListener("click", () => DeliveriesPage.openCreateForm(b.dataset.assign)));
        el.querySelectorAll("[data-location]").forEach((b) => b.addEventListener("click", () => openLocationForm(b.dataset.location)));
        el.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openForm(Store.getById("deliveryStaff", b.dataset.edit))));
        el.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", () => deleteStaff(b.dataset.delete)));
      },
    });
    table.render();

    const labels = { search: "Search", status: "Status" };
    const refreshFilters = () => {
      UI.updateFilterChrome(container, {
        state, labels, clearBtnId: "dsClearFilters", searchId: "dsSearch",
        resultCount: getFiltered().length, totalCount: Store.getAll("deliveryStaff").length,
        onChipClear: (key) => { state[key] = ""; render(container); },
      });
    };
    container.querySelector("#dsSearch").addEventListener("input", Utils.debounce((e) => { state.search = e.target.value; table.resetPage(); table.render(); refreshFilters(); }, 200));
    UI.bindSearchClear(container, "dsSearch", () => { state.search = ""; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#dsStatusFilter").addEventListener("change", (e) => { state.status = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#dsClearFilters").addEventListener("click", () => {
      state = { search: "", status: "" };
      render(container);
    });
    container.querySelector("#dsAddBtn").addEventListener("click", () => openForm(null));
    container.querySelector("#dsExportBtn").addEventListener("click", exportExcel);
    refreshFilters();
  }

  function exportExcel() {
    const rows = getFiltered().map((s) => ({
      "Staff ID": s.deliveryStaffId, "Name": s.name, "Phone": s.phone, "Vehicle Number": s.vehicleNumber,
      "Vehicle Type": s.vehicleType, "Assigned Area": s.assignedArea, "Location": s.currentLocation?.name || "",
      "Latitude": s.currentLocation?.lat ?? "", "Longitude": s.currentLocation?.lng ?? "",
      "Status": s.status, "Last Updated": Utils.formatDateTime(s.lastUpdated),
    }));
    Utils.downloadWorkbook({ "Delivery Staff": rows }, `DeliveryStaff_${Utils.fileTimestamp()}.xlsx`);
    UI.toast("Delivery staff list exported to Excel");
  }

  function openForm(existing, onDone) {
    const isEdit = !!existing;
    const nextId = isEdit ? existing.deliveryStaffId : Utils.nextSequentialId(Store.getAll("deliveryStaff"), "DS", "deliveryStaffId");

    UI.openModal({
      title: isEdit ? "Edit Delivery Staff" : "Add Delivery Staff",
      size: "lg",
      render(body) {
        body.innerHTML = `<form id="dsForm">
          <div class="form-grid">
            ${UI.field({ label: "Staff ID", name: "deliveryStaffId", value: nextId, required: true })}
            ${UI.field({ label: "Staff Name", name: "name", value: existing?.name, required: true })}
            ${UI.field({ label: "Phone", name: "phone", value: existing?.phone, required: true })}
            ${UI.field({ label: "Vehicle Number", name: "vehicleNumber", value: existing?.vehicleNumber, required: true })}
            ${UI.field({ label: "Vehicle Type", name: "vehicleType", type: "select", value: existing?.vehicleType, options: VEHICLE_TYPES, required: true })}
            ${UI.field({ label: "Assigned Area", name: "assignedArea", value: existing?.assignedArea, required: true })}
            ${UI.field({ label: "Status", name: "status", type: "select", value: existing?.status || "Available", options: STATUS_OPTIONS, required: true })}
            ${UI.field({ label: "Location Name", name: "locationName", value: existing?.currentLocation?.name, hint: "e.g. Anna Nagar Tower" })}
            ${UI.field({ label: "Latitude", name: "lat", type: "number", step: "0.0001", value: existing?.currentLocation?.lat })}
            ${UI.field({ label: "Longitude", name: "lng", type: "number", step: "0.0001", value: existing?.currentLocation?.lng })}
          </div>
        </form>`;
      },
      footer: [
        { text: "Cancel", variant: "secondary", onClick: (e, { close }) => close() },
        {
          text: isEdit ? "Save Changes" : "Add Staff", variant: "primary",
          onClick: (e, { close, body }) => {
            const form = body.querySelector("#dsForm");
            if (!form.reportValidity()) return;
            const data = UI.formToObject(form);
            const record = {
              deliveryStaffId: data.deliveryStaffId, name: data.name, phone: data.phone,
              vehicleNumber: data.vehicleNumber, vehicleType: data.vehicleType, assignedArea: data.assignedArea,
              status: data.status,
              currentLocation: { name: data.locationName || "", lat: Number(data.lat) || 0, lng: Number(data.lng) || 0 },
              lastUpdated: new Date().toISOString(),
            };
            if (isEdit) {
              Store.update("deliveryStaff", existing.id, record);
              Store.logActivity("delivery", `Delivery staff ${data.name} details updated`);
              UI.toast("Delivery staff updated");
            } else {
              Store.add("deliveryStaff", record);
              Store.logActivity("delivery", `New delivery staff ${data.name} added`);
              UI.toast("Delivery staff added");
            }
            close();
            if (table) table.render();
            if (onDone) onDone();
          },
        },
      ],
    });
  }

  function openLocationForm(id, onDone) {
    const staff = Store.getById("deliveryStaff", id);
    if (!staff) return;
    UI.openModal({
      title: `Update Location - ${staff.name}`,
      size: "sm",
      render(body) {
        body.innerHTML = `<form id="locForm">
          <div class="form-grid">
            ${UI.field({ label: "Location Name", name: "locationName", value: staff.currentLocation?.name, required: true, full: true })}
            ${UI.field({ label: "Latitude", name: "lat", type: "number", step: "0.0001", value: staff.currentLocation?.lat })}
            ${UI.field({ label: "Longitude", name: "lng", type: "number", step: "0.0001", value: staff.currentLocation?.lng })}
            ${UI.field({ label: "Availability Status", name: "status", type: "select", value: staff.status, options: STATUS_OPTIONS, required: true, full: true })}
          </div>
        </form>`;
      },
      footer: [
        { text: "Cancel", variant: "secondary", onClick: (e, { close }) => close() },
        {
          text: "Update Location", variant: "primary",
          onClick: (e, { close, body }) => {
            const form = body.querySelector("#locForm");
            if (!form.reportValidity()) return;
            const data = UI.formToObject(form);
            Store.update("deliveryStaff", id, {
              currentLocation: { name: data.locationName, lat: Number(data.lat) || 0, lng: Number(data.lng) || 0 },
              status: data.status,
              lastUpdated: new Date().toISOString(),
            });
            Store.logActivity("location", `${staff.name} updated location to ${data.locationName}`);
            UI.toast("Location updated");
            close();
            if (table) table.render();
            if (onDone) onDone();
          },
        },
      ],
    });
  }

  function deleteStaff(id) {
    const s = Store.getById("deliveryStaff", id);
    if (!s) return;
    UI.confirmAction({
      title: "Delete Delivery Staff",
      message: `Are you sure you want to delete this record? "${s.name}" (${s.deliveryStaffId}) will be permanently removed.`,
      onConfirm() {
        Store.remove("deliveryStaff", id);
        UI.toast("Delivery staff deleted", "info");
        table.render();
      },
    });
  }

  return { render, VEHICLE_TYPES, STATUS_OPTIONS, openForm, openLocationForm, refreshTable: () => table && table.render() };
})();

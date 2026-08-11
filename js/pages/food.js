/* ==========================================================================
   Mess / Food Management Page
   ========================================================================== */

const FoodPage = (() => {
  const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snacks", "Drinks"];
  const STATUS_OPTIONS = ["Available", "Unavailable"];

  let state = { search: "", category: "", status: "" };
  let table = null;

  function getFiltered() {
    const all = Store.getAll("food");
    return all.filter((f) =>
      Utils.matchesSearch(f, ["foodId", "name"], state.search) &&
      (!state.category || f.category === state.category) &&
      (!state.status || f.status === state.status)
    ).sort((a, b) => a.foodId.localeCompare(b.foodId));
  }

  function render(container) {
    const active = UI.hasActiveFilters(state);
    container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-row">
          ${UI.searchInput({ id: "foodSearch", placeholder: "name or ID...", value: state.search })}
          ${UI.filterSelect({ id: "foodCatFilter", label: "Category", value: state.category, options: CATEGORIES, allLabel: "All" })}
          ${UI.filterSelect({ id: "foodStatusFilter", label: "Status", value: state.status, options: STATUS_OPTIONS, allLabel: "All" })}
          <div class="toolbar-actions">
            ${UI.clearFiltersBtn("foodClearFilters", active)}
            <button class="btn btn-secondary" id="foodExportBtn">Export Excel</button>
            <button class="btn btn-primary" id="foodAddBtn">+ Add Food Item</button>
          </div>
        </div>
        ${UI.filterMeta()}
      </div>
      <div id="foodTableContainer"></div>
    `;

    const tableContainer = container.querySelector("#foodTableContainer");
    table = UI.createDataTable(tableContainer, {
      pageSize: 8,
      emptyMessage: "No food items found.",
      getData: getFiltered,
      columns: [
        { label: "Food ID", key: "foodId" },
        { label: "Item Name", render: (r) => `<strong>${Utils.escapeHtml(r.name)}</strong>` },
        { label: "Category", key: "category" },
        { label: "Price", render: (r) => Utils.formatCurrency(r.price) },
        { label: "Available Qty", key: "quantity" },
        { label: "Status", render: (r) => UI.badge(r.status) },
        {
          label: "Actions", render: (r) => `
          <div class="actions-cell">
            <button class="btn btn-secondary btn-sm btn-icon" data-edit="${r.id}" title="Edit">✎</button>
            <button class="btn btn-secondary btn-sm btn-icon" data-delete="${r.id}" title="Delete">🗑</button>
          </div>`,
        },
      ],
      afterRender(el) {
        el.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openForm(Store.getById("food", b.dataset.edit))));
        el.querySelectorAll("[data-delete]").forEach((b) => b.addEventListener("click", () => deleteFood(b.dataset.delete)));
      },
    });
    table.render();

    const labels = { search: "Search", category: "Category", status: "Status" };
    const refreshFilters = () => {
      UI.updateFilterChrome(container, {
        state, labels, clearBtnId: "foodClearFilters", searchId: "foodSearch",
        resultCount: getFiltered().length, totalCount: Store.getAll("food").length,
        onChipClear: (key) => { state[key] = ""; render(container); },
      });
    };
    container.querySelector("#foodSearch").addEventListener("input", Utils.debounce((e) => { state.search = e.target.value; table.resetPage(); table.render(); refreshFilters(); }, 200));
    UI.bindSearchClear(container, "foodSearch", () => { state.search = ""; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#foodCatFilter").addEventListener("change", (e) => { state.category = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#foodStatusFilter").addEventListener("change", (e) => { state.status = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    container.querySelector("#foodClearFilters").addEventListener("click", () => {
      state = { search: "", category: "", status: "" };
      render(container);
    });
    container.querySelector("#foodAddBtn").addEventListener("click", () => openForm(null));
    container.querySelector("#foodExportBtn").addEventListener("click", exportExcel);
    refreshFilters();
  }

  function exportExcel() {
    const rows = getFiltered().map((f) => ({
      "Food ID": f.foodId, "Item Name": f.name, "Category": f.category, "Price": f.price,
      "Available Quantity": f.quantity, "Status": f.status,
    }));
    Utils.downloadWorkbook({ "Food Menu": rows }, `FoodMenu_${Utils.fileTimestamp()}.xlsx`);
    UI.toast("Food menu exported to Excel");
  }

  function openForm(existing) {
    const isEdit = !!existing;
    const nextId = isEdit ? existing.foodId : Utils.nextSequentialId(Store.getAll("food"), "FOOD", "foodId");

    UI.openModal({
      title: isEdit ? "Edit Food Item" : "Add Food Item",
      render(body) {
        body.innerHTML = `<form id="foodForm">
          <div class="form-grid">
            ${UI.field({ label: "Food ID", name: "foodId", value: nextId, required: true })}
            ${UI.field({ label: "Item Name", name: "name", value: existing?.name, required: true })}
            ${UI.field({ label: "Category", name: "category", type: "select", value: existing?.category, options: CATEGORIES, required: true })}
            ${UI.field({ label: "Price", name: "price", type: "number", value: existing?.price, required: true, min: 0 })}
            ${UI.field({ label: "Available Quantity", name: "quantity", type: "number", value: existing?.quantity, required: true, min: 0 })}
            ${UI.field({ label: "Status", name: "status", type: "select", value: existing?.status || "Available", options: STATUS_OPTIONS, required: true })}
          </div>
        </form>`;
      },
      footer: [
        { text: "Cancel", variant: "secondary", onClick: (e, { close }) => close() },
        {
          text: isEdit ? "Save Changes" : "Add Item", variant: "primary",
          onClick: (e, { close, body }) => {
            const form = body.querySelector("#foodForm");
            if (!form.reportValidity()) return;
            const data = UI.formToObject(form);
            data.price = Number(data.price) || 0;
            data.quantity = Number(data.quantity) || 0;
            if (isEdit) {
              Store.update("food", existing.id, data);
              UI.toast("Food item updated");
            } else {
              Store.add("food", data);
              UI.toast("Food item added");
            }
            close();
            table.render();
          },
        },
      ],
    });
  }

  function deleteFood(id) {
    const f = Store.getById("food", id);
    if (!f) return;
    UI.confirmAction({
      title: "Delete Food Item",
      message: `Are you sure you want to delete this record? "${f.name}" will be permanently removed.`,
      onConfirm() {
        Store.remove("food", id);
        UI.toast("Food item deleted", "info");
        table.render();
      },
    });
  }

  return { render, CATEGORIES, STATUS_OPTIONS };
})();

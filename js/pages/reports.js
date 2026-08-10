/* ==========================================================================
   Reports Page — Employee, Salary, Delivery, Delivery Staff, Expense,
   Customer, Food/Menu reports with search, filters, summary & export.
   ========================================================================== */

const ReportsPage = (() => {
  let activeReport = "employee";
  let state = {}; // per-report filter state, keyed by report key
  let table = null;

  function staffName(staffId) {
    const s = Store.getAll("deliveryStaff").find((x) => x.deliveryStaffId === staffId);
    return s ? s.name : "Unassigned";
  }

  function getState(key) {
    if (!state[key]) state[key] = { search: "", dateFrom: "", dateTo: "", filterA: "" };
    return state[key];
  }

  const REPORTS = {
    employee: {
      label: "Employee Report",
      dateField: "joiningDate",
      filterAOptions: () => EmployeesPage.DEPARTMENTS,
      filterALabel: "Department",
      getData(st) {
        return Store.getAll("employees").filter((e) =>
          Utils.matchesSearch(e, ["employeeId", "name", "phone", "email"], st.search) &&
          Utils.inDateRange(e.joiningDate, st.dateFrom, st.dateTo) &&
          (!st.filterA || e.department === st.filterA)
        );
      },
      columns: [
        { label: "Employee ID", key: "employeeId" },
        { label: "Name", key: "name" },
        { label: "Designation", key: "designation" },
        { label: "Department", key: "department" },
        { label: "Joining Date", render: (r) => Utils.formatDate(r.joiningDate) },
        { label: "Salary", render: (r) => Utils.formatCurrency(r.salary) },
        { label: "Status", render: (r) => UI.badge(r.status) },
      ],
      summary(rows) {
        return [
          { label: "Total Employees", value: rows.length },
          { label: "Active", value: rows.filter((r) => r.status === "Active").length },
          { label: "Inactive", value: rows.filter((r) => r.status === "Inactive").length },
          { label: "Total Payroll", value: Utils.formatCurrency(Utils.sumBy(rows.filter((r) => r.status === "Active"), "salary")) },
        ];
      },
      excelRow: (e) => ({ "Employee ID": e.employeeId, "Name": e.name, "Phone": e.phone, "Designation": e.designation, "Department": e.department, "Joining Date": Utils.formatDate(e.joiningDate), "Salary": e.salary, "Status": e.status }),
    },
    salary: {
      label: "Salary Report",
      dateField: "paymentDate",
      filterAOptions: () => ["Paid", "Pending"],
      filterALabel: "Payment Status",
      getData(st) {
        return Store.getAll("salaries").filter((s) =>
          Utils.matchesSearch(s, ["salaryId", "employeeId", "employeeName"], st.search) &&
          Utils.inDateRange(s.paymentDate, st.dateFrom, st.dateTo) &&
          (!st.filterA || s.paymentStatus === st.filterA)
        );
      },
      columns: [
        { label: "Salary ID", key: "salaryId" },
        { label: "Employee", key: "employeeName" },
        { label: "Month", render: (r) => Utils.monthLabel(r.salaryMonth) },
        { label: "Basic", render: (r) => Utils.formatCurrency(r.basicSalary) },
        { label: "Net Salary", render: (r) => Utils.formatCurrency(r.netSalary) },
        { label: "Status", render: (r) => UI.badge(r.paymentStatus) },
      ],
      summary(rows) {
        return [
          { label: "Total Records", value: rows.length },
          { label: "Total Salary", value: Utils.formatCurrency(Utils.sumBy(rows, "netSalary")) },
          { label: "Paid", value: Utils.formatCurrency(Utils.sumBy(rows.filter((r) => r.paymentStatus === "Paid"), "netSalary")) },
          { label: "Pending", value: Utils.formatCurrency(Utils.sumBy(rows.filter((r) => r.paymentStatus === "Pending"), "netSalary")) },
        ];
      },
      excelRow: (s) => ({ "Salary ID": s.salaryId, "Employee ID": s.employeeId, "Employee Name": s.employeeName, "Basic Salary": s.basicSalary, "Allowance": s.allowance, "Deduction": s.deduction, "Net Salary": s.netSalary, "Month": Utils.monthLabel(s.salaryMonth), "Payment Status": s.paymentStatus }),
    },
    delivery: {
      label: "Delivery Report",
      dateField: "orderDate",
      filterAOptions: () => DeliveriesPage.STATUS_OPTIONS,
      filterALabel: "Status",
      getData(st) {
        return Store.getAll("deliveries").filter((d) =>
          Utils.matchesSearch(d, ["deliveryId", "customerName", "customerPhone"], st.search) &&
          Utils.inDateRange(d.orderDate, st.dateFrom, st.dateTo) &&
          (!st.filterA || d.status === st.filterA)
        );
      },
      columns: [
        { label: "Delivery ID", key: "deliveryId" },
        { label: "Customer", key: "customerName" },
        { label: "Staff", render: (r) => staffName(r.assignedStaffId) },
        { label: "Order Date", render: (r) => Utils.formatDate(r.orderDate) },
        { label: "Status", render: (r) => UI.badge(r.status) },
      ],
      summary(rows) {
        return [
          { label: "Total Deliveries", value: rows.length },
          { label: "Delivered", value: rows.filter((r) => r.status === "Delivered").length },
          { label: "Pending/In-progress", value: rows.filter((r) => ["Pending", "Assigned", "Out for Delivery"].includes(r.status)).length },
          { label: "Cancelled", value: rows.filter((r) => r.status === "Cancelled").length },
        ];
      },
      excelRow: (d) => ({ "Delivery ID": d.deliveryId, "Customer Name": d.customerName, "Customer Phone": d.customerPhone, "Address": d.deliveryAddress, "Assigned Staff": staffName(d.assignedStaffId), "Order Date": Utils.formatDate(d.orderDate), "Status": d.status }),
    },
    deliveryStaff: {
      label: "Delivery Staff Report",
      dateField: null,
      filterAOptions: () => DeliveryStaffPage.STATUS_OPTIONS,
      filterALabel: "Status",
      getData(st) {
        return Store.getAll("deliveryStaff").filter((s) =>
          Utils.matchesSearch(s, ["deliveryStaffId", "name", "phone", "assignedArea"], st.search) &&
          (!st.filterA || s.status === st.filterA)
        );
      },
      columns: [
        { label: "Staff ID", key: "deliveryStaffId" },
        { label: "Name", key: "name" },
        { label: "Vehicle", key: "vehicleType" },
        { label: "Area", key: "assignedArea" },
        { label: "Status", render: (r) => UI.badge(r.status) },
        { label: "Last Updated", render: (r) => Utils.timeAgo(r.lastUpdated) },
      ],
      summary(rows) {
        return [
          { label: "Total Staff", value: rows.length },
          { label: "Available", value: rows.filter((r) => r.status === "Available").length },
          { label: "On Delivery", value: rows.filter((r) => r.status === "On Delivery").length },
          { label: "Offline", value: rows.filter((r) => r.status === "Offline").length },
        ];
      },
      excelRow: (s) => ({ "Staff ID": s.deliveryStaffId, "Name": s.name, "Phone": s.phone, "Vehicle Number": s.vehicleNumber, "Vehicle Type": s.vehicleType, "Assigned Area": s.assignedArea, "Status": s.status, "Last Updated": Utils.formatDateTime(s.lastUpdated) }),
    },
    expense: {
      label: "Expense Report",
      dateField: "date",
      filterAOptions: () => ExpensesPage.CATEGORIES,
      filterALabel: "Category",
      getData(st) {
        return Store.getAll("expenses").filter((x) =>
          Utils.matchesSearch(x, ["expenseId", "description", "paidBy"], st.search) &&
          Utils.inDateRange(x.date, st.dateFrom, st.dateTo) &&
          (!st.filterA || x.category === st.filterA)
        );
      },
      columns: [
        { label: "Expense ID", key: "expenseId" },
        { label: "Date", render: (r) => Utils.formatDate(r.date) },
        { label: "Category", key: "category" },
        { label: "Description", key: "description" },
        { label: "Amount", render: (r) => Utils.formatCurrency(r.amount) },
        { label: "Paid By", key: "paidBy" },
      ],
      summary(rows) {
        return [
          { label: "Total Records", value: rows.length },
          { label: "Total Amount", value: Utils.formatCurrency(Utils.sumBy(rows, "amount")) },
          { label: "Highest Category", value: topCategory(rows) },
          { label: "Avg. Expense", value: Utils.formatCurrency(rows.length ? Utils.sumBy(rows, "amount") / rows.length : 0) },
        ];
      },
      excelRow: (x) => ({ "Expense ID": x.expenseId, "Date": Utils.formatDate(x.date), "Category": x.category, "Description": x.description, "Amount": x.amount, "Paid By": x.paidBy, "Payment Method": x.paymentMethod }),
    },
    customer: {
      label: "Customer Report",
      dateField: "startDate",
      filterAOptions: () => CustomersPage.STATUS_OPTIONS,
      filterALabel: "Status",
      getData(st) {
        return Store.getAll("customers").filter((c) =>
          Utils.matchesSearch(c, ["customerId", "name", "phone", "area"], st.search) &&
          Utils.inDateRange(c.startDate, st.dateFrom, st.dateTo) &&
          (!st.filterA || c.status === st.filterA)
        );
      },
      columns: [
        { label: "Customer ID", key: "customerId" },
        { label: "Name", key: "name" },
        { label: "Area", key: "area" },
        { label: "Subscription", key: "subscriptionType" },
        { label: "Status", render: (r) => UI.badge(r.status) },
      ],
      summary(rows) {
        return [
          { label: "Total Customers", value: rows.length },
          { label: "Active", value: rows.filter((r) => r.status === "Active").length },
          { label: "Expired", value: rows.filter((r) => r.status === "Expired").length },
          { label: "Cancelled", value: rows.filter((r) => r.status === "Cancelled").length },
        ];
      },
      excelRow: (c) => ({ "Customer ID": c.customerId, "Name": c.name, "Phone": c.phone, "Area": c.area, "Subscription Type": c.subscriptionType, "Start Date": Utils.formatDate(c.startDate), "End Date": Utils.formatDate(c.endDate), "Status": c.status }),
    },
    food: {
      label: "Food/Menu Report",
      dateField: null,
      filterAOptions: () => FoodPage.CATEGORIES,
      filterALabel: "Category",
      getData(st) {
        return Store.getAll("food").filter((f) =>
          Utils.matchesSearch(f, ["foodId", "name"], st.search) &&
          (!st.filterA || f.category === st.filterA)
        );
      },
      columns: [
        { label: "Food ID", key: "foodId" },
        { label: "Item Name", key: "name" },
        { label: "Category", key: "category" },
        { label: "Price", render: (r) => Utils.formatCurrency(r.price) },
        { label: "Status", render: (r) => UI.badge(r.status) },
      ],
      summary(rows) {
        return [
          { label: "Total Items", value: rows.length },
          { label: "Available", value: rows.filter((r) => r.status === "Available").length },
          { label: "Unavailable", value: rows.filter((r) => r.status === "Unavailable").length },
        ];
      },
      excelRow: (f) => ({ "Food ID": f.foodId, "Item Name": f.name, "Category": f.category, "Price": f.price, "Available Quantity": f.quantity, "Status": f.status }),
    },
  };

  function topCategory(rows) {
    const grouped = Utils.groupCount(rows, "category");
    let best = "-", max = -1;
    Object.entries(grouped).forEach(([k, v]) => { if (v > max) { max = v; best = k; } });
    return best;
  }

  function render(container) {
    container.innerHTML = `
      <div class="report-tabs" id="reportTabs">
        ${Object.entries(REPORTS).map(([key, cfg]) => `<button class="report-tab ${key === activeReport ? "active" : ""}" data-report="${key}">${cfg.label}</button>`).join("")}
      </div>
      <div id="reportBody"></div>
    `;
    container.querySelectorAll("[data-report]").forEach((b) => b.addEventListener("click", () => {
      activeReport = b.dataset.report;
      render(container);
    }));
    renderReportBody(container.querySelector("#reportBody"));
  }

  function renderReportBody(body) {
    const cfg = REPORTS[activeReport];
    const st = getState(activeReport);
    const options = cfg.filterAOptions();

    body.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-row">
          ${UI.searchInput({ id: "repSearch", placeholder: "Search...", value: st.search })}
          ${cfg.dateField ? UI.dateRange({ fromId: "repDateFrom", toId: "repDateTo", fromValue: st.dateFrom, toValue: st.dateTo }) : ""}
          ${UI.filterSelect({ id: "repFilterA", label: cfg.filterALabel, value: st.filterA, options, allLabel: "All" })}
          <div class="toolbar-actions">
            ${UI.clearFiltersBtn("repClearFilters", UI.hasActiveFilters(st))}
            <button class="btn btn-secondary no-print" id="repPrintBtn">Print</button>
            <button class="btn btn-primary" id="repExportBtn">Export Excel</button>
          </div>
        </div>
        ${UI.filterMeta()}
      </div>
      <div class="report-summary" id="repSummary"></div>
      <div id="repTableContainer"></div>
    `;

    function getData() { return cfg.getData(st); }

    function renderSummary() {
      const rows = getData();
      body.querySelector("#repSummary").innerHTML = cfg.summary(rows).map((s) => `
        <div class="summary-mini"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
      `).join("");
    }

    const tableContainer = body.querySelector("#repTableContainer");
    table = UI.createDataTable(tableContainer, {
      pageSize: 8,
      emptyMessage: "No records match your filters.",
      getData,
      columns: cfg.columns,
      afterRender() { renderSummary(); },
    });
    table.render();

    const labels = { search: "Search", filterA: cfg.filterALabel, dateFrom: "From", dateTo: "To" };
    const refreshFilters = () => {
      UI.updateFilterChrome(body, {
        state: st, labels, clearBtnId: "repClearFilters", searchId: "repSearch",
        resultCount: getData().length,
        onChipClear: (key) => { st[key] = ""; renderReportBody(body); },
      });
    };
    body.querySelector("#repSearch").addEventListener("input", Utils.debounce((e) => { st.search = e.target.value; table.resetPage(); table.render(); refreshFilters(); }, 200));
    UI.bindSearchClear(body, "repSearch", () => { st.search = ""; table.resetPage(); table.render(); refreshFilters(); });
    const fA = body.querySelector("#repFilterA");
    if (fA) fA.addEventListener("change", (e) => { st.filterA = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    const dFrom = body.querySelector("#repDateFrom");
    const dTo = body.querySelector("#repDateTo");
    if (dFrom) dFrom.addEventListener("change", (e) => { st.dateFrom = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    if (dTo) dTo.addEventListener("change", (e) => { st.dateTo = e.target.value; table.resetPage(); table.render(); refreshFilters(); });
    body.querySelector("#repClearFilters").addEventListener("click", () => {
      st.search = ""; st.dateFrom = ""; st.dateTo = ""; st.filterA = "";
      renderReportBody(body);
    });

    body.querySelector("#repExportBtn").addEventListener("click", () => {
      const rows = getData().map(cfg.excelRow);
      Utils.downloadWorkbook({ [cfg.label]: rows }, cfg.label.replace(/[\s/]+/g, "_") + ".xlsx");
      UI.toast(cfg.label + " exported to Excel");
    });
    body.querySelector("#repPrintBtn").addEventListener("click", () => window.print());
    refreshFilters();
  }

  return { render };
})();

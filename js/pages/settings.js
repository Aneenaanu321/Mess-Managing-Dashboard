/* ==========================================================================
   Settings Page — business info, data export/reset, cloud status
   ========================================================================== */

const SettingsPage = (() => {
  function render(container) {
    const settings = Store.getSettings();
    const cloudOn = Store.isCloudEnabled();

    container.innerHTML = `
      <div class="two-col">
        <div class="panel">
          <div class="section-title">Business Information</div>
          <form id="settingsForm">
            <div class="form-grid">
              ${UI.field({ label: "Business Name", name: "businessName", value: settings.businessName || "Mess Manager", required: true, full: true })}
              ${UI.field({ label: "Owner / Manager Name", name: "ownerName", value: settings.ownerName || "" })}
              ${UI.field({ label: "Contact Phone", name: "phone", value: settings.phone || "" })}
              ${UI.field({ label: "Email", name: "email", type: "email", value: settings.email || "" })}
              ${UI.field({ label: "Address", name: "address", type: "textarea", value: settings.address || "", full: true })}
            </div>
            <button type="submit" class="btn btn-primary mt-16">Save Settings</button>
          </form>
        </div>

        <div class="panel">
          <div class="section-title">Data Storage</div>
          <p class="form-hint mb-16">
            ${cloudOn
              ? "Connected to free Firebase cloud. Data syncs across devices and stays online."
              : "Using this browser only (localStorage). Add Firebase keys in <code>js/firebase-config.js</code> to enable free cloud storage."}
          </p>
          <span class="badge ${cloudOn ? "badge-green" : "badge-gray"}" style="margin-bottom:20px;">
            ${cloudOn ? "Cloud connected" : "Local only"}
          </span>

          <div class="section-title">Data Management</div>
          <p class="form-hint mb-16">Export everything to Excel, load sample demo data, or clear all records for real client use.</p>
          <button class="btn btn-secondary mb-16" id="exportAllBtn" style="width:100%;">Export All Data to Excel</button>
          <button class="btn btn-secondary mb-16" id="resetDataBtn" style="width:100%;">Load Demo Data</button>
          <button class="btn btn-danger" id="clearDataBtn" style="width:100%;">Clear All Data</button>
        </div>
      </div>
    `;

    container.querySelector("#settingsForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const data = UI.formToObject(e.target);
      Store.saveSettings(data);
      UI.toast(cloudOn ? "Settings saved to cloud" : "Settings saved");
    });

    container.querySelector("#exportAllBtn").addEventListener("click", () => {
      Utils.downloadWorkbook({
        Employees: Store.getAll("employees").map((e) => ({ "Employee ID": e.employeeId, "Name": e.name, "Phone": e.phone, "Email": e.email || "", "Designation": e.designation, "Department": e.department, "Joining Date": Utils.formatDate(e.joiningDate), "Salary": e.salary, "Status": e.status })),
        Salaries: Store.getAll("salaries").map((s) => ({ "Salary ID": s.salaryId, "Employee": s.employeeName, "Basic": s.basicSalary, "Allowance": s.allowance, "Deduction": s.deduction, "Net Salary": s.netSalary, "Month": Utils.monthLabel(s.salaryMonth), "Status": s.paymentStatus })),
        "Delivery Staff": Store.getAll("deliveryStaff").map((d) => ({ "Staff ID": d.deliveryStaffId, "Name": d.name, "Phone": d.phone, "Vehicle": d.vehicleType, "Area": d.assignedArea, "Status": d.status })),
        Deliveries: Store.getAll("deliveries").map((d) => ({ "Delivery ID": d.deliveryId, "Customer": d.customerName, "Phone": d.customerPhone, "Order Date": Utils.formatDate(d.orderDate), "Status": d.status })),
        Customers: Store.getAll("customers").map((c) => ({ "Customer ID": c.customerId, "Name": c.name, "Phone": c.phone, "Area": c.area, "Subscription": c.subscriptionType, "Status": c.status })),
        Expenses: Store.getAll("expenses").map((x) => ({ "Expense ID": x.expenseId, "Date": Utils.formatDate(x.date), "Category": x.category, "Amount": x.amount, "Paid By": x.paidBy })),
        "Food Menu": Store.getAll("food").map((f) => ({ "Food ID": f.foodId, "Name": f.name, "Category": f.category, "Price": f.price, "Status": f.status })),
      }, "MessManager_FullExport.xlsx");
      UI.toast("All data exported to Excel");
    });

    container.querySelector("#resetDataBtn").addEventListener("click", () => {
      UI.confirmAction({
        title: "Load Demo Data",
        message: "This will replace current data with sample demo records. Continue?",
        confirmText: "Load Demo",
        onConfirm() {
          Store.resetDemoData();
          UI.toast("Demo data loaded", "info");
          App.navigate("dashboard");
        },
      });
    });

    container.querySelector("#clearDataBtn").addEventListener("click", () => {
      UI.confirmAction({
        title: "Clear All Data",
        message: "This permanently removes all employees, deliveries, customers, expenses, and other records. Continue?",
        confirmText: "Clear Everything",
        onConfirm() {
          Store.clearAllData();
          UI.toast("All data cleared", "info");
          App.navigate("dashboard");
        },
      });
    });
  }

  return { render };
})();

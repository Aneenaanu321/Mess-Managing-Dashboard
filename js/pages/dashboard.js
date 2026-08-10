/* ==========================================================================
   Dashboard Home Page
   ========================================================================== */

const DashboardPage = (() => {
  const ACTIVITY_ICONS = {
    employee: { icon: "👤", bg: "var(--info-bg)", color: "var(--info)" },
    salary: { icon: "💰", bg: "var(--success-bg)", color: "var(--success)" },
    delivery: { icon: "🚚", bg: "var(--warning-bg)", color: "var(--warning)" },
    location: { icon: "📍", bg: "var(--brand-light)", color: "var(--brand)" },
    expense: { icon: "🧾", bg: "var(--danger-bg)", color: "var(--danger)" },
    customer: { icon: "👥", bg: "var(--info-bg)", color: "var(--info)" },
  };

  function statCard(label, value, iconSvg, bg, color) {
    return `<div class="stat-card" style="--stat-accent:${color}">
      <div class="stat-icon" style="background:${bg};color:${color};">${iconSvg}</div>
      <div class="stat-info">
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
    </div>`;
  }

  const I = {
    users: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M10 11a4 4 0 100-8 4 4 0 000 8zM23 20v-1a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    userCheck: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM17 11l2 2 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    truck: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="5.5" cy="18.5" r="1.8" stroke="currentColor" stroke-width="1.8"/><circle cx="18.5" cy="18.5" r="1.8" stroke="currentColor" stroke-width="1.8"/></svg>',
    cash: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>',
    receipt: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8h6M9 12h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    box: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    clock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    checkCircle: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M22 4L12 14.01l-3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  function render(container) {
    const employees = Store.getAll("employees");
    const deliveryStaff = Store.getAll("deliveryStaff");
    const deliveries = Store.getAll("deliveries");
    const expenses = Store.getAll("expenses");
    const salaries = Store.getAll("salaries");
    const activity = Store.getAll("activity");

    const activeEmployees = employees.filter((e) => e.status === "Active");
    const totalMonthlySalary = Utils.sumBy(activeEmployees, "salary");
    const totalExpenses = Utils.sumBy(expenses, "amount");
    const completedDeliveries = deliveries.filter((d) => d.status === "Delivered").length;
    const pendingDeliveries = deliveries.filter((d) => ["Pending", "Assigned", "Out for Delivery"].includes(d.status)).length;

    container.innerHTML = `
      <div class="page-intro">
        <div>
          <div class="page-intro-kicker">${greeting()}</div>
          <div class="page-intro-title">Mess overview</div>
          <div class="page-intro-sub">Track staff, deliveries, and kitchen spend in one place.</div>
        </div>
      </div>

      <div class="stat-grid">
        ${statCard("Total Employees", employees.length, I.users, "var(--brand-light)", "var(--brand)")}
        ${statCard("Active Employees", activeEmployees.length, I.userCheck, "var(--success-bg)", "var(--success)")}
        ${statCard("Delivery Staff", deliveryStaff.length, I.truck, "var(--info-bg)", "var(--info)")}
        ${statCard("Total Monthly Salary", Utils.formatCurrency(totalMonthlySalary), I.cash, "var(--warning-bg)", "var(--warning)")}
        ${statCard("Total Mess Expenses", Utils.formatCurrency(totalExpenses), I.receipt, "var(--danger-bg)", "var(--danger)")}
        ${statCard("Total Deliveries", deliveries.length, I.box, "var(--brand-light)", "var(--brand)")}
        ${statCard("Pending Deliveries", pendingDeliveries, I.clock, "var(--warning-bg)", "var(--warning)")}
        ${statCard("Completed Deliveries", completedDeliveries, I.checkCircle, "var(--success-bg)", "var(--success)")}
      </div>

      <div class="chart-grid">
        <div class="panel">
          <div class="panel-header"><div class="panel-title">Monthly Salary Summary</div></div>
          <div class="chart-box"><canvas id="chartSalary"></canvas></div>
        </div>
        <div class="panel">
          <div class="panel-header"><div class="panel-title">Delivery Summary</div></div>
          <div class="chart-box"><canvas id="chartDelivery"></canvas></div>
        </div>
        <div class="panel">
          <div class="panel-header"><div class="panel-title">Monthly Expenses</div></div>
          <div class="chart-box"><canvas id="chartExpenses"></canvas></div>
        </div>
        <div class="panel">
          <div class="panel-header"><div class="panel-title">Employee Count by Department</div></div>
          <div class="chart-box"><canvas id="chartDept"></canvas></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header"><div class="panel-title">Recent Activity</div></div>
        <div class="activity-list" id="activityList"></div>
      </div>
    `;

    // Monthly Salary Summary chart
    const salaryByMonth = {};
    salaries.forEach((s) => { salaryByMonth[s.salaryMonth] = (salaryByMonth[s.salaryMonth] || 0) + Number(s.netSalary || 0); });
    const salMonths = Object.keys(salaryByMonth).sort();
    Charts.barChart("chartSalary", salMonths.map(Utils.monthLabel), salMonths.map((m) => salaryByMonth[m]), "Net Salary");

    // Delivery Summary chart
    const statusOrder = ["Pending", "Assigned", "Out for Delivery", "Delivered", "Cancelled"];
    const delCounts = Utils.groupCount(deliveries, "status");
    Charts.doughnutChart("chartDelivery", statusOrder.filter((s) => delCounts[s]), statusOrder.filter((s) => delCounts[s]).map((s) => delCounts[s]));

    // Monthly Expenses chart
    const expByMonth = {};
    expenses.forEach((e) => {
      const m = (e.date || "").slice(0, 7);
      expByMonth[m] = (expByMonth[m] || 0) + Number(e.amount || 0);
    });
    const expMonths = Object.keys(expByMonth).sort();
    Charts.lineChart("chartExpenses", expMonths.map(Utils.monthLabel), expMonths.map((m) => expByMonth[m]), "Expenses");

    // Employee Count by Department chart
    const deptCounts = Utils.groupCount(employees, "department");
    Charts.doughnutChart("chartDept", Object.keys(deptCounts), Object.values(deptCounts));

    // Recent activity
    const list = document.getElementById("activityList");
    const sorted = [...activity].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8);
    if (!sorted.length) {
      list.innerHTML = UI.emptyStateHtml("No recent activity yet");
    } else {
      list.innerHTML = sorted.map((a) => {
        const cfg = ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.expense;
        return `<div class="activity-item">
          <div class="activity-dot" style="background:${cfg.bg};color:${cfg.color};">${cfg.icon}</div>
          <div>
            <div class="activity-text">${Utils.escapeHtml(a.message)}</div>
            <div class="activity-time">${Utils.timeAgo(a.timestamp)}</div>
          </div>
        </div>`;
      }).join("");
    }
  }

  return { render };
})();

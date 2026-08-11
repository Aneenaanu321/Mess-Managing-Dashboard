/* ==========================================================================
   App shell — sidebar navigation, routing, mobile menu
   ========================================================================== */

const App = (() => {
  const ROUTES = [
    { key: "dashboard", label: "Dashboard", section: "Overview", page: () => DashboardPage, icon: '<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>' },
    { key: "employees", label: "Employees", section: "People", page: () => EmployeesPage, icon: '<path d="M17 20v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1"/><circle cx="10" cy="7" r="4"/><path d="M23 20v-1a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>' },
    { key: "salary", label: "Salary", section: "People", page: () => SalaryPage, icon: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>' },
    { key: "deliveryStaff", label: "Delivery Staff", section: "Operations", page: () => DeliveryStaffPage, icon: '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="1.8"/><circle cx="18.5" cy="18.5" r="1.8"/>' },
    { key: "deliveries", label: "Deliveries", section: "Operations", page: () => DeliveriesPage, icon: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>' },
    { key: "locations", label: "Locations", section: "Operations", page: () => LocationsPage, icon: '<path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1118 0z"/><circle cx="12" cy="10" r="2.5"/>' },
    { key: "customers", label: "Customers", section: "Operations", page: () => CustomersPage, icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>' },
    { key: "food", label: "Food / Menu", section: "Mess", page: () => FoodPage, icon: '<path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><path d="M6 1v3M10 1v3M14 1v3"/>' },
    { key: "expenses", label: "Expenses", section: "Mess", page: () => ExpensesPage, icon: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z"/><path d="M9 8h6M9 12h6"/>' },
    { key: "reports", label: "Reports", section: "System", page: () => ReportsPage, icon: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8"/>' },
    { key: "settings", label: "Settings", section: "System", page: () => SettingsPage, icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 008.6 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H2a2 2 0 010-4h.09A1.65 1.65 0 003.6 8.6a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H8a1.65 1.65 0 001-1.51V2a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V8a1.65 1.65 0 001.51 1H22a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>' },
  ];

  const STORAGE_KEY = "mm-nav-open";
  const MOBILE_MQ = "(max-width: 900px)";

  function buildIcon(inner) {
    return `<svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  }

  function isMobile() {
    return window.matchMedia(MOBILE_MQ).matches;
  }

  function isNavOpen() {
    return !document.body.classList.contains("nav-closed");
  }

  function syncToggleUi(open) {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const toggle = document.getElementById("sidebarToggle");
    if (!sidebar || !overlay) return;

    // Keep collapsed rail interactive — don't aria-hide the whole sidebar
    sidebar.setAttribute("data-collapsed", open ? "false" : "true");
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Collapse navigation" : "Expand navigation");
      toggle.title = open ? "Collapse menu" : "Expand menu";
    }

    if (isMobile()) {
      overlay.classList.toggle("show", open);
      document.body.classList.toggle("nav-open", open);
    } else {
      overlay.classList.remove("show");
      document.body.classList.remove("nav-open");
    }
  }

  function openNav() {
    document.body.classList.remove("nav-closed");
    if (isMobile()) document.body.classList.add("nav-open");
    syncToggleUi(true);
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch (_) {}
  }

  function closeNav() {
    document.body.classList.add("nav-closed");
    document.body.classList.remove("nav-open");
    syncToggleUi(false);
    try { localStorage.setItem(STORAGE_KEY, "0"); } catch (_) {}
  }

  function toggleNav() {
    if (isNavOpen()) closeNav();
    else openNav();
  }

  function renderSidebar(activeKey) {
    const nav = document.getElementById("sidebarNav");
    let lastSection = null;
    nav.innerHTML = ROUTES.map((r) => {
      const sectionHtml = r.section !== lastSection
        ? `<div class="nav-section">${r.section}</div>`
        : "";
      lastSection = r.section;
      return `${sectionHtml}
      <div class="nav-item ${r.key === activeKey ? "active" : ""}" data-route="${r.key}" role="link" tabindex="0" title="${r.label}">
        ${buildIcon(r.icon)}
        <span>${r.label}</span>
      </div>`;
    }).join("");
    nav.querySelectorAll("[data-route]").forEach((el) => {
      const go = () => {
        navigate(el.dataset.route);
        if (isMobile()) closeNav();
      };
      el.addEventListener("click", go);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
    });
  }

  function navigate(routeKey) {
    window.location.hash = "#" + routeKey;
  }

  function renderRoute() {
    let key = (window.location.hash || "#dashboard").replace("#", "");
    const route = ROUTES.find((r) => r.key === key) || ROUTES[0];
    key = route.key;

    renderSidebar(key);
    document.getElementById("pageTitle").textContent = route.label;
    const content = document.getElementById("mainContent");
    content.innerHTML = "";
    route.page().render(content);
  }

  function updateDate() {
    const el = document.getElementById("topbarDate");
    if (el) el.textContent = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }

  function restoreNavState() {
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (_) {}

    if (isMobile()) {
      closeNav();
      return;
    }

    if (saved === "0") closeNav();
    else openNav();
  }

  function init() {
    updateDate();

    const toggleBtn = document.getElementById("sidebarToggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleNav();
      });
    }

    const overlay = document.getElementById("sidebarOverlay");
    if (overlay) overlay.addEventListener("click", closeNav);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isNavOpen()) closeNav();
    });

    window.matchMedia(MOBILE_MQ).addEventListener("change", (e) => {
      if (e.matches) closeNav();
      else {
        let saved = null;
        try { saved = localStorage.getItem(STORAGE_KEY); } catch (_) {}
        if (saved === "0") closeNav();
        else openNav();
      }
    });

    restoreNavState();
    window.addEventListener("hashchange", renderRoute);
    try {
      renderRoute();
    } catch (err) {
      console.error("Failed to render route:", err);
    }
  }

  return { init, navigate, openNav, closeNav, toggleNav, ROUTES };
})();

document.addEventListener("DOMContentLoaded", () => {
  if (typeof Auth !== "undefined" && !Auth.requireAuth()) return;
  document.documentElement.style.visibility = "";

  const start = () => {
    try {
      App.init();
    } catch (err) {
      console.error("Failed to start app:", err);
      const content = document.getElementById("mainContent");
      if (content) {
        content.innerHTML = `<div class="panel" style="padding:24px;">
          <div class="section-title">Could not start dashboard</div>
          <p class="form-hint">${String(err && err.message ? err.message : err)}</p>
        </div>`;
      }
    }
  };

  if (typeof Store === "undefined" || !Store.ready) {
    start();
    return;
  }

  const content = document.getElementById("mainContent");
  if (content) {
    content.innerHTML = `<div class="panel" style="text-align:center;padding:48px 24px;">
      <div class="section-title" style="margin-bottom:8px;">Loading Mess Manager…</div>
      <p class="form-hint">Connecting to data store</p>
    </div>`;
  }

  Promise.race([
    Store.ready(),
    new Promise((resolve) => setTimeout(resolve, 6000)),
  ]).then(start);
});


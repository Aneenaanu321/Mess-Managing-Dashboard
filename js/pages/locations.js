/* ==========================================================================
   Delivery Staff Location Tracking Page
   Simple, non-GPS location view: staff self-report a location name + lat/lng
   ========================================================================== */

const LocationsPage = (() => {
  let containerRef = null;

  function statusDotColor(status) {
    if (status === "Available") return "#16a34a";
    if (status === "On Delivery") return "#2563eb";
    return "#9aa1b1";
  }

  function renderMapPanel(staffList) {
    const withCoords = staffList.filter((s) => s.currentLocation && s.currentLocation.lat && s.currentLocation.lng);
    if (!withCoords.length) {
      return `<div class="panel"><div class="panel-header"><div class="panel-title">Map View</div></div>${UI.emptyStateHtml("No location data available yet")}</div>`;
    }
    const lats = withCoords.map((s) => s.currentLocation.lat);
    const lngs = withCoords.map((s) => s.currentLocation.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const padLat = (maxLat - minLat) || 0.01;
    const padLng = (maxLng - minLng) || 0.01;

    const pins = withCoords.map((s) => {
      const x = 6 + ((s.currentLocation.lng - minLng) / padLng) * 88;
      const y = 90 - ((s.currentLocation.lat - minLat) / padLat) * 80;
      const color = statusDotColor(s.status);
      return `<div title="${Utils.escapeHtml(s.name)} — ${Utils.escapeHtml(s.currentLocation.name)}" style="position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-100%);text-align:center;">
        <div style="width:14px;height:14px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);margin:0 auto;box-shadow:0 1px 3px rgba(0,0,0,.3);"></div>
        <div style="font-size:10.5px;font-weight:600;color:var(--text);background:#fff;padding:1px 5px;border-radius:5px;margin-top:2px;display:inline-block;box-shadow:var(--shadow-sm);white-space:nowrap;">${Utils.escapeHtml(s.name.split(" ")[0])}</div>
      </div>`;
    }).join("");

    return `<div class="panel">
      <div class="panel-header">
        <div class="panel-title">Map View (approximate positions)</div>
        <div style="display:flex;gap:12px;font-size:11.5px;color:var(--text-muted);">
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#16a34a;margin-right:4px;"></span>Available</span>
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2563eb;margin-right:4px;"></span>On Delivery</span>
          <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#9aa1b1;margin-right:4px;"></span>Offline</span>
        </div>
      </div>
      <div style="position:relative;height:260px;background:linear-gradient(135deg,#f4f6fb,#eef2ff);border-radius:10px;border:1px solid var(--border);overflow:hidden;">
        <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(79,70,229,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(79,70,229,.06) 1px,transparent 1px);background-size:24px 24px;"></div>
        ${pins}
      </div>
    </div>`;
  }

  function render(container) {
    containerRef = container;
    const staffList = Store.getAll("deliveryStaff");

    container.innerHTML = `
      ${renderMapPanel(staffList)}
      <div class="panel" style="margin-top:16px;">
        <div class="panel-header"><div class="panel-title">Delivery Staff Locations</div></div>
        <div id="locTableContainer"></div>
      </div>
    `;

    const tableContainer = container.querySelector("#locTableContainer");
    const table = UI.createDataTable(tableContainer, {
      pageSize: 8,
      emptyMessage: "No delivery staff found.",
      getData: () => Store.getAll("deliveryStaff").sort((a, b) => a.name.localeCompare(b.name)),
      columns: [
        { label: "Staff Name", render: (r) => `<strong>${Utils.escapeHtml(r.name)}</strong>` },
        { label: "Phone", key: "phone" },
        { label: "Current Location", render: (r) => `${Utils.escapeHtml(r.currentLocation?.name || "-")} <span class="cell-muted">(${r.currentLocation?.lat ?? "-"}, ${r.currentLocation?.lng ?? "-"})</span>` },
        { label: "Status", render: (r) => UI.badge(r.status) },
        { label: "Last Updated", render: (r) => Utils.timeAgo(r.lastUpdated) },
        {
          label: "Actions", render: (r) => `<div class="actions-cell"><button class="btn btn-primary btn-sm" data-update="${r.id}">Update Location</button></div>`,
        },
      ],
      afterRender(el) {
        el.querySelectorAll("[data-update]").forEach((b) => b.addEventListener("click", () => {
          DeliveryStaffPage.openLocationForm(b.dataset.update, () => render(containerRef));
        }));
      },
    });
    table.render();
  }

  return { render };
})();

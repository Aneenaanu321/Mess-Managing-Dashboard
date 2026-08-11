/* ==========================================================================
   Delivery Staff Location Tracking Page
   Real map (Leaflet / OpenStreetMap) + staff location table
   ========================================================================== */

const LocationsPage = (() => {
  let containerRef = null;
  let map = null;
  let markers = [];

  function statusDotColor(status) {
    if (status === "Available") return "#16a34a";
    if (status === "On Delivery") return "#2563eb";
    return "#9aa1b1";
  }

  function staffWithCoords(staffList) {
    return (staffList || []).filter((s) => {
      const lat = Number(s.currentLocation?.lat);
      const lng = Number(s.currentLocation?.lng);
      return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
    });
  }

  function destroyMap() {
    markers = [];
    if (map) {
      map.remove();
      map = null;
    }
  }

  function pinIcon(color) {
    return L.divIcon({
      className: "staff-map-pin",
      html: `<div style="width:16px;height:16px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.28);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 16],
      popupAnchor: [0, -16],
    });
  }

  function initMap(staffList) {
    destroyMap();
    const el = document.getElementById("staffMap");
    if (!el || typeof L === "undefined") return;

    const withCoords = staffWithCoords(staffList);
    map = L.map(el, { scrollWheelZoom: true }).setView([13.0827, 80.2707], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    const bounds = [];
    withCoords.forEach((s) => {
      const lat = Number(s.currentLocation.lat);
      const lng = Number(s.currentLocation.lng);
      const marker = L.marker([lat, lng], { icon: pinIcon(statusDotColor(s.status)) }).addTo(map);
      marker.bindPopup(`
        <strong>${Utils.escapeHtml(s.name)}</strong>
        ${Utils.escapeHtml(s.currentLocation.name || "Unknown location")}<br>
        ${Utils.escapeHtml(s.phone || "")}<br>
        Status: ${Utils.escapeHtml(s.status || "-")}
      `);
      markers.push(marker);
      bounds.push([lat, lng]);
    });

    if (bounds.length === 1) map.setView(bounds[0], 14);
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });

    setTimeout(() => map && map.invalidateSize(), 80);
  }

  function render(container) {
    containerRef = container;
    destroyMap();
    const staffList = Store.getAll("deliveryStaff");
    const withCoords = staffWithCoords(staffList);

    container.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">Map View</div>
          <div class="staff-map-legend">
            <span><i class="staff-map-dot" style="background:#16a34a;"></i>Available</span>
            <span><i class="staff-map-dot" style="background:#2563eb;"></i>On Delivery</span>
            <span><i class="staff-map-dot" style="background:#9aa1b1;"></i>Offline</span>
          </div>
        </div>
        ${withCoords.length
          ? `<div id="staffMap" class="staff-map"></div>`
          : `${UI.emptyStateHtml("No location data yet. Add delivery staff with latitude and longitude, or load sample data.")}
             <div style="text-align:center;margin-top:12px;">
               <button class="btn btn-primary" id="locLoadSample">Load sample locations</button>
             </div>`}
      </div>
      <div class="panel" style="margin-top:16px;">
        <div class="panel-header">
          <div class="panel-title">Delivery Staff Locations</div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-secondary" id="locAddStaff">+ Add staff</button>
            <button class="btn btn-secondary" id="locExportBtn">Export Excel</button>
          </div>
        </div>
        <div id="locTableContainer"></div>
      </div>
    `;

    const tableContainer = container.querySelector("#locTableContainer");
    const table = UI.createDataTable(tableContainer, {
      pageSize: 8,
      emptyMessage: "No delivery staff found. Use + Add staff or Load sample locations.",
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

    container.querySelector("#locExportBtn").addEventListener("click", () => {
      const rows = Store.getAll("deliveryStaff").map((s) => ({
        "Staff ID": s.deliveryStaffId,
        "Name": s.name,
        "Phone": s.phone,
        "Current Location": s.currentLocation?.name || "-",
        "Latitude": s.currentLocation?.lat ?? "-",
        "Longitude": s.currentLocation?.lng ?? "-",
        "Assigned Area": s.assignedArea,
        "Status": s.status,
        "Last Updated": s.lastUpdated ? new Date(s.lastUpdated).toLocaleString() : "-",
      }));
      Utils.downloadWorkbook({ "Locations": rows }, `StaffLocations_${Utils.fileTimestamp()}.xlsx`);
      UI.toast("Locations exported to Excel");
    });

    container.querySelector("#locAddStaff").addEventListener("click", () => {
      DeliveryStaffPage.openForm(null, () => render(containerRef));
    });

    const sampleBtn = container.querySelector("#locLoadSample");
    if (sampleBtn) {
      sampleBtn.addEventListener("click", () => {
        Store.resetDemoData();
        UI.toast("Sample delivery staff and locations loaded");
        render(containerRef);
      });
    }

    if (withCoords.length) {
      requestAnimationFrame(() => initMap(staffList));
    }
  }

  return { render };
})();

/* ==========================================================================
   Utils — shared helper functions used across the app
   ========================================================================== */

const Utils = (() => {
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatCurrency(value) {
    const n = Number(value) || 0;
    return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }

  function formatDate(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatDateTime(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      ", " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function monthLabel(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  }

  function timeAgo(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return mins + "m ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    const days = Math.floor(hrs / 24);
    if (days < 30) return days + "d ago";
    return formatDate(dateStr);
  }

  function uid(prefix) {
    return prefix + "-" + Date.now().toString(36).slice(-5) + Math.floor(Math.random() * 900 + 100);
  }

  function nextSequentialId(list, prefix, field) {
    let max = 0;
    (list || []).forEach((item) => {
      const val = item[field] || "";
      const match = String(val).match(/(\d+)$/);
      if (match) max = Math.max(max, parseInt(match[1], 10));
    });
    return prefix + String(max + 1).padStart(3, "0");
  }

  function debounce(fn, delay) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay || 250);
    };
  }

  function downloadWorkbook(sheets, filename) {
    // sheets: { "Sheet Name": [{col: val}, ...] }
    const wb = XLSX.utils.book_new();
    Object.keys(sheets).forEach((name) => {
      const rows = sheets[name] && sheets[name].length ? sheets[name] : [{ "No Data": "" }];
      const ws = XLSX.utils.json_to_sheet(rows);
      const colWidths = Object.keys(rows[0]).map((key) => {
        const maxLen = rows.reduce((m, r) => Math.max(m, String(r[key] ?? "").length), key.length);
        return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
      });
      ws["!cols"] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31));
    });
    XLSX.writeFile(wb, filename);
  }

  function matchesSearch(record, fields, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    return fields.some((f) => String(record[f] ?? "").toLowerCase().includes(q));
  }

  function inDateRange(dateStr, from, to) {
    if (!dateStr) return !from && !to;
    const d = new Date(dateStr).getTime();
    if (from && d < new Date(from).getTime()) return false;
    if (to && d > new Date(to).getTime() + 86399999) return false;
    return true;
  }

  function sumBy(list, field) {
    return (list || []).reduce((s, item) => s + (Number(item[field]) || 0), 0);
  }

  function groupCount(list, field) {
    const map = {};
    (list || []).forEach((item) => {
      const key = item[field] || "Unspecified";
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }

  function randomColor(seedStr) {
    const palette = ["#0f766e", "#0ea5e9", "#15803d", "#c2410c", "#dc2626", "#0369a1", "#0891b2", "#a16207"];
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
  }

  function fileTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  }

  return {
    escapeHtml, formatCurrency, formatDate, formatDateTime, todayISO, monthLabel,
    timeAgo, uid, nextSequentialId, debounce, downloadWorkbook, matchesSearch,
    inDateRange, sumBy, groupCount, randomColor, fileTimestamp,
  };
})();

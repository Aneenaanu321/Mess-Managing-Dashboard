/* ==========================================================================
   Charts helper — thin wrapper over Chart.js with instance cleanup
   ========================================================================== */

const Charts = (() => {
  const instances = {};
  const PALETTE = ["#0f766e", "#0ea5e9", "#15803d", "#c2410c", "#dc2626", "#0369a1", "#0891b2", "#a16207"];

  function render(canvasId, config) {
    const el = document.getElementById(canvasId);
    if (!el) return;
    if (instances[canvasId]) {
      instances[canvasId].destroy();
    }
    instances[canvasId] = new Chart(el.getContext("2d"), config);
  }

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, labels: { boxWidth: 10, font: { size: 11 } } } },
  };

  function barChart(canvasId, labels, values, label) {
    render(canvasId, {
      type: "bar",
      data: { labels, datasets: [{ label, data: values, backgroundColor: "#0f766e", borderRadius: 8, maxBarThickness: 34 }] },
      options: { ...baseOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: "#e8eee9" } }, x: { grid: { display: false } } } },
    });
  }

  function lineChart(canvasId, labels, values, label) {
    render(canvasId, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label, data: values, borderColor: "#0f766e", backgroundColor: "rgba(15,118,110,0.12)",
          fill: true, tension: 0.35, pointRadius: 3, pointBackgroundColor: "#0f766e",
        }],
      },
      options: { ...baseOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: "#e8eee9" } }, x: { grid: { display: false } } } },
    });
  }

  function doughnutChart(canvasId, labels, values) {
    render(canvasId, {
      type: "doughnut",
      data: { labels, datasets: [{ data: values, backgroundColor: labels.map((l, i) => PALETTE[i % PALETTE.length]), borderWidth: 2, borderColor: "#fff" }] },
      options: { ...baseOptions, cutout: "62%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } } },
    });
  }

  function multiBarChart(canvasId, labels, datasets) {
    render(canvasId, {
      type: "bar",
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({ ...ds, backgroundColor: ds.color || PALETTE[i % PALETTE.length], borderRadius: 6, maxBarThickness: 26 })),
      },
      options: { ...baseOptions, scales: { y: { beginAtZero: true, grid: { color: "#e8eee9" } }, x: { grid: { display: false } } } },
    });
  }

  return { render, barChart, lineChart, doughnutChart, multiBarChart, PALETTE };
})();

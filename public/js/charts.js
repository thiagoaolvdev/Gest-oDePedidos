let _chartInstances = {};

function fmtCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function statusLabel(s) {
  const map = { pendente: 'Pendente', em_compra: 'Em Compra', aguardando_aprovacao: 'Aguarda Aprovacao', novo_orcamento: 'Novo Orcamento', aprovado: 'Aprovado', rejeitado: 'Cancelado', comprado: 'Comprado', concluido: 'Concluido' };
  return map[s] || s;
}

function getChartTextColor() {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#e6edf3' : '#2C3E50';
}

function getChartGridColor() {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
}

function getChartTooltipBg() {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#21262d' : '#0B2545';
}

function destroyCharts() {
  Object.values(_chartInstances).forEach(c => c?.destroy());
  _chartInstances = {};
}

function createBarChart(canvasId, labels, data, label, color) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const accentColor = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#F9A826' : (color || '#0B2545');
  _chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label,
        data,
        backgroundColor: accentColor + 'CC',
        hoverBackgroundColor: accentColor,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 40
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: getChartTooltipBg(),
          titleFont: { size: 12, weight: '600' },
          bodyFont: { size: 13 },
          padding: 12,
          cornerRadius: 10,
          displayColors: false,
          callbacks: {
            label: function(ctx) { return `${ctx.parsed.y} pedido(s)`; }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: getChartGridColor() },
          border: { display: false },
          ticks: { font: { size: 11, weight: '500' }, color: getChartTextColor(), stepSize: 1 }
        },
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { size: 11, weight: '500' }, color: getChartTextColor() }
        }
      }
    }
  });
}

function createDoughnutChart(canvasId, labels, data, colors) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const total = data.reduce((a, b) => a + b, 0);
  _chartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors || ['#F39C12', '#3498DB', '#2ECC71', '#0B2545', '#E74C3C'],
        borderWidth: 3,
        borderColor: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#161b22' : '#ffffff',
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      animation: { animateRotate: true, duration: 1000 },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 11, weight: '500' }, padding: 14, usePointStyle: true, pointStyleWidth: 8, color: getChartTextColor() }
        },
        tooltip: {
          backgroundColor: getChartTooltipBg(),
          padding: 12,
          cornerRadius: 10,
          displayColors: true,
          callbacks: {
            label: function (ctx) {
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
            }
          }
        }
      }
    },
    plugins: [{
      id: 'centerText',
      beforeDraw: function (chart) {
        const { width, height, ctx: c } = chart;
        c.save();
        const centerX = width / 2;
        const centerY = height / 2 - 10;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = 'bold 30px Inter, sans-serif';
        c.fillStyle = getChartTextColor();
        c.fillText(total, centerX, centerY);
        c.font = '12px Inter, sans-serif';
        c.fillStyle = getChartTextColor() === '#e6edf3' ? '#7d8590' : '#8899AA';
        c.fillText('Total', centerX, centerY + 24);
        c.restore();
      }
    }]
  });
}

function createValoresPie(canvasId, statusRows) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const aprovadosSet = ['aprovado', 'comprado', 'concluido'];
  const rows = statusRows || [];
  const aprovados = rows.filter(r => aprovadosSet.includes(r.status)).reduce((a, r) => a + (parseFloat(r.valor) || 0), 0);
  const pendenteRow = rows.find(r => r.status === 'pendente');
  const pendentes = pendenteRow ? (parseFloat(pendenteRow.valor) || 0) : 0;
  const data = [aprovados, pendentes];
  const labels = ['Valores Gastos (Aprovados)', 'Valores Pendentes'];
  const total = data.reduce((a, b) => a + b, 0);
  _chartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ['#2ECC71', '#F39C12'],
        borderWidth: 3,
        borderColor: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#161b22' : '#ffffff',
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      animation: { animateRotate: true, duration: 1000 },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 11, weight: '500' }, padding: 14, usePointStyle: true, pointStyleWidth: 8, color: getChartTextColor() }
        },
        tooltip: {
          backgroundColor: getChartTooltipBg(),
          padding: 12,
          cornerRadius: 10,
          displayColors: true,
          callbacks: {
            label: function (ctx) {
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ` ${ctx.label}: ${fmtCurrency(ctx.parsed)} (${pct}%)`;
            }
          }
        }
      }
    },
    plugins: [{
      id: 'centerText',
      beforeDraw: function (chart) {
        const { width, height, ctx: c } = chart;
        c.save();
        const centerX = width / 2;
        const centerY = height / 2 - 10;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.font = 'bold 20px Inter, sans-serif';
        c.fillStyle = getChartTextColor();
        c.fillText(fmtCurrency(total), centerX, centerY);
        c.font = '12px Inter, sans-serif';
        c.fillStyle = getChartTextColor() === '#e6edf3' ? '#7d8590' : '#8899AA';
        c.fillText('Total', centerX, centerY + 24);
        c.restore();
      }
    }]
  });
}

function createLineChart(canvasId, labels, data, label, color, fillColor) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const accentColor = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#F9A826' : (color || '#0B2545');
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'rgba(249, 168, 38, 0.2)' : (fillColor || 'rgba(11, 37, 69, 0.15)'));
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  _chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label,
        data,
        borderColor: accentColor,
        backgroundColor: gradient,
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: accentColor,
        pointBorderColor: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#161b22' : '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: accentColor,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 1000, easing: 'easeOutQuart' },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: getChartTooltipBg(),
          padding: 12,
          cornerRadius: 10,
          displayColors: false,
          titleFont: { size: 12, weight: '600' },
          bodyFont: { size: 13 },
          callbacks: {
            label: function (ctx) { return ` ${label}: ${fmtCurrency(ctx.parsed.y)}`; }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: getChartGridColor() },
          border: { display: false },
          ticks: {
            font: { size: 11, weight: '500' },
            color: getChartTextColor(),
            callback: function (v) { return 'R$ ' + v.toFixed(0); }
          }
        },
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { size: 11, weight: '500' }, color: getChartTextColor() }
        }
      }
    }
  });
}

function createHorizontalBarChart(canvasId, labels, data, label, barColor) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
  const colors = [
    'rgba(249, 168, 38, 0.85)',
    'rgba(52, 152, 219, 0.85)',
    'rgba(46, 204, 113, 0.85)',
    'rgba(155, 89, 182, 0.85)',
    'rgba(231, 76, 60, 0.85)',
    'rgba(26, 188, 156, 0.85)',
    'rgba(243, 156, 18, 0.85)',
    'rgba(52, 73, 94, 0.85)'
  ];
  _chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label,
        data,
        backgroundColor: colors.slice(0, data.length),
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 28
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: getChartTooltipBg(),
          padding: 12,
          cornerRadius: 10,
          displayColors: false,
          callbacks: {
            label: function(ctx) { return `${ctx.parsed.x} pedido(s)`; }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: getChartGridColor() },
          border: { display: false },
          ticks: { font: { size: 10, weight: '500' }, color: getChartTextColor(), stepSize: 1 }
        },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { size: 11, weight: '600' }, color: getChartTextColor() }
        }
      }
    }
  });
}

function createRadarChart(canvasId, labels, data, label, color) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  const accentColor = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#F9A826' : (color || '#0B2545');
  _chartInstances[canvasId] = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label,
        data,
        backgroundColor: accentColor + '22',
        borderColor: accentColor,
        borderWidth: 2,
        pointBackgroundColor: accentColor,
        pointBorderColor: document.documentElement.getAttribute('data-bs-theme') === 'dark' ? '#161b22' : '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 800 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: getChartTooltipBg(),
          padding: 12,
          cornerRadius: 10,
          displayColors: false
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          grid: { color: getChartGridColor() },
          angleLines: { color: getChartGridColor() },
          pointLabels: { font: { size: 12, weight: '500' }, color: getChartTextColor() },
          ticks: {
            stepSize: 20,
            font: { size: 10 },
            backdropColor: 'transparent',
            color: getChartTextColor()
          }
        }
      }
    }
  });
}

function initCharts(data) {
  destroyCharts();
  if (!data) return;
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  if (data.pMes) {
    const pd = Array(12).fill(0);
    (data.pMes || []).forEach(r => { if (r.mes >= 1 && r.mes <= 12) pd[r.mes - 1] = r.total; });
    createBarChart('chartPedidosMes', meses, pd, 'Pedidos');
  }
  if (data.status) {
    const labels = (data.status || []).map(r => statusLabel(r.status));
    const values = (data.status || []).map(r => r.total);
    const cores = {
      pendente: '#F39C12', em_compra: '#3498DB', aguardando_aprovacao: '#E74C3C',
      novo_orcamento: '#E67E22', aprovado: '#2ECC71', rejeitado: '#E74C3C', comprado: '#9B59B6', concluido: '#2ECC71'
    };
    const chartColors = (data.status || []).map(r => cores[r.status] || '#8899AA');
    createDoughnutChart('chartStatus', labels, values, chartColors);
  }
  if (data.pedidosPorVeiculo) {
    const pv = data.pedidosPorVeiculo || [];
    if (pv.length > 0) {
      const labels = pv.map(r => r.placa || '-');
      const values = pv.map(r => r.total || 0);
      createHorizontalBarChart('chartDesempenho', labels, values, 'Pedidos');
    } else {
      const ctx = document.getElementById('chartDesempenho');
      if (ctx) {
        const c = ctx.getContext('2d');
        c.font = '13px Inter, sans-serif';
        c.fillStyle = getChartTextColor() === '#e6edf3' ? '#7d8590' : '#8899AA';
        c.textAlign = 'center';
        c.fillText('Nenhum dado disponivel', ctx.width / 2, ctx.height / 2);
      }
    }
  }
}

function recreateCharts(data) {
  initCharts(data);
}

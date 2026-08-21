const PDFDocument = require('pdfkit');
const path = require('path');
const { statusLabel, statusColor } = require('./statusMap');

const BRAND = '#1a3d8f';
const BRAND_LIGHT = '#f0f4ff';
const ACCENT = '#d97706';
const TEXT = '#1a1d23';
const MUTED = '#6b7280';
const BORDER = '#d1d5db';

const COL_PCTS = [
  { label: 'Data', key: 'data', pct: 9 },
  { label: 'Pedido', key: 'numero_pedido', pct: 13 },
  { label: 'Peça', key: 'peca_nome', pct: 21 },
  { label: 'Qtd', key: 'quantidade', pct: 6 },
  { label: 'Valor Unit.', key: 'valor_unitario', pct: 11 },
  { label: 'Valor Total', key: 'valor_total', pct: 11 },
  { label: 'Fornecedor', key: 'fornecedor', pct: 15 },
  { label: 'Status', key: 'status', pct: 14 }
];

const fmtCurrency = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const fmtDate = (valor) => {
  if (!valor) return '-';
  const d = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR');
};

const buildCols = (pageW) => {
  const gap = 4;
  const avail = pageW - gap * (COL_PCTS.length - 1);
  return COL_PCTS.map(c => ({ ...c, width: Math.floor(c.pct / 100 * avail) }));
};

const fitText = (doc, text, maxWidth) => {
  const str = String(text ?? '');
  if (doc.widthOfString(str) <= maxWidth) return str;
  let out = str;
  while (out.length > 1 && doc.widthOfString(out + '…') > maxWidth) {
    out = out.slice(0, -1);
  }
  return out.trimEnd() + '…';
};

function gerarRelatorioVeiculoPDF(dados) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const M = 40;
  const pageW = doc.page.width - M * 2;
  const contentBottom = () => doc.page.height - doc.page.margins.bottom;
  let y = M;

  const checkPage = (needed) => {
    if (y + needed > contentBottom()) {
      doc.addPage();
      y = M;
      return true;
    }
    return false;
  };

  const drawFooter = (pageNum, totalPages) => {
    doc.fontSize(8).fillColor(MUTED).font('Helvetica')
      .text(`Página ${pageNum} de ${totalPages}`, M, doc.page.height - 25, { width: pageW, align: 'center' });
  };

  // ---------- Header com logo ----------
  const headerH = 60;
  doc.rect(M, y, pageW, headerH).fill(BRAND);
  try {
    doc.image(path.join(__dirname, '..', '..', 'public', 'img', 'logo.png'), M + 10, y + 10, { fit: [40, 40], align: 'center', valign: 'center' });
  } catch (e) { /* logo indisponivel: segue sem imagem */ }
  doc.fontSize(15).fillColor('#fff').font('Helvetica-Bold')
    .text('RELATÓRIO DETALHADO POR VEÍCULO', M + 62, y + 14, { width: pageW - 74 });
  doc.fontSize(9).fillColor('#c7d2ea').font('Helvetica')
    .text('Chemar Auto — Controle de Pedidos', M + 62, y + 36, { width: pageW - 74 });
  y += headerH + 14;

  // ---------- Dados do veículo ----------
  const v = dados.veiculo;
  doc.fontSize(10).fillColor(TEXT).font('Helvetica-Bold')
    .text(`Placa: ${v.placa}`, M, y, { width: pageW, lineBreak: false });
  doc.fontSize(9).fillColor('#444').font('Helvetica')
    .text(`Veículo: ${[v.marca, v.modelo].filter(Boolean).join(' ') || '-'}    |    Ano: ${v.ano || '-'}    |    Cor: ${v.cor || '-'}`, M, y + 14, { width: pageW });
  y += 30;
  const periodoTxt = `Período: ${dados.periodo || 'Todo o histórico'}    |    Gerado em: ${fmtDate(dados.geradoEm)}`;
  doc.fontSize(8).fillColor(MUTED).font('Helvetica').text(periodoTxt, M, y, { width: pageW });
  y += 16;
  doc.moveTo(M, y).lineTo(M + pageW, y).lineWidth(1).strokeColor(BORDER).stroke();
  y += 14;

  if (!dados.meses.length) {
    doc.fontSize(11).fillColor(MUTED).font('Helvetica')
      .text('Nenhum pedido registrado para este veículo.', M, y, { width: pageW, align: 'center' });
    return doc;
  }

  // ---------- Cards de resumo executivo ----------
  const totalItens = dados.meses.reduce((a, m) => a + m.itens.length, 0);
  const ticketMedio = totalItens > 0 ? dados.totalGeral / totalItens : 0;
  const kpis = [
    { label: 'TOTAL GASTO', value: fmtCurrency(dados.totalGeral) },
    { label: 'TOTAL DE ITENS', value: String(totalItens) },
    { label: 'TOTAL DE MESES', value: String(dados.meses.length) },
    { label: 'TICKET MÉDIO', value: fmtCurrency(ticketMedio) }
  ];
  const kpiGap = 8;
  const kpiW = (pageW - kpiGap * 3) / 4;
  const kpiH = 44;
  checkPage(kpiH + 20);
  kpis.forEach((kpi, i) => {
    const kx = M + i * (kpiW + kpiGap);
    doc.rect(kx, y, kpiW, kpiH).fill(BRAND_LIGHT);
    doc.rect(kx, y, kpiW, 3).fill(BRAND);
    doc.fontSize(6.5).fillColor(MUTED).font('Helvetica-Bold')
      .text(kpi.label, kx + 6, y + 10, { width: kpiW - 12, align: 'center' });
    doc.fontSize(kpi.value.length > 12 ? 10 : 12).fillColor(BRAND).font('Helvetica-Bold')
      .text(kpi.value, kx + 6, y + 22, { width: kpiW - 12, align: 'center' });
  });
  y += kpiH + 18;

  // ---------- Gráficos (vetoriais, sem canvas/JS) ----------
  const drawBarChart = (titulo, rows, color, valueFmt) => {
    if (!rows.length) return;
    const maxVal = Math.max(...rows.map(r => r.value), 0);
    const labelW = 78;
    const valueW = 72;
    const trackX = M + labelW + 8;
    const trackW = pageW - labelW - valueW - 16;
    const rowH = 17;
    const blockH = 24 + rows.length * rowH + 10;
    checkPage(blockH);

    doc.fontSize(10).fillColor(TEXT).font('Helvetica-Bold')
      .text(titulo, M, y, { width: pageW });
    y += 18;

    rows.forEach((r) => {
      const w = maxVal > 0 ? Math.max((r.value / maxVal) * trackW, r.value > 0 ? 2 : 0) : 0;
      doc.fontSize(8).fillColor(MUTED).font('Helvetica')
        .text(r.label, M, y + 2, { width: labelW, align: 'right', lineBreak: false });
      doc.rect(trackX, y, trackW, 11).fill('#eef1f6');
      if (w > 0) doc.rect(trackX, y, w, 11).fill(color);
      doc.fontSize(8).fillColor(TEXT).font('Helvetica-Bold')
        .text(valueFmt(r.value), trackX + trackW + 8, y + 2, { width: valueW, lineBreak: false });
      y += rowH;
    });
    y += 10;
  };

  drawBarChart(
    'Gastos por Mês',
    dados.meses.map(m => ({ label: m.label, value: Number(m.subtotal) || 0 })),
    BRAND,
    fmtCurrency
  );
  drawBarChart(
    'Pedidos por Mês',
    dados.meses.map(m => ({
      label: m.label,
      value: new Set(m.itens.map(i => i.numero_pedido)).size
    })),
    ACCENT,
    (n) => `${n} pedido${n === 1 ? '' : 's'}`
  );

  // ---------- Tabelas por mês ----------
  const cols = buildCols(pageW);
  const colGap = 4;
  const rowH = 13;

  for (let mi = 0; mi < dados.meses.length; mi++) {
    const mes = dados.meses[mi];
    checkPage(76);

    doc.rect(M, y, pageW, 20).fill(BRAND_LIGHT);
    doc.fontSize(10).fillColor(BRAND).font('Helvetica-Bold')
      .text(`${mes.label}   —   Subtotal: ${fmtCurrency(mes.subtotal)}   |   Aprovados: ${fmtCurrency(mes.subtotalAprovados)}`, M + 6, y + 5, { width: pageW - 12, lineBreak: false });
    y += 26;

    doc.fontSize(7).font('Helvetica-Bold').fillColor('#555');
    let x = M + 2;
    for (const col of cols) {
      doc.text(fitText(doc, col.label, col.width), x, y, { width: col.width, lineBreak: false });
      x += col.width + colGap;
    }
    y += 12;
    doc.moveTo(M, y).lineTo(M + pageW, y).lineWidth(0.5).strokeColor('#ccc').stroke();
    y += 4;

    for (let ii = 0; ii < mes.itens.length; ii++) {
      const item = mes.itens[ii];
      checkPage(rowH + 4);

      if (ii % 2 === 1) {
        doc.rect(M, y - 2, pageW, rowH).fill('#fafafa');
      }

      const vals = [
        fmtDate(item.data),
        item.numero_pedido || '-',
        item.peca_nome || '-',
        String(item.quantidade ?? '-'),
        fmtCurrency(item.valor_unitario),
        fmtCurrency(item.valor_total),
        item.fornecedor || '-',
        statusLabel(item.status)
      ];

      x = M + 2;
      for (let ci = 0; ci < cols.length; ci++) {
        const isStatus = ci === cols.length - 1;
        if (isStatus) doc.fillColor(statusColor(item.status)).font('Helvetica-Bold');
        else doc.fillColor('#333').font('Helvetica');
        doc.text(fitText(doc, vals[ci], cols[ci].width), x, y, { width: cols[ci].width, lineBreak: false });
        x += cols[ci].width + colGap;
      }
      y += rowH;
    }

    y += 2;
    doc.moveTo(M, y).lineTo(M + pageW, y).lineWidth(0.5).strokeColor('#ccc').stroke();
    y += 6;
    if (mi < dados.meses.length - 1) y += 8;
  }
  y += 6;

  // ---------- Total geral em destaque ----------
  checkPage(56);
  doc.rect(M, y, pageW, 30).fill(BRAND);
  doc.fontSize(11).fillColor('#fff').font('Helvetica-Bold')
    .text(`TOTAL GERAL: ${fmtCurrency(dados.totalGeral)}    |    Aprovados/Comprados/Finalizados: ${fmtCurrency(dados.totalAprovados)}`, M + 8, y + 9, { width: pageW - 16, lineBreak: false });
  y += 42;

  doc.fontSize(7).fillColor(MUTED).font('Helvetica')
    .text('Nota: O "Total Geral" inclui todos os pedidos (pendentes, aprovados, rejeitados). O total de aprovados contempla apenas pedidos com status aprovado, comprado ou concluído.', M, y, { width: pageW });

  // ---------- Numeração de páginas ----------
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    drawFooter(i + 1, totalPages);
  }

  return doc;
}

module.exports = gerarRelatorioVeiculoPDF;

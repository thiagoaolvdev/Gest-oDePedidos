const PDFDocument = require('pdfkit');
const { statusLabel, statusColor } = require('./statusMap');

const fmtCurrency = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const fmtDate = (valor) => {
  if (!valor) return '-';
  const d = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR');
};

const COL_PCTS = [
  { label: 'Data', pct: 9 },
  { label: 'Pedido', pct: 13 },
  { label: 'Peça', pct: 21 },
  { label: 'Qtd', pct: 6 },
  { label: 'Valor Unit.', pct: 11 },
  { label: 'Valor Total', pct: 11 },
  { label: 'Fornecedor', pct: 15 },
  { label: 'Status', pct: 14 }
];

const buildCols = (availWidth) => {
  const gap = 3;
  const avail = availWidth - gap * (COL_PCTS.length - 1);
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

function gerarRelatorioFrotaPDF(dados) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  let y = doc.page.margins.top;

  const checkPage = (needed) => {
    if (y + needed > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
      return true;
    }
    return false;
  };

  const drawFooter = (pageNum, totalPages) => {
    doc.fontSize(8).fillColor('#888')
      .text(`Página ${pageNum} de ${totalPages}`, doc.page.margins.left, doc.page.height - 25, { width: pageW, align: 'center' });
  };

  const COLS = buildCols(pageW - 8);

  // Title
  doc.fontSize(18).fillColor('#1a1d23').font('Helvetica-Bold')
    .text('Relatório de Gastos por Frota', 40, y, { width: pageW });
  y += 24;

  const periodoLabel = dados.periodo || 'Todo o histórico';
  doc.fontSize(11).fillColor('#444').font('Helvetica')
    .text(`Período: ${periodoLabel}`, 40, y, { width: pageW });
  y += 16;
  doc.fontSize(9).fillColor('#666')
    .text(`Total de veículos: ${dados.veiculos.length}`, 40, y, { width: pageW });
  y += 12;
  doc.fontSize(8).fillColor('#888')
    .text(`Gerado em: ${new Date(dados.geradoEm).toLocaleString('pt-BR')}`, 40, y, { width: pageW });
  y += 10;

  doc.moveTo(40, y).lineTo(40 + pageW, y).lineWidth(1).strokeColor('#d1d5db').stroke();
  y += 12;

  if (!dados.veiculos.length) {
    doc.fontSize(11).fillColor('#888').font('Helvetica')
      .text('Nenhum veículo com pedidos encontrado.', 40, y, { width: pageW, align: 'center' });
    return doc;
  }

  for (let vi = 0; vi < dados.veiculos.length; vi++) {
    const vd = dados.veiculos[vi];
    const v = vd.veiculo;

    checkPage(70);

    // Vehicle header
    doc.rect(40, y, pageW, 24).fill('#1a3d8f');
    doc.fontSize(11).fillColor('#fff').font('Helvetica-Bold')
      .text(`${v.placa}  —  ${v.marca || ''} ${v.modelo || ''}  |  Ano: ${v.ano || '-'}  |  Subtotal: ${fmtCurrency(vd.subtotal)}`, 46, y + 6, { width: pageW - 12 });
    y += 30;

    if (!vd.meses.length) {
      doc.fontSize(9).fillColor('#888').font('Helvetica')
        .text('Nenhum pedido para este veículo no período.', 46, y, { width: pageW });
      y += 16;
    }

    for (const mes of vd.meses) {
      checkPage(60);

      doc.rect(46, y, pageW - 6, 20).fill('#f0f4ff');
      doc.fontSize(9).fillColor('#1a3d8f').font('Helvetica-Bold')
        .text(`${mes.label}  —  Subtotal: ${fmtCurrency(mes.subtotal)}`, 52, y + 4, { width: pageW - 18 });
      y += 26;

      // Table header
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#555');
      let x = 48;
      for (const col of COLS) {
        doc.text(fitText(doc, col.label, col.width), x, y, { width: col.width, lineBreak: false });
        x += col.width + 3;
      }
      y += 13;
      doc.moveTo(46, y).lineTo(46 + pageW - 6, y).lineWidth(0.4).strokeColor('#ccc').stroke();
      y += 3;

      // Table rows
      doc.font('Helvetica').fontSize(7).fillColor('#333');
      for (let ii = 0; ii < mes.itens.length; ii++) {
        const item = mes.itens[ii];
        checkPage(14);

        if (ii % 2 === 1) {
          doc.rect(46, y - 2, pageW - 6, 11).fill('#fafafa');
        }

        x = 48;
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

        for (let ci = 0; ci < COLS.length; ci++) {
          if (ci === COLS.length - 1) {
            doc.fillColor(statusColor(item.status)).font('Helvetica-Bold')
              .text(fitText(doc, vals[ci], COLS[ci].width), x, y, { width: COLS[ci].width, lineBreak: false });
            doc.fillColor('#333').font('Helvetica');
          } else {
            doc.text(fitText(doc, vals[ci], COLS[ci].width), x, y, { width: COLS[ci].width, lineBreak: false });
          }
          x += COLS[ci].width + 3;
        }
        y += 11;
      }

      // Month subtotal
      y += 1;
      doc.moveTo(46, y).lineTo(46 + pageW - 6, y).lineWidth(0.3).strokeColor('#ccc').stroke();
      y += 3;
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#1a3d8f')
        .text(`Subtotal: ${fmtCurrency(mes.subtotal)}  |  Aprovados: ${fmtCurrency(mes.subtotalAprovados)}`, 48, y, { width: pageW - 12, lineBreak: false });
      y += 14;
    }

    // Vehicle subtotal
    checkPage(22);
    doc.moveTo(40, y).lineTo(40 + pageW, y).lineWidth(0.8).strokeColor('#1a3d8f').stroke();
    y += 4;
    doc.rect(40, y, pageW, 18).fill('#e8edf8');
    doc.fontSize(9).fillColor('#1a3d8f').font('Helvetica-Bold')
      .text(`Subtotal ${v.placa}: ${fmtCurrency(vd.subtotal)}  |  Aprovados: ${fmtCurrency(vd.subtotalAprovados)}`, 46, y + 4, { width: pageW - 12, lineBreak: false });
    y += 24;
  }

  // Total geral
  checkPage(50);
  y += 4;
  doc.moveTo(40, y).lineTo(40 + pageW, y).lineWidth(2).strokeColor('#1a3d8f').stroke();
  y += 6;
  doc.rect(40, y, pageW, 28).fill('#1a3d8f');
  doc.fontSize(11).fillColor('#fff').font('Helvetica-Bold')
    .text(`TOTAL GERAL DA FROTA: ${fmtCurrency(dados.totalGeral)}    |    Total Aprovados: ${fmtCurrency(dados.totalAprovados)}`, 46, y + 8, { width: pageW - 12 });
  y += 36;

  // Summary table
  checkPage(30 + dados.veiculos.length * 14);
  doc.fontSize(9).fillColor('#444').font('Helvetica-Bold')
    .text('Resumo por Veículo', 40, y, { width: pageW });
  y += 14;
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#555');
  doc.text('Placa', 48, y, { width: 80, lineBreak: false });
  doc.text('Veículo', 130, y, { width: 140, lineBreak: false });
  doc.text('Pedidos', 275, y, { width: 45, lineBreak: false });
  doc.text('Total', 350, y, { width: 80, lineBreak: false, align: 'right' });
  y += 11;
  doc.moveTo(46, y).lineTo(40 + pageW, y).lineWidth(0.4).strokeColor('#ccc').stroke();
  y += 3;

  doc.font('Helvetica').fontSize(7).fillColor('#333');
  for (const vd of dados.veiculos) {
    doc.text(vd.veiculo.placa, 48, y, { width: 80, lineBreak: false });
    doc.text(`${vd.veiculo.marca || ''} ${vd.veiculo.modelo || ''}`.trim() || '-', 130, y, { width: 140, lineBreak: false });
    doc.text(String(vd.meses.reduce((a, m) => a + m.itens.length, 0)), 275, y, { width: 45, lineBreak: false });
    doc.text(fmtCurrency(vd.subtotal), 350, y, { width: 80, lineBreak: false, align: 'right' });
    y += 13;
  }

  // Note
  y += 8;
  doc.fontSize(7).fillColor('#888').font('Helvetica')
    .text('Nota: O "Total Geral" inclui todos os pedidos. O "Total Aprovados" contempla apenas pedidos com status aprovado, comprado ou concluído.', 40, y, { width: pageW });

  // Page numbers
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    drawFooter(i + 1, totalPages);
  }

  return doc;
}

module.exports = gerarRelatorioFrotaPDF;

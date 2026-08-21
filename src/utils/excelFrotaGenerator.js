const ExcelJS = require('exceljs');
const { STATUS_MAP } = require('./statusMap');

const fmtCurrency = (v) => Number(v || 0).toFixed(2);
const fmtDate = (valor) => {
  if (!valor) return '-';
  const dt = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(dt.getTime())) return '-';
  return dt.toLocaleDateString('pt-BR');
};

const STATUS_COLORS = {
  pendente: 'FFFFF3CD',
  aguardando_aprovacao: 'FFFFF3CD',
  aprovado: 'FFD1E7DD',
  comprado: 'FFD1E7DD',
  concluido: 'FFD1E7DD',
  rejeitado: 'FFF5C2CB'
};

const STATUS_LABELS = STATUS_MAP;

async function gerarRelatorioFrotaExcel(dados) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema de Pedidos';
  wb.created = new Date();

  const ws = wb.addWorksheet('Relatorio Frota', {
    properties: { defaultColWidth: 15 }
  });

  const columns = [
    { header: 'Data', key: 'data', width: 13 },
    { header: 'Pedido', key: 'numero_pedido', width: 12 },
    { header: 'Peca', key: 'peca_nome', width: 30 },
    { header: 'Qtd', key: 'quantidade', width: 6 },
    { header: 'Valor Unit.', key: 'valor_unitario', width: 14 },
    { header: 'Valor Total', key: 'valor_total', width: 14 },
    { header: 'Fornecedor', key: 'fornecedor', width: 25 },
    { header: 'Status', key: 'status', width: 15 }
  ];

  const NUM_COLS = columns.length;

  // Title
  ws.mergeCells(`A1:${String.fromCharCode(64 + NUM_COLS)}1`);
  const titleCell = ws.getCell('A1');
  titleCell.value = 'Relatorio de Gastos por Frota';
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF1A1D23' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(1).height = 30;

  ws.mergeCells(`A2:${String.fromCharCode(64 + NUM_COLS)}2`);
  const infoCell = ws.getCell('A2');
  infoCell.value = `Periodo: ${dados.periodo || 'Todo o historico'}  |  Veiculos: ${dados.veiculos.length}`;
  infoCell.font = { size: 10, color: { argb: 'FF444444' } };
  ws.getRow(2).height = 20;

  ws.mergeCells(`A3:${String.fromCharCode(64 + NUM_COLS)}3`);
  const dateCell = ws.getCell('A3');
  dateCell.value = `Gerado em: ${new Date(dados.geradoEm).toLocaleString('pt-BR')}`;
  dateCell.font = { size: 9, color: { argb: 'FF888888' } };
  ws.getRow(3).height = 18;

  let currentRow = 5;

  for (const vd of dados.veiculos) {
    const v = vd.veiculo;

    // Vehicle header
    ws.mergeCells(`A${currentRow}:${String.fromCharCode(64 + NUM_COLS)}${currentRow}`);
    const vhcCell = ws.getCell(`A${currentRow}`);
    vhcCell.value = `${v.placa}  —  ${v.marca || ''} ${v.modelo || ''}  |  Ano: ${v.ano || '-'}  |  Subtotal: R$ ${vd.subtotal.toFixed(2).replace('.', ',')}`;
    vhcCell.font = { size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    vhcCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3D8F' } };
    vhcCell.alignment = { vertical: 'middle' };
    ws.getRow(currentRow).height = 24;
    currentRow++;

    for (const mes of vd.meses) {
      // Month header
      ws.mergeCells(`A${currentRow}:${String.fromCharCode(64 + NUM_COLS)}${currentRow}`);
      const mesCell = ws.getCell(`A${currentRow}`);
      mesCell.value = `${mes.label}  —  Subtotal: R$ ${mes.subtotal.toFixed(2).replace('.', ',')}`;
      mesCell.font = { size: 10, bold: true, color: { argb: 'FF1A3D8F' } };
      mesCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
      ws.getRow(currentRow).height = 20;
      currentRow++;

      // Table header
      const headerRow = ws.getRow(currentRow);
      columns.forEach((col, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = col.header;
        cell.font = { size: 9, bold: true, color: { argb: 'FF555555' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
      });
      headerRow.height = 20;
      currentRow++;

      // Data rows
      for (const item of mes.itens) {
        const row = ws.getRow(currentRow);
        const vals = [
          fmtDate(item.data),
          item.numero_pedido || '-',
          item.peca_nome || '-',
          item.quantidade,
          fmtCurrency(item.valor_unitario),
          fmtCurrency(item.valor_total),
          item.fornecedor || '-',
          STATUS_LABELS[item.status] || item.status || '-'
        ];

        vals.forEach((val, i) => {
          const cell = row.getCell(i + 1);
          cell.value = val;
          cell.font = { size: 9 };
          cell.border = { bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } } };
        });

        const statusCell = row.getCell(8);
        if (STATUS_COLORS[item.status]) {
          statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_COLORS[item.status] } };
          statusCell.font = { size: 9, bold: true };
        }

        row.getCell(5).numFmt = '#,##0.00';
        row.getCell(6).numFmt = '#,##0.00';
        row.getCell(5).alignment = { horizontal: 'right' };
        row.getCell(6).alignment = { horizontal: 'right' };
        row.getCell(4).alignment = { horizontal: 'center' };

        currentRow++;
      }

      // Month subtotal
      const subRow = ws.getRow(currentRow);
      ws.mergeCells(`A${currentRow}:E${currentRow}`);
      const subLabel = subRow.getCell(1);
      subLabel.value = `Subtotal ${mes.label}`;
      subLabel.font = { size: 9, bold: true, color: { argb: 'FF1A3D8F' } };
      subLabel.alignment = { horizontal: 'right' };
      const subVal = subRow.getCell(6);
      subVal.value = mes.subtotal;
      subVal.numFmt = '#,##0.00';
      subVal.font = { size: 9, bold: true, color: { argb: 'FF1A3D8F' } };
      subVal.alignment = { horizontal: 'right' };
      subRow.height = 20;
      currentRow += 2;
    }

    // Vehicle subtotal
    const vhcSubRow = ws.getRow(currentRow);
    ws.mergeCells(`A${currentRow}:${String.fromCharCode(64 + NUM_COLS)}${currentRow}`);
    const vhcSubCell = vhcSubRow.getCell(1);
    vhcSubCell.value = `Subtotal ${v.placa}: R$ ${vd.subtotal.toFixed(2).replace('.', ',')}  |  Aprovados: R$ ${vd.subtotalAprovados.toFixed(2).replace('.', ',')}`;
    vhcSubCell.font = { size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    vhcSubCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B5998' } };
    vhcSubCell.alignment = { vertical: 'middle' };
    vhcSubRow.height = 24;
    currentRow += 2;
  }

  // Total geral
  ws.mergeCells(`A${currentRow}:${String.fromCharCode(64 + NUM_COLS)}${currentRow}`);
  const totalCell = ws.getCell(`A${currentRow}`);
  totalCell.value = `TOTAL GERAL DA FROTA: R$ ${dados.totalGeral.toFixed(2).replace('.', ',')}  |  Total Aprovados: R$ ${dados.totalAprovados.toFixed(2).replace('.', ',')}`;
  totalCell.font = { size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3D8F' } };
  totalCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(currentRow).height = 28;
  currentRow += 2;

  // Summary table
  ws.mergeCells(`A${currentRow}:${String.fromCharCode(64 + NUM_COLS)}${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Resumo por Veiculo';
  ws.getCell(`A${currentRow}`).font = { size: 10, bold: true, color: { argb: 'FF1A1D23' } };
  currentRow++;

  const sumHeaders = ['Placa', 'Veiculo', 'Pedidos', 'Total Geral'];
  const sumColWidths = [14, 35, 10, 16];
  const sumRow = ws.getRow(currentRow);
  sumHeaders.forEach((h, i) => {
    const cell = sumRow.getCell(i + 1);
    cell.value = h;
    cell.font = { size: 9, bold: true, color: { argb: 'FF555555' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
  });
  currentRow++;

  for (const vd of dados.veiculos) {
    const row = ws.getRow(currentRow);
    row.getCell(1).value = vd.veiculo.placa;
    row.getCell(2).value = `${vd.veiculo.marca || ''} ${vd.veiculo.modelo || ''}`.trim() || '-';
    row.getCell(3).value = vd.meses.reduce((a, m) => a + m.itens.length, 0);
    row.getCell(4).value = vd.subtotal;
    row.getCell(4).numFmt = '#,##0.00';
    row.getCell(4).alignment = { horizontal: 'right' };
    row.getCell(1).font = { size: 9, bold: true };
    row.getCell(2).font = { size: 9 };
    row.getCell(3).font = { size: 9 };
    row.getCell(4).font = { size: 9, bold: true };
    currentRow++;
  }

  // Note
  currentRow++;
  ws.mergeCells(`A${currentRow}:${String.fromCharCode(64 + NUM_COLS)}${currentRow}`);
  const noteCell = ws.getCell(`A${currentRow}`);
  noteCell.value = 'Nota: O "Total Geral" inclui todos os pedidos. O "Total Aprovados" contempla apenas pedidos com status aprovado, comprado ou concluido.';
  noteCell.font = { size: 8, italic: true, color: { argb: 'FF888888' } };

  return wb;
}

module.exports = gerarRelatorioFrotaExcel;

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

async function gerarRelatorioVeiculoExcel(dados) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema de Pedidos';
  wb.created = new Date();

  const ws = wb.addWorksheet('Relatorio Veiculo', {
    properties: { defaultColWidth: 15 }
  });

  // Header - vehicle info
  ws.mergeCells('A1:H1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'Relatorio Detalhado por Veiculo';
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF1A1D23' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(1).height = 30;

  ws.mergeCells('A2:H2');
  const infoCell = ws.getCell('A2');
  infoCell.value = `Placa: ${dados.veiculo.placa}  |  Veiculo: ${dados.veiculo.marca || ''} ${dados.veiculo.modelo || ''}  |  Ano: ${dados.veiculo.ano || '-'}  |  Cor: ${dados.veiculo.cor || '-'}`;
  infoCell.font = { size: 10, color: { argb: 'FF444444' } };
  ws.getRow(2).height = 20;

  let nextRow = 3;
  if (dados.periodo) {
    ws.mergeCells(`A${nextRow}:H${nextRow}`);
    const periodoCell = ws.getCell(`A${nextRow}`);
    periodoCell.value = `Periodo: ${dados.periodo}`;
    periodoCell.font = { size: 10, bold: true, color: { argb: 'FF1A3D8F' } };
    ws.getRow(nextRow).height = 18;
    nextRow++;
  }

  ws.mergeCells(`A${nextRow}:H${nextRow}`);
  const dateCell = ws.getCell(`A${nextRow}`);
  dateCell.value = `Gerado em: ${new Date(dados.geradoEm).toLocaleString('pt-BR')}`;
  dateCell.font = { size: 9, color: { argb: 'FF888888' } };
  ws.getRow(nextRow).height = 18;
  nextRow++;

  // Blank row
  let currentRow = nextRow + 1;

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

  for (const mes of dados.meses) {
    // Month header
    ws.mergeCells(`A${currentRow}:H${currentRow}`);
    const mesCell = ws.getCell(`A${currentRow}`);
    mesCell.value = `${mes.label}  —  Subtotal: R$ ${mes.subtotal.toFixed(2).replace('.', ',')}`;
    mesCell.font = { size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    mesCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3D8F' } };
    mesCell.alignment = { vertical: 'middle' };
    ws.getRow(currentRow).height = 24;
    currentRow++;

    // Table header
    const headerRow = ws.getRow(currentRow);
    columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.font = { size: 9, bold: true, color: { argb: 'FF555555' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } }
      };
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
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFEEEEEE' } }
        };
      });

      // Status cell color
      const statusCell = row.getCell(8);
      if (STATUS_COLORS[item.status]) {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_COLORS[item.status] } };
        statusCell.font = { size: 9, bold: true };
      }

      // Currency format for value columns
      row.getCell(5).numFmt = '#,##0.00';
      row.getCell(6).numFmt = '#,##0.00';
      row.getCell(5).alignment = { horizontal: 'right' };
      row.getCell(6).alignment = { horizontal: 'right' };
      row.getCell(4).alignment = { horizontal: 'center' };

      currentRow++;
    }

    // Subtotal row
    const subRow = ws.getRow(currentRow);
    ws.mergeCells(`A${currentRow}:E${currentRow}`);
    const subLabel = subRow.getCell(1);
    subLabel.value = `Subtotal ${mes.label}  |  Aprovados: R$ ${mes.subtotalAprovados.toFixed(2).replace('.', ',')}`;
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

  // Total geral
  ws.mergeCells(`A${currentRow}:H${currentRow}`);
  const totalCell = ws.getCell(`A${currentRow}`);
  totalCell.value = `Total Geral (todos os status): R$ ${dados.totalGeral.toFixed(2).replace('.', ',')}  |  Total Aprovados/Comprados/Finalizados: R$ ${dados.totalAprovados.toFixed(2).replace('.', ',')}`;
  totalCell.font = { size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3D8F' } };
  totalCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(currentRow).height = 28;
  currentRow += 2;

  // Note
  ws.mergeCells(`A${currentRow}:H${currentRow}`);
  const noteCell = ws.getCell(`A${currentRow}`);
  noteCell.value = 'Nota: O "Total Geral" inclui todos os pedidos (pendentes, aprovados, rejeitados). O "Total Aprovados" contempla apenas pedidos com status aprovado, comprado ou concluido.';
  noteCell.font = { size: 8, italic: true, color: { argb: 'FF888888' } };

  // Auto-fit column widths (minimum from definition)
  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
  });

  return wb;
}

module.exports = gerarRelatorioVeiculoExcel;

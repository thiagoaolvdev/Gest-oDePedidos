const db = require('../config/database');
const { STATUS_MAP } = require('../utils/statusMap');

const STATUS_GASTO = "'aprovado','comprado','concluido'";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const normalizarPeriodo = (periodo = {}) => {
  const inicio = typeof periodo.dataInicio === 'string' ? periodo.dataInicio.trim() : '';
  const fim = typeof periodo.dataFim === 'string' ? periodo.dataFim.trim() : '';
  if (DATA_ISO.test(inicio) && DATA_ISO.test(fim)) {
    return { dataInicio: inicio, dataFim: fim };
  }
  return {};
};

const temPeriodo = (periodo = {}) => !!(periodo.dataInicio && periodo.dataFim);

const wherePeriodo = (alias, periodo = {}) =>
  temPeriodo(periodo) ? ` AND ${alias}.data_pedido BETWEEN ? AND ?` : '';

const paramsPeriodo = (periodo = {}) =>
  temPeriodo(periodo) ? [`${periodo.dataInicio} 00:00:00`, `${periodo.dataFim} 23:59:59`] : [];

const periodoAnteriorDe = (periodo) => {
  if (!temPeriodo(periodo)) return {};
  const inicio = new Date(`${periodo.dataInicio}T00:00:00`);
  const fim = new Date(`${periodo.dataFim}T00:00:00`);
  const duracaoMs = fim.getTime() - inicio.getTime();
  const prevFim = new Date(inicio.getTime() - 24 * 60 * 60 * 1000);
  const prevInicio = new Date(prevFim.getTime() - duracaoMs);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { dataInicio: iso(prevInicio), dataFim: iso(prevFim) };
};

const calcularVariacao = (atual, anterior) => {
  const a = Number(atual);
  const b = Number(anterior);
  if (!isFinite(a) || !isFinite(b) || anterior === null || anterior === undefined || b === 0) {
    return null;
  }
  return parseFloat((((a - b) / Math.abs(b)) * 100).toFixed(1));
};

const arredondar = (valor, casas = 1) => {
  if (valor === null || valor === undefined) return null;
  const n = Number(valor);
  if (!isFinite(n)) return null;
  return parseFloat(n.toFixed(casas));
};

const formatarValor = (unidade, valor) => {
  if (valor === null || valor === undefined || valor === '') return '-';
  const n = Number(valor);
  if (!isFinite(n)) return String(valor);
  switch (unidade) {
    case 'moeda':
      return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    case 'percentual':
      return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    case 'horas': {
      const h = Math.round(n);
      if (h <= 0) return '0h';
      const d = Math.floor(h / 24);
      const r = h % 24;
      return d > 0 ? `${d}d ${r}h` : `${h}h`;
    }
    case 'dias':
      return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${n === 1 ? 'dia' : 'dias'}`;
    default:
      return n.toLocaleString('pt-BR');
  }
};

const periodoTexto = (periodo = {}) => {
  if (!temPeriodo(periodo)) return 'Todo o período';
  const fmt = (iso) => iso.split('-').reverse().join('/');
  return `${fmt(periodo.dataInicio)} a ${fmt(periodo.dataFim)}`;
};

// Tendência dos últimos N meses de um KPI (para o sparkline do card).
// Reaproveita o calcular() de cada KPI rodando uma vez por mês retroativo.
const getTendencia = async (chave, pontos = 6) => {
  const hoje = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const resultado = [];
  for (let i = pontos - 1; i >= 0; i--) {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0);
    const valor = await KPIS[chave].calcular({ dataInicio: iso(inicio), dataFim: iso(fim) });
    resultado.push({
      label: inicio.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      valor: valor || 0
    });
  }
  return resultado;
};

const KPIS = {
  gasto_por_veiculo: {
    label: 'Gasto Total de Veículos',
    unidade: 'moeda',
    direcao: 'queda_boa',
    descricao: 'Soma dos valores de itens em pedidos aprovados, comprados ou concluídos.',
    async calcular(periodo) {
      const [rows] = await db.query(`
        SELECT COALESCE(SUM(pi.valor_total), 0) AS valor
        FROM pedido_itens pi
        JOIN pedidos p ON p.id = pi.pedido_id
        WHERE p.status IN (${STATUS_GASTO})${wherePeriodo('p', periodo)}
      `, paramsPeriodo(periodo));
      return arredondar(rows[0].valor, 2);
    },
    async detalhar(periodo) {
      const [rows] = await db.query(`
        SELECT v.placa, COALESCE(mo.nome, '-') AS modelo,
          COUNT(DISTINCT p.id) AS total_pedidos,
          SUM(pi.valor_total) AS total_gasto
        FROM pedido_itens pi
        JOIN pedidos p ON p.id = pi.pedido_id
        JOIN veiculos v ON v.id = p.veiculo_id
        LEFT JOIN modelos mo ON mo.id = v.modelo_id
        WHERE p.status IN (${STATUS_GASTO})${wherePeriodo('p', periodo)}
        GROUP BY v.id, v.placa, mo.nome
        ORDER BY total_gasto DESC
      `, paramsPeriodo(periodo));
      return {
        colunas: [
          { key: 'placa', label: 'Placa', tipo: 'texto' },
          { key: 'modelo', label: 'Modelo', tipo: 'texto' },
          { key: 'total_pedidos', label: 'Pedidos', tipo: 'numero' },
          { key: 'total_gasto', label: 'Total Gasto', tipo: 'moeda' }
        ],
        registros: rows.map(r => ({ ...r, total_gasto: arredondar(r.total_gasto, 2) }))
      };
    }
  },

  ticket_medio: {
    label: 'Ticket Médio por Pedido',
    unidade: 'moeda',
    direcao: 'neutro',
    descricao: 'Média do subtotal de itens por pedido criado no período.',
    async calcular(periodo) {
      const [rows] = await db.query(`
        SELECT AVG(subtotal) AS valor FROM (
          SELECT pi.pedido_id, SUM(pi.valor_total) AS subtotal
          FROM pedido_itens pi
          JOIN pedidos p ON p.id = pi.pedido_id
          WHERE 1=1${wherePeriodo('p', periodo)}
          GROUP BY pi.pedido_id
        ) t
      `, paramsPeriodo(periodo));
      return arredondar(rows[0].valor, 2);
    },
    async detalhar(periodo) {
      const [rows] = await db.query(`
        SELECT p.numero, p.data_pedido, v.placa,
          SUM(pi.valor_total) AS subtotal
        FROM pedido_itens pi
        JOIN pedidos p ON p.id = pi.pedido_id
        LEFT JOIN veiculos v ON v.id = p.veiculo_id
        WHERE 1=1${wherePeriodo('p', periodo)}
        GROUP BY p.id, p.numero, p.data_pedido, v.placa
        ORDER BY subtotal DESC
      `, paramsPeriodo(periodo));
      return {
        colunas: [
          { key: 'numero', label: 'Pedido', tipo: 'texto' },
          { key: 'data_pedido', label: 'Data', tipo: 'data' },
          { key: 'placa', label: 'Placa', tipo: 'texto' },
          { key: 'subtotal', label: 'Subtotal', tipo: 'moeda' }
        ],
        registros: rows.map(r => ({ ...r, subtotal: arredondar(r.subtotal, 2) }))
      };
    }
  },

  pedidos_em_atencao: {
    label: 'Pedidos em Atenção Agora',
    unidade: 'quantidade',
    direcao: 'queda_boa',
    sem_periodo: true,
    descricao: 'Pedidos com triagem preenchida que ainda estão pendentes de tratamento (aba Atenção).',
    async calcular() {
      const [rows] = await db.query(`
        SELECT COUNT(*) AS valor
        FROM pedidos
        WHERE triagem IS NOT NULL AND status = 'pendente'
      `);
      return Number(rows[0].valor);
    },
    async detalhar() {
      const [rows] = await db.query(`
        SELECT numero, triagem, data_pedido,
          TIMESTAMPDIFF(HOUR, data_pedido, NOW()) AS horas_em_atencao
        FROM pedidos
        WHERE triagem IS NOT NULL AND status = 'pendente'
        ORDER BY horas_em_atencao DESC
      `);
      return {
        colunas: [
          { key: 'numero', label: 'Pedido', tipo: 'texto' },
          { key: 'triagem', label: 'Triagem', tipo: 'texto' },
          { key: 'data_pedido', label: 'Criado em', tipo: 'datahora' },
          { key: 'horas_em_atencao', label: 'Horas em Atenção', tipo: 'horas' }
        ],
        registros: rows
      };
    }
  },

  tempo_aprovacao: {
    label: 'Tempo Médio de Aprovação',
    unidade: 'horas',
    direcao: 'queda_boa',
    descricao: 'Média de horas entre a criação e a aprovação dos pedidos do período.',
    async calcular(periodo) {
      const [rows] = await db.query(`
        SELECT AVG(TIMESTAMPDIFF(HOUR, p.data_pedido, p.data_aprovacao)) AS valor
        FROM pedidos p
        WHERE p.data_aprovacao IS NOT NULL AND p.data_aprovacao >= p.data_pedido${wherePeriodo('p', periodo)}
      `, paramsPeriodo(periodo));
      return arredondar(rows[0].valor, 1);
    },
    async detalhar(periodo) {
      const [rows] = await db.query(`
        SELECT p.numero, p.data_pedido, p.data_aprovacao,
          TIMESTAMPDIFF(HOUR, p.data_pedido, p.data_aprovacao) AS horas_para_aprovar
        FROM pedidos p
        WHERE p.data_aprovacao IS NOT NULL AND p.data_aprovacao >= p.data_pedido${wherePeriodo('p', periodo)}
        ORDER BY horas_para_aprovar DESC
      `, paramsPeriodo(periodo));
      return {
        colunas: [
          { key: 'numero', label: 'Pedido', tipo: 'texto' },
          { key: 'data_pedido', label: 'Criado em', tipo: 'datahora' },
          { key: 'data_aprovacao', label: 'Aprovado em', tipo: 'datahora' },
          { key: 'horas_para_aprovar', label: 'Horas para Aprovar', tipo: 'horas' }
        ],
        registros: rows
      };
    }
  },

  pedidos_parados: {
    label: 'Pedidos Parados > 48h',
    unidade: 'quantidade',
    direcao: 'queda_boa',
    sem_periodo: true,
    descricao: 'Pedidos em aberto sem atualização há mais de 48 horas (situação atual).',
    async calcular() {
      const [rows] = await db.query(`
        SELECT COUNT(*) AS valor
        FROM pedidos
        WHERE status NOT IN ('concluido', 'rejeitado', 'comprado')
          AND TIMESTAMPDIFF(HOUR, ultima_atualizacao, NOW()) > 48
      `);
      return Number(rows[0].valor);
    },
    async detalhar() {
      const [rows] = await db.query(`
        SELECT numero, status, ultima_atualizacao,
          TIMESTAMPDIFF(HOUR, ultima_atualizacao, NOW()) AS horas_parado
        FROM pedidos
        WHERE status NOT IN ('concluido', 'rejeitado', 'comprado')
          AND TIMESTAMPDIFF(HOUR, ultima_atualizacao, NOW()) > 48
        ORDER BY horas_parado DESC
      `);
      return {
        colunas: [
          { key: 'numero', label: 'Pedido', tipo: 'texto' },
          { key: 'status', label: 'Status', tipo: 'status' },
          { key: 'ultima_atualizacao', label: 'Última Atualização', tipo: 'datahora' },
          { key: 'horas_parado', label: 'Horas Parado', tipo: 'horas' }
        ],
        registros: rows
      };
    }
  },

  taxa_rejeicao: {
    label: 'Taxa de Rejeição',
    unidade: 'percentual',
    direcao: 'queda_boa',
    descricao: 'Percentual de pedidos rejeitados sobre o total de pedidos criados no período.',
    async calcular(periodo) {
      const [rows] = await db.query(`
        SELECT ROUND(SUM(p.status = 'rejeitado') / COUNT(*) * 100, 1) AS valor
        FROM pedidos p
        WHERE 1=1${wherePeriodo('p', periodo)}
      `, paramsPeriodo(periodo));
      return arredondar(rows[0].valor, 1);
    },
    async detalhar(periodo) {
      const [rows] = await db.query(`
        SELECT numero, data_pedido, motivo_rejeicao, valor_total
        FROM pedidos p
        WHERE status = 'rejeitado'${wherePeriodo('p', periodo)}
        ORDER BY data_pedido DESC
      `, paramsPeriodo(periodo));
      return {
        colunas: [
          { key: 'numero', label: 'Pedido', tipo: 'texto' },
          { key: 'data_pedido', label: 'Data', tipo: 'data' },
          { key: 'motivo_rejeicao', label: 'Motivo', tipo: 'texto' },
          { key: 'valor_total', label: 'Valor', tipo: 'moeda' }
        ],
        registros: rows.map(r => ({ ...r, valor_total: arredondar(r.valor_total, 2) }))
      };
    }
  },

  tempo_resposta_triagem: {
    label: 'Tempo Médio na Triagem',
    unidade: 'horas',
    direcao: 'queda_boa',
    descricao: 'Média de horas entre a criação e a saída da aba Atenção, para pedidos com triagem preenchida.',
    async calcular(periodo) {
      const [rows] = await db.query(`
        SELECT AVG(TIMESTAMPDIFF(HOUR, pedidos.data_pedido, pedidos.ultima_atualizacao)) AS valor
        FROM pedidos
        WHERE pedidos.triagem IS NOT NULL AND pedidos.status <> 'pendente'${wherePeriodo('pedidos', periodo)}
      `, paramsPeriodo(periodo));
      return arredondar(rows[0].valor, 1);
    },
    async detalhar(periodo) {
      const [rows] = await db.query(`
        SELECT numero, triagem, status, data_pedido, ultima_atualizacao,
          TIMESTAMPDIFF(HOUR, data_pedido, ultima_atualizacao) AS horas_ate_sair
        FROM pedidos
        WHERE triagem IS NOT NULL AND status <> 'pendente'${wherePeriodo('pedidos', periodo)}
        ORDER BY horas_ate_sair DESC
      `, paramsPeriodo(periodo));
      return {
        colunas: [
          { key: 'numero', label: 'Pedido', tipo: 'texto' },
          { key: 'triagem', label: 'Triagem', tipo: 'texto' },
          { key: 'status', label: 'Status Atual', tipo: 'status' },
          { key: 'data_pedido', label: 'Criado em', tipo: 'datahora' },
          { key: 'ultima_atualizacao', label: 'Saiu da Atenção em', tipo: 'datahora' },
          { key: 'horas_ate_sair', label: 'Horas na Triagem', tipo: 'horas' }
        ],
        registros: rows
      };
    }
  },

  concentracao_fornecedor: {
    label: 'Concentração no Maior Fornecedor',
    unidade: 'percentual',
    direcao: 'neutro',
    descricao: 'Participação do fornecedor com maior gasto no total do período (pedidos aprovados/comprados/concluídos).',
    async calcular(periodo) {
      const [geral] = await db.query(`
        SELECT COALESCE(SUM(pi.valor_total), 0) AS total_geral
        FROM pedido_itens pi
        JOIN pedidos p ON p.id = pi.pedido_id
        LEFT JOIN fornecedores f ON f.id = pi.fornecedor_id
        WHERE COALESCE(NULLIF(TRIM(pi.fornecedor_origem), ''), f.razao_social) IS NOT NULL
          AND p.status IN (${STATUS_GASTO})${wherePeriodo('p', periodo)}
      `, paramsPeriodo(periodo));
      const totalGeral = Number(geral[0].total_geral);
      if (!totalGeral) return null;
      const [maior] = await db.query(`
        SELECT MAX(total_fornecedor) AS maior FROM (
          SELECT COALESCE(NULLIF(TRIM(pi.fornecedor_origem), ''), f.razao_social) AS fornecedor,
            SUM(pi.valor_total) AS total_fornecedor
          FROM pedido_itens pi
          JOIN pedidos p ON p.id = pi.pedido_id
          LEFT JOIN fornecedores f ON f.id = pi.fornecedor_id
          WHERE COALESCE(NULLIF(TRIM(pi.fornecedor_origem), ''), f.razao_social) IS NOT NULL
            AND p.status IN (${STATUS_GASTO})${wherePeriodo('p', periodo)}
          GROUP BY fornecedor
        ) t
      `, paramsPeriodo(periodo));
      return arredondar((Number(maior[0].maior) / totalGeral) * 100, 1);
    },
    async detalhar(periodo) {
      const [geral] = await db.query(`
        SELECT COALESCE(SUM(pi.valor_total), 0) AS total_geral
        FROM pedido_itens pi
        JOIN pedidos p ON p.id = pi.pedido_id
        LEFT JOIN fornecedores f ON f.id = pi.fornecedor_id
        WHERE COALESCE(NULLIF(TRIM(pi.fornecedor_origem), ''), f.razao_social) IS NOT NULL
          AND p.status IN (${STATUS_GASTO})${wherePeriodo('p', periodo)}
      `, paramsPeriodo(periodo));
      const totalGeral = Number(geral[0].total_geral);
      if (!totalGeral) {
        return {
          colunas: [
            { key: 'fornecedor', label: 'Fornecedor', tipo: 'texto' },
            { key: 'total_gasto', label: 'Total Gasto', tipo: 'moeda' },
            { key: 'percentual_do_total', label: '% do Total', tipo: 'percentual' }
          ],
          registros: []
        };
      }
      const [rows] = await db.query(`
        SELECT COALESCE(NULLIF(TRIM(pi.fornecedor_origem), ''), f.razao_social) AS fornecedor,
          SUM(pi.valor_total) AS total_gasto,
          ROUND(SUM(pi.valor_total) / ?, 4) * 100 AS percentual_do_total
        FROM pedido_itens pi
        JOIN pedidos p ON p.id = pi.pedido_id
        LEFT JOIN fornecedores f ON f.id = pi.fornecedor_id
        WHERE COALESCE(NULLIF(TRIM(pi.fornecedor_origem), ''), f.razao_social) IS NOT NULL
          AND p.status IN (${STATUS_GASTO})${wherePeriodo('p', periodo)}
        GROUP BY fornecedor
        ORDER BY total_gasto DESC
      `, [totalGeral, ...paramsPeriodo(periodo)]);
      return {
        colunas: [
          { key: 'fornecedor', label: 'Fornecedor', tipo: 'texto' },
          { key: 'total_gasto', label: 'Total Gasto', tipo: 'moeda' },
          { key: 'percentual_do_total', label: '% do Total', tipo: 'percentual' }
        ],
        registros: rows.map(r => ({ ...r, total_gasto: arredondar(r.total_gasto, 2) }))
      };
    }
  },

  solicitantes_ativos: {
    label: 'Solicitantes Ativos',
    unidade: 'quantidade',
    direcao: 'neutro',
    descricao: 'Usuários distintos que criaram pedidos no período.',
    async calcular(periodo) {
      const [rows] = await db.query(`
        SELECT COUNT(DISTINCT p.usuario_id) AS valor
        FROM pedidos p
        WHERE 1=1${wherePeriodo('p', periodo)}
      `, paramsPeriodo(periodo));
      return Number(rows[0].valor);
    },
    async detalhar(periodo) {
      const [rows] = await db.query(`
        SELECT u.nome, COUNT(DISTINCT p.id) AS total_pedidos,
          SUM(pi.valor_total) AS total_gasto
        FROM pedidos p
        INNER JOIN usuarios u ON u.id = p.usuario_id
        LEFT JOIN pedido_itens pi ON pi.pedido_id = p.id
        WHERE 1=1${wherePeriodo('p', periodo)}
        GROUP BY u.id, u.nome
        ORDER BY total_pedidos DESC
      `, paramsPeriodo(periodo));
      return {
        colunas: [
          { key: 'nome', label: 'Solicitante', tipo: 'texto' },
          { key: 'total_pedidos', label: 'Pedidos', tipo: 'numero' },
          { key: 'total_gasto', label: 'Gasto Total', tipo: 'moeda' }
        ],
        registros: rows.map(r => ({ ...r, total_gasto: arredondar(r.total_gasto, 2) }))
      };
    }
  },

  taxa_duplicidade: {
    label: 'Taxa de Duplicidade Detectada',
    unidade: 'percentual',
    direcao: 'queda_boa',
    JANELA_HORAS: 48,
    descricao: 'Itens do período com a mesma peça para o mesmo veículo em pedidos distintos dentro de uma janela de 48h.',
    async calcular(periodo) {
      const janela = this.JANELA_HORAS;
      const [rows] = await db.query(`
        SELECT ROUND(COUNT(DISTINCT pi1.id) /
          NULLIF((SELECT COUNT(*) FROM pedido_itens pix
            JOIN pedidos px ON px.id = pix.pedido_id
            WHERE 1=1${wherePeriodo('px', periodo)}), 0) * 100, 1) AS valor
        FROM pedido_itens pi1
        JOIN pedidos p1 ON p1.id = pi1.pedido_id
        WHERE 1=1${wherePeriodo('p1', periodo)}
          AND pi1.peca_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM pedido_itens pi2
            JOIN pedidos p2 ON p2.id = pi2.pedido_id
            WHERE pi2.peca_id = pi1.peca_id
              AND p2.veiculo_id = p1.veiculo_id
              AND p2.id <> p1.id
              AND ABS(TIMESTAMPDIFF(HOUR, p1.data_pedido, p2.data_pedido)) <= ?
          )
      `, [...paramsPeriodo(periodo), ...paramsPeriodo(periodo), janela]);
      return arredondar(rows[0].valor, 1);
    },
    async detalhar(periodo) {
      const janela = this.JANELA_HORAS;
      const [rows] = await db.query(`
        SELECT p1.numero AS pedido_a, p2.numero AS pedido_b,
          pe.nome AS peca, v.placa,
          ABS(TIMESTAMPDIFF(HOUR, p1.data_pedido, p2.data_pedido)) AS diferenca_horas
        FROM pedido_itens pi1
        JOIN pedidos p1 ON p1.id = pi1.pedido_id
        JOIN pedido_itens pi2 ON pi2.peca_id = pi1.peca_id AND pi2.id > pi1.id
        JOIN pedidos p2 ON p2.id = pi2.pedido_id AND p2.veiculo_id = p1.veiculo_id
        JOIN pecas pe ON pe.id = pi1.peca_id
        JOIN veiculos v ON v.id = p1.veiculo_id
        WHERE 1=1${wherePeriodo('p1', periodo)}
          AND ABS(TIMESTAMPDIFF(HOUR, p1.data_pedido, p2.data_pedido)) <= ?
        GROUP BY p1.id, p2.id, p1.numero, p2.numero, pe.nome, v.placa, diferenca_horas
        ORDER BY diferenca_horas ASC
      `, [...paramsPeriodo(periodo), janela]);
      return {
        colunas: [
          { key: 'pedido_a', label: 'Pedido A', tipo: 'texto' },
          { key: 'pedido_b', label: 'Pedido B', tipo: 'texto' },
          { key: 'peca', label: 'Peça', tipo: 'texto' },
          { key: 'placa', label: 'Veículo', tipo: 'texto' },
          { key: 'diferenca_horas', label: 'Diferença', tipo: 'horas' }
        ],
        registros: rows
      };
    }
  }
};

const paraFormatoBarra = (registros, labelField, valorField, limite = 10) => {
  const top = registros.slice(0, limite);
  return {
    tipo: 'bar',
    labels: top.map(r => r[labelField]),
    valores: top.map(r => arredondar(r[valorField], 2))
  };
};

const paraFormatoLinha = async (chave) => {
  const pontos = await getTendencia(chave, 12);
  return {
    tipo: 'linha',
    labels: pontos.map(p => p.label),
    valores: pontos.map(p => p.valor)
  };
};

const PALETA_LINHAS = (i) => `hsl(${(i * 47) % 360}, 70%, 55%)`;

const GRAFICOS_KPI = {
  gasto_por_veiculo: (registros) => {
    const ordenados = [...registros].sort((a, b) => b.total_gasto - a.total_gasto);
    return {
      tipo: 'barras_horizontais',
      labels: ordenados.map(r => r.placa),
      valores: ordenados.map(r => arredondar(r.total_gasto, 2)),
      cores: ordenados.map((_r, i) => PALETA_LINHAS(i)),
      meta: ordenados.map(r => ({ modelo: r.modelo, pedidos: r.total_pedidos }))
    };
  },
  ticket_medio: (_registros, _periodo, chave) => paraFormatoLinha(chave),
  tempo_aprovacao: (_registros, _periodo, chave) => paraFormatoLinha(chave),
  pedidos_parados: (registros) => {
    const DIAS = 14;
    const hoje = new Date();
    const dias = [];
    for (let i = DIAS - 1; i >= 0; i--) {
      dias.push(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i));
    }
    const fimDoDia = (d) => d.getTime() + 24 * 60 * 60 * 1000;
    const top = registros.slice(0, 10);
    return {
      tipo: 'linha_multipla',
      labels: dias.map(d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
      mostrarLegenda: true,
      series: top.map((r, i) => {
        const inicio = r.ultima_atualizacao ? new Date(r.ultima_atualizacao).getTime() : null;
        return {
          label: r.numero,
          cor: PALETA_LINHAS(i),
          valores: dias.map(d => {
            if (!inicio) return null;
            const acumulado = Math.floor((fimDoDia(d) - inicio) / (60 * 60 * 1000));
            return Math.max(0, Math.min(acumulado, Number(r.horas_parado) || 0));
          })
        };
      })
    };
  },
  taxa_rejeicao: (_registros, _periodo, chave) => paraFormatoLinha(chave),
  concentracao_fornecedor: (registros) => {
    const top = registros.slice(0, 10);
    return {
      tipo: 'pizza',
      labels: top.map(r => r.fornecedor),
      valores: top.map(r => arredondar(r.percentual_do_total, 2))
    };
  },
  solicitantes_ativos: (registros) => paraFormatoBarra(registros, 'nome', 'total_pedidos'),
  taxa_duplicidade: (registros) => {
    const contagemPorPlaca = new Map();
    for (const r of registros) {
      if (!r.placa) continue;
      contagemPorPlaca.set(r.placa, (contagemPorPlaca.get(r.placa) || 0) + 1);
    }
    const top = [...contagemPorPlaca.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    return {
      tipo: 'bar',
      labels: top.map(e => e[0]),
      valores: top.map(e => e[1])
    };
  }
};

class KpiService {
  getChaves() {
    return Object.keys(KPIS);
  }

  existe(chave) {
    return Object.prototype.hasOwnProperty.call(KPIS, chave);
  }

  _erroSchemaEntrega(err) {
    return err && err.code === 'ER_BAD_FIELD_ERROR' &&
      String(err.message || '').includes('data_entrega_real');
  }

  async getKpi(chave, periodoRaw = {}) {
    const kpi = KPIS[chave];
    if (!kpi) {
      throw Object.assign(new Error('KPI não encontrado'), { statusCode: 404 });
    }
    const periodo = kpi.sem_periodo ? {} : normalizarPeriodo(periodoRaw);

    const resultado = {
      chave,
      label: kpi.label,
      unidade: kpi.unidade,
      direcao: kpi.direcao,
      descricao: kpi.descricao,
      sem_periodo: !!kpi.sem_periodo,
      periodoTexto: kpi.sem_periodo ? 'Agora' : periodoTexto(periodo),
      valor: null,
      variacao: null,
      indisponivel: false
    };

    let valorAtual;
    try {
      valorAtual = await kpi.calcular(periodo);
    } catch (err) {
      if (this._erroSchemaEntrega(err)) {
        resultado.indisponivel = true;
        resultado.motivo = 'Recurso em implantação: execute a migração 019 para habilitar este indicador';
        return resultado;
      }
      throw err;
    }

    if (kpi.requerDadosMinimos && (valorAtual === null || valorAtual === undefined)) {
      resultado.indisponivel = true;
      resultado.motivo = 'Aguardando dados de entrega real suficientes';
      return resultado;
    }

    resultado.valor = valorAtual;

    if (!kpi.sem_periodo && temPeriodo(periodo)) {
      try {
        const valorAnterior = await kpi.calcular(periodoAnteriorDe(periodo));
        resultado.variacao = calcularVariacao(valorAtual, valorAnterior);
      } catch (err) {
        if (this._erroSchemaEntrega(err)) {
          resultado.variacao = null;
        } else {
          throw err;
        }
      }
    }

    // Sparkline: apenas para KPIs com suporte a período e disponíveis.
    // Falha aqui é enriquecimento opcional — não derruba o KPI.
    if (!kpi.sem_periodo && valorAtual !== null && valorAtual !== undefined) {
      try {
        resultado.tendencia = await getTendencia(chave);
      } catch (err) {
        console.error(`[KPI] tendencia de ${chave} indisponivel:`, err.message);
      }
    }

    return resultado;
  }

  async getTodosKpis(periodoRaw = {}) {
    const chaves = this.getChaves();
    const lista = await Promise.all(chaves.map(chave =>
      this.getKpi(chave, periodoRaw).catch(() => ({
        chave,
        label: KPIS[chave].label,
        unidade: KPIS[chave].unidade,
        direcao: KPIS[chave].direcao,
        sem_periodo: !!KPIS[chave].sem_periodo,
        valor: null,
        variacao: null,
        indisponivel: true,
        motivo: 'Não foi possível calcular este indicador agora'
      }))
    ));
    return { periodoTexto: periodoTexto(normalizarPeriodo(periodoRaw)), kpis: lista };
  }

  async getGraficoKpi(chave, periodoRaw = {}, registros = []) {
    const construir = GRAFICOS_KPI[chave];
    if (!construir || !this.existe(chave)) return null;
    try {
      const kpi = KPIS[chave];
      const periodo = kpi.sem_periodo ? {} : normalizarPeriodo(periodoRaw);
      return await construir(registros || [], periodo, chave);
    } catch (err) {
      console.error(`[KPI] grafico de ${chave} indisponivel:`, err.message);
      return null;
    }
  }

  async detalhar(chave, periodoRaw = {}) {
    const kpi = KPIS[chave];
    if (!kpi) {
      throw Object.assign(new Error('KPI não encontrado'), { statusCode: 404 });
    }
    const periodo = kpi.sem_periodo ? {} : normalizarPeriodo(periodoRaw);

    const resumo = await this.getKpi(chave, periodoRaw);
    if (resumo.indisponivel) {
      return { ...resumo, colunas: [], registros: [] };
    }

    const { colunas, registros } = await kpi.detalhar(periodo);
    const limiteRegistros = 500;

    return {
      ...resumo,
      colunas,
      registros: registros.slice(0, limiteRegistros),
      total_registros: registros.length
    };
  }
}

module.exports = KpiService;
module.exports.formatarValor = formatarValor;
module.exports.periodoTexto = periodoTexto;
module.exports.STATUS_MAP_LABELS = STATUS_MAP;

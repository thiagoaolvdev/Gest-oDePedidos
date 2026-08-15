let user = null;
let charts = {};
let currentPage = 'dashboard';

const ROLE_INFO = {
  mecanico: { label: 'Mecânico', icon: 'bi-wrench', color: 'secondary', desc: 'Execução dos serviços nos veículos' },
  oficina: { label: 'Oficina', icon: 'bi-tools', color: 'secondary', desc: 'Cadastro de veículos e criação de pedidos' },
  logistica: { label: 'Logística', icon: 'bi-truck', color: 'info', desc: 'Atualização de status e fornecedores' },
  garantia: { label: 'Garantia', icon: 'bi-shield-check', color: 'success', desc: 'Gestão de usuários e cadastros' },
  funilaria: { label: 'Funilaria', icon: 'bi-brush', color: 'warning', desc: 'Funilaria e cadastros' },
  administrativo: { label: 'Administrativo', icon: 'bi-people-fill', color: 'dark', desc: 'Replica do diretor, gestão de usuários' },
  diretor: { label: 'Diretor', icon: 'bi-star', color: 'danger', desc: 'Gestão completa, aprovação de pedidos e auditoria' }
};

const SETORES = ['Oficina', 'Funilaria', 'Garantia', 'Logística', 'Diretor', 'Administrativo'];

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get('token');
  if (urlToken) {
    localStorage.setItem('token', urlToken);
    API.token = urlToken;
    window.history.replaceState({}, document.title, '/app');
  }
  if (!API.token) { window.location.href = '/'; return; }
  try {
    user = await API.get('/auth/me');
    localStorage.setItem('user', JSON.stringify(user));
  } catch { API.logout(); return; }
  renderUserInfo();
  applyPermissions();
  initUI();
  navigate('dashboard');
});

function renderUserInfo() {
  const info = ROLE_INFO[user.perfil] || { label: user.perfil, color: 'secondary' };
  const initial = user.nome?.charAt(0)?.toUpperCase() || 'U';
  document.getElementById('userName').textContent = user.nome;
  document.getElementById('userPerfil').textContent = info.label;
  document.getElementById('sidebarUserName').textContent = user.nome;
  document.getElementById('sidebarUserRole').textContent = info.label;
  document.getElementById('topbarAvatar').textContent = initial;
  document.getElementById('sidebarAvatar').textContent = initial;
}

function applyPermissions() {
  const p = user.perfil;
  const show = (id, cond) => { const el = document.getElementById(id); if (el) el.style.display = cond ? '' : 'none'; };
  show('navDashboard', true);
  show('sectionCadastros', ['oficina', 'logistica', 'garantia', 'funilaria', 'administrativo', 'diretor'].includes(p));
  show('navVehicles', ['oficina', 'logistica', 'garantia', 'funilaria', 'administrativo', 'diretor'].includes(p));
  show('navMarcas', false);
  show('navModelos', false);
  show('navParts', ['garantia', 'funilaria', 'administrativo', 'diretor'].includes(p));
  show('navFornecedores', false);
  show('sectionAdmin', ['garantia', 'funilaria', 'administrativo', 'diretor'].includes(p));
  show('navUsers', ['administrativo'].includes(p));
  show('navCategorias', ['garantia', 'funilaria', 'administrativo', 'diretor'].includes(p));
  show('navAudit', ['diretor', 'administrativo'].includes(p));
}

function initUI() {
  // Sidebar toggle
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('show');
    if (sidebar.classList.contains('show')) {
      const bd = document.createElement('div');
      bd.className = 'sidebar-backdrop';
      bd.id = 'sbBackdrop';
      bd.onclick = () => sidebar.classList.remove('show');
      document.body.appendChild(bd);
    } else document.getElementById('sbBackdrop')?.remove();
  });

  // Nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.dataset.page);
      document.getElementById('sidebar')?.classList.remove('show');
      document.getElementById('sbBackdrop')?.remove();
    });
  });

  // Profile link in dropdown
  document.querySelector('.dropdown-menu a[data-page="profile"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('profile');
  });

  // Theme
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-bs-theme', saved);
  updateThemeIcon(saved);
  document.getElementById('themeToggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-bs-theme');
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
    if (currentPage === 'dashboard') {
      setTimeout(() => PAGES.dashboard(), 100);
    }
  });

  // Logout
  const doLogout = () => {
    API.post('/auth/logout', { refreshToken: API.refreshToken }).catch(() => {});
    API.logout();
  };
  document.getElementById('logoutBtn').addEventListener('click', (e) => { e.preventDefault(); doLogout(); });
  document.getElementById('logoutBtnSidebar').addEventListener('click', (e) => { e.preventDefault(); doLogout(); });

  // Notifications
  initNotifications();
}

function updateThemeIcon(theme) {
  document.getElementById('themeIcon').className = theme === 'light' ? 'bi bi-moon-stars' : 'bi bi-sun';
}

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const titles = {
    dashboard: 'Dashboard', vehicles: 'Veículos', marcas: 'Marcas', modelos: 'Modelos', parts: 'Peças',
    orders: 'Pedidos', orders_urgentes: 'Urgentes', orders_pendente: 'Pendentes', orders_aprovado: 'Aprovados', orders_aguardando_aprovacao: 'Aguardando Aprovação',
    entregas_chegou: 'Entregues',
    users: 'Usuários', audit: 'Auditoria',
    fornecedores: 'Fornecedores', categorias: 'Categorias', profile: 'Meu Perfil'
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.innerHTML = `<i class="bi ${getPageIcon(page)} me-2"></i>${titles[page] || page}`;
  const content = document.getElementById('pageContent');
  content.classList.remove('fade-in');
  void content.offsetWidth;
  (PAGES[page] || PAGES.dashboard)();
  content.classList.add('fade-in');
}

function getPageIcon(page) {
  const icons = {
    dashboard: 'bi-speedometer2', vehicles: 'bi-truck', marcas: 'bi-bookmark', modelos: 'bi-diagram-3', parts: 'bi-gear',
    orders: 'bi-clipboard-check', orders_urgentes: 'bi-alarm', orders_pendente: 'bi-clock', orders_aprovado: 'bi-check-circle', orders_aguardando_aprovacao: 'bi-hourglass-split',
    entregas_chegou: 'bi-truck',
    users: 'bi-people', audit: 'bi-journal-text',
    fornecedores: 'bi-shop', categorias: 'bi-tags', profile: 'bi-person-circle'
  };
  return icons[page] || 'bi-speedometer2';
}

// ===== TOAST =====
function toast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  const colors = { success: '#198754', danger: '#dc3545', warning: '#ffc107', info: '#0dcaf0', dark: '#212529' };
  const icons = { success: 'bi-check-circle-fill', danger: 'bi-exclamation-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
  const id = `t-${Date.now()}`;
  const html = `<div id="${id}" class="toast-custom" style="background:${colors[type] || '#212529'}"><i class="bi ${icons[type] || 'bi-info-circle'}"></i>${msg}</div>`;
  c.insertAdjacentHTML('beforeend', html);
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }
  }, 4000);
  document.getElementById(id)?.addEventListener('click', () => document.getElementById(id)?.remove());
}

// ===== MODAL =====
let _lastModal = null;
function modal(html, size = 'md') {
  if (_lastModal) {
    _lastModal.hide();
  }
  const w = document.createElement('div');
  w.innerHTML = `<div class="modal fade" id="dynamicModal" tabindex="-1"><div class="modal-dialog modal-${size} modal-dialog-centered modal-dialog-scrollable"><div class="modal-content">${html}</div></div></div>`;
  const el = w.firstElementChild;
  document.body.appendChild(el);
  const m = new bootstrap.Modal(el);
  m.show();
  _lastModal = m;
  el.addEventListener('hidden.bs.modal', () => { el.remove(); if (_lastModal === m) _lastModal = null; });
  return m;
}

// ===== HELPERS =====
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('pt-BR') : '-'; }
function fmtCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
const STATUS_MAP = { pendente: 'Pendente', em_compra: 'Em Compra', aguardando_aprovacao: 'Aguarda Aprovação', novo_orcamento: 'Novo Orçamento', aprovado: 'Aprovado', rejeitado: 'Cancelado', comprado: 'Comprado', concluido: 'Concluído' };
const DIRECTOR_APPROVAL_LIMIT = 599;
function statusLabel(s) { return STATUS_MAP[s] || s; }
function statusBadge(s) { return `<span class="status-badge status-${s}">${statusLabel(s)}</span>`; }
function entregaBadge(s) {
  const cls = s === 'chegou' ? 'status-aprovado' : s === 'em_transito' ? 'status-em_compra' : 'status-pendente';
  const lbl = { pendente: 'Pendente', em_transito: 'Em Trânsito', chegou: 'Chegou' }[s] || 'Pendente';
  return `<span class="status-badge ${cls}">${lbl}</span>`;
}
function renderOrderNumero(o) {
  const horas = o.horas_sem_resposta || 0;
  if (!o.urgente) return `<strong>${o.numero}</strong>`;
  return `<strong class="text-danger">${o.numero}</strong> <span class="badge rounded-pill text-bg-danger urgente-badge" title="Sem resposta há ${horas} horas"><i class="bi bi-exclamation-triangle me-1"></i>${horas}h sem resposta</span>`;
}
function renderOrderRowClass(o) { return o.urgente ? ' class="order-urgent"' : ''; }
function nextStatuses(current, perfil) {
  const flow = ['pendente', 'em_compra', 'aguardando_aprovacao', 'novo_orcamento', 'aprovado', 'comprado', 'concluido'];
  const idx = flow.indexOf(current);
  if (idx === -1) return [];
  if (current === 'aguardando_aprovacao') return ['diretor', 'administrativo'].includes(perfil) ? ['aprovado', 'rejeitado'] : [];
  if (current === 'novo_orcamento') return perfil === 'logistica' ? ['aguardando_aprovacao'] : [];
  const avail = flow.slice(idx + 1).filter(s => s !== 'aguardando_aprovacao');
  if (['diretor', 'administrativo'].includes(perfil)) return avail;
  return avail.filter(s => s !== 'aprovado' && s !== 'rejeitado');
}

function renderPagination(data, fn) {
  if (!data || data.total <= data.limit) return '';
  const tp = Math.ceil(data.total / data.limit);
  const cur = data.page;
  const pages = [];
  for (let i = Math.max(1, cur - 2); i <= Math.min(tp, cur + 2); i++) pages.push(i);
  return `<nav><ul class="pagination pagination-sm justify-content-center mb-0 mt-3">
    <li class="page-item ${cur <= 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="${fn}(${cur - 1});return false;">«</a></li>
    ${pages.map(p => `<li class="page-item ${p === cur ? 'active' : ''}"><a class="page-link" href="#" onclick="${fn}(${p});return false;">${p}</a></li>`).join('')}
    <li class="page-item ${cur >= tp ? 'disabled' : ''}"><a class="page-link" href="#" onclick="${fn}(${cur + 1});return false;">»</a></li>
  </ul></nav>`;
}

function getOrderSupplierId(order) {
  return order?.itens?.find((item) => item.fornecedor_id)?.fornecedor_id || null;
}

function getNextLogisticsAction(order) {
  if (!order) return null;
  if (order.status === 'aprovado') {
    return {
      type: 'status',
      value: 'comprado',
      label: 'Marcar como Comprado',
      busyLabel: 'Marcando como Comprado...'
    };
  }
  if (order.status === 'comprado') {
    if (order.status_entrega !== 'chegou') {
      return {
        type: 'entrega',
        value: 'chegou',
        label: 'Marcar como Chegou',
        busyLabel: 'Atualizando entrega...'
      };
    }
    return {
      type: 'status',
      value: 'concluido',
      label: 'Concluir Pedido',
      busyLabel: 'Concluindo pedido...'
    };
  }
  return null;
}

function getOrderOrigins(order) {
  const origins = (order?.itens || [])
    .map((item) => String(item.fornecedor_origem || '').trim())
    .filter(Boolean);
  return [...new Set(origins)].join(', ');
}

function getOrderVehicleLabel(order) {
  const parts = [order?.veiculo_marca, order?.veiculo_modelo].filter(Boolean);
  return parts.join(' ').trim() || order?.placa || '';
}

function openHtmlInNewTab(html) {
  const win = window.open('', '_blank');
  if (!win) {
    toast('Permita pop-ups para abrir a impressão', 'warning');
    return null;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return win;
}

async function fetchHtmlWithAuth(path) {
  const headers = {};
  if (API.token) headers.Authorization = `Bearer ${API.token}`;
  const res = await fetch(`${API.baseUrl}${path}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro ao abrir impressão' }));
    throw err;
  }
  return res.text();
}

async function printOrderCompra(pedidoId) {
  const win = window.open('', '_blank');
  if (!win) {
    toast('Permita pop-ups para abrir a impressão', 'warning');
    return;
  }
  try {
    const html = await fetchHtmlWithAuth(`/pedidos/${pedidoId}/ordem-compra/pdf`);
    win.document.open();
    win.document.write(html);
    win.document.close();
  } catch (err) {
    win.close();
    toast(err.error || 'Erro ao abrir ordem de compra', 'danger');
  }
}

async function openOrdemCompraFlow(order) {
  if (order.ordem_compra_id) {
    await printOrderCompra(order.id);
    return;
  }
  const supplierId = getOrderSupplierId(order);
  let fornecedor = null;
  if (supplierId) {
    try {
      fornecedor = await API.get(`/fornecedores/${supplierId}`);
    } catch (err) {
      toast(err.error || 'Erro ao carregar fornecedor', 'danger');
      return;
    }
  }
  await openOrdemCompraModal(order, fornecedor);
}

function buildOcItems(order) {
  return (order.itens || []).map((item) => ({
    descricao: item.item_nome || item.descricao || item.peca_nome || '',
    quantidade: Number(item.quantidade || 0),
    unidade: item.unidade || 'un',
    valor_unitario: Number(item.valor_unitario || 0),
    valor_total: Number(item.valor_total || (Number(item.quantidade || 0) * Number(item.valor_unitario || 0))),
    ci_os: item.ci_os || item.peca_codigo || '',
    aplicacao: order.placa || '',
    origem: item.fornecedor_origem || ''
  })).filter((item) => item.descricao);
}

async function openOrdemCompraModal(order, fornecedor) {
  const items = buildOcItems(order);
  const subtotal = items.reduce((sum, item) => sum + item.valor_total, 0);
  const approvedTotal = Number(order.valor_total || subtotal);
  const today = new Date().toISOString().slice(0, 10);
  const vehicleLabel = getOrderVehicleLabel(order);
  const originName = getOrderOrigins(order);
  const supplierName = fornecedor?.razao_social || fornecedor?.nome_fantasia || originName || '';
  const supplierPhone = fornecedor?.telefone || '';
  const supplierAddress = fornecedor?.endereco || '';
  const m = modal(`
    <div class="modal-header">
      <h5 class="modal-title fw-bold">Gerar Ordem de Compra${order.numero ? ' — Pedido ' + escapeHtml(String(order.numero)) : ''}</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
    </div>
    <div class="modal-body">
      <div class="alert alert-info small mb-3">
        Os itens do pedido serão reaproveitados automaticamente. Revise os campos da OC antes de imprimir.
      </div>
      <form id="ocForm">
        <div class="row g-3">
            <div class="col-md-8">
            <label class="form-label">Fornecedor *</label>
            <input class="form-control" name="fornecedor_nome" required placeholder="Nome do fornecedor" value="${escapeHtml(supplierName)}">
          </div>
          <div class="col-md-4">
            <label class="form-label">Telefone *</label>
            <input class="form-control" name="fornecedor_telefone" required placeholder="Telefone" value="${escapeHtml(supplierPhone)}">
          </div>
          <div class="col-12">
            <label class="form-label">Endereço *</label>
            <input class="form-control" name="fornecedor_endereco" required placeholder="Endereço completo" value="${escapeHtml(supplierAddress)}">
          </div>
          <div class="col-md-4">
            <label class="form-label">Tipo *</label>
            <select class="form-select" name="tipo" required>
              <option value="">Selecione...</option>
              <option value="contrato">Contrato</option>
              <option value="concorrencia">Concorrência</option>
              <option value="simples">Simples</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label">Prazo de entrega *</label>
            <input type="date" class="form-control" name="prazo_entrega" required>
          </div>
            <div class="col-md-4">
            <label class="form-label">Data de emissão *</label>
            <input type="date" class="form-control" name="data_emissao" required value="${today}">
          </div>
          <div class="col-12">
            <label class="form-label">Condições de pagamento *</label>
            <input class="form-control" name="condicoes_pagamento" required placeholder="Forma + responsável">
          </div>
            <div class="col-md-4">
            <label class="form-label">Veículo</label>
            <input class="form-control" name="veiculo_uso" value="${escapeHtml(vehicleLabel)}" placeholder="Veículo">
          </div>
          <div class="col-md-4">
            <label class="form-label">Placa</label>
            <input class="form-control" name="placa_uso" value="${escapeHtml(order.placa || '')}" placeholder="Placa">
          </div>
          <div class="col-md-4">
            <label class="form-label">Data do pedido</label>
            <input class="form-control" value="${fmtDate(order.data_pedido)}" disabled>
          </div>
          <div class="col-md-4">
            <label class="form-label">Subtotal</label>
            <input class="form-control" id="ocSubtotal" value="${fmtCurrency(approvedTotal)}" disabled>
          </div>
          <div class="col-md-4">
            <label class="form-label">Total</label>
            <input class="form-control" id="ocTotal" value="${fmtCurrency(approvedTotal)}" disabled>
          </div>
          <div class="col-12">
            <label class="form-label">Observações</label>
            <textarea class="form-control" name="observacoes" rows="3" placeholder="Campo livre">${escapeHtml(order.observacoes || '')}</textarea>
          </div>
        </div>
      </form>

      <div class="mt-4">
        <h6 class="fw-semibold mb-2">Itens que vão para a OC</h6>
        <div class="table-responsive">
          <table class="table table-sm table-bordered align-middle">
            <thead class="table-light">
              <tr>
                <th>Qtd</th>
                <th>Un</th>
                <th>Descrição</th>
                <th>Unitário</th>
                <th>Total</th>
                <th>Aplicação</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item) => `<tr>
                <td class="text-center">${item.quantidade}</td>
                <td class="text-center">${escapeHtml(item.unidade || 'un')}</td>
                <td>${escapeHtml(item.descricao)}</td>
                <td class="text-end">${fmtCurrency(item.valor_unitario)}</td>
                <td class="text-end">${fmtCurrency(item.valor_total)}</td>
                <td>${escapeHtml(item.aplicacao || '')}</td>
                <td>${escapeHtml(item.origem || '—')}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-primary" id="ocSubmit" disabled>Gerar e Imprimir</button>
    </div>`, 'lg');

  const form = document.getElementById('ocForm');
  const submitBtn = document.getElementById('ocSubmit');
  const totalInput = document.getElementById('ocTotal');
  const subtotalInput = document.getElementById('ocSubtotal');
  const updateTotals = () => {
    subtotalInput.value = fmtCurrency(approvedTotal);
    totalInput.value = fmtCurrency(approvedTotal);
  };
  const updateSubmitState = () => {
    const requiredFields = [...form.querySelectorAll('[required]')];
    const valid = requiredFields.every((field) => String(field.value || '').trim().length > 0);
    submitBtn.disabled = !valid;
  };
  form.addEventListener('input', () => { updateTotals(); updateSubmitState(); });
  form.addEventListener('change', () => { updateTotals(); updateSubmitState(); });
  updateTotals();
  updateSubmitState();

  submitBtn.addEventListener('click', async () => {
    const payload = {
      fornecedor_id: getOrderSupplierId(order),
      fornecedor_nome: form.fornecedor_nome.value.trim(),
      fornecedor_endereco: form.fornecedor_endereco.value.trim(),
      fornecedor_telefone: form.fornecedor_telefone.value.trim(),
      tipo: form.tipo.value,
      prazo_entrega: form.prazo_entrega.value,
      data_emissao: form.data_emissao.value,
      condicoes_pagamento: form.condicoes_pagamento.value.trim(),
      veiculo_uso: form.veiculo_uso.value.trim(),
      placa_uso: form.placa_uso.value.trim(),
      observacoes: form.observacoes.value.trim(),
      itens: items
    };
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Gerando...';
    try {
      await API.post(`/pedidos/${order.id}/ordem-compra`, payload);
      m.hide();
      toast('Ordem de compra gerada');
      await printOrderCompra(order.id);
    } catch (err) {
      toast((err.fields?.length ? `${err.error}: ${err.fields.join(', ')}` : err.error) || 'Erro ao gerar ordem de compra', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Gerar e Imprimir';
    }
  });
}

// ===== NOTIFICATIONS =====
function initNotifications() {
  loadNotifs();
  setInterval(loadNotifs, 30000);
  document.getElementById('markAllRead')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await API.patch('/notifications/read-all'); loadNotifs(); } catch {}
  });
}

async function loadNotifs() {
  try {
    const d = await API.get('/notifications?limit=10');
    const badge = document.getElementById('notifBadge');
    const list = document.getElementById('notifList');
    const empty = document.getElementById('notifEmpty');
    if (d.unread > 0) { badge.classList.remove('d-none'); badge.textContent = d.unread; }
    else { badge.classList.add('d-none'); }
    if (!d.data?.length) { list.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    list.innerHTML = d.data.map(n =>
      `<a class="notif-item ${n.lida ? '' : 'unread'}" href="#" onclick="openNotif(${n.id}, ${n.pedido_id || 'null'})">
        <small class="text-muted">${new Date(n.created_at).toLocaleString('pt-BR')}</small><br>${escapeHtml(n.titulo)}
      </a>`
    ).join('');
  } catch {}
}

async function markNotif(id) {
  try { await API.patch(`/notifications/${id}/read`); loadNotifs(); } catch {}
}

async function openNotif(id, pedidoId) {
  try { await API.patch(`/notifications/${id}/read`); loadNotifs(); } catch {}
  if (pedidoId) viewOrder(pedidoId);
}

// ===== PAGE RENDERERS =====
const PAGES = {};

function kpiCards(k) {
  k = k || {};
  return `
    <div class="kpi-card kpi-warning">
      <div class="kpi-icon" style="background:rgba(243,156,18,0.12);color:var(--warning)">
        <i class="fa-solid fa-clock"></i>
      </div>
      <div class="kpi-content">
        <div class="kpi-label"><i class="fa-solid fa-spinner me-1"></i>Pedidos Pendentes</div>
        <div class="kpi-value">${k.pedidos_pendentes ?? 0}</div>
        <div class="kpi-footer">
          <span class="kpi-sub"><i class="fa-solid fa-hourglass me-1"></i>Aguardando andamento</span>
        </div>
      </div>
    </div>
    <div class="kpi-card kpi-primary">
      <div class="kpi-icon" style="background:rgba(11,37,69,0.1);color:var(--primary)">
        <i class="fa-solid fa-hourglass-half"></i>
      </div>
      <div class="kpi-content">
        <div class="kpi-label"><i class="fa-solid fa-hourglass-split me-1"></i>Aguardando Aprovação</div>
        <div class="kpi-value">${k.pedidos_aguardando_aprovacao ?? 0}</div>
        <div class="kpi-footer">
          <span class="kpi-sub"><i class="fa-solid fa-user-tie me-1"></i>Análise da diretoria</span>
        </div>
      </div>
    </div>
    <div class="kpi-card kpi-success">
      <div class="kpi-icon" style="background:rgba(46,204,113,0.12);color:var(--success)">
        <i class="fa-solid fa-cart-shopping"></i>
      </div>
      <div class="kpi-content">
        <div class="kpi-label"><i class="fa-solid fa-cart-shopping me-1"></i>Pedidos Comprados</div>
        <div class="kpi-value">${k.pedidos_comprados ?? 0}</div>
        <div class="kpi-footer">
          <span class="kpi-sub"><i class="fa-solid fa-check me-1"></i>Compras realizadas</span>
        </div>
      </div>
    </div>
    <div class="kpi-card kpi-info">
      <div class="kpi-icon" style="background:rgba(52,152,219,0.12);color:var(--info)">
        <i class="fa-solid fa-truck-fast"></i>
      </div>
      <div class="kpi-content">
        <div class="kpi-label"><i class="fa-solid fa-truck me-1"></i>Pedidos Chegados</div>
        <div class="kpi-value">${k.pedidos_chegados ?? 0}</div>
        <div class="kpi-footer">
          <span class="kpi-sub"><i class="fa-solid fa-box-open me-1"></i>Entrega concluída</span>
        </div>
      </div>
    </div>
    <div class="kpi-card kpi-danger">
      <div class="kpi-icon" style="background:rgba(231,76,60,0.12);color:#e74c3c">
        <i class="fa-solid fa-dollar-sign"></i>
      </div>
      <div class="kpi-content">
        <div class="kpi-label"><i class="fa-solid fa-coins me-1"></i>Total de Valores Gastos</div>
        <div class="kpi-value">${fmtCurrency(k.total_valores_aprovados)}</div>
        <div class="kpi-footer">
          <span class="kpi-sub"><i class="fa-solid fa-circle-check me-1"></i>Soma dos valores aprovados</span>
        </div>
      </div>
    </div>`;
}

// ---------- DASHBOARD ----------
PAGES.dashboard = async function () {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="dashboard"><div class="dash-loading"><div class="spinner"></div><span>Carregando dashboard...</span></div></div>';
  try {
    const isFull = ['diretor', 'administrativo'].includes(user.perfil);
    const [kpis, status] = await Promise.all([
      API.get('/dashboard/kpis').catch(() => ({})),
      API.get('/dashboard/pedidos-por-status').catch(() => [])
    ]);

    if (!isFull) {
      c.innerHTML = `
        <div class="dashboard">
          <div class="dash-header">
            <div>
              <h1><i class="fa-solid fa-gauge-high me-2" style="color:var(--accent)"></i>Dashboard</h1>
              <p class="dash-subtitle"><i class="fa-solid fa-chart-pie me-1"></i>Resumo de pedidos e gastos</p>
            </div>
            <div class="dash-breadcrumb"><i class="fa-solid fa-house me-1"></i>Home / <span><i class="fa-solid fa-gauge me-1"></i>Dashboard</span></div>
          </div>
          <div class="kpi-grid">
            ${kpiCards(kpis)}
          </div>
          <div class="charts-grid">
            <div class="chart-card">
              <div class="chart-title"><i class="fa-solid fa-chart-pie"></i>Status dos Pedidos</div>
              <canvas id="chartStatus" height="260"></canvas>
            </div>
            <div class="chart-card">
              <div class="chart-title"><i class="fa-solid fa-chart-pie"></i>Valores Gastos (Aprovados) x Pendentes</div>
              <canvas id="chartValores" height="260"></canvas>
            </div>
          </div>
        </div>`;
      setTimeout(() => {
        initCharts({ status });
        createValoresPie('chartValores', status);
      }, 100);
    } else {
      const [pMes, recentes, rankSol] = await Promise.all([
        API.get('/dashboard/pedidos-por-mes').catch(() => []),
        API.get('/dashboard/recentes?limit=8').catch(() => []),
        API.get('/dashboard/ranking-solicitantes?limit=5').catch(() => [])
      ]);

      const rankPosClass = (i) => i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
      const rankIcon = (i) => i === 0 ? '<i class="fa-solid fa-trophy"></i>' : i === 1 ? '<i class="fa-solid fa-medal"></i>' : i === 2 ? '<i class="fa-solid fa-award"></i>' : (i + 1);

      c.innerHTML = `
        <div class="dashboard">
          <div class="dash-header">
            <div>
              <h1><i class="fa-solid fa-gauge-high me-2" style="color:var(--accent)"></i>Dashboard</h1>
              <p class="dash-subtitle"><i class="fa-solid fa-chart-pie me-1"></i>Visao geral do sistema de pedidos e gestao</p>
            </div>
            <div class="dash-breadcrumb"><i class="fa-solid fa-house me-1"></i>Home / <span><i class="fa-solid fa-gauge me-1"></i>Dashboard</span></div>
          </div>

          <div class="kpi-grid">
            ${kpiCards(kpis)}
          </div>

          <div class="charts-grid">
            <div class="chart-card">
              <div class="chart-title"><i class="fa-solid fa-chart-column"></i>Pedidos por Mes</div>
              <canvas id="chartPedidosMes" height="260"></canvas>
            </div>
            <div class="chart-card">
              <div class="chart-title"><i class="fa-solid fa-chart-pie"></i>Status dos Pedidos</div>
              <canvas id="chartStatus" height="260"></canvas>
            </div>
            <div class="chart-card">
              <div class="chart-title"><i class="fa-solid fa-chart-pie"></i>Valores Gastos (Aprovados) x Pendentes</div>
              <canvas id="chartValores" height="260"></canvas>
            </div>
            <div class="chart-card">
              <div class="chart-title"><i class="fa-solid fa-ranking-star"></i>Pedidos por Veiculo</div>
              <canvas id="chartDesempenho" height="260"></canvas>
            </div>
          </div>

          <div class="rankings-grid">
            <div class="rank-card">
              <div class="rank-title"><i class="fa-solid fa-users"></i>Ranking de Solicitantes</div>
              ${rankSol.length > 0 ? `
              <table class="rank-table">
                <thead><tr><th><i class="fa-solid fa-medal"></i></th><th><i class="fa-solid fa-user me-1"></i>Solicitante</th><th class="text-end"><i class="fa-solid fa-hourglass-half me-1"></i>Pendentes</th><th class="text-end"><i class="fa-solid fa-check me-1"></i>Aprovados</th><th class="text-end"><i class="fa-solid fa-clipboard me-1"></i>Pedidos</th><th class="text-end"><i class="fa-solid fa-coins me-1"></i>Valor Total</th></tr></thead>
                <tbody>
                  ${rankSol.map((r, i) => `
                  <tr>
                    <td><span class="rank-pos ${rankPosClass(i)}">${rankIcon(i)}</span></td>
                    <td class="rank-name"><i class="fa-solid fa-user me-1" style="color:var(--text-light);font-size:11px"></i>${r.nome || '-'}</td>
                    <td class="rank-stat text-end"><i class="fa-solid fa-hourglass-half me-1" style="font-size:11px"></i>${r.pedidos_pendentes ?? 0}</td>
                    <td class="rank-stat text-end"><i class="fa-solid fa-check me-1" style="font-size:11px"></i>${r.pedidos_aprovados ?? 0}</td>
                    <td class="rank-stat text-end"><i class="fa-solid fa-clipboard me-1" style="font-size:11px"></i>${r.total_pedidos}</td>
                    <td class="text-end" style="font-weight:600;color:var(--primary)"><i class="fa-solid fa-brazilian-real-sign me-1"></i>${fmtCurrency(r.valor_total)}</td>
                  </tr>`).join('')}
                </tbody>
              </table>` : '<div class="rank-empty"><i class="fa-solid fa-user-slash"></i><span>Nenhum solicitante registrado</span></div>'}
            </div>
          </div>

          <div class="placa-search-section">
            <div class="placa-search-header">
              <i class="fa-solid fa-magnifying-glass-chart"></i>
              <h3><i class="fa-solid fa-car me-1"></i>Consulta por Placa</h3>
            </div>
            <div class="placa-search-box">
              <div class="placa-input-wrapper">
                <input type="text" id="placaInput" placeholder="Digite a placa do veiculo (ex: ABC-1234)" maxlength="10" autocomplete="off">
                <div id="placaSuggestions" class="placa-suggestions"></div>
              </div>
              <button onclick="buscarPorPlaca()"><i class="fa-solid fa-magnifying-glass"></i> Consultar</button>
            </div>
            <div id="placaResult"></div>
          </div>

          <div class="chart-card table-card">
            <div class="chart-title"><i class="fa-solid fa-table-list"></i>Pedidos Recentes</div>
            <div class="table-wrapper">
              <table class="recent-orders">
                <thead>
                  <tr><th><i class="fa-solid fa-hashtag me-1"></i>Pedido</th><th><i class="fa-solid fa-car me-1"></i>Veiculo</th><th><i class="fa-solid fa-user me-1"></i>Solicitante</th><th><i class="fa-solid fa-store me-1"></i>Fornecedor</th><th><i class="fa-solid fa-dollar-sign me-1"></i>Valor</th><th><i class="fa-solid fa-flag me-1"></i>Status</th><th><i class="fa-solid fa-calendar me-1"></i>Data</th><th><i class="fa-solid fa-user-gear me-1"></i>Responsavel</th><th class="text-end"><i class="fa-solid fa-gear me-1"></i>Acoes</th></tr>
                </thead>
                <tbody>
                  ${!recentes.length ? '<tr><td colspan="9" class="recent-empty"><i class="fa-solid fa-inbox"></i>Nenhum pedido recente</td></tr>' : recentes.map(o => `
                  <tr>
                    <td><span class="order-num"><i class="fa-solid fa-receipt me-1"></i>${o.numero || '-'}</span></td>
                    <td class="order-vehicle"><i class="fa-solid fa-car-side me-1" style="font-size:11px;color:var(--text-light)"></i>${o.placa || '-'}</td>
                    <td class="order-client"><i class="fa-solid fa-user me-1" style="font-size:10px;color:var(--text-light)"></i>${o.solicitante || '-'}</td>
                    <td class="order-client"><i class="fa-solid fa-store me-1" style="font-size:10px;color:var(--text-light)"></i>${o.fornecedor || '-'}</td>
                    <td class="order-value">${fmtCurrency(o.valor_total)}</td>
                    <td><span class="badge-status badge-${o.status || 'pendente'}"><i class="fa-solid ${o.status === 'concluido' ? 'fa-circle-check' : o.status === 'pendente' ? 'fa-clock' : o.status === 'rejeitado' ? 'fa-circle-xmark' : o.status === 'aprovado' ? 'fa-circle-check' : o.status === 'em_compra' ? 'fa-cart-shopping' : 'fa-spinner'} me-1"></i>${statusLabel(o.status)}</span></td>
                    <td class="order-date"><i class="fa-regular fa-calendar me-1"></i>${fmtDate(o.data_pedido)}</td>
                    <td class="order-responsible"><i class="fa-solid fa-user-gear me-1" style="font-size:10px;color:var(--text-light)"></i>${o.responsavel || '-'}</td>
                    <td><div class="order-actions justify-content-end">
                      <button class="btn-view" onclick="viewOrder(${o.id})" title="Visualizar"><i class="fa-solid fa-eye"></i></button>
                      ${(o.status === 'pendente' || o.status === 'novo_orcamento') && user.perfil === 'logistica' ? `<button class="btn-edit" onclick="openOrder(${o.id})" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>` : ''}
                      ${o.status === 'pendente' && user.perfil === 'logistica' ? `<button class="btn-delete" onclick="delOrder(${o.id})" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                    </div></td>
                  </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>`;

      setTimeout(async () => {
        const pvData = await API.get('/dashboard/pedidos-por-veiculo?limit=8').catch(() => []);
        initCharts({ pMes, status, pedidosPorVeiculo: pvData });
        createValoresPie('chartValores', status);
        initPlacaAutocomplete();
      }, 50);
    }
  } catch (err) {
    c.innerHTML = `<div class="dashboard"><div class="dash-error"><i class="fa-solid fa-circle-exclamation me-2"></i>${err.error || 'Erro ao carregar o dashboard'}</div></div>`;
  }
};

// ---------- PROFILE ----------
PAGES.profile = async function () {
  const c = document.getElementById('pageContent');
  const info = ROLE_INFO[user.perfil];
  c.innerHTML = `
    <div class="row g-4">
      <div class="col-lg-4">
        <div class="card text-center p-4">
          <div class="mb-3"><div class="avatar-placeholder mx-auto"><i class="bi bi-person-fill"></i></div></div>
          <h5 class="fw-bold">${user.nome}</h5>
          <span class="badge bg-${info.color} fs-6 mb-2">${info.label}</span>
          <p class="text-muted mb-0">@${user.nick}</p>
        </div>
      </div>
      <div class="col-lg-8">
        <div class="card p-4">
          <h5 class="fw-bold mb-3">Permissões do Perfil</h5>
          <p class="text-muted">${info.desc}</p>
          <hr>
          <h6 class="fw-bold mb-2">Informações</h6>
          <div class="row g-2">
            <div class="col-md-6"><small class="text-muted">ID:</small><p class="mb-0">${user.id}</p></div>
            <div class="col-md-6"><small class="text-muted">Nick:</small><p class="mb-0">@${user.nick}</p></div>
          </div>
        </div>
      </div>
    </div>`;
};

// ---------- VEHICLES ----------
PAGES.vehicles = async function (pg = 1, q = '') {
  const c = document.getElementById('pageContent');
  c.innerHTML = `<div class="loading-screen"><div class="spinner-border"></div></div>`;
  try {
    const data = await API.get(`/vehicles?page=${pg}&limit=15&search=${encodeURIComponent(q)}`);
    c.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div><input type="text" class="form-control form-control-sm" placeholder="Buscar placa ou modelo..." id="vehicleSearch" value="${q}" style="min-width:240px"></div>
        ${['oficina','logistica','garantia','funilaria','administrativo','diretor'].includes(user.perfil) ? `<button class="btn btn-primary btn-sm" onclick="openVehicle()"><i class="bi bi-plus-lg me-1"></i>Novo Veículo</button>` : ''}
      </div>
      <div class="card">
        <div class="table-responsive">
          ${!data.data?.length ? '<div class="empty-state"><i class="bi bi-truck"></i><p>Nenhum veículo encontrado</p></div>' : `
          <table class="table table-hover">
            <thead><tr><th>Placa</th><th>Marca</th><th>Modelo</th><th>Ano</th><th class="text-end">Ações</th></tr></thead>
            <tbody>${data.data.map(v => `
              <tr>
                <td><strong>${v.placa}</strong></td><td>${v.marca_nome || '-'}</td><td>${v.modelo_nome || '-'}</td>
                <td>${v.ano}</td>
                <td class="text-end"><div class="table-actions justify-content-end">
                  <button class="btn btn-outline-primary" onclick="openVehicle(${v.id})"><i class="bi bi-pencil"></i></button>
                  ${['oficina','logistica','garantia','funilaria','administrativo','diretor'].includes(user.perfil) ? `<button class="btn btn-outline-danger" onclick="delVehicle(${v.id})"><i class="bi bi-trash"></i></button>` : ''}
                </div></td>
              </tr>
            `).join('')}</tbody>
          </table>`}
        </div>
        ${renderPagination(data, 'PAGES.vehicles')}
      </div>`;
    const inp = document.getElementById('vehicleSearch');
    let timer;
    inp?.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => PAGES.vehicles(1, inp.value), 400); });
    inp?.addEventListener('keydown', e => { if (e.key === 'Enter') PAGES.vehicles(1, inp.value); });
  } catch (err) { c.innerHTML = `<div class="alert alert-danger">${err.error || 'Erro ao carregar'}</div>`; }
};

async function openVehicle(id) {
  let v = { placa: '', modelo_id: '', ano: '', motor: '', chassi: '', observacoes: '', marca_id: '' };
  if (id) try { v = await API.get(`/vehicles/${id}`); } catch { return; }
  const isEdit = !!id;
  try {
    const marcas = await API.get('/marcas');
    const m = modal(`
      <div class="modal-header"><h5 class="modal-title fw-bold">${isEdit ? 'Editar' : 'Novo'} Veículo</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
      <div class="modal-body">
        <form id="vehicleForm">
          <div class="row g-3">
            <div class="col-md-3"><label class="form-label">Placa *</label><input class="form-control" name="placa" value="${v.placa}" required style="text-transform:uppercase" maxlength="7"></div>
            <div class="col-md-3"><label class="form-label">Marca</label>
              <select class="form-select" name="marca_id" id="vmarca">
                <option value="">Selecione...</option>
                ${marcas.map(m => `<option value="${m.id}" ${v.marca_id == m.id ? 'selected' : ''}>${m.nome}</option>`).join('')}
              </select></div>
            <div class="col-md-3"><label class="form-label">Modelo *</label><input class="form-control" name="modelo_nome" id="vmodelo" value="${v.modelo_nome || ''}" required placeholder="Digite o modelo"></div>
            <div class="col-md-3"><label class="form-label">Ano *</label><input class="form-control" name="ano" type="number" value="${v.ano}" required min="1900" max="2099"></div>
            <div class="col-md-3"><label class="form-label">Motor</label><input class="form-control" name="motor" value="${v.motor || ''}"></div>
            <div class="col-md-3"><label class="form-label">Chassi</label><input class="form-control" name="chassi" value="${v.chassi || ''}"></div>
            <div class="col-12"><label class="form-label">Observações</label><textarea class="form-control" name="observacoes" rows="2">${v.observacoes || ''}</textarea></div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-primary" id="vehicleSubmit">${isEdit ? 'Atualizar' : 'Salvar'}</button>
      </div>`, 'lg');

    document.getElementById('vehicleSubmit').addEventListener('click', async () => {
      const fd = Object.fromEntries(new FormData(document.getElementById('vehicleForm')));
      if (!fd.marca_id) { toast('Selecione a marca', 'warning'); return; }
      if (!fd.modelo_nome?.trim()) { toast('Informe o modelo', 'warning'); return; }
      fd.placa = fd.placa.toUpperCase();
      fd.ano = parseInt(fd.ano);
      fd.marca_id = parseInt(fd.marca_id);
      try {
        const modelos = await API.get('/modelos');
        let modelo = modelos.find(m => m.marca_id === fd.marca_id && m.nome.toLowerCase() === fd.modelo_nome.trim().toLowerCase());
        if (!modelo) {
          modelo = await API.post('/modelos', { nome: fd.modelo_nome.trim(), marca_id: fd.marca_id });
        }
        fd.modelo_id = modelo.id;
        delete fd.modelo_nome;
        delete fd.marca_id;
        if (isEdit) { await API.put(`/vehicles/${id}`, fd); toast('Veículo atualizado'); }
        else { await API.post('/vehicles', fd); toast('Veículo cadastrado'); }
        m.hide(); PAGES.vehicles();
      } catch (err) { toast(err.error || 'Erro ao salvar', 'danger'); }
    });
  } catch (err) { toast(err.error || 'Erro ao carregar dados', 'danger'); }
}

async function delVehicle(id) {
  if (!confirm('Desativar este veículo?')) return;
  try { await API.del(`/vehicles/${id}`); toast('Veículo desativado'); PAGES.vehicles(); }
  catch (err) { toast(err.error || 'Erro', 'danger'); }
}

// ---------- MARCAS ----------
PAGES.marcas = async function () {
  const c = document.getElementById('pageContent');
  c.innerHTML = `<div class="loading-screen"><div class="spinner-border"></div></div>`;
  try {
    const data = await API.get('/marcas');
    c.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div><p class="text-muted mb-0">${data.length} marca(s) cadastrada(s)</p></div>
        ${['garantia', 'funilaria', 'administrativo', 'diretor'].includes(user.perfil) ? `<button class="btn btn-primary btn-sm" onclick="openMarca()"><i class="bi bi-plus-lg me-1"></i>Nova Marca</button>` : ''}
      </div>
      <div class="card">
        <div class="table-responsive">
          ${!data.length ? '<div class="empty-state"><i class="bi bi-bookmark"></i><p>Nenhuma marca cadastrada</p></div>' : `
          <table class="table table-hover">
            <thead><tr><th>ID</th><th>Nome</th><th class="text-end">Ações</th></tr></thead>
            <tbody>${data.map(m => `
              <tr>
                <td>${m.id}</td><td><strong>${m.nome}</strong></td>
                <td class="text-end"><div class="table-actions justify-content-end">
                  ${['garantia', 'funilaria', 'administrativo', 'diretor'].includes(user.perfil) ? `<button class="btn btn-outline-primary" onclick="openMarca(${m.id},'${m.nome.replace(/'/g, "\\'")}')"><i class="bi bi-pencil"></i></button>` : ''}
                  ${['diretor', 'administrativo'].includes(user.perfil) ? `<button class="btn btn-outline-danger" onclick="delMarca(${m.id})"><i class="bi bi-trash"></i></button>` : ''}
                </div></td>
              </tr>
            `).join('')}</tbody>
          </table>`}
        </div>
      </div>`;
  } catch (err) { c.innerHTML = `<div class="alert alert-danger">${err.error || 'Erro ao carregar'}</div>`; }
};

function openMarca(id, nome) {
  const isEdit = !!id;
  const m = modal(`
    <div class="modal-header"><h5 class="modal-title fw-bold">${isEdit ? 'Editar' : 'Nova'} Marca</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body">
      <form id="marcaForm">
        <div class="mb-3"><label class="form-label">Nome da Marca *</label><input class="form-control" name="nome" value="${isEdit ? nome : ''}" required autofocus></div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-primary" id="marcaSubmit">${isEdit ? 'Atualizar' : 'Salvar'}</button>
    </div>
  `, 'sm');
  document.getElementById('marcaSubmit').addEventListener('click', async () => {
    const fd = Object.fromEntries(new FormData(document.getElementById('marcaForm')));
    if (!fd.nome?.trim()) { toast('Informe o nome da marca', 'warning'); return; }
    try {
      if (isEdit) { await API.put(`/marcas/${id}`, fd); toast('Marca atualizada'); }
      else { await API.post('/marcas', fd); toast('Marca criada'); }
      m.hide(); PAGES.marcas();
    } catch (err) { toast(err.error || 'Erro ao salvar', 'danger'); }
  });
}

async function delMarca(id) {
  if (!confirm('Excluir esta marca?')) return;
  try { await API.del(`/marcas/${id}`); toast('Marca excluída'); PAGES.marcas(); }
  catch (err) { toast(err.error || 'Erro', 'danger'); }
}

// ---------- MODELOS ----------
PAGES.modelos = async function () {
  const c = document.getElementById('pageContent');
  c.innerHTML = `<div class="loading-screen"><div class="spinner-border"></div></div>`;
  try {
    const data = await API.get('/modelos');
    c.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div><p class="text-muted mb-0">${data.length} modelo(s) cadastrado(s)</p></div>
        ${['garantia', 'funilaria', 'administrativo', 'diretor'].includes(user.perfil) ? `<button class="btn btn-primary btn-sm" onclick="openModelo()"><i class="bi bi-plus-lg me-1"></i>Novo Modelo</button>` : ''}
      </div>
      <div class="card">
        <div class="table-responsive">
          ${!data.length ? '<div class="empty-state"><i class="bi bi-diagram-3"></i><p>Nenhum modelo cadastrado</p></div>' : `
          <table class="table table-hover">
            <thead><tr><th>ID</th><th>Modelo</th><th>Marca</th><th class="text-end">Ações</th></tr></thead>
            <tbody>${data.map(m => `
              <tr>
                <td>${m.id}</td><td><strong>${m.nome}</strong></td><td>${m.marca_nome || '-'}</td>
                <td class="text-end"><div class="table-actions justify-content-end">
                  ${['garantia', 'funilaria', 'administrativo', 'diretor'].includes(user.perfil) ? `<button class="btn btn-outline-primary" onclick="openModelo(${m.id})"><i class="bi bi-pencil"></i></button>` : ''}
                  ${['diretor', 'administrativo'].includes(user.perfil) ? `<button class="btn btn-outline-danger" onclick="delModelo(${m.id})"><i class="bi bi-trash"></i></button>` : ''}
                </div></td>
              </tr>
            `).join('')}</tbody>
          </table>`}
        </div>
      </div>`;
  } catch (err) { c.innerHTML = `<div class="alert alert-danger">${err.error || 'Erro ao carregar'}</div>`; }
};

async function openModelo(id) {
  let modelo = { nome: '', marca_id: '' };
  if (id) try { modelo = await API.get(`/modelos/${id}`); } catch { return; }
  const isEdit = !!id;
  const marcas = await API.get('/marcas').catch(() => []);
  const m = modal(`
    <div class="modal-header"><h5 class="modal-title fw-bold">${isEdit ? 'Editar' : 'Novo'} Modelo</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body">
      <form id="modeloForm">
        <div class="mb-3"><label class="form-label">Modelo *</label><input class="form-control" name="nome" value="${modelo.nome}" required autofocus></div>
        <div class="mb-3"><label class="form-label">Marca *</label>
          <select class="form-select" name="marca_id" required>
            <option value="">Selecione...</option>
            ${marcas.map(m => `<option value="${m.id}" ${modelo.marca_id == m.id ? 'selected' : ''}>${m.nome}</option>`).join('')}
          </select></div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-primary" id="modeloSubmit">${isEdit ? 'Atualizar' : 'Salvar'}</button>
    </div>
  `, 'sm');
  document.getElementById('modeloSubmit').addEventListener('click', async () => {
    const fd = Object.fromEntries(new FormData(document.getElementById('modeloForm')));
    if (!fd.nome?.trim()) { toast('Informe o nome do modelo', 'warning'); return; }
    if (!fd.marca_id) { toast('Selecione a marca', 'warning'); return; }
    fd.marca_id = parseInt(fd.marca_id);
    try {
      if (isEdit) { await API.put(`/modelos/${id}`, fd); toast('Modelo atualizado'); }
      else { await API.post('/modelos', fd); toast('Modelo criado'); }
      m.hide(); PAGES.modelos();
    } catch (err) { toast(err.error || 'Erro ao salvar', 'danger'); }
  });
}

async function delModelo(id) {
  if (!confirm('Excluir este modelo?')) return;
  try { await API.del(`/modelos/${id}`); toast('Modelo excluído'); PAGES.modelos(); }
  catch (err) { toast(err.error || 'Erro', 'danger'); }
}

// ---------- PARTS ----------
PAGES.parts = async function (pg = 1, q = '') {
  const c = document.getElementById('pageContent');
  if (!['garantia', 'funilaria', 'administrativo', 'diretor'].includes(user.perfil)) { c.innerHTML = `<div class="alert alert-danger">Acesso restrito</div>`; return; }
  c.innerHTML = `<div class="loading-screen"><div class="spinner-border"></div></div>`;
  try {
    const data = await API.get(`/parts?page=${pg}&limit=15&search=${encodeURIComponent(q)}`);
    c.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div><input type="text" class="form-control form-control-sm" placeholder="Buscar peça..." id="partSearch" value="${q}" style="min-width:240px"></div>
        <button class="btn btn-primary btn-sm" onclick="openPart()"><i class="bi bi-plus-lg me-1"></i>Nova Peça</button>
      </div>
      <div class="card">
        <div class="table-responsive">
          ${!data.data?.length ? '<div class="empty-state"><i class="bi bi-gear"></i><p>Nenhuma peça encontrada</p></div>' : `
          <table class="table table-hover"><thead><tr><th>Código</th><th>Nome</th><th class="d-none d-md-table-cell">Categoria</th><th>Estoque</th><th class="d-none d-md-table-cell">Valor Médio</th><th class="text-end">Ações</th></tr></thead>
          <tbody>${data.data.map(p => `<tr>
            <td><strong>${p.codigo_interno}</strong></td><td>${p.nome}</td><td class="d-none d-md-table-cell">${p.categoria_nome || '-'}</td>
            <td>${p.estoque} ${p.unidade}</td><td class="d-none d-md-table-cell">${fmtCurrency(p.valor_medio)}</td>
            <td class="text-end"><div class="table-actions justify-content-end">
              <button class="btn btn-outline-primary" onclick="openPart(${p.id})"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-outline-danger" onclick="delPart(${p.id})"><i class="bi bi-trash"></i></button>
            </div></td>
          </tr>`).join('')}</tbody></table>`}
        </div>
        ${renderPagination(data, 'PAGES.parts')}
      </div>`;
    const inp = document.getElementById('partSearch');
    let timer;
    inp?.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => PAGES.parts(1, inp.value), 400); });
  } catch (err) { c.innerHTML = `<div class="alert alert-danger">${err.error || 'Erro ao carregar'}</div>`; }
};

async function openPart(id) {
  let p = { nome: '', codigo_interno: '', codigo_fabricante: '', categoria_id: '', unidade: 'un', estoque: 0, valor_medio: 0 };
  if (id) try { p = await API.get(`/parts/${id}`); } catch { return; }
  const isEdit = !!id;
  const cats = await API.get('/categorias-pecas').catch(() => []);
  const m = modal(`
    <div class="modal-header"><h5 class="modal-title fw-bold">${isEdit ? 'Editar' : 'Nova'} Peça</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body">
      <form id="partForm"><div class="row g-3">
        <div class="col-md-6"><label class="form-label">Nome *</label><input class="form-control" name="nome" value="${p.nome}" required></div>
        <div class="col-md-3"><label class="form-label">Cód. Interno *</label><input class="form-control" name="codigo_interno" value="${p.codigo_interno}" required></div>
        <div class="col-md-3"><label class="form-label">Cód. Fabricante</label><input class="form-control" name="codigo_fabricante" value="${p.codigo_fabricante || ''}"></div>
        <div class="col-md-4"><label class="form-label">Categoria</label><select class="form-select" name="categoria_id"><option value="">Sem categoria</option>${cats.map(c => `<option value="${c.id}" ${p.categoria_id == c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}</select></div>
        <div class="col-md-2"><label class="form-label">Unidade</label><select class="form-select" name="unidade"><option value="un">Unidade</option><option value="par" ${p.unidade==='par'?'selected':''}>Par</option><option value="l" ${p.unidade==='l'?'selected':''}>Litro</option><option value="kg" ${p.unidade==='kg'?'selected':''}>Kg</option></select></div>
        <div class="col-md-3"><label class="form-label">Estoque</label><input class="form-control" name="estoque" type="number" value="${p.estoque}"></div>
        <div class="col-md-3"><label class="form-label">Valor Médio</label><input class="form-control" name="valor_medio" type="number" step="0.01" value="${p.valor_medio}"></div>
      </div></form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-primary" id="partSubmit">${isEdit ? 'Atualizar' : 'Salvar'}</button>
    </div>`, 'lg');
  document.getElementById('partSubmit').addEventListener('click', async () => {
    const fd = Object.fromEntries(new FormData(document.getElementById('partForm')));
    fd.estoque = parseInt(fd.estoque) || 0; fd.valor_medio = parseFloat(fd.valor_medio) || 0;
    fd.categoria_id = fd.categoria_id ? parseInt(fd.categoria_id) : null;
    try {
      if (isEdit) { await API.put(`/parts/${id}`, fd); toast('Peça atualizada'); }
      else { await API.post('/parts', fd); toast('Peça criada'); }
      m.hide(); PAGES.parts();
    } catch (err) { toast(err.error || 'Erro', 'danger'); }
  });
}

async function delPart(id) {
  if (!confirm('Desativar esta peça?')) return;
  try { await API.del(`/parts/${id}`); toast('Peça desativada'); PAGES.parts(); }
  catch (err) { toast(err.error || 'Erro', 'danger'); }
}

// ---------- FORNECEDORES ----------
PAGES.fornecedores = async function (pg = 1) {
  const c = document.getElementById('pageContent');
  c.innerHTML = `<div class="loading-screen"><div class="spinner-border"></div></div>`;
  try {
    const data = await API.get(`/fornecedores?page=${pg}&limit=20`);
    c.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div></div>
        ${['garantia','funilaria','administrativo','diretor'].includes(user.perfil) ? `<button class="btn btn-primary btn-sm" onclick="openFornecedor()"><i class="bi bi-plus-lg me-1"></i>Novo Fornecedor</button>` : ''}
      </div>
      <div class="card"><div class="table-responsive">
        ${!data.data?.length ? '<div class="empty-state"><i class="bi bi-shop"></i><p>Nenhum fornecedor</p></div>' : `
        <table class="table table-hover"><thead><tr><th>Nome</th><th class="d-none d-sm-table-cell">Contato</th><th>Telefone</th><th class="d-none d-md-table-cell">E-mail</th><th class="text-end">Ações</th></tr></thead>
        <tbody>${data.data.map(f => `<tr>
          <td><strong>${f.nome}</strong></td><td class="d-none d-sm-table-cell">${f.contato || '-'}</td><td>${f.telefone || '-'}</td><td class="d-none d-md-table-cell">${f.email || '-'}</td>
          <td class="text-end"><div class="table-actions justify-content-end">
            <button class="btn btn-outline-primary" onclick="openFornecedor(${f.id})"><i class="bi bi-pencil"></i></button>
            ${['garantia','funilaria','administrativo','diretor'].includes(user.perfil) ? `<button class="btn btn-outline-danger" onclick="delFornecedor(${f.id})"><i class="bi bi-trash"></i></button>` : ''}
          </div></td>
        </tr>`).join('')}</tbody></table>`}
      </div>${renderPagination(data, 'PAGES.fornecedores')}</div>`;
  } catch (err) { c.innerHTML = `<div class="alert alert-danger">${err.error || 'Erro'}</div>`; }
};

async function openFornecedor(id) {
  let f = { nome: '', contato: '', telefone: '', email: '', endereco: '', observacoes: '' };
  if (id) try { f = await API.get(`/fornecedores/${id}`); } catch { return; }
  const isEdit = !!id;
  const m = modal(`
    <div class="modal-header"><h5 class="modal-title fw-bold">${isEdit ? 'Editar' : 'Novo'} Fornecedor</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body">
      <form id="fornForm"><div class="row g-3">
        <div class="col-md-6"><label class="form-label">Nome *</label><input class="form-control" name="nome" value="${f.nome}" required></div>
        <div class="col-md-6"><label class="form-label">Contato</label><input class="form-control" name="contato" value="${f.contato || ''}"></div>
        <div class="col-md-4"><label class="form-label">Telefone</label><input class="form-control" name="telefone" value="${f.telefone || ''}"></div>
        <div class="col-md-4"><label class="form-label">E-mail</label><input class="form-control" name="email" type="email" value="${f.email || ''}"></div>
        <div class="col-md-4"><label class="form-label">Endereço</label><input class="form-control" name="endereco" value="${f.endereco || ''}"></div>
        <div class="col-12"><label class="form-label">Observações</label><textarea class="form-control" name="observacoes" rows="2">${f.observacoes || ''}</textarea></div>
      </div></form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-primary" id="fornSubmit">${isEdit ? 'Atualizar' : 'Salvar'}</button>
    </div>`);
  document.getElementById('fornSubmit').addEventListener('click', async () => {
    const fd = Object.fromEntries(new FormData(document.getElementById('fornForm')));
    try {
      if (isEdit) { await API.put(`/fornecedores/${id}`, fd); toast('Fornecedor atualizado'); }
      else { await API.post('/fornecedores', fd); toast('Fornecedor criado'); }
      m.hide(); PAGES.fornecedores();
    } catch (err) { toast(err.error || 'Erro', 'danger'); }
  });
}

async function delFornecedor(id) {
  if (!confirm('Excluir fornecedor?')) return;
  try { await API.del(`/fornecedores/${id}`); toast('Excluído'); PAGES.fornecedores(); }
  catch (err) { toast(err.error || 'Erro', 'danger'); }
}

// ---------- CATEGORIAS ----------
PAGES.categorias = async function (pg = 1) {
  const c = document.getElementById('pageContent');
  c.innerHTML = `<div class="loading-screen"><div class="spinner-border"></div></div>`;
  try {
    const data = await API.get(`/categorias-pecas?page=${pg}&limit=20`);
    c.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div></div>
        <button class="btn btn-primary btn-sm" onclick="openCategoria()"><i class="bi bi-plus-lg me-1"></i>Nova Categoria</button>
      </div>
      <div class="card"><div class="table-responsive">
        ${!data.data?.length ? '<div class="empty-state"><i class="bi bi-tags"></i><p>Nenhuma categoria</p></div>' : `
        <table class="table table-hover"><thead><tr><th>Nome</th><th>Descrição</th><th class="text-end">Ações</th></tr></thead>
        <tbody>${data.data.map(c => `<tr>
          <td><strong>${c.nome}</strong></td><td>${c.descricao || '-'}</td>
          <td class="text-end"><div class="table-actions justify-content-end">
            <button class="btn btn-outline-primary" onclick="openCategoria(${c.id})"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger" onclick="delCategoria(${c.id})"><i class="bi bi-trash"></i></button>
          </div></td>
        </tr>`).join('')}</tbody></table>`}
      </div>${renderPagination(data, 'PAGES.categorias')}</div>`;
  } catch (err) { c.innerHTML = `<div class="alert alert-danger">${err.error || 'Erro'}</div>`; }
};

async function openCategoria(id) {
  let cat = { nome: '', descricao: '' };
  if (id) try { cat = await API.get(`/categorias-pecas/${id}`); } catch { return; }
  const isEdit = !!id;
  const m = modal(`
    <div class="modal-header"><h5 class="modal-title fw-bold">${isEdit ? 'Editar' : 'Nova'} Categoria</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body">
      <form id="catForm">
        <div class="mb-3"><label class="form-label">Nome *</label><input class="form-control" name="nome" value="${cat.nome}" required></div>
        <div class="mb-3"><label class="form-label">Descrição</label><textarea class="form-control" name="descricao" rows="3">${cat.descricao || ''}</textarea></div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-primary" id="catSubmit">${isEdit ? 'Atualizar' : 'Salvar'}</button>
    </div>`);
  document.getElementById('catSubmit').addEventListener('click', async () => {
    const fd = Object.fromEntries(new FormData(document.getElementById('catForm')));
    try {
      if (isEdit) { await API.put(`/categorias-pecas/${id}`, fd); toast('Categoria atualizada'); }
      else { await API.post('/categorias-pecas', fd); toast('Categoria criada'); }
      m.hide(); PAGES.categorias();
    } catch (err) { toast(err.error || 'Erro', 'danger'); }
  });
}

async function delCategoria(id) {
  if (!confirm('Excluir categoria?')) return;
  try { await API.del(`/categorias-pecas/${id}`); toast('Excluída'); PAGES.categorias(); }
  catch (err) { toast(err.error || 'Erro', 'danger'); }
}

// ---------- ORDERS ----------
PAGES.orders = async function (pg = 1) {
  await applyOrderFilters(pg);
};

function buildOrdersUrl(pg, state) {
  let url = `/orders?page=${pg}&limit=15`;
  if (state.status) url += `&status=${state.status}`;
  if (state.solicitanteId) url += `&usuario_id=${state.solicitanteId}`;
  if (state.search) url += `&search=${encodeURIComponent(state.search)}`;
  if (state.dataInicio) url += `&data_inicio=${state.dataInicio}`;
  if (state.dataFim) url += `&data_fim=${state.dataFim}`;
  return url;
}

function readOrderFilters() {
  return {
    status: document.getElementById('orderStatusFilter')?.value || '',
    solicitanteId: document.getElementById('orderSolicitanteFilter')?.value || '',
    search: document.getElementById('orderSearchFilter')?.value || '',
    dataInicio: document.getElementById('orderDataInicioFilter')?.value || '',
    dataFim: document.getElementById('orderDataFimFilter')?.value || ''
  };
}

async function applyOrderFilters(pg = 1) {
  const state = readOrderFilters();
  await renderOrdersPage(buildOrdersUrl(pg, state), pg, state);
}

function navigateOrderPage(pg) {
  const state = readOrderFilters();
  renderOrdersPage(buildOrdersUrl(pg, state), pg, state);
}

async function renderOrdersPage(url, pg, state) {
  const c = document.getElementById('pageContent');
  c.innerHTML = `<div class="loading-screen"><div class="spinner-border"></div></div>`;
  try {
      const [data, users] = await Promise.all([
        API.get(url),
        API.get('/users/list-dropdown').catch(() => []),
      ]);
      const isOficinaOrd = user.perfil === 'oficina';
      const { status = '', solicitanteId = '', search = '', dataInicio = '', dataFim = '' } = state;
      const userOpts = (Array.isArray(users) ? users : []).map(u =>
        `<option value="${u.id}"${String(u.id) === solicitanteId ? ' selected' : ''}>${u.nome}</option>`
      ).join('');
      c.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div class="d-flex gap-2 align-items-center flex-wrap">
          <div class="input-group input-group-sm" style="width:auto;">
            <span class="input-group-text"><i class="bi bi-upc-scan"></i></span>
            <input type="text" class="form-control" placeholder="Código do pedido..." id="orderSearchFilter" value="${escapeHtml(search)}" style="min-width:200px" onkeydown="if(event.key==='Enter')applyOrderFilters()">
          </div>
          <select class="form-select form-select-sm" id="orderStatusFilter" style="width:auto;" onchange="applyOrderFilters()">
            <option value="">Todos os status</option>
            ${Object.entries(STATUS_MAP).map(([k, v]) => `<option value="${k}"${k === status ? ' selected' : ''}>${v}</option>`).join('')}
          </select>
          <select class="form-select form-select-sm" id="orderSolicitanteFilter" style="width:auto;" onchange="applyOrderFilters()">
            <option value="">Todos os solicitantes</option>
            ${userOpts}
          </select>
          <div class="input-group input-group-sm" style="width:auto;">
            <span class="input-group-text">De</span>
            <input type="date" class="form-control" id="orderDataInicioFilter" value="${dataInicio}" onchange="applyOrderFilters()">
          </div>
          <div class="input-group input-group-sm" style="width:auto;">
            <span class="input-group-text">Até</span>
            <input type="date" class="form-control" id="orderDataFimFilter" value="${dataFim}" onchange="applyOrderFilters()">
          </div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openOrder()"><i class="bi bi-plus-lg me-1"></i>Novo Pedido</button>
      </div>
      <div class="card"><div class="table-responsive">
        ${!data.data?.length ? '<div class="empty-state"><i class="bi bi-clipboard-check"></i><p>Nenhum pedido encontrado</p></div>' : `
        <table class="table table-hover"><thead><tr><th>Número</th><th>Veículo</th><th class="d-none d-md-table-cell">Solicitante</th><th class="d-none d-sm-table-cell">Data</th>${isOficinaOrd ? '' : '<th class="d-none d-sm-table-cell">Valor</th>'}<th>Status</th><th class="text-end">Ações</th></tr></thead>
        <tbody>${data.data.map(o => `<tr${renderOrderRowClass(o)}>
          <td>${renderOrderNumero(o)}</td><td>${o.placa || '-'}</td><td class="d-none d-md-table-cell">${o.usuario_nome || '-'}</td>
          <td class="d-none d-sm-table-cell">${fmtDate(o.data_pedido)}</td>${isOficinaOrd ? '' : `<td class="d-none d-sm-table-cell">${fmtCurrency(o.valor_total)}</td>`}
          <td>${statusBadge(o.status)}</td>
           <td class="text-end"><div class="table-actions justify-content-end">
            <button class="btn btn-outline-info" onclick="viewOrder(${o.id})"><i class="bi bi-eye"></i></button>
            ${(o.status === 'pendente' || o.status === 'novo_orcamento') && user.perfil === 'logistica' ? `<button class="btn btn-outline-primary" onclick="openOrder(${o.id})"><i class="bi bi-pencil"></i></button>` : ''}
            ${o.status === 'pendente' && user.perfil === 'logistica' ? `<button class="btn btn-outline-danger" onclick="delOrder(${o.id})"><i class="bi bi-trash"></i></button>` : ''}
          </div></td>
        </tr>`).join('')}</tbody></table>`}
      </div>${renderPagination(data, 'navigateOrderPage')}</div>`;
      attachOrderSearchDebounce('orderSearchFilter', applyOrderFilters);
  } catch (err) { c.innerHTML = `<div class="alert alert-danger">${err.error || 'Erro ao carregar'}</div>`; }
}

function attachOrderSearchDebounce(id, cb) {
  const inp = document.getElementById(id);
  if (!inp) return;
  let timer;
  inp.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(cb, 500); });
}

function createOrdersPage(statusFilter, label) {
  const pageKey = 'orders_' + statusFilter;
  PAGES[pageKey] = async function (pg = 1) {
    const c = document.getElementById('pageContent');
    const solicitanteId = document.getElementById('solFilter_' + statusFilter)?.value || '';
    const searchEl = document.getElementById('solSearch_' + statusFilter);
    const search = searchEl?.value || '';
    const dataInicio = document.getElementById('solDataInicio_' + statusFilter)?.value || '';
    const dataFim = document.getElementById('solDataFim_' + statusFilter)?.value || '';
    c.innerHTML = `<div class="loading-screen"><div class="spinner-border"></div></div>`;
    try {
      const params = new URLSearchParams({ page: pg, limit: 15, status: statusFilter });
      if (solicitanteId) params.set('usuario_id', solicitanteId);
      if (search) params.set('search', search);
      if (dataInicio) params.set('data_inicio', dataInicio);
      if (dataFim) params.set('data_fim', dataFim);
      const [data, users] = await Promise.all([
        API.get(`/orders?${params}`),
        API.get('/users/list-dropdown').catch(() => []),
      ]);
      const isOficinaOrd = user.perfil === 'oficina';
      const userOpts = (Array.isArray(users) ? users : []).map(u =>
        `<option value="${u.id}"${String(u.id) === solicitanteId ? ' selected' : ''}>${u.nome}</option>`
      ).join('');
      c.innerHTML = `
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div class="d-flex gap-2 align-items-center flex-wrap">
            <h5 class="mb-0 fw-semibold">${escapeHtml(label)}</h5>
            <div class="input-group input-group-sm" style="width:auto;">
              <span class="input-group-text"><i class="bi bi-upc-scan"></i></span>
              <input type="text" class="form-control" placeholder="Código do pedido..." id="solSearch_${statusFilter}" value="${escapeHtml(search)}" style="min-width:200px" onkeydown="if(event.key==='Enter')PAGES['${pageKey}'](1)">
            </div>
            <select class="form-select form-select-sm" id="solFilter_${statusFilter}" style="width:auto;" onchange="PAGES['${pageKey}'](1)">
              <option value="">Todos os solicitantes</option>
              ${userOpts}
            </select>
            <div class="input-group input-group-sm" style="width:auto;">
              <span class="input-group-text">De</span>
              <input type="date" class="form-control" id="solDataInicio_${statusFilter}" value="${dataInicio}" onchange="PAGES['${pageKey}'](1)">
            </div>
            <div class="input-group input-group-sm" style="width:auto;">
              <span class="input-group-text">Até</span>
              <input type="date" class="form-control" id="solDataFim_${statusFilter}" value="${dataFim}" onchange="PAGES['${pageKey}'](1)">
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openOrder()"><i class="bi bi-plus-lg me-1"></i>Novo Pedido</button>
        </div>
        <div class="card"><div class="table-responsive">
          ${!data.data?.length ? '<div class="empty-state"><i class="bi bi-clipboard-check"></i><p>Nenhum pedido encontrado</p></div>' : `
          <table class="table table-hover"><thead><tr><th>Número</th><th>Veículo</th><th class="d-none d-md-table-cell">Solicitante</th><th class="d-none d-sm-table-cell">Data</th>${isOficinaOrd ? '' : '<th class="d-none d-sm-table-cell">Valor</th>'}<th>Status</th><th class="text-end">Ações</th></tr></thead>
          <tbody>${data.data.map(o => `<tr${renderOrderRowClass(o)}>
            <td>${renderOrderNumero(o)}</td><td>${o.placa || '-'}</td><td class="d-none d-md-table-cell">${o.usuario_nome || '-'}</td>
            <td class="d-none d-sm-table-cell">${fmtDate(o.data_pedido)}</td>${isOficinaOrd ? '' : `<td class="d-none d-sm-table-cell">${fmtCurrency(o.valor_total)}</td>`}
            <td>${statusBadge(o.status)}</td>
             <td class="text-end"><div class="table-actions justify-content-end">
              <button class="btn btn-outline-info" onclick="viewOrder(${o.id})"><i class="bi bi-eye"></i></button>
               ${o.status === 'pendente' && user.perfil === 'logistica' ? `<button class="btn btn-outline-primary" onclick="openOrder(${o.id})"><i class="bi bi-pencil"></i></button>` : ''}
               ${o.status === 'pendente' && user.perfil === 'logistica' ? `<button class="btn btn-outline-danger" onclick="delOrder(${o.id})"><i class="bi bi-trash"></i></button>` : ''}
            </div></td>
          </tr>`).join('')}</tbody></table>`}
        </div>${renderPagination(data, `PAGES.${pageKey}`)}</div>`;
      attachOrderSearchDebounce('solSearch_' + statusFilter, () => PAGES[pageKey](1));
    } catch (err) { c.innerHTML = `<div class="alert alert-danger">${err.error || 'Erro ao carregar'}</div>`; }
  };
}

function createEntregaPage(entregaFilter, label) {
  const pageKey = 'entregas_' + entregaFilter;
  PAGES[pageKey] = async function (pg = 1) {
    const c = document.getElementById('pageContent');
    const solicitanteId = document.getElementById('solFilter_entrega')?.value || '';
    const searchEl = document.getElementById('solSearch_entrega');
    const search = searchEl?.value || '';
    const dataInicio = document.getElementById('solDataInicio_entrega')?.value || '';
    const dataFim = document.getElementById('solDataFim_entrega')?.value || '';
    c.innerHTML = `<div class="loading-screen"><div class="spinner-border"></div></div>`;
    try {
      const params = new URLSearchParams({ page: pg, limit: 15, status_entrega: entregaFilter });
      if (solicitanteId) params.set('usuario_id', solicitanteId);
      if (search) params.set('search', search);
      if (dataInicio) params.set('data_inicio', dataInicio);
      if (dataFim) params.set('data_fim', dataFim);
      const [data, users] = await Promise.all([
        API.get(`/orders?${params}`),
        API.get('/users/list-dropdown').catch(() => []),
      ]);
      const isOficinaOrd = user.perfil === 'oficina';
      const userOpts = (Array.isArray(users) ? users : []).map(u =>
        `<option value="${u.id}"${String(u.id) === solicitanteId ? ' selected' : ''}>${u.nome}</option>`
      ).join('');
      c.innerHTML = `
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div class="d-flex gap-2 align-items-center flex-wrap">
            <h5 class="mb-0 fw-semibold">${escapeHtml(label)}</h5>
            <div class="input-group input-group-sm" style="width:auto;">
              <span class="input-group-text"><i class="bi bi-upc-scan"></i></span>
              <input type="text" class="form-control" placeholder="Código do pedido..." id="solSearch_entrega" value="${escapeHtml(search)}" style="min-width:200px" onkeydown="if(event.key==='Enter')PAGES['${pageKey}'](1)">
            </div>
            <select class="form-select form-select-sm" id="solFilter_entrega" style="width:auto;" onchange="PAGES['${pageKey}'](1)">
              <option value="">Todos os solicitantes</option>
              ${userOpts}
            </select>
            <div class="input-group input-group-sm" style="width:auto;">
              <span class="input-group-text">De</span>
              <input type="date" class="form-control" id="solDataInicio_entrega" value="${dataInicio}" onchange="PAGES['${pageKey}'](1)">
            </div>
            <div class="input-group input-group-sm" style="width:auto;">
              <span class="input-group-text">Até</span>
              <input type="date" class="form-control" id="solDataFim_entrega" value="${dataFim}" onchange="PAGES['${pageKey}'](1)">
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openOrder()"><i class="bi bi-plus-lg me-1"></i>Novo Pedido</button>
        </div>
        <div class="card"><div class="table-responsive">
          ${!data.data?.length ? '<div class="empty-state"><i class="bi bi-clipboard-check"></i><p>Nenhum pedido encontrado</p></div>' : `
          <table class="table table-hover"><thead><tr><th>Número</th><th>Veículo</th><th class="d-none d-md-table-cell">Solicitante</th><th class="d-none d-sm-table-cell">Data</th>${isOficinaOrd ? '' : '<th class="d-none d-sm-table-cell">Valor</th>'}<th>Status</th><th>Entrega</th><th class="text-end">Ações</th></tr></thead>
          <tbody>${data.data.map(o => `<tr${renderOrderRowClass(o)}>
            <td>${renderOrderNumero(o)}</td><td>${o.placa || '-'}</td><td class="d-none d-md-table-cell">${o.usuario_nome || '-'}</td>
            <td class="d-none d-sm-table-cell">${fmtDate(o.data_pedido)}</td>${isOficinaOrd ? '' : `<td class="d-none d-sm-table-cell">${fmtCurrency(o.valor_total)}</td>`}
            <td>${statusBadge(o.status)}</td>
            <td>${entregaBadge(o.status_entrega)}</td>
             <td class="text-end"><div class="table-actions justify-content-end">
              <button class="btn btn-outline-info" onclick="viewOrder(${o.id})"><i class="bi bi-eye"></i></button>
               ${o.status === 'pendente' && user.perfil === 'logistica' ? `<button class="btn btn-outline-primary" onclick="openOrder(${o.id})"><i class="bi bi-pencil"></i></button>` : ''}
               ${o.status === 'pendente' && user.perfil === 'logistica' ? `<button class="btn btn-outline-danger" onclick="delOrder(${o.id})"><i class="bi bi-trash"></i></button>` : ''}
            </div></td>
          </tr>`).join('')}</tbody></table>`}
        </div>${renderPagination(data, `PAGES.${pageKey}`)}</div>`;
      attachOrderSearchDebounce('solSearch_entrega', () => PAGES[pageKey](1));
    } catch (err) { c.innerHTML = `<div class="alert alert-danger">${err.error || 'Erro ao carregar'}</div>`; }
  };
}

// Gerar páginas de pedidos por status
createOrdersPage('pendente', 'Pedidos Pendentes');
createOrdersPage('aprovado', 'Pedidos Aprovados');
createOrdersPage('aguardando_aprovacao', 'Pedidos Aguardando Aprovação');

// Páginas de entrega
createEntregaPage('chegou', 'Pedidos Entregues');

function createUrgentesPage(label) {
  const pageKey = 'orders_urgentes';
  PAGES[pageKey] = async function (pg = 1) {
    const c = document.getElementById('pageContent');
    const solicitanteId = document.getElementById('solFilter_urgentes')?.value || '';
    const searchEl = document.getElementById('solSearch_urgentes');
    const search = searchEl?.value || '';
    const dataInicio = document.getElementById('solDataInicio_urgentes')?.value || '';
    const dataFim = document.getElementById('solDataFim_urgentes')?.value || '';
    c.innerHTML = `<div class="loading-screen"><div class="spinner-border"></div></div>`;
    try {
      const params = new URLSearchParams({ page: pg, limit: 15, urgente: 1 });
      if (solicitanteId) params.set('usuario_id', solicitanteId);
      if (search) params.set('search', search);
      if (dataInicio) params.set('data_inicio', dataInicio);
      if (dataFim) params.set('data_fim', dataFim);
      const [data, users] = await Promise.all([
        API.get(`/orders?${params}`),
        API.get('/users/list-dropdown').catch(() => []),
      ]);
      const isOficinaOrd = user.perfil === 'oficina';
      const userOpts = (Array.isArray(users) ? users : []).map(u =>
        `<option value="${u.id}"${String(u.id) === solicitanteId ? ' selected' : ''}>${u.nome}</option>`
      ).join('');
      c.innerHTML = `
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div class="d-flex gap-2 align-items-center flex-wrap">
            <h5 class="mb-0 fw-semibold text-danger"><i class="bi bi-alarm me-1"></i>${escapeHtml(label)}</h5>
            <div class="input-group input-group-sm" style="width:auto;">
              <span class="input-group-text"><i class="bi bi-upc-scan"></i></span>
              <input type="text" class="form-control" placeholder="Código do pedido..." id="solSearch_urgentes" value="${escapeHtml(search)}" style="min-width:200px" onkeydown="if(event.key==='Enter')PAGES['${pageKey}'](1)">
            </div>
            <select class="form-select form-select-sm" id="solFilter_urgentes" style="width:auto;" onchange="PAGES['${pageKey}'](1)">
              <option value="">Todos os solicitantes</option>
              ${userOpts}
            </select>
            <div class="input-group input-group-sm" style="width:auto;">
              <span class="input-group-text">De</span>
              <input type="date" class="form-control" id="solDataInicio_urgentes" value="${dataInicio}" onchange="PAGES['${pageKey}'](1)">
            </div>
            <div class="input-group input-group-sm" style="width:auto;">
              <span class="input-group-text">Até</span>
              <input type="date" class="form-control" id="solDataFim_urgentes" value="${dataFim}" onchange="PAGES['${pageKey}'](1)">
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openOrder()"><i class="bi bi-plus-lg me-1"></i>Novo Pedido</button>
        </div>
        <div class="card"><div class="table-responsive">
          ${!data.data?.length ? '<div class="empty-state"><i class="bi bi-alarm"></i><p>Nenhum pedido urgente</p></div>' : `
          <table class="table table-hover"><thead><tr><th>Número</th><th>Veículo</th><th class="d-none d-md-table-cell">Solicitante</th><th class="d-none d-sm-table-cell">Data</th><th class="d-none d-sm-table-cell">Sem resposta</th>${isOficinaOrd ? '' : '<th class="d-none d-sm-table-cell">Valor</th>'}<th>Status</th><th class="text-end">Ações</th></tr></thead>
          <tbody>${data.data.map(o => `<tr${renderOrderRowClass(o)}>
            <td>${renderOrderNumero(o)}</td><td>${o.placa || '-'}</td><td class="d-none d-md-table-cell">${o.usuario_nome || '-'}</td>
            <td class="d-none d-sm-table-cell">${fmtDate(o.data_pedido)}</td><td class="d-none d-sm-table-cell text-danger">${o.horas_sem_resposta || 0}h</td>${isOficinaOrd ? '' : `<td class="d-none d-sm-table-cell">${fmtCurrency(o.valor_total)}</td>`}
            <td>${statusBadge(o.status)}</td>
             <td class="text-end"><div class="table-actions justify-content-end">
              <button class="btn btn-outline-info" onclick="viewOrder(${o.id})"><i class="bi bi-eye"></i></button>
               ${o.status === 'pendente' && user.perfil === 'logistica' ? `<button class="btn btn-outline-primary" onclick="openOrder(${o.id})"><i class="bi bi-pencil"></i></button>` : ''}
               ${o.status === 'pendente' && user.perfil === 'logistica' ? `<button class="btn btn-outline-danger" onclick="delOrder(${o.id})"><i class="bi bi-trash"></i></button>` : ''}
            </div></td>
          </tr>`).join('')}</tbody></table>`}
        </div>${renderPagination(data, `PAGES.${pageKey}`)}</div>`;
      attachOrderSearchDebounce('solSearch_urgentes', () => PAGES[pageKey](1));
    } catch (err) { c.innerHTML = `<div class="alert alert-danger">${err.error || 'Erro ao carregar'}</div>`; }
  };
}

createUrgentesPage('Pedidos Urgentes');

async function viewOrder(id) {
  try {
    const o = await API.get(`/orders/${id}`);
    const fotos = o.fotos || [];
    const itens = o.itens || [];

    const timelineFlow = ['pendente', 'aprovado', 'comprado', 'concluido'];
    const timelineSteps = ['Solicitado', 'Aprovado', 'Comprado', 'Recebido', 'Finalizado'];
    const stepLevel = { 'Solicitado': 0, 'Aprovado': 1, 'Comprado': 2, 'Recebido': 3, 'Finalizado': 3 };
    const currentLevel = timelineFlow.indexOf(o.status);

    const statusBadgeClass = {
      pendente: 'pm-badge-neutral', em_compra: 'pm-badge-info',
      aguardando_aprovacao: 'pm-badge-warning', novo_orcamento: 'pm-badge-warning',
      aprovado: 'pm-badge-success',
      rejeitado: 'pm-badge-danger', comprado: 'pm-badge-info',
      concluido: 'pm-badge-success'
    }[o.status] || 'pm-badge-neutral';

    const entregaBadgeClass = {
      pendente: 'pm-badge-neutral',
      em_transito: 'pm-badge-warning',
      chegou: 'pm-badge-success'
    }[o.status_entrega] || 'pm-badge-neutral';

    const entregaLabel = {
      pendente: 'Pendente',
      em_transito: 'Em Trânsito',
      chegou: 'Chegou'
    }[o.status_entrega] || 'Pendente';

    const vehicleLabel = [o.veiculo_marca, o.veiculo_modelo].filter(Boolean).join(' ') || o.placa || '---';

    const subtotal = itens.reduce(function (s, i) { return s + Number(i.valor_total || 0); }, 0);

    const canManage = user.perfil === 'logistica';

    const showActions = canManage;

    const precisaDiretor = Number(o.valor_total) > DIRECTOR_APPROVAL_LIMIT;
    const canApprove = o.status === 'aguardando_aprovacao'
      && (precisaDiretor ? user.perfil === 'diretor' : (Number(o.usuario_id) === Number(user.id) || user.perfil === 'logistica'));

    const hasOC = !!o.ordem_compra_id;
    const nextLogisticsAction = getNextLogisticsAction(o);

    var mHtml = '';
    mHtml += '<div class="pm-header">';
    mHtml += '  <div class="pm-header-left">';
    mHtml += '    <div class="pm-header-icon"><i data-lucide="shopping-cart"></i></div>';
    mHtml += '    <div class="pm-header-info">';
    mHtml += '      <div class="pm-header-title">' + escapeHtml('Pedido ' + (o.numero || '')) + '</div>';
    mHtml += '      <div class="pm-header-date"><i data-lucide="calendar"></i> ' + fmtDate(o.data_pedido) + '</div>';
    mHtml += '    </div>';
    mHtml += '  </div>';
    mHtml += '  <button class="pm-header-close" data-bs-dismiss="modal" aria-label="Fechar"><i data-lucide="x"></i></button>';
    mHtml += '</div>';
    mHtml += '<div class="pm-body">';
    mHtml += '  <div class="pm-tabs" role="tablist">';
    mHtml += '    <button class="pm-tab active" data-bs-toggle="tab" data-bs-target="#pm-detalhes" type="button" role="tab"><i data-lucide="file-text"></i> Detalhes</button>';
    mHtml += '    <button class="pm-tab" data-bs-toggle="tab" data-bs-target="#pm-fotos" type="button" role="tab"><i data-lucide="image"></i> Fotos' + (fotos.length ? ' <span class="pm-badge pm-badge-info" style="padding:0.1rem 0.4rem;font-size:0.65rem;">' + fotos.length + '</span>' : '') + '</button>';
    mHtml += '  </div>';
    mHtml += '  <div class="tab-content">';
    mHtml += '    <div class="tab-pane fade show active" id="pm-detalhes" role="tabpanel">';
    mHtml += '      <div class="pm-section">';
    mHtml += '        <div class="pm-section-title"><i data-lucide="info"></i> Informa\u00e7\u00f5es Principais</div>';
    mHtml += '        <div class="pm-grid-4">';
    mHtml += '          <div class="pm-card"><div class="pm-card-label"><i data-lucide="truck"></i> Ve\u00edculo</div><div class="pm-card-value">' + escapeHtml(vehicleLabel) + '</div></div>';
    mHtml += '          <div class="pm-card"><div class="pm-card-label"><i data-lucide="user"></i> Solicitante</div><div class="pm-card-value">' + escapeHtml(o.usuario_nome || '---') + '</div></div>';
    mHtml += '          <div class="pm-card"><div class="pm-card-label"><i data-lucide="user-check"></i> Perfil Solicitante</div><div class="pm-card-value-muted">' + escapeHtml(o.usuario_perfil || '---') + '</div></div>';
    mHtml += '          <div class="pm-card"><div class="pm-card-label"><i data-lucide="dollar-sign"></i> Valor Total</div><div class="pm-card-value">' + fmtCurrency(o.valor_total) + '</div></div>';
    mHtml += '        </div>';
    mHtml += '      </div>';
    mHtml += '      <div class="pm-grid-3">';
    mHtml += '        <div class="pm-card"><div class="pm-card-label"><i data-lucide="calendar"></i> Data</div><div class="pm-card-value">' + fmtDate(o.data_pedido) + '</div></div>';
    mHtml += '        <div class="pm-card"><div class="pm-card-label"><i data-lucide="circle"></i> Status</div><div><span class="pm-badge ' + statusBadgeClass + '">' + statusLabel(o.status) + '</span></div></div>';
    mHtml += '        <div class="pm-card"><div class="pm-card-label"><i data-lucide="truck"></i> Entrega</div><div><span class="pm-badge ' + entregaBadgeClass + '">' + entregaLabel + '</span></div></div>';
    mHtml += '      </div>';
    if (showActions) {
      mHtml += '      <div class="pm-section">';
      mHtml += '        <div class="pm-section-title"><i data-lucide="settings"></i> A\u00e7\u00f5es do Pedido</div>';
      mHtml += '        <div class="pm-card">';
      mHtml += '          <div class="pm-actions">';
      if (nextLogisticsAction) {
        mHtml += '            <button class="pm-btn pm-btn-success pm-btn-sm" id="advanceOrderBtn"><i data-lucide="arrow-right-circle"></i> ' + escapeHtml(nextLogisticsAction.label) + '</button>';
      }
      mHtml += '            <button class="pm-btn pm-btn-danger pm-btn-sm" id="cancelOrderBtn"><i data-lucide="x"></i> Cancelar Pedido</button>';
      mHtml += '          </div>';
      mHtml += '        </div>';
      mHtml += '      </div>';
    }
    if (canApprove) {
      mHtml += '      <div class="pm-section">';
      mHtml += '        <div class="pm-section-title"><i data-lucide="check-circle"></i> Aprova\u00e7\u00e3o</div>';
      mHtml += '        <div class="pm-oc-area" style="border-color:rgba(234,179,8,0.2);background:rgba(234,179,8,0.04);">';
      mHtml += '          <div class="pm-oc-label"><strong>Cota\u00e7\u00e3o pronta.</strong> Valor: ' + fmtCurrency(o.valor_total) + (o.previsao_entrega ? ' \u00b7 Previs\u00e3o de entrega: ' + fmtDate(o.previsao_entrega) : '') + '.</div>';
      if (precisaDiretor) {
        mHtml += '          <div class="pm-oc-label" style="color:#b45309;"><i data-lucide="shield-alert"></i> Pedido acima de ' + fmtCurrency(DIRECTOR_APPROVAL_LIMIT) + ' requer autoriza\u00e7\u00e3o do diretor.</div>';
      }
      mHtml += '          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">';
      if (precisaDiretor) {
        mHtml += '            <button class="pm-btn pm-btn-success pm-btn-sm" id="approveQuoteBtn"><i data-lucide="check-circle"></i> Aprovar</button>';
        mHtml += '            <button class="pm-btn pm-btn-danger pm-btn-sm" id="cancelQuoteBtn"><i data-lucide="x-circle"></i> Rejeitar</button>';
      } else {
        mHtml += '            <button class="pm-btn pm-btn-success pm-btn-sm" id="approveQuoteBtn"><i data-lucide="check-circle"></i> Comprar</button>';
        mHtml += '            <button class="pm-btn pm-btn-warning pm-btn-sm" id="requestQuoteBtn"><i data-lucide="refresh-cw"></i> Novo Or\u00e7amento</button>';
        mHtml += '            <button class="pm-btn pm-btn-danger pm-btn-sm" id="cancelQuoteBtn"><i data-lucide="x-circle"></i> Cancelado</button>';
      }
      mHtml += '          </div>';
      mHtml += '        </div>';
      mHtml += '      </div>';
    } else if (precisaDiretor && o.status === 'aguardando_aprovacao') {
      mHtml += '      <div class="pm-section">';
      mHtml += '        <div class="pm-section-title"><i data-lucide="shield-check"></i> Autoriza\u00e7\u00e3o do Diretor</div>';
      mHtml += '        <div class="pm-oc-area" style="border-color:rgba(234,179,8,0.2);background:rgba(234,179,8,0.04);">';
      mHtml += '          <div class="pm-oc-label"><i data-lucide="clock"></i> Este pedido est\u00e1 acima de ' + fmtCurrency(DIRECTOR_APPROVAL_LIMIT) + ' e aguarda a autoriza\u00e7\u00e3o do diretor.</div>';
      mHtml += '        </div>';
      mHtml += '      </div>';
    }
    mHtml += '      <div class="pm-section">';
    mHtml += '        <div class="pm-section-title"><i data-lucide="file-text"></i> Observa\u00e7\u00f5es</div>';
    mHtml += '        <div class="pm-card pm-card-full">';
    mHtml += '          <textarea class="pm-textarea" placeholder="Nenhuma observa\u00e7\u00e3o registrada..." readonly>' + escapeHtml(o.observacoes || '') + '</textarea>';
    mHtml += '        </div>';
    mHtml += '      </div>';
    if (user.perfil === 'logistica' && o.status === 'aprovado') {
      mHtml += '      <div class="pm-section">';
      mHtml += '        <div class="pm-section-title"><i data-lucide="printer"></i> Ordem de Compra</div>';
      mHtml += '        <div class="pm-oc-area">';
      if (hasOC) {
        mHtml += '          <div class="pm-oc-label"><strong>OC ' + escapeHtml(o.ordem_compra_numero || '') + '</strong> j\u00e1 gerada.</div>';
        mHtml += '          <button class="pm-btn pm-btn-primary pm-btn-sm" id="ordemCompraBtn"><i data-lucide="printer"></i> Imprimir</button>';
      } else {
        mHtml += '          <div class="pm-oc-label"></div>';
        mHtml += '          <button class="pm-btn pm-btn-primary pm-btn-sm" id="ordemCompraBtn"><i data-lucide="printer"></i> Gerar Ordem de Compra</button>';
      }
      mHtml += '        </div>';
      mHtml += '      </div>';
    }
    mHtml += '      <div class="pm-section">';
    mHtml += '        <div class="pm-section-title"><i data-lucide="package"></i> Itens do Pedido</div>';
    mHtml += '        <div class="pm-card">';
    mHtml += '          <div class="pm-table-wrap">';
    mHtml += '            <table class="pm-table">';
    mHtml += '              <thead><tr><th>Item</th><th>Quantidade</th><th>Valor Unit\u00e1rio</th><th>Total</th><th>Fornecedor</th><th>Origem</th></tr></thead>';
    mHtml += '              <tbody>';
    if (itens.length) {
      for (var i = 0; i < itens.length; i++) {
        var item = itens[i];
        mHtml += '                <tr><td>' + escapeHtml(item.item_nome || '-') + '</td><td>' + (item.quantidade || 0) + '</td><td>' + fmtCurrency(item.valor_unitario) + '</td><td>' + fmtCurrency(item.valor_total) + '</td><td>' + escapeHtml(item.fornecedor_nome || '-') + '</td><td>' + escapeHtml(item.fornecedor_origem || '-') + '</td></tr>';
      }
    } else {
      mHtml += '                <tr><td colspan="6" style="text-align:center;color:#64748b;padding:2rem 1rem;font-size:0.85rem;">Nenhum item cadastrado</td></tr>';
    }
    mHtml += '              </tbody>';
    mHtml += '            </table>';
    mHtml += '          </div>';
    mHtml += '        </div>';
    mHtml += '      </div>';
    mHtml += '      <div class="pm-section">';
    mHtml += '        <div class="pm-section-title"><i data-lucide="credit-card"></i> Resumo Financeiro</div>';
    mHtml += '        <div class="pm-card">';
    mHtml += '          <div class="pm-fin-row"><span class="pm-fin-label"><i data-lucide="tag"></i> Subtotal</span><span class="pm-fin-value">' + fmtCurrency(subtotal) + '</span></div>';
    mHtml += '          <div class="pm-fin-total"><span>Total do Pedido</span><span class="pm-fin-value">' + fmtCurrency(o.valor_total) + '</span></div>';
    mHtml += '        </div>';
    mHtml += '      </div>';
    mHtml += '      <div class="pm-section">';
    mHtml += '        <div class="pm-section-title"><i data-lucide="info"></i> Informa\u00e7\u00f5es Adicionais</div>';
    mHtml += '        <div class="pm-card">';
    mHtml += '          <div class="pm-info-grid">';
    mHtml += '            <div class="pm-info-item"><span class="pm-info-item-label"><i data-lucide="hash"></i> N\u00famero do Pedido</span><span class="pm-info-item-value">' + escapeHtml(o.numero || '---') + '</span></div>';
    mHtml += '            <div class="pm-info-item"><span class="pm-info-item-label"><i data-lucide="user"></i> Criado por</span><span class="pm-info-item-value">' + escapeHtml(o.usuario_nome || '---') + '</span></div>';
    mHtml += '            <div class="pm-info-item"><span class="pm-info-item-label"><i data-lucide="clock"></i> \u00daltima Atualiza\u00e7\u00e3o</span><span class="pm-info-item-value">' + fmtDate(o.updated_at || o.ultima_atualizacao) + '</span></div>';
    mHtml += '            <div class="pm-info-item"><span class="pm-info-item-label"><i data-lucide="layers"></i> Departamento</span><span class="pm-info-item-value">' + escapeHtml(o.departamento || '---') + '</span></div>';
    mHtml += '            <div class="pm-info-item"><span class="pm-info-item-label"><i data-lucide="calendar"></i> Previsão de Entrega</span><span class="pm-info-item-value">' + fmtDate(o.previsao_entrega) + '</span></div>';
    mHtml += '          </div>';
    mHtml += '        </div>';
    mHtml += '      </div>';
    mHtml += '      <div class="pm-section">';
    mHtml += '        <div class="pm-section-title"><i data-lucide="history"></i> Hist\u00f3rico</div>';
    mHtml += '        <div class="pm-card">';
    mHtml += '          <div class="pm-section-title" style="margin-bottom:0.75rem;text-transform:none;font-size:0.82rem;"><i data-lucide="clock"></i> Hist\u00f3rico de Altera\u00e7\u00f5es</div>';
    mHtml += '          <div style="font-size:0.85rem;color:#64748b;margin-bottom:1.5rem;">Nenhuma altera\u00e7\u00e3o registrada.</div>';
    mHtml += '          <div class="pm-section-title" style="margin-bottom:0.75rem;text-transform:none;font-size:0.82rem;"><i data-lucide="bar-chart-3"></i> Fluxo do Pedido</div>';
    mHtml += '          <div class="pm-timeline">';
    for (var t = 0; t < timelineSteps.length; t++) {
      var step = timelineSteps[t];
      var sl = stepLevel[step];
      var cls = sl < currentLevel ? 'done' : sl === currentLevel ? 'active' : '';
      mHtml += '            <div class="pm-timeline-step ' + cls + '"><div class="pm-timeline-dot"></div>' + (t < timelineSteps.length - 1 ? '<div class="pm-timeline-line"></div>' : '') + '<div class="pm-timeline-label">' + step + '</div></div>';
    }
    mHtml += '          </div>';
    mHtml += '        </div>';
    mHtml += '      </div>';
      mHtml += '    </div>';
    mHtml += '    <div class="tab-pane fade" id="pm-fotos" role="tabpanel">';
    mHtml += '      <div class="pm-section">';
    mHtml += '        <div class="pm-section-title"><i data-lucide="image"></i> Galeria de Fotos</div>';
    if (fotos.length) {
      mHtml += '        <div class="row g-2">';
      for (var j = 0; j < fotos.length; j++) {
        mHtml += '          <div class="col-4 col-md-3"><a href="' + fotos[j].url + '" target="_blank"><img src="' + fotos[j].url + '" class="img-fluid rounded border" style="height:100px;width:100%;object-fit:cover" alt="foto"></a></div>';
      }
      mHtml += '        </div>';
    } else {
      mHtml += '        <div class="pm-card">';
      mHtml += '          <div style="text-align:center;padding:2rem 1rem;color:#64748b;">';
      mHtml += '            <i data-lucide="image" style="width:48px;height:48px;margin-bottom:1rem;opacity:0.3;"></i>';
      mHtml += '            <p style="font-size:0.85rem;">Nenhuma foto anexada</p>';
      mHtml += '          </div>';
      mHtml += '        </div>';
    }
    mHtml += '        <div style="margin-top:1rem;">';
    mHtml += '          <form id="photoUploadForm">';
    mHtml += '            <div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap;">';
    mHtml += '              <input type="file" class="pm-select" name="foto" accept="image/*" style="padding:0.5rem;font-size:0.82rem;">';
    mHtml += '              <button type="button" class="pm-btn pm-btn-outline pm-btn-sm" id="photoUploadBtn"><i data-lucide="upload"></i> Enviar Foto</button>';
    mHtml += '            </div>';
    mHtml += '          </form>';
    mHtml += '        </div>';
    mHtml += '      </div>';
    mHtml += '    </div>';
    mHtml += '  </div>';
    mHtml += '</div>';

    if (_lastModal) {
      _lastModal.hide();
    }
    var wrapper = document.createElement('div');
    wrapper.innerHTML = '<div class="modal fade pm-overlay" id="dynamicModal" tabindex="-1"><div class="modal-dialog modal-xl pm-dialog"><div class="modal-content">' + mHtml + '</div></div></div>';
    var modalEl = wrapper.firstElementChild;
    document.body.appendChild(modalEl);
    var bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
    _lastModal = bsModal;
    modalEl.addEventListener('hidden.bs.modal', function () { modalEl.remove(); if (_lastModal === bsModal) _lastModal = null; });
    if (window.lucide) lucide.createIcons();

    document.getElementById('cancelOrderBtn')?.addEventListener('click', function () {
      if (confirm('Deseja realmente cancelar este pedido?')) {
        openQuoteObservationModal(id, 'reject');
      }
    });
    document.getElementById('ordemCompraBtn')?.addEventListener('click', function () {
      openOrdemCompraFlow(o);
    });

    var approveBtn = document.getElementById('approveQuoteBtn');
    if (approveBtn) approveBtn.addEventListener('click', function () { confirmQuoteApproval(id); });
    var cancelQuoteBtn = document.getElementById('cancelQuoteBtn');
    if (cancelQuoteBtn) cancelQuoteBtn.addEventListener('click', function () { openQuoteObservationModal(id, 'reject'); });
    var requestQuoteBtn = document.getElementById('requestQuoteBtn');
    if (requestQuoteBtn) requestQuoteBtn.addEventListener('click', function () { openQuoteObservationModal(id, 'request-new-quote'); });

    var photoBtn = document.getElementById('photoUploadBtn');
    if (photoBtn) photoBtn.addEventListener('click', async function () {
      var fileInput = document.querySelector('#photoUploadForm input[type="file"]');
      if (!fileInput?.files?.length) { toast('Selecione uma foto', 'warning'); return; }
      var fd = new FormData();
      fd.append('foto', fileInput.files[0]);
      photoBtn.disabled = true; photoBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      try {
        await API.upload('/orders/' + id + '/upload', fd);
        toast('Foto enviada');
        viewOrder(id);
      } catch (err) { toast(err.error || 'Erro ao enviar', 'danger'); }
      finally { photoBtn.disabled = false; photoBtn.innerHTML = '<i data-lucide="upload"></i> Enviar Foto'; if (window.lucide) lucide.createIcons(); }
    });

    var advanceBtn = document.getElementById('advanceOrderBtn');
    if (advanceBtn) {
      advanceBtn.addEventListener('click', async function () {
        const action = nextLogisticsAction;
        if (!action) return;
        advanceBtn.disabled = true;
        advanceBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> ' + escapeHtml(action.busyLabel || 'Atualizando...');
        try {
          if (action.type === 'status') {
            await API.patch('/orders/' + id + '/status', { status: action.value });
          } else if (action.type === 'entrega') {
            await API.patch('/orders/' + id + '/entrega', { status_entrega: action.value });
          }
          toast('Pedido atualizado');
          viewOrder(id);
        } catch (err) {
          toast(err.error || 'Erro ao atualizar pedido', 'danger');
          advanceBtn.disabled = false;
          advanceBtn.innerHTML = '<i data-lucide="arrow-right-circle"></i> ' + escapeHtml(action.label);
          if (window.lucide) lucide.createIcons();
        }
      });
    }
  } catch (err) { toast(err.error || 'Erro ao carregar pedido', 'danger'); }
}

let pendingPhotos = [];

async function openOrder(id) {
  try {
    const isEdit = !!id;
    if (isEdit && user.perfil === 'oficina') {
      toast('Perfil oficina não pode editar pedidos', 'warning');
      return;
    }
    let order = null;
    const vehicles = await API.get('/vehicles?limit=100');
    if (!vehicles.data?.length) { toast('Cadastre um veículo primeiro', 'warning'); return; }

    if (isEdit) {
      order = await API.get(`/orders/${id}`);
    }

    const isOficina = user.perfil === 'oficina';
    const hasItems = isEdit && order.itens?.length;

    const vehicleOpts = vehicles.data.map(v =>
      `<option value="${v.id}"${isEdit && order.veiculo_id === v.id ? ' selected' : ''}>${v.placa} — ${v.modelo_nome || v.modelo} (${v.marca_nome || v.marca})</option>`
    ).join('');

    var mHtml = '';
    mHtml += '<div class="pm-header">';
    mHtml += '  <div class="pm-header-left">';
    mHtml += '    <div class="pm-header-icon"><i data-lucide="' + (isEdit ? 'edit-3' : 'file-plus') + '"></i></div>';
    mHtml += '    <div class="pm-header-info">';
    mHtml += '      <div class="pm-header-title">' + (isEdit ? 'Editar Pedido' : 'Novo Pedido') + '</div>';
    mHtml += '      <div class="pm-header-date"><i data-lucide="calendar"></i> ' + (isEdit ? 'Alterar dados do pedido' : 'Criar um novo pedido') + '</div>';
    mHtml += '    </div>';
    mHtml += '  </div>';
    mHtml += '  <button class="pm-header-close" data-bs-dismiss="modal" aria-label="Fechar"><i data-lucide="x"></i></button>';
    mHtml += '</div>';
    mHtml += '<div class="pm-body">';
    mHtml += '  <div class="pm-tabs" role="tablist">';
    mHtml += '    <button class="pm-tab active" data-bs-toggle="tab" data-bs-target="#pm-newItems" type="button" role="tab"><i data-lucide="list"></i> Itens</button>';
    mHtml += '    <button class="pm-tab" data-bs-toggle="tab" data-bs-target="#pm-newPhotos" type="button" role="tab"><i data-lucide="camera"></i> Fotos</button>';
    mHtml += '  </div>';
    mHtml += '  <div class="tab-content">';
    mHtml += '    <div class="tab-pane fade show active" id="pm-newItems" role="tabpanel">';
    mHtml += '      <form id="orderForm">';
    mHtml += '        <div class="pm-section">';
    mHtml += '          <div class="pm-section-title"><i data-lucide="car"></i> Veículo *</div>';
    mHtml += '          <select class="pm-input" name="veiculo_id" required style="cursor:pointer;">';
    mHtml += '            <option value="">Selecione um veículo...</option>';
    mHtml +=              vehicleOpts;
    mHtml += '          </select>';
    mHtml += '        </div>';
    mHtml += '        <div class="pm-section">';
    mHtml += '          <div class="pm-section-title"><i data-lucide="file-text"></i> Observações</div>';
    mHtml += '          <textarea class="pm-textarea" name="observacoes" rows="2" placeholder="Observações do pedido">' + (isEdit ? escapeHtml(order.observacoes || '') : '') + '</textarea>';
    mHtml += '        </div>';
    mHtml += '        <div class="pm-section">';
    mHtml += '          <div class="pm-section-title"><i data-lucide="calendar"></i> Previsão de Entrega</div>';
    mHtml += '          <input type="date" class="pm-input" name="previsao_entrega" value="' + (isEdit && order.previsao_entrega ? order.previsao_entrega.split('T')[0] : '') + '"' + (user.perfil === 'logistica' ? '' : ' disabled') + '>';
    mHtml += '          ' + (user.perfil === 'logistica' ? '' : '<small class="text-muted d-block mt-1">Somente logística pode alterar esta data</small>');
    mHtml += '        </div>';
    mHtml += '        <div class="pm-section">';
    mHtml += '          <div class="pm-section-title"><i data-lucide="shopping-cart"></i> Itens do Pedido</div>';
    mHtml += '          <div class="pm-items-card">';
    mHtml += '            <div class="pm-item-header' + (user.perfil === 'logistica' ? '' : ' pm-no-valor') + '">';
    mHtml += '              <span>Item</span><span class="pm-ic-qtd">Qtd</span>';
    if (user.perfil === 'logistica') {
      mHtml += '              <span class="pm-ic-valor">Valor Unit.</span>';
      mHtml += '              <span>Origem</span>';
    }
    mHtml += '              <span class="pm-ic-del"></span>';
    mHtml += '            </div>';
    mHtml += '            <div id="orderItems">';
    if (hasItems) {
      for (var _oi = 0; _oi < order.itens.length; _oi++) {
        var _item = order.itens[_oi];
        mHtml += '            <div class="pm-item-row' + (user.perfil === 'logistica' ? '' : ' pm-no-valor') + ' order-item">';
        mHtml += '              <input type="text" class="pm-input pm-input-sm desc-input" placeholder="Descrição do item" value="' + escapeHtml(_item.item_nome || '') + '" required>';
        mHtml += '              <input type="number" class="pm-input pm-input-sm qtd-input" placeholder="Qtd" min="1" value="' + (_item.quantidade || 1) + '">';
        if (user.perfil === 'logistica') {
          mHtml += '              <input type="number" class="pm-input pm-input-sm valor-input" placeholder="Valor unit." step="0.01" required value="' + (_item.valor_unitario || '') + '">';
          mHtml += '              <input type="text" class="pm-input pm-input-sm fornecedor-input" placeholder="Da onde vem a peça" required value="' + escapeHtml(_item.fornecedor_origem || '') + '">';
        }
        mHtml += '              <button type="button" class="pm-btn pm-btn-danger pm-btn-sm" onclick="this.closest(\'.order-item\').remove();calcTotal()"><i data-lucide="trash-2"></i></button>';
        mHtml += '            </div>';
      }
    } else {
      mHtml += '            <div class="pm-item-row' + (user.perfil === 'logistica' ? '' : ' pm-no-valor') + ' order-item">';
      mHtml += '              <input type="text" class="pm-input pm-input-sm desc-input" placeholder="Descrição do item" required>';
      mHtml += '              <input type="number" class="pm-input pm-input-sm qtd-input" placeholder="Qtd" min="1" value="1">';
      if (user.perfil === 'logistica') {
        mHtml += '              <input type="number" class="pm-input pm-input-sm valor-input" placeholder="Valor unit." step="0.01" required>';
        mHtml += '              <input type="text" class="pm-input pm-input-sm fornecedor-input" placeholder="Da onde vem a peça" required>';
      }
      mHtml += '              <button type="button" class="pm-btn pm-btn-danger pm-btn-sm" onclick="this.closest(\'.order-item\').remove();calcTotal()"><i data-lucide="trash-2"></i></button>';
      mHtml += '            </div>';
    }
    mHtml += '            </div>';
    mHtml += '          </div>';
    mHtml += '          <button type="button" class="pm-btn pm-btn-outline pm-btn-sm mt-2" onclick="addItem()"><i data-lucide="plus"></i> Item</button>';
    if (user.perfil === 'logistica') {
      mHtml += '          <div class="pm-fin-total mt-3"><span>Valor Total</span><span class="pm-fin-value" id="orderTotalPreview">' + fmtCurrency(isEdit ? (order.valor_total || 0) : 0) + '</span></div>';
    }
    mHtml += '        </div>';
    mHtml += '      </form>';
    mHtml += '    </div>';
    mHtml += '    <div class="tab-pane fade" id="pm-newPhotos" role="tabpanel">';
    mHtml += '      <div class="pm-section">';
    mHtml += '        <div class="pm-section-title"><i data-lucide="image"></i> Fotos</div>';
    mHtml += '        <div class="pm-card">';
    mHtml += '          <p style="color:#94a3b8;font-size:0.85rem;margin-bottom:0.75rem;">Selecione fotos para anexar ao pedido (opcional)</p>';
    mHtml += '          <input type="file" class="pm-input" id="photoFilesInput" accept="image/*" multiple style="padding:0.5rem;font-size:0.82rem;cursor:pointer;">';
    mHtml += '          <div class="row g-2 mt-2" id="pendingPhotoPreviews"></div>';
    mHtml += '        </div>';
    mHtml += '      </div>';
    mHtml += '    </div>';
    mHtml += '  </div>';
    mHtml += '</div>';
    mHtml += '<div class="pm-footer">';
    mHtml += '  <button class="pm-btn pm-btn-outline" data-bs-dismiss="modal">Cancelar</button>';
    mHtml += '  <button class="pm-btn pm-btn-primary" id="orderSubmit">' + (isEdit ? 'Salvar' : 'Criar Pedido') + '</button>';
    mHtml += '</div>';

    if (_lastModal) {
      _lastModal.hide();
    }
    var wrapper = document.createElement('div');
    wrapper.innerHTML = '<div class="modal fade pm-overlay" id="dynamicModal" tabindex="-1"><div class="modal-dialog pm-dialog" style="max-width:900px;"><div class="modal-content">' + mHtml + '</div></div></div>';
    var modalEl = wrapper.firstElementChild;
    document.body.appendChild(modalEl);
    var bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
    _lastModal = bsModal;
    modalEl.addEventListener('hidden.bs.modal', function () { modalEl.remove(); if (_lastModal === bsModal) _lastModal = null; });
    if (window.lucide) lucide.createIcons();

    const orderForm = document.getElementById('orderForm');
    const orderSubmitBtn = document.getElementById('orderSubmit');
    const orderItemsEl = document.getElementById('orderItems');

    const validateOrderForm = () => {
      if (!orderForm || !orderSubmitBtn) return false;
      if (!orderForm.veiculo_id.value.trim()) return false;
      const rows = [...(orderItemsEl?.querySelectorAll('.order-item') || [])];
      if (!rows.length) return false;
      return rows.every((row) => {
        const desc = row.querySelector('.desc-input')?.value.trim();
        const qtd = parseInt(row.querySelector('.qtd-input')?.value, 10) || 0;
        if (!desc || qtd < 1) return false;
        const valorInput = row.querySelector('.valor-input');
        if (valorInput) {
          const valor = parseFloat(valorInput.value);
          if (!(valor > 0)) return false;
        }
        const origemInput = row.querySelector('.fornecedor-input');
        if (origemInput && !origemInput.value.trim()) return false;
        return true;
      });
    };

    const updateOrderSubmitState = () => {
      orderSubmitBtn.disabled = !validateOrderForm();
    };

    updateOrderSubmitState();
    orderForm?.addEventListener('input', updateOrderSubmitState);
    orderForm?.addEventListener('change', updateOrderSubmitState);
    orderItemsEl?.addEventListener('click', (event) => {
      if (event.target.closest('.pm-btn-danger')) {
        setTimeout(updateOrderSubmitState, 0);
      }
    });

    pendingPhotos = [];
    var fileInput = document.getElementById('photoFilesInput');
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        var container = document.getElementById('pendingPhotoPreviews');
        container.innerHTML = '';
        pendingPhotos = [...fileInput.files];
        pendingPhotos.forEach(function (f, i) {
          var url = URL.createObjectURL(f);
          container.innerHTML += '<div class="col-4 col-md-3"><img src="' + url + '" class="img-fluid rounded border" style="height:100px;width:100%;object-fit:cover" alt="foto"></div>';
        });
      });
    }

    document.getElementById('orderSubmit').addEventListener('click', async function () {
      var form = document.getElementById('orderForm');
      var veiculo_id = form.veiculo_id.value;
      if (!veiculo_id) { toast('Selecione um veículo', 'warning'); return; }
      var itens = [...document.querySelectorAll('.order-item')].map(function (row) {
        var item = {
          descricao: row.querySelector('.desc-input').value.trim(),
          quantidade: parseInt(row.querySelector('.qtd-input').value) || 1
        };
        var valorInput = row.querySelector('.valor-input');
        if (valorInput) item.valor_unitario = parseFloat(valorInput.value) || 0;
        var fornecedorInput = row.querySelector('.fornecedor-input');
        if (fornecedorInput) item.fornecedor_origem = fornecedorInput.value.trim();
        return item;
      }).filter(function (i) { return i.descricao; });
      if (!itens.length) { toast('Adicione pelo menos um item com descrição', 'warning'); return; }
      if (!validateOrderForm()) { toast('Preencha todos os campos obrigatórios antes de finalizar', 'warning'); return; }
      var btn = document.getElementById('orderSubmit');
      btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      try {
        var previsao = (user.perfil === 'logistica') ? (document.querySelector('[name="previsao_entrega"]')?.value || undefined) : undefined;
        if (isEdit) {
          await API.put('/orders/' + id, { veiculo_id: parseInt(veiculo_id), observacoes: form.observacoes.value, itens: itens, previsao_entrega: previsao });
        } else {
          var newOrder = await API.post('/orders', { veiculo_id: parseInt(veiculo_id), observacoes: form.observacoes.value, itens: itens, previsao_entrega: previsao });
          for (var _fi = 0; _fi < pendingPhotos.length; _fi++) {
            var fd = new FormData();
            fd.append('foto', pendingPhotos[_fi]);
            await API.upload('/orders/' + newOrder.id + '/upload', fd);
          }
        }
        toast(isEdit ? 'Pedido atualizado' : 'Pedido criado com sucesso');
        bsModal.hide(); PAGES.orders();
      } catch (err) { toast(err.error || 'Erro ao salvar', 'danger'); }
      finally { btn.disabled = false; btn.innerHTML = isEdit ? 'Salvar' : 'Criar Pedido'; if (window.lucide) lucide.createIcons(); }
    });
  } catch (err) { toast(err.error || 'Erro ao carregar', 'danger'); }
}

function addItem() {
  const orderItems = document.getElementById('orderItems');
  const template = orderItems.querySelector('.order-item');
  if (!template) return;
  const c = template.cloneNode(true);
  c.querySelectorAll('input').forEach(i => i.value = '');
  c.querySelector('input[type="number"]').value = '1';
  orderItems.appendChild(c);
  if (window.lucide) lucide.createIcons();
  calcTotal();
  document.getElementById('orderSubmit')?.setAttribute('disabled', 'disabled');
}

function calcTotal() {
  let t = 0;
  document.querySelectorAll('.order-item').forEach(row => {
    const qtd = parseInt(row.querySelector('.qtd-input').value) || 0;
    const valInput = row.querySelector('.valor-input');
    const val = valInput ? parseFloat(valInput.value) || 0 : 0;
    t += qtd * val;
  });
  const el = document.getElementById('orderTotalPreview');
  if (el) el.textContent = fmtCurrency(t);
}
document.addEventListener('change', e => { if (e.target.closest('.order-item')) calcTotal(); });

async function delOrder(id) {
  if (!confirm('Excluir este pedido?')) return;
  try { await API.del(`/orders/${id}`); toast('Pedido excluído'); PAGES.orders(); }
  catch (err) { toast(err.error || 'Erro ao excluir', 'danger'); }
}

async function confirmQuoteApproval(id) {
  const btn = document.getElementById('approveQuoteBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  }
  try {
    await API.post(`/orders/${id}/approve`, {});
    toast('Pedido confirmado');
    viewOrder(id);
  } catch (err) {
    toast(err.error || 'Erro ao processar aprovação', 'danger');
    } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>' + (user.perfil === 'diretor' ? 'Aprovar' : 'Comprar');
    }
  }
}

function openQuoteObservationModal(id, action) {
  const isReject = action === 'reject';
  const isDirector = user.perfil === 'diretor';
  const title = isReject ? (isDirector ? 'Rejeitar Pedido' : 'Cancelar Pedido') : 'Novo Orçamento';
  const label = isReject ? 'Motivo da rejeição' : 'O que deseja diferente no novo orçamento';
  const desc = isReject
    ? 'Informe o motivo da rejeição deste pedido.'
    : 'Descreva o que você deseja diferente para a logística elaborar um novo orçamento.';
  const confirmLabel = isReject ? (isDirector ? 'Confirmar Rejeição' : 'Confirmar Cancelamento') : 'Solicitar Novo Orçamento';
  const m = modal(`
    <div class="modal-header">
      <h5 class="modal-title fw-bold">${title}</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
    </div>
    <div class="modal-body">
      <p class="text-muted mb-3">${desc}</p>
      <label class="form-label">${label} *</label>
      <textarea class="form-control" id="quoteObsInput" rows="4" placeholder="Escreva aqui..."></textarea>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Voltar</button>
      <button type="button" class="btn ${isReject ? 'btn-danger' : 'btn-primary'}" id="quoteObsConfirm">${confirmLabel}</button>
    </div>
  `, 'md');
  document.getElementById('quoteObsConfirm').addEventListener('click', async function () {
    const motivo = document.getElementById('quoteObsInput').value.trim();
    if (!motivo) { toast('Informe a observação', 'warning'); return; }
    const btn = this;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    try {
      await API.post(`/orders/${id}/${isReject ? 'reject' : 'request-new-quote'}`, { motivo });
      toast(isReject ? 'Pedido cancelado' : 'Novo orçamento solicitado');
      m.hide();
      if (isReject) {
        viewOrder(id);
      } else {
        openOrder(id);
      }
    } catch (err) { toast(err.error || 'Erro ao processar', 'danger'); }
    finally { btn.disabled = false; btn.innerHTML = confirmLabel; }
  });
}

// ---------- USERS ----------
PAGES.users = async function () {
  const c = document.getElementById('pageContent');
  if (!['administrativo'].includes(user.perfil)) { c.innerHTML = `<div class="alert alert-danger">Acesso restrito</div>`; return; }
  c.innerHTML = `<div class="loading-screen"><div class="spinner-border"></div></div>`;
  try {
    const data = await API.get('/users?limit=100');
    const grupos = { diretor: { label: 'Diretor', icon: 'bi-star', color: 'danger', desc: 'Gestão completa, aprovação e auditoria' }, administrativo: { label: 'Administrativo', icon: 'bi-people-fill', color: 'dark', desc: 'Replica do diretor, gestão de usuários' }, garantia: { label: 'Garantia', icon: 'bi-shield-check', color: 'success', desc: 'Garantia e cadastros' }, funilaria: { label: 'Funilaria', icon: 'bi-brush', color: 'warning', desc: 'Funilaria e cadastros' }, logistica: { label: 'Logística', icon: 'bi-truck', color: 'info', desc: 'Atualiza pedidos e fornecedores' }, oficina: { label: 'Oficina', icon: 'bi-tools', color: 'secondary', desc: 'Veículos e pedidos' }, mecanico: { label: 'Mecânico', icon: 'bi-wrench', color: 'secondary', desc: 'Execução de serviços' } };
    c.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div><p class="text-muted mb-0">Usuários organizados por função</p></div>
        <button class="btn btn-primary btn-sm" onclick="openUser()"><i class="bi bi-plus-lg me-1"></i>Novo Usuário</button>
      </div>
      ${Object.entries(grupos).map(([key, g]) => {
        const membros = data.data.filter(u => u.perfil === key);
        return `<div class="card mb-3 role-group-card">
          <div class="card-header bg-${g.color} bg-opacity-10">
            <i class="bi ${g.icon} text-${g.color} fs-5"></i>
            <div class="flex-grow-1"><h6>${g.label}</h6><small class="text-muted">${membros.length} usuário(s) — ${g.desc}</small></div>
            <span class="badge bg-${g.color}">${membros.length}</span>
          </div>
          ${!membros.length ? '<div class="card-body p-3 text-center text-muted"><small>Nenhum usuário</small></div>' : `
          <div class="table-responsive"><table class="table table-hover mb-0"><thead><tr><th>Nome</th><th>Nick</th><th class="d-none d-sm-table-cell">Setor</th><th>Ativo</th><th class="text-end">Ações</th></tr></thead>
            <tbody>${membros.map(u => `<tr>
              <td><div class="d-flex align-items-center gap-2"><div class="user-avatar-mini bg-${g.color} bg-opacity-10 text-${g.color}">${escapeHtml((u.nome||'U').charAt(0).toUpperCase())}</div>${escapeHtml(u.nome)}</div></td>
              <td><small class="text-muted">@${escapeHtml(u.nick)}</small></td>
              <td class="d-none d-sm-table-cell"><small class="text-muted">${escapeHtml(u.setor || '-')}</small></td>
              <td>${u.ativo ? '<span class="text-success"><i class="bi bi-check-circle-fill"></i></span>' : '<span class="text-danger"><i class="bi bi-x-circle-fill"></i></span>'}</td>
              <td class="text-end"><div class="table-actions justify-content-end">
                <button class="btn btn-outline-primary" onclick="openUser(${u.id})"><i class="bi bi-pencil"></i></button>
                ${['administrativo'].includes(user.perfil) ? `<button class="btn btn-outline-danger" onclick="delUser(${u.id})"><i class="bi bi-trash"></i></button>` : ''}
              </div></td>
            </tr>`).join('')}</tbody></table></div>`}
        </div>`;
      }).join('')}`;
  } catch (err) { c.innerHTML = `<div class="alert alert-danger">${err.error || 'Erro'}</div>`; }
};


async function openUser(id) {
  let u = { nome: '', setor: '', nick: '', perfil: 'oficina', ativo: 1 };
  if (id) try { u = await API.get(`/users/${id}`); } catch { return; }
  const isEdit = !!id;
  const m = modal(`
    <div class="modal-header"><h5 class="modal-title fw-bold">${isEdit ? 'Editar' : 'Novo'} Usuário</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
    <div class="modal-body">
      <form id="userForm">
        <div class="mb-3"><label class="form-label">Nome *</label><input class="form-control" name="nome" value="${escapeHtml(u.nome)}" placeholder="Nome do usuário" required></div>
        <div class="mb-3"><label class="form-label">Setor *</label><select class="form-select" name="setor" required><option value="" disabled ${SETORES.includes(u.setor) ? '' : 'selected'}>Selecione o setor</option>${SETORES.map(s => `<option value="${s}" ${u.setor === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="mb-3"><label class="form-label">${isEdit ? 'Nova senha (deixe vazio para manter)' : 'Senha *'}</label><input class="form-control" name="senha" type="password" ${isEdit ? '' : 'required'}></div>
        <div class="mb-3"><label class="form-label">Perfil</label><select class="form-select" name="perfil">${Object.entries(ROLE_INFO).map(([p, i]) => `<option value="${p}" ${u.perfil===p?'selected':''}>${i.label}</option>`).join('')}</select></div>
        <div class="mb-3"><label class="form-label">Nick *</label><input class="form-control" name="nick" value="${escapeHtml(u.nick)}" placeholder="Nick usado no login" required></div>
        <div class="form-check"><input class="form-check-input" type="checkbox" name="ativo" value="1" ${u.ativo?'checked':''} id="userAtivo"><label class="form-check-label" for="userAtivo">Ativo</label></div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-primary" id="userSubmit">${isEdit ? 'Atualizar' : 'Salvar'}</button>
    </div>`);
  document.getElementById('userSubmit').addEventListener('click', async () => {
    const fd = Object.fromEntries(new FormData(document.getElementById('userForm')));
    fd.ativo = fd.ativo ? 1 : 0;
    if (!fd.senha) delete fd.senha;
    if (fd.nick) fd.nick = fd.nick.trim().toLowerCase();
    try {
      if (isEdit) { await API.put(`/users/${id}`, fd); toast('Usuário atualizado'); }
      else { await API.post('/users', fd); toast('Usuário criado'); }
      m.hide(); PAGES.users();
    } catch (err) { toast(err.error || 'Erro', 'danger'); }
  });
}

async function delUser(id) {
  if (!confirm('Desativar usuário? Ele não poderá mais acessar o sistema.')) return;
  try { await API.del(`/users/${id}`); toast('Usuário desativado'); PAGES.users(); }
  catch (err) { toast(err.error || 'Erro', 'danger'); }
}

async function buscarPorPlaca(placa) {
  const input = document.getElementById('placaInput');
  const resultDiv = document.getElementById('placaResult');
  const p = placa || input?.value?.trim();
  if (!p) { resultDiv.innerHTML = '<div class="placa-error"><i class="fa-solid fa-circle-exclamation me-2"></i>Digite uma placa</div>'; return; }
  closeSuggestions();
  resultDiv.innerHTML = '<div class="dash-loading" style="padding:30px"><div class="spinner"></div><span><i class="fa-solid fa-magnifying-glass me-1"></i>Consultando...</span></div>';
  try {
    const data = await API.get('/dashboard/pedidos-por-placa?placa=' + encodeURIComponent(p));
    if (!data || !data.veiculo) {
      resultDiv.innerHTML = '<div class="placa-no-results"><i class="fa-solid fa-car-side"></i><br>Veiculo nao encontrado</div>';
      return;
    }
    const v = data.veiculo;
    const pedidos = data.pedidos || [];
    resultDiv.innerHTML = `<div class="placa-result">
      <div class="placa-veiculo-info">
        <span><i class="fa-solid fa-id-card me-1" style="color:var(--accent)"></i><strong>Placa:</strong> ${escapeHtml(v.placa)}</span>
        <span><i class="fa-solid fa-car me-1" style="color:var(--info)"></i><strong>Modelo:</strong> ${escapeHtml(v.marca || '')} ${escapeHtml(v.modelo || '')}</span>
        <span><i class="fa-solid fa-calendar me-1" style="color:var(--warning)"></i><strong>Ano:</strong> ${escapeHtml(v.ano || '-')}</span>
        <span><i class="fa-solid fa-gears me-1" style="color:var(--text-light)"></i><strong>Motor:</strong> ${escapeHtml(v.motor || '-')}</span>
        <span><i class="fa-solid fa-droplet me-1" style="color:var(--info)"></i><strong>Cor:</strong> ${escapeHtml(v.cor || '-')}</span>
        <span><i class="fa-solid fa-fingerprint me-1" style="color:var(--text-light)"></i><strong>Chassi:</strong> ${escapeHtml(v.chassi || '-')}</span>
        <span><i class="fa-solid fa-road me-1" style="color:var(--success)"></i><strong>Km:</strong> ${v.quilometragem ? v.quilometragem.toLocaleString('pt-BR') + ' km' : '-'}</span>
        <span><i class="fa-solid fa-clipboard-list me-1" style="color:var(--primary)"></i><strong>Pedidos:</strong> ${pedidos.length}</span>
      </div>
      ${!pedidos.length ? '<div class="placa-no-results" style="padding:20px"><i class="fa-solid fa-inbox"></i><br>Nenhum pedido encontrado para este veiculo</div>' : pedidos.map(o => `
      <div class="placa-order-card">
        <div class="placa-order-header">
          <span class="placa-order-num"><i class="fa-solid fa-receipt me-1" style="color:var(--accent)"></i>${escapeHtml(o.numero || '-')}</span>
          <span class="badge-status badge-${o.status || 'pendente'}"><i class="fa-solid ${o.status === 'concluido' ? 'fa-circle-check' : o.status === 'pendente' ? 'fa-clock' : o.status === 'rejeitado' ? 'fa-circle-xmark' : 'fa-spinner'} me-1"></i>${statusLabel(o.status)}</span>
        </div>
        <div class="placa-order-meta">
          <span><i class="fa-regular fa-calendar me-1"></i><strong>Data:</strong> ${fmtDate(o.data_pedido)}</span>
          <span><i class="fa-solid fa-user me-1"></i><strong>Solicitante:</strong> ${escapeHtml(o.solicitante || '-')}</span>
          <span><i class="fa-solid fa-wrench me-1"></i><strong>Mecanico:</strong> ${escapeHtml(o.mecanico || '-')}</span>
          <span><i class="fa-solid fa-dollar-sign me-1"></i><strong>Valor Total:</strong> ${fmtCurrency(o.valor_total)}</span>
          ${o.data_aprovacao ? `<span><i class="fa-solid fa-circle-check me-1"></i><strong>Aprovacao:</strong> ${fmtDate(o.data_aprovacao)}</span>` : ''}
          ${o.motivo_rejeicao ? `<span><i class="fa-solid fa-circle-xmark me-1"></i><strong>Motivo Rejeicao:</strong> ${escapeHtml(o.motivo_rejeicao)}</span>` : ''}
        </div>
        ${o.observacoes ? `<div style="font-size:12px;color:var(--text-light);margin-bottom:8px"><i class="fa-solid fa-comment me-1"></i><strong>Obs:</strong> ${escapeHtml(o.observacoes)}</div>` : ''}
        ${o.itens && o.itens.length ? `
        <table class="placa-items-table">
          <thead><tr><th><i class="fa-solid fa-gear me-1"></i>Peca</th><th><i class="fa-solid fa-barcode me-1"></i>Codigo</th><th><i class="fa-solid fa-hashtag me-1"></i>Qtd</th><th><i class="fa-solid fa-dollar-sign me-1"></i>Valor Unit.</th><th><i class="fa-solid fa-coins me-1"></i>Valor Total</th><th><i class="fa-solid fa-store me-1"></i>Fornecedor</th></tr></thead>
          <tbody>
            ${o.itens.map(oi => `
            <tr>
              <td style="font-weight:500"><i class="fa-solid fa-gear me-1" style="font-size:10px;color:var(--text-light)"></i>${oi.peca_nome || '-'}</td>
              <td style="color:var(--text-light)">${oi.codigo_interno || '-'}</td>
              <td><i class="fa-solid fa-xmark me-1" style="font-size:10px;color:var(--text-light)"></i>${oi.quantidade}</td>
              <td>${fmtCurrency(oi.valor_unitario)}</td>
              <td style="font-weight:600">${fmtCurrency(oi.valor_total)}</td>
              <td><i class="fa-solid fa-store me-1" style="font-size:10px;color:var(--text-light)"></i>${oi.fornecedor || '-'}</td>
            </tr>`).join('')}
          </tbody>
        </table>` : '<div style="font-size:12px;color:var(--text-light);padding:8px 0"><i class="fa-solid fa-inbox me-1"></i>Nenhum item</div>'}
        <div style="margin-top:10px">
          <button class="btn-view" onclick="viewOrder(${o.id})" style="width:auto;padding:7px 16px;border:none;border-radius:8px;background:var(--bg);color:var(--info);cursor:pointer;font-size:12px;font-weight:600;transition:all var(--transition)" onmouseover="this.style.background='var(--info)';this.style.color='#fff'" onmouseout="this.style.background='var(--bg)';this.style.color='var(--info)'"><i class="fa-solid fa-eye me-1"></i>Ver Pedido</button>
        </div>
      </div>`).join('')}
    </div>`;
  } catch (err) {
    resultDiv.innerHTML = `<div class="placa-error"><i class="fa-solid fa-circle-exclamation me-2"></i>${err.error || 'Erro ao consultar placa'}</div>`;
  }
}

function closeSuggestions() {
  const el = document.getElementById('placaSuggestions');
  if (el) { el.classList.remove('show'); el.innerHTML = ''; }
}

function selectSuggestion(placa) {
  const input = document.getElementById('placaInput');
  if (input) input.value = placa;
  closeSuggestions();
  buscarPorPlaca(placa);
}

function initPlacaAutocomplete() {
  const input = document.getElementById('placaInput');
  const suggestions = document.getElementById('placaSuggestions');
  if (!input || !suggestions) return;
  let timer, selectedIndex = -1;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim().toUpperCase();
    if (q.length < 1) { closeSuggestions(); return; }
    timer = setTimeout(async () => {
      try {
        const data = await API.get('/dashboard/suggest-placas?q=' + encodeURIComponent(q));
        selectedIndex = -1;
        if (!data || !data.length) {
          suggestions.innerHTML = '<div class="placa-suggest-empty">Nenhuma placa encontrada</div>';
          suggestions.classList.add('show');
          return;
        }
        suggestions.innerHTML = data.map((item, i) =>
          `<div class="placa-suggest-item" data-index="${i}" data-placa="${item.placa}" onclick="selectSuggestion('${item.placa}')">
            <span class="suggest-placa">${item.placa}</span>
            <span class="suggest-modelo">${item.marca || ''} ${item.modelo || ''}</span>
          </div>`
        ).join('');
        suggestions.classList.add('show');
      } catch { closeSuggestions(); }
    }, 200);
  });

  input.addEventListener('keydown', (e) => {
    const items = suggestions.querySelectorAll('.placa-suggest-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      items.forEach((el, i) => el.classList.toggle('active', i === selectedIndex));
      if (items[selectedIndex]) items[selectedIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      items.forEach((el, i) => el.classList.toggle('active', i === selectedIndex));
      if (items[selectedIndex]) items[selectedIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && items[selectedIndex]) {
        e.preventDefault();
        items[selectedIndex].click();
      }
    } else if (e.key === 'Escape') {
      closeSuggestions();
    }
  });

  input.addEventListener('blur', () => setTimeout(closeSuggestions, 200));

  input.addEventListener('focus', () => {
    if (suggestions.children.length > 0) suggestions.classList.add('show');
  });
}

// ---------- AUDIT ----------
PAGES.audit = async function (pg = 1) {
  const c = document.getElementById('pageContent');
  if (!['diretor', 'administrativo'].includes(user.perfil)) { c.innerHTML = `<div class="alert alert-danger">Acesso restrito</div>`; return; }
  c.innerHTML = `<div class="loading-screen"><div class="spinner-border"></div></div>`;
  try {
    const data = await API.get(`/audit?page=${pg}&limit=30`);
    c.innerHTML = `<div class="card"><div class="table-responsive">
      ${!data.data?.length ? '<div class="empty-state"><i class="bi bi-journal-text"></i><p>Nenhum registro</p></div>' : `
      <table class="table table-sm table-hover"><thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th class="d-none d-sm-table-cell">Entidade</th><th class="d-none d-lg-table-cell">ID</th><th class="d-none d-lg-table-cell">IP</th></tr></thead>
      <tbody>${data.data.map(a => `<tr>
        <td class="text-nowrap">${new Date(a.data_criacao).toLocaleString('pt-BR')}</td>
        <td>${a.usuario_nome || '-'}</td>
        <td><span class="badge bg-${a.acao === 'login' || a.acao === 'logout' ? 'info' : a.acao === 'create' ? 'success' : a.acao === 'update' || a.acao === 'status_update' ? 'warning' : a.acao === 'delete' ? 'danger' : a.acao === 'approve' ? 'primary' : a.acao === 'reject' ? 'dark' : 'secondary'}">${a.acao}</span></td>
        <td class="d-none d-sm-table-cell">${a.entidade}</td><td class="d-none d-lg-table-cell">${a.entidade_id || '-'}</td><td class="d-none d-lg-table-cell"><small>${a.ip || '-'}</small></td>
      </tr>`).join('')}</tbody></table>`}
    </div>${renderPagination(data, 'PAGES.audit')}</div>`;
  } catch (err) { c.innerHTML = `<div class="alert alert-danger">${err.error || 'Erro'}</div>`; }
};

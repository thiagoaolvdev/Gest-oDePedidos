let user = null;
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
  if (user.deveTrocarSenha || user.deve_trocar_senha) {
    initChangePasswordModal();
  }
});

function initChangePasswordModal() {
  const modalEl = document.getElementById('changePasswordModal');
  if (!modalEl) return;
  const modal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

  document.querySelectorAll('[data-cp-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.querySelector(btn.getAttribute('data-cp-toggle'));
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.querySelector('i').className = show ? 'bi bi-eye-slash' : 'bi bi-eye';
    });
  });

  const currentInput = document.getElementById('cpCurrentPassword');
  const newInput = document.getElementById('cpNewPassword');
  const confirmInput = document.getElementById('cpConfirmPassword');
  const errorBox = document.getElementById('cpError');
  const submitBtn = document.getElementById('cpSubmitBtn');
  const submitSpinner = document.getElementById('cpSubmitSpinner');
  const submitText = document.getElementById('cpSubmitText');

  function showError(msg) {
    errorBox.textContent = msg || '';
    errorBox.classList.toggle('d-none', !msg);
    document.getElementById('cpSuccess').classList.add('d-none');
  }

  submitBtn.addEventListener('click', async () => {
    showError('');
    document.getElementById('cpSuccess').classList.add('d-none');
    const current = currentInput.value;
    const next = newInput.value;
    const confirm = confirmInput.value;
    if (!current) return showError('Informe a senha atual.');
    if (!next || next.length < 10) return showError('A nova senha deve ter no mínimo 10 caracteres.');
    if (!/[A-Za-zÀ-ÿ]/.test(next) || !/\d/.test(next)) return showError('A nova senha deve conter ao menos uma letra e um número.');
    if (!/[^A-Za-zÀ-ÿ0-9]/.test(next)) return showError('A nova senha deve conter ao menos um caractere especial (ex: @, #, !, $).');
    if (next !== confirm) return showError('A confirmação da nova senha não confere.');

    submitBtn.disabled = true;
    submitSpinner.classList.remove('d-none');
    submitText.textContent = 'Salvando...';
    try {
      await API.post('/auth/change-password', { currentPassword: current, newPassword: next });
      currentInput.value = '';
      newInput.value = '';
      confirmInput.value = '';
      user.deveTrocarSenha = false;
      user.deve_trocar_senha = 0;
      const successBox = document.getElementById('cpSuccess');
      successBox.classList.remove('d-none');
      setTimeout(() => {
        modal.hide();
        successBox.classList.add('d-none');
      }, 1200);
    } catch (err) {
      showError(err.error || 'Erro ao alterar a senha. Tente novamente.');
    } finally {
      submitBtn.disabled = false;
      submitSpinner.classList.add('d-none');
      submitText.textContent = 'Salvar nova senha';
    }
  });

  modal.show();
}

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
  show('navUsers', ['administrativo', 'diretor'].includes(p));
  show('navAudit', ['diretor', 'administrativo'].includes(p));
}

function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.add('show');
  let bd = document.getElementById('sbBackdrop');
  if (!bd) {
    bd = document.createElement('div');
    bd.className = 'sidebar-backdrop';
    bd.id = 'sbBackdrop';
    bd.onclick = closeSidebar;
    document.body.appendChild(bd);
  }
  requestAnimationFrame(() => bd.classList.add('show'));
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.remove('show');
  const bd = document.getElementById('sbBackdrop');
  if (bd) {
    bd.classList.remove('show');
    bd.addEventListener('transitionend', () => bd.remove(), { once: true });
  }
}

function initUI() {
  // Sidebar toggle
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.contains('show') ? closeSidebar() : openSidebar();
  });

  // Nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.dataset.page);
      closeSidebar();
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
    orders: 'Pedidos', urgentes: 'Pedidos Urgentes', orders_urgentes: 'Atenção', orders_pendente: 'Pendentes', orders_aprovado: 'Aprovados', orders_aguardando_aprovacao: 'Aguardando Aprovação', orders_aguardando_autorizacao: 'Aguardando Autorização', orders_comprado: 'Comprados',
    entregas_chegou: 'Entregues',
    users: 'Usuários', audit: 'Auditoria',
    fornecedores: 'Fornecedores', profile: 'Meu Perfil'
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
    orders: 'bi-clipboard-check', urgentes: 'bi-alarm', orders_urgentes: 'bi-alarm', orders_pendente: 'bi-clock', orders_aprovado: 'bi-check-circle', orders_aguardando_aprovacao: 'bi-hourglass-split', orders_aguardando_autorizacao: 'bi-shield-lock', orders_comprado: 'bi-cart-check',
    entregas_chegou: 'bi-truck',
    users: 'bi-people', audit: 'bi-journal-text',
    fornecedores: 'bi-shop', profile: 'bi-person-circle'
  };
  return icons[page] || 'bi-speedometer2';
}

// ===== TOAST =====
function apiErrorMsg(err, fallback = 'Erro') {
  if (err && err.details && err.details.length) {
    return err.details.join(' • ');
  }
  return (err && err.error) || fallback;
}

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
function fmtDateTime(d) { return d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'; }
function fmtCurrency(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
function fmtTempoRelativo(ts) {
  if (!ts) return '-';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 0) return '-';
  const min = Math.floor(diff / 60);
  const h = Math.floor(diff / 3600);
  const d = Math.floor(diff / 86400);
  if (d >= 1) return d === 1 ? '1 dia' : `${d} dias`;
  if (h >= 1) return h === 1 ? '1 hora' : `${h} horas`;
  if (min >= 1) return `${min} min`;
  return 'agora';
}
function fmtDuracao(inicio, fim) {
  if (!inicio || !fim) return null;
  const diff = Math.floor((new Date(fim).getTime() - new Date(inicio).getTime()) / 1000);
  if (diff < 0) return null;
  const min = Math.floor(diff / 60);
  const h = Math.floor(diff / 3600);
  const d = Math.floor(diff / 86400);
  if (d >= 1) return d === 1 ? '1 dia' : `${d} dias`;
  if (h >= 1) return h === 1 ? '1 hora' : `${h} horas`;
  if (min >= 1) return `${min} min`;
  return '< 1 min';
}
function fmtTempoMedio(h) {
  h = Math.round(Number(h) || 0);
  if (h <= 0) return '0h';
  const d = Math.floor(h / 24);
  const r = h % 24;
  if (d > 0) return `${d}d ${r}h`;
  return `${h}h`;
}
function renderTempoCell(o) {
  const criado = fmtTempoRelativo(o.data_pedido);
  const resp = o.data_aprovacao ? fmtDuracao(o.data_pedido, o.data_aprovacao) : null;
  return `<div class="tempo-cell">
    <div class="tempo-row"><i class="bi bi-calendar-plus"></i><span>Criado há ${criado}</span></div>
    <div class="tempo-row ${resp ? 'tempo-ok' : ''}"><i class="bi ${resp ? 'bi-check2-circle' : 'bi-hourglass-split'}"></i><span>${resp ? 'Resposta: ' + resp : 'Aguardando resposta'}</span></div>
  </div>`;
}
function renderHistoricoBadge(s) {
  const labels = { pendente: 'Pendente', em_compra: 'Em Compra', aguardando_aprovacao: 'Aguarda Aprovação', aguardando_autorizacao: 'Aguarda Autorização Diretor', novo_orcamento: 'Novo Orçamento', aprovado: 'Aprovado', rejeitado: 'Cancelado', comprado: 'Comprado', concluido: 'Concluído', entrega_pendente: 'Entrega: Pendente', entrega_em_transito: 'Entrega: Em Trânsito', entrega_chegou: 'Entrega: Chegou' };
  const classes = { pendente: 'pendente', em_compra: 'em_compra', aguardando_aprovacao: 'aguardando_aprovacao', aguardando_autorizacao: 'aguardando_aprovacao', novo_orcamento: 'novo_orcamento', aprovado: 'aprovado', rejeitado: 'rejeitado', comprado: 'comprado', concluido: 'concluido', entrega_pendente: 'pendente', entrega_em_transito: 'em_compra', entrega_chegou: 'concluido' };
  return `<span class="status-badge status-${classes[s] || 'pendente'}">${labels[s] || s}</span>`;
}
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
const STATUS_MAP = { pendente: 'Pendente', em_compra: 'Em Compra', aguardando_aprovacao: 'Aguarda Aprovação', aguardando_autorizacao: 'Aguarda Autorização Diretor', novo_orcamento: 'Novo Orçamento', aprovado: 'Aprovado', rejeitado: 'Cancelado', comprado: 'Comprado', concluido: 'Concluído' };
const DIRECTOR_APPROVAL_LIMIT = 599;
function statusLabel(s) { return STATUS_MAP[s] || s; }
function statusBadge(s) { return `<span class="status-badge status-${s}">${statusLabel(s)}</span>`; }
function entregaBadge(s) {
  const cls = s === 'chegou' ? 'status-aprovado' : s === 'em_transito' ? 'status-em_compra' : 'status-pendente';
  const lbl = { pendente: 'Pendente', em_transito: 'Em Trânsito', chegou: 'Chegou' }[s] || 'Pendente';
  return `<span class="status-badge ${cls}">${lbl}</span>`;
}
function triagemBadge(t) {
  const map = {
    urgente: { cls: 'text-bg-danger', lbl: 'Urgente', icon: 'bi-exclamation-triangle' },
    carro_vendido: { cls: 'text-bg-primary', lbl: 'Carro vendido', icon: 'bi-cash-coin' },
    carro_estoque: { cls: 'text-bg-secondary', lbl: 'Carro estoque', icon: 'bi-box-seam' }
  };
  const conf = map[t];
  if (!conf) return '';
  return ` <span class="badge rounded-pill ${conf.cls} triagem-badge" title="Triagem: ${escapeHtml(conf.lbl)}"><i class="bi ${conf.icon} me-1"></i>${conf.lbl}</span>`;
}
function renderOrderNumero(o) {
  const horas = o.horas_sem_resposta || 0;
  const destBadge = o.destinatario_id ? ` <span class="badge rounded-pill text-bg-info" title="Enviado para: ${escapeHtml(o.destinatario_nome || '')}"><i class="bi bi-send me-1"></i>${escapeHtml(o.destinatario_nome || '---')}</span>` : '';
  const dupBadge = o.duplicidade_ignorada ? ` <span class="badge rounded-pill text-bg-warning" title="Criado mesmo após aviso de possível duplicidade"><i class="bi bi-exclamation-triangle me-1"></i>Duplicidade confirmada</span>` : '';
  const triBadge = triagemBadge(o.triagem);
  if (!o.urgente) return `<strong>${o.numero}</strong>${triBadge}${destBadge}${dupBadge}`;
  return `<strong class="text-danger">${o.numero}</strong> <span class="badge rounded-pill text-bg-danger urgente-badge" title="Sem resposta há ${horas} horas"><i class="bi bi-exclamation-triangle me-1"></i>${horas}h sem resposta</span>${triBadge}${destBadge}${dupBadge}`;
}
function renderOrderRowClass(o) { return o.urgente ? ' class="order-urgent"' : ''; }
function calcularUrgenciaPedido(o) {
  if (!o || !['pendente', 'em_compra', 'novo_orcamento'].includes(o.status)) return { urgente: false, horas: 0 };
  const ts = o.ultima_atualizacao ? new Date(o.ultima_atualizacao).getTime() : null;
  if (!ts) return { urgente: false, horas: 0 };
  const horas = Math.max(0, Math.floor((Date.now() - ts) / 3600000));
  return { urgente: horas >= 48, horas };
}
function nextStatuses(current, perfil) {
  const flow = ['pendente', 'em_compra', 'aguardando_aprovacao', 'aguardando_autorizacao', 'novo_orcamento', 'aprovado', 'comprado', 'concluido'];
  const idx = flow.indexOf(current);
  if (idx === -1) return [];
  if (current === 'aguardando_aprovacao') return ['diretor', 'administrativo'].includes(perfil) ? ['aprovado', 'rejeitado'] : [];
  if (current === 'aguardando_autorizacao') return perfil === 'diretor' ? ['aprovado', 'rejeitado'] : [];
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

function buildOcGroups(order) {
  const groups = [];
  for (const item of (order.itens || [])) {
    const itemData = {
      id: item.id,
      descricao: item.item_nome || item.descricao || item.peca_nome || '',
      quantidade: Number(item.quantidade || 0),
      unidade: item.unidade || 'un',
      valor_unitario: Number(item.valor_unitario || 0),
      valor_total: Number(item.valor_total || (Number(item.quantidade || 0) * Number(item.valor_unitario || 0))),
      ci_os: item.ci_os || item.peca_codigo || '',
      fornecedor_origem: item.fornecedor_origem || ''
    };
    groups.push({
      fornecedor_id: item.fornecedor_id || null,
      fornecedor_nome: item.fornecedor_origem || item.fornecedor_nome || '',
      fornecedor_telefone: '',
      fornecedor_endereco: '',
      itens: [itemData]
    });
  }
  return groups;
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

async function printOrderCompra(pedidoId, ocId) {
  const win = window.open('', '_blank');
  if (!win) {
    toast('Permita pop-ups para abrir a impressão', 'warning');
    return;
  }
  try {
    const path = ocId
      ? `/pedidos/${pedidoId}/ordem-compra/${ocId}/pdf`
      : `/pedidos/${pedidoId}/ordem-compra/pdf`;
    const html = await fetchHtmlWithAuth(path);
    win.document.open();
    win.document.write(html);
    win.document.close();
  } catch (err) {
    win.close();
    toast(err.error || 'Erro ao abrir ordem de compra', 'danger');
  }
}

async function printAllOrderCompras(pedidoId) {
  try {
    const ocs = await API.get(`/pedidos/${pedidoId}/ordens-compra`);
    if (!ocs.length) {
      toast('Nenhuma ordem de compra encontrada', 'warning');
      return;
    }
    await printOrderCompra(pedidoId);
  } catch (err) {
    toast(err.error || 'Erro ao carregar ordens de compra', 'danger');
  }
}

async function openOrdemCompraFlow(order) {
  if (order.ordens_compra && order.ordens_compra.length > 0) {
    await printAllOrderCompras(order.id);
    return;
  }
  const groups = buildOcGroups(order);
  await openOrdemCompraModal(order, groups);
}

async function openOrdemCompraModal(order, groups) {
  const today = new Date().toISOString().slice(0, 10);
  const vehicleLabel = getOrderVehicleLabel(order);
  const totalAllGroups = groups.reduce((sum, g) => sum + g.itens.reduce((s, i) => s + i.valor_total, 0), 0);

  let groupsHtml = '';
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    const groupTotal = g.itens.reduce((s, i) => s + i.valor_total, 0);
    const fornecedorData = g.fornecedor_id ? await loadFornecedorData(g.fornecedor_id) : {};
    groups[gi].fornecedor_nome = g.fornecedor_nome || fornecedorData.razao_social || '';
    groups[gi].fornecedor_telefone = fornecedorData.telefone || '';
    groups[gi].fornecedor_endereco = fornecedorData.endereco || '';

    groupsHtml += `
      <div class="card mb-3 oc-group-card" data-group-index="${gi}">
        <div class="card-header d-flex justify-content-between align-items-center" style="cursor:pointer;" onclick="this.parentElement.querySelector('.card-body').classList.toggle('d-none')">
          <div>
            <strong>Item ${gi + 1}:</strong> ${escapeHtml(groups[gi].itens[0]?.descricao || 'Sem descrição')}
            ${groups[gi].fornecedor_nome ? `<span class="badge bg-secondary ms-2">${escapeHtml(groups[gi].fornecedor_nome)}</span>` : ''}
          </div>
          <div class="fw-bold">${fmtCurrency(groupTotal)}</div>
        </div>
        <div class="card-body">
          <div class="row g-2 mb-2">
            <div class="col-md-4">
              <label class="form-label small">Nome / Razão Social</label>
              <input class="form-control form-control-sm oc-fornecedor-nome" value="${escapeHtml(groups[gi].fornecedor_nome || '')}">
            </div>
            <div class="col-md-4">
              <label class="form-label small">Telefone</label>
              <input class="form-control form-control-sm oc-fornecedor-telefone" value="${escapeHtml(groups[gi].fornecedor_telefone || '')}">
            </div>
            <div class="col-md-4">
              <label class="form-label small">Endereço</label>
              <input class="form-control form-control-sm oc-fornecedor-endereco" value="${escapeHtml(groups[gi].fornecedor_endereco || '')}">
            </div>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-bordered align-middle mb-0">
              <thead class="table-light">
                <tr><th>Qtd</th><th>Un</th><th>Descrição</th><th>Unitário</th><th>Total</th><th>Origem</th></tr>
              </thead>
              <tbody>
                ${g.itens.map(item => `<tr>
                  <td class="text-center">${item.quantidade}</td>
                  <td class="text-center">${escapeHtml(item.unidade || 'un')}</td>
                  <td>${escapeHtml(item.descricao)}</td>
                  <td class="text-end">${fmtCurrency(item.valor_unitario)}</td>
                  <td class="text-end">${fmtCurrency(item.valor_total)}</td>
                  <td>${escapeHtml(item.fornecedor_origem || '—')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  }

  const m = modal(`
    <div class="modal-header">
      <h5 class="modal-title fw-bold">Gerar Ordens de Compra${order.numero ? ' — Pedido ' + escapeHtml(String(order.numero)) : ''}</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
    </div>
    <div class="modal-body">
      <div class="alert alert-info small mb-3">
        Será gerada <strong>uma ordem de compra para cada item</strong>. Preencha os dados do fornecedor quando disponível.
      </div>
      <form id="ocForm">
        <div class="row g-3 mb-3">
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
            <label class="form-label">Total Geral</label>
            <input class="form-control" id="ocTotalGeral" value="${fmtCurrency(totalAllGroups)}" disabled>
          </div>
          <div class="col-12">
            <label class="form-label">Observações</label>
            <textarea class="form-control" name="observacoes" rows="2" placeholder="Campo livre">${escapeHtml(order.observacoes || '')}</textarea>
          </div>
        </div>
      </form>

      <h6 class="fw-semibold mb-2">Itens — cada um gera uma OC (${groups.length})</h6>
      ${groupsHtml}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-primary" id="ocSubmit" disabled>Gerar e Imprimir</button>
    </div>`, 'lg');

  const form = document.getElementById('ocForm');
  const submitBtn = document.getElementById('ocSubmit');
  const updateSubmitState = () => {
    const requiredFields = [...form.querySelectorAll('[required]')];
    const valid = requiredFields.every((field) => String(field.value || '').trim().length > 0);
    submitBtn.disabled = !valid;
  };
  form.addEventListener('input', updateSubmitState);
  form.addEventListener('change', updateSubmitState);
  updateSubmitState();

  submitBtn.addEventListener('click', async () => {
    const gruposPayload = [];
    for (let gi = 0; gi < groups.length; gi++) {
      const card = document.querySelector(`.oc-group-card[data-group-index="${gi}"]`);
      const fname = card.querySelector('.oc-fornecedor-nome').value.trim();
      const fphone = card.querySelector('.oc-fornecedor-telefone').value.trim();
      const faddr = card.querySelector('.oc-fornecedor-endereco').value.trim();

      gruposPayload.push({
        fornecedor_id: groups[gi].fornecedor_id,
        fornecedor_nome: fname || groups[gi].fornecedor_nome,
        fornecedor_telefone: fphone,
        fornecedor_endereco: faddr,
        itens: groups[gi].itens
      });
    }

    const payload = {
      grupos: gruposPayload,
      tipo: form.tipo.value,
      prazo_entrega: form.prazo_entrega.value,
      data_emissao: form.data_emissao.value,
      condicoes_pagamento: form.condicoes_pagamento.value.trim(),
      veiculo_uso: form.veiculo_uso.value.trim(),
      placa_uso: form.placa_uso.value.trim(),
      observacoes: form.observacoes.value.trim()
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Gerando...';
    try {
      const result = await API.post(`/pedidos/${order.id}/ordem-compra`, payload);
      m.hide();
      const qty = result?.ids?.length || groups.length;
      toast(`${qty} ordem${qty > 1 ? 's' : ''} de compra gerada${qty > 1 ? 's' : ''}`);
      await printAllOrderCompras(order.id);
    } catch (err) {
      toast((err.fields?.length ? `${err.error}: ${err.fields.join(', ')}` : err.error) || 'Erro ao gerar ordens de compra', 'danger');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Gerar e Imprimir';
    }
  });
}

async function loadFornecedorData(fornecedorId) {
  try {
    return await API.get(`/fornecedores/${fornecedorId}`);
  } catch {
    return {};
  }
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

// ---------- INDICADORES (KPIS) ----------
function ultimosNDias(n) {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - n);
  const fmt = d => d.toISOString().slice(0, 10);
  return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
}

let kpiPeriodo = ultimosNDias(30);
let kpiPeriodoModo = 'ultimos30'; // 'ultimos30' | 'especifico' | 'todo'
let KPI_LISTA = [];
const KPI_TIPOS_NUM = ['moeda', 'numero', 'percentual', 'horas', 'dias'];

function kpiIndicadoresSectionHtml() {
  return `
    <div id="kpiIndicadoresSection" class="vehicle-report-section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <h3 style="font-size:15px;font-weight:700;margin:0;"><i class="fa-solid fa-chart-line me-2" style="color:var(--accent)"></i>Indicadores de Desempenho</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <span id="kpiPeriodoLabel" class="badge bg-light text-dark border" style="font-weight:600;">Todo o período</span>
          <button class="btn btn-outline-primary btn-sm" onclick="abrirSeletorPeriodoKpi()" style="border-radius:8px;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
            <i class="fa-solid fa-calendar-days"></i> Período
          </button>
          <button class="btn btn-outline-secondary btn-sm" onclick="abrirAjudaKpis()" title="Como funciona" style="border-radius:8px;display:inline-flex;align-items:center;gap:6px;">
            <i class="fa-solid fa-circle-question"></i>
          </button>
          <button class="btn btn-outline-secondary btn-sm" onclick="carregarKpis()" title="Atualizar indicadores" style="border-radius:8px;display:inline-flex;align-items:center;gap:6px;">
            <i class="fa-solid fa-arrows-rotate"></i>
          </button>
        </div>
      </div>
      <div class="kpi-grid kpi-grid-indicadores" id="kpiGrid">
        <div class="dash-loading" style="grid-column:1/-1;"><div class="spinner"></div><span>Calculando indicadores...</span></div>
      </div>
    </div>`;
}

function kpiFmtValor(unidade, valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  const n = Number(valor);
  if (!isFinite(n)) return escapeHtml(String(valor));
  switch (unidade) {
    case 'moeda': return fmtCurrency(n);
    case 'percentual': return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
    case 'horas': return fmtTempoMedio(n);
    case 'dias': return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${n === 1 ? 'dia' : 'dias'}`;
    default: return n.toLocaleString('pt-BR');
  }
}

function kpiFmtCelula(tipo, valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  const n = Number(valor);
  switch (tipo) {
    case 'moeda': return isFinite(n) ? fmtCurrency(n) : escapeHtml(String(valor));
    case 'percentual': return isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : escapeHtml(String(valor));
    case 'horas': return fmtTempoMedio(n);
    case 'dias': return isFinite(n) ? `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias` : escapeHtml(String(valor));
    case 'numero': return isFinite(n) ? n.toLocaleString('pt-BR') : escapeHtml(String(valor));
    case 'data': return fmtDate(valor);
    case 'datahora': return fmtDateTime(valor);
    default: return escapeHtml(String(valor));
  }
}

function kpiVariacaoBadge(k) {
  if (k.sem_periodo) return '';
  if (k.variacao === null || k.variacao === undefined || !isFinite(k.variacao)) return '';
  const subiu = k.variacao > 0;
  const seta = subiu ? 'bi-arrow-up-short' : 'bi-arrow-down-short';
  let cls = 'neutro';
  let titulo = 'Variação vs. período anterior';
  if (k.direcao === 'queda_boa') {
    cls = subiu ? 'ruim' : 'bom';
    titulo += subiu ? ' (alta desfavorável)' : ' (queda favorável)';
  } else if (k.direcao === 'alta_boa') {
    cls = subiu ? 'bom' : 'ruim';
    titulo += subiu ? ' (alta favorável)' : ' (queda desfavorável)';
  }
  const txt = `${subiu ? '+' : ''}${Math.abs(k.variacao).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  return `<span class="kpi-variacao ${cls}" title="${titulo}"><i class="bi ${seta}"></i>${txt}</span>`;
}

const KPI_ICONES = {
  gasto_por_veiculo: 'fa-solid fa-truck',
  ticket_medio: 'fa-solid fa-receipt',
  pedidos_em_atencao: 'fa-solid fa-triangle-exclamation',
  tempo_aprovacao: 'fa-solid fa-hourglass-half',
  pedidos_parados: 'fa-solid fa-clock-rotate-left',
  taxa_rejeicao: 'fa-solid fa-circle-xmark',
  tempo_resposta_triagem: 'fa-solid fa-stopwatch',
  concentracao_fornecedor: 'fa-solid fa-warehouse',
  solicitantes_ativos: 'fa-solid fa-users',
  taxa_duplicidade: 'fa-solid fa-clone'
};

/* Mesma semântica de cor e tons exatos dos 6 cards de referência do dashboard:
   laranja=atenção (kpi-warning), vermelho=crítico (kpi-danger), azul=neutro (kpi-info), verde=positivo (kpi-success) */
const KPI_ESTILOS = {
  gasto_por_veiculo: { cls: 'kpi-danger', cor: '#e74c3c', iconeBg: 'rgba(231,76,60,0.12)', iconeCor: '#e74c3c' },
  ticket_medio: { cls: 'kpi-info', cor: 'var(--info)', iconeBg: 'rgba(52,152,219,0.12)', iconeCor: 'var(--info)' },
  pedidos_em_atencao: { cls: 'kpi-warning', cor: 'var(--warning)', iconeBg: 'rgba(243,156,18,0.12)', iconeCor: 'var(--warning)' },
  tempo_aprovacao: { cls: 'kpi-info', cor: 'var(--info)', iconeBg: 'rgba(52,152,219,0.12)', iconeCor: 'var(--info)' },
  pedidos_parados: { cls: 'kpi-warning', cor: 'var(--warning)', iconeBg: 'rgba(243,156,18,0.12)', iconeCor: 'var(--warning)' },
  taxa_rejeicao: { cls: 'kpi-danger', cor: '#e74c3c', iconeBg: 'rgba(231,76,60,0.12)', iconeCor: '#e74c3c' },
  tempo_resposta_triagem: { cls: 'kpi-warning', cor: 'var(--warning)', iconeBg: 'rgba(243,156,18,0.12)', iconeCor: 'var(--warning)' },
  concentracao_fornecedor: { cls: 'kpi-warning', cor: 'var(--warning)', iconeBg: 'rgba(243,156,18,0.12)', iconeCor: 'var(--warning)' },
  solicitantes_ativos: { cls: 'kpi-success', cor: 'var(--success)', iconeBg: 'rgba(46,204,113,0.12)', iconeCor: 'var(--success)' },
  taxa_duplicidade: { cls: 'kpi-danger', cor: '#e74c3c', iconeBg: 'rgba(231,76,60,0.12)', iconeCor: '#e74c3c' }
};

const KPI_SUBTITULOS = {
  gasto_por_veiculo: 'Soma dos gastos por veículo',
  ticket_medio: 'Média por pedido no período',
  pedidos_em_atencao: 'Aguardando tratamento na Atenção',
  tempo_aprovacao: 'Do pedido até a aprovação',
  pedidos_parados: '+48h sem atualização',
  taxa_rejeicao: 'Pedidos rejeitados no período',
  tempo_resposta_triagem: 'Da criação até sair da Atenção',
  concentracao_fornecedor: 'Fatia do maior fornecedor',
  solicitantes_ativos: 'Usuários que abriram pedidos',
  taxa_duplicidade: 'Pedidos duplicados detectados'
};

// Sparkline de tendencia (SVG puro, sem biblioteca): linha fina, sem eixo/legenda/grade.
function gerarSparklineSVG(pontos, cor) {
  if (!pontos || pontos.length < 2) return '';
  const valores = pontos.map(p => Number(p.valor) || 0);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const w = 100, h = 28, pad = 2;
  const range = (max - min) || 1;
  const coords = valores.map((v, i) => {
    const x = pad + (i / (valores.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `
    <svg viewBox="0 0 ${w} ${h}" class="kpi-sparkline" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="${coords}" fill="none" style="stroke:${cor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
}

function renderKpiCards(kpis) {
  return (kpis || []).map(k => {
    const estilo = KPI_ESTILOS[k.chave] || { cls: 'kpi-primary', cor: 'var(--text)', iconeBg: 'rgba(11,37,69,0.1)', iconeCor: 'var(--text)' };
    const icone = KPI_ICONES[k.chave] || 'fa-solid fa-chart-simple';
    const badgeAgora = k.sem_periodo && !k.indisponivel
      ? ' <span class="kpi-badge-agora" title="Situação atual do sistema"><i class="bi bi-broadcast"></i> agora</span>'
      : '';
    const subtitulo = k.indisponivel
      ? `<span class="kpi-sub"><i class="fa-solid fa-circle-info me-1"></i>${escapeHtml(k.motivo || 'Aguardando dados')}</span>`
      : `<span class="kpi-sub"><i class="fa-solid fa-chart-line me-1"></i>${escapeHtml(KPI_SUBTITULOS[k.chave] || k.label)}</span>`;
    // Sparkline apenas para KPIs com suporte a periodo e disponiveis; ausente = nenhum espaco vazio.
    const sparkline = !k.indisponivel && !k.sem_periodo && Array.isArray(k.tendencia) && k.tendencia.length > 1
      ? gerarSparklineSVG(k.tendencia, estilo.cor)
      : '';
    const acoesCard = k.indisponivel
      ? ` title="${escapeHtml(k.motivo || 'Indicador indisponível')}"`
      : ` onclick="abrirKpiDetalhe('${k.chave}')" role="button" title="Clique para ver os registros por trás deste número"`;
    return `
      <div class="kpi-card ${estilo.cls}${k.indisponivel ? ' kpi-indisponivel' : ' kpi-clickable'}"${acoesCard}>
        <div class="kpi-icon" style="background:${estilo.iconeBg};color:${estilo.iconeCor};"><i class="${icone}"></i></div>
        <div class="kpi-content">
          <div class="kpi-label"><i class="${icone} me-1"></i>${escapeHtml(k.label)}${badgeAgora}</div>
          <div class="kpi-value${k.indisponivel ? ' kpi-em-breve' : ''}">${k.indisponivel ? 'Em breve' : kpiFmtValor(k.unidade, k.valor)}</div>
          <div class="kpi-footer">${kpiVariacaoBadge(k)}${subtitulo}</div>
          ${sparkline}
        </div>
      </div>`;
  }).join('');
}

async function carregarKpis() {
  const grid = document.getElementById('kpiGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="dash-loading" style="grid-column:1/-1;"><div class="spinner"></div><span>Calculando indicadores...</span></div>';
  try {
    let url = '/kpis';
    if (kpiPeriodo?.dataInicio && kpiPeriodo?.dataFim) {
      url += `?dataInicio=${encodeURIComponent(kpiPeriodo.dataInicio)}&dataFim=${encodeURIComponent(kpiPeriodo.dataFim)}`;
    }
    const data = await API.get(url);
    KPI_LISTA = data.kpis || [];
    const label = document.getElementById('kpiPeriodoLabel');
    if (label) label.textContent = data.periodoTexto || 'Todo o período';
    grid.innerHTML = renderKpiCards(KPI_LISTA);
  } catch (err) {
    grid.innerHTML = `<div class="dash-error" style="grid-column:1/-1;"><i class="fa-solid fa-circle-exclamation me-2"></i>${err.error || 'Erro ao carregar indicadores'}</div>`;
  }
}

function abrirSeletorPeriodoKpi() {
  modal(`
    <div class="modal-header">
      <h5 class="modal-title fw-bold">Período dos Indicadores</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
    </div>
    <div class="modal-body">
      <div class="form-check mb-2">
        <input class="form-check-input" type="radio" name="kpiPeriodoTipo" id="kpiPeriodoUltimos30" value="ultimos30" ${kpiPeriodoModo === 'ultimos30' ? 'checked' : ''}>
        <label class="form-check-label" for="kpiPeriodoUltimos30">Últimos 30 dias <span class="text-muted small">(padrão)</span></label>
      </div>
      <div class="form-check mb-2">
        <input class="form-check-input" type="radio" name="kpiPeriodoTipo" id="kpiPeriodoTodo" value="todo" ${kpiPeriodoModo === 'todo' ? 'checked' : ''}>
        <label class="form-check-label" for="kpiPeriodoTodo">Todo o período</label>
      </div>
      <div class="form-check mb-3">
        <input class="form-check-input" type="radio" name="kpiPeriodoTipo" id="kpiPeriodoEspecifico" value="especifico" ${kpiPeriodoModo === 'especifico' ? 'checked' : ''}>
        <label class="form-check-label" for="kpiPeriodoEspecifico">Período específico</label>
      </div>
      <div id="kpiPeriodoDatas" style="display:${kpiPeriodoModo === 'especifico' ? 'block' : 'none'};">
        <div class="row g-2">
          <div class="col-6">
            <label class="form-label small">Data inicio</label>
            <input type="date" class="form-control" id="kpiDataInicio" value="${kpiPeriodo?.dataInicio || ''}">
          </div>
          <div class="col-6">
            <label class="form-label small">Data fim</label>
            <input type="date" class="form-control" id="kpiDataFim" value="${kpiPeriodo?.dataFim || ''}">
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button type="button" class="btn btn-primary" onclick="aplicarPeriodoKpi()">Aplicar</button>
    </div>
  `, 'sm');

  document.querySelectorAll('input[name="kpiPeriodoTipo"]').forEach(r =>
    r.addEventListener('change', () => {
      document.getElementById('kpiPeriodoDatas').style.display =
        document.getElementById('kpiPeriodoEspecifico').checked ? 'block' : 'none';
    })
  );
}

function aplicarPeriodoKpi() {
  const modo = document.querySelector('input[name="kpiPeriodoTipo"]:checked').value;
  if (modo === 'especifico') {
    const inicio = document.getElementById('kpiDataInicio').value;
    const fim = document.getElementById('kpiDataFim').value;
    if (!inicio || !fim) { alert('Selecione as duas datas do periodo.'); return; }
    if (inicio > fim) { alert('A data inicial deve ser anterior à data final.'); return; }
    kpiPeriodo = { dataInicio: inicio, dataFim: fim };
  } else if (modo === 'todo') {
    kpiPeriodo = null;
  } else {
    kpiPeriodo = ultimosNDias(30);
  }
  kpiPeriodoModo = modo;
  _lastModal?.hide();
  carregarKpis();
}

function abrirAjudaKpis() {
  const itensKpi = (KPI_LISTA || []).map(k => `
    <li style="margin-bottom:10px;">
      <strong>${escapeHtml(k.label)}</strong>
      ${k.sem_periodo ? '<span class="badge bg-light text-dark border ms-1" style="font-size:10px;">Situação atual</span>' : ''}
      <div class="text-muted small">${escapeHtml(k.descricao || '')}</div>
    </li>
  `).join('');

  modal(`
    <div class="modal-header">
      <h5 class="modal-title fw-bold"><i class="fa-solid fa-circle-question me-2"></i>Como funciona o Dashboard</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
    </div>
    <div class="modal-body">
      <p>Os indicadores abaixo mostram, por padrão, os dados dos <strong>últimos 30 dias</strong> — essa janela anda sozinha dia a dia (por exemplo, hoje mostra os últimos 30 dias contados a partir de hoje; amanhã, os últimos 30 dias contados a partir de amanhã).</p>
      <p>Use o botão <strong>Período</strong> para trocar isso por <strong>Todo o período</strong> (desde o início do sistema) ou por um <strong>intervalo de datas específico</strong> escolhido por você.</p>
      <p>Indicadores marcados como <span class="badge bg-light text-dark border" style="font-size:10px;">Situação atual</span> mostram um número "de agora" (ex.: quantos pedidos estão parados neste momento) e não mudam com o período escolhido — eles refletem a fila atual, não um histórico.</p>
      <hr>
      <p class="fw-bold mb-2">O que cada indicador mostra:</p>
      <ul style="padding-left:18px;">${itensKpi || '<li class="text-muted">Carregue o Dashboard primeiro para ver a lista de indicadores.</li>'}</ul>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Entendi</button>
    </div>
  `, 'lg');
}

function kpiExportUrl(chave, formato) {
  const token = API.token || localStorage.getItem('token') || '';
  let q = `formato=${formato}&token=${encodeURIComponent(token)}`;
  if (kpiPeriodo?.dataInicio && kpiPeriodo?.dataFim) {
    q += `&dataInicio=${kpiPeriodo.dataInicio}&dataFim=${kpiPeriodo.dataFim}`;
  }
  return `/api/kpis/${chave}/export?${q}`;
}

function kpiFrotaReportUrl(formato) {
  const token = API.token || localStorage.getItem('token') || '';
  let q = `formato=${formato}&token=${encodeURIComponent(token)}`;
  if (kpiPeriodo?.dataInicio && kpiPeriodo?.dataFim) {
    q += `&dataInicio=${kpiPeriodo.dataInicio}&dataFim=${kpiPeriodo.dataFim}`;
  }
  return `/api/dashboard/relatorio-frota/export?${q}`;
}

function kpiTabelaDetalhe(dados) {
  if (!dados.colunas || !dados.colunas.length) {
    return '<div class="text-center text-muted py-4">Sem detalhamento disponível.</div>';
  }
  const ths = dados.colunas.map(c =>
    `<th class="${KPI_TIPOS_NUM.includes(c.tipo) ? 'text-end' : ''}">${escapeHtml(c.label)}</th>`).join('');
  const trs = (dados.registros || []).map(r => `
    <tr>${dados.colunas.map(c =>
      `<td class="${KPI_TIPOS_NUM.includes(c.tipo) ? 'text-end text-nowrap' : ''}">${kpiFmtCelula(c.tipo, r[c.key])}</td>`).join('')}</tr>`).join('');
  if (!trs) {
    return '<div class="text-center text-muted py-4">Nenhum registro encontrado para o período.</div>';
  }
  return `
    <div class="table-responsive" style="max-height:55vh;">
      <table class="kpi-detalhe-tabela">
        <thead><tr>${ths}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div>
    ${(dados.registros || []).length >= 500
      ? '<div class="text-muted small mt-2">Exibindo os primeiros 500 registros.</div>'
      : ''}`;
}

// ===== GRAFICO DO DRILL-DOWN (Chart.js, exibicao em tela) =====
let _kpiChartInstance = null;
let _kpiDrillAberto = null;

function destruirGraficoKpi() {
  if (_kpiChartInstance) {
    _kpiChartInstance.destroy();
    _kpiChartInstance = null;
  }
}

function kpiCorGrafico(chave) {
  // Canvas 2d nao resolve var(--css); mapeia para os hex exatos do tema.
  const mapa = { 'var(--info)': '#3498DB', 'var(--warning)': '#F39C12', 'var(--success)': '#2ECC71' };
  const cor = (KPI_ESTILOS[chave] || {}).cor;
  return mapa[cor] || cor || '#0B2545';
}

function kpiDatasetsGrafico(grafico, corHex) {
  if (grafico.tipo === 'barras_horizontais') {
    return [{
      label: 'Total Gasto',
      data: grafico.valores,
      backgroundColor: grafico.cores,
      borderRadius: 4,
      maxBarThickness: 26
    }];
  }
  if (grafico.tipo === 'linha_multipla') {
    return grafico.series.map((s, i) => {
      const cor = s.cor || `hsl(${(i * 47) % 360}, 70%, 55%)`;
      const pontoUnico = s.valores.filter(v => v !== null && v !== undefined).length <= 1;
      return {
        label: s.label,
        data: s.valores,
        borderColor: cor,
        backgroundColor: cor,
        fill: false,
        tension: 0.3,
        pointRadius: pontoUnico ? 5 : 2.5,
        pointHoverRadius: pontoUnico ? 7 : 4,
        borderWidth: 2
      };
    });
  }
  if (Array.isArray(grafico.series)) {
    const coresSeries = [corHex, '#95A5A6'];
    return grafico.series.map((s, i) => ({
      label: s.label,
      data: s.valores,
      backgroundColor: coresSeries[i % coresSeries.length],
      borderRadius: 4
    }));
  }
  if (grafico.tipo === 'linha') {
    return [{
      data: grafico.valores,
      borderColor: corHex,
      backgroundColor: corHex,
      fill: false,
      tension: 0.3,
      pointRadius: 3
    }];
  }
  const ehPizza = grafico.tipo === 'pizza';
  return [{
    data: grafico.valores,
    backgroundColor: ehPizza
      ? grafico.labels.map((_, i) => `hsl(${(i * 47) % 360}, 70%, 55%)`)
      : corHex,
    borderRadius: ehPizza ? 0 : 4,
    borderWidth: ehPizza ? 1 : undefined,
    borderColor: ehPizza ? 'rgba(255,255,255,0.8)' : undefined
  }];
}

const kpiCoresTemaGrafico = () => {
  const escuro = document.documentElement.getAttribute('data-bs-theme') === 'dark';
  return escuro
    ? { rotulo: '#e2e8f0', tick: '#94a3b8', eixo: '#cbd5e1', grid: 'rgba(148, 163, 184, 0.14)', legenda: '#94a3b8' }
    : { rotulo: '#334155', tick: '#64748b', eixo: '#334155', grid: 'rgba(100, 116, 139, 0.16)', legenda: '#64748b' };
};

const kpiPluginRotuloValorBarras = {
  id: 'kpiRotuloValorBarras',
  afterDatasetsDraw(chart) {
    const meta = chart.getDatasetMeta(0);
    if (!meta || !chart.data.datasets[0]) return;
    const { ctx } = chart;
    ctx.save();
    ctx.font = '700 11px Inter, system-ui, sans-serif';
    ctx.fillStyle = kpiCoresTemaGrafico().rotulo;
    ctx.textBaseline = 'middle';
    meta.data.forEach((barra, i) => {
      const valor = chart.data.datasets[0].data[i];
      if (valor === null || valor === undefined) return;
      const texto = fmtCurrency(valor);
      const largura = ctx.measureText(texto).width;
      const cabeFora = barra.x + 8 + largura <= chart.width;
      ctx.textAlign = cabeFora ? 'left' : 'right';
      ctx.fillText(texto, cabeFora ? barra.x + 8 : barra.x - 8, barra.y);
    });
    ctx.restore();
  }
};

function kpiTickMoedaCompacto(v) {
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return fmtCurrency(v);
}

function renderizarGraficoKpi(chave, grafico) {
  destruirGraficoKpi();
  document.getElementById('kpiDrillLegenda')?.remove();
  if (!grafico || !window.Chart || _kpiDrillAberto !== chave) return;
  const canvas = document.getElementById('kpiDrillGrafico');
  const wrap = document.getElementById('kpiDrillGraficoWrap');
  if (!canvas || !wrap || !Array.isArray(grafico.labels) || !grafico.labels.length) return;

  if (grafico.tipo === 'barras_horizontais') {
    const qtd = grafico.labels.length;
    const alturaNecessaria = qtd * 36 + 70;
    wrap.style.height = Math.min(alturaNecessaria, 440) + 'px';
    wrap.style.maxHeight = '440px';
    wrap.style.overflowY = 'auto';
    const coresTema = kpiCoresTemaGrafico();
    const itensLegenda = grafico.labels.map((placa, i) =>
      `<span style="display:inline-flex;align-items:center;gap:5px;font-size:.72rem;color:${coresTema.legenda};">` +
      `<span style="width:10px;height:10px;border-radius:3px;background:${grafico.cores[i]};flex:none;"></span>${escapeHtml(placa)}</span>`
    ).join('');
    wrap.insertAdjacentHTML('afterend',
      `<div id="kpiDrillLegenda" class="d-flex flex-wrap justify-content-center" style="gap:10px;margin:-4px 0 12px;">${itensLegenda}</div>`);
    _kpiChartInstance = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: { labels: grafico.labels, datasets: kpiDatasetsGrafico(grafico, kpiCorGrafico(chave)) },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        layout: { padding: { right: 90 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, .95)',
            padding: 10,
            callbacks: {
              label: (item) => {
                const m = (grafico.meta || [])[item.dataIndex] || {};
                return [
                  `Modelo: ${m.modelo || '-'}`,
                  `Pedidos: ${m.pedidos ?? '-'}`,
                  `Total gasto: ${fmtCurrency(item.parsed.x)}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: coresTema.grid },
            border: { display: false },
            ticks: { color: coresTema.tick, font: { size: 11 }, callback: (v) => kpiTickMoedaCompacto(v) }
          },
          y: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: coresTema.eixo, font: { size: 12, weight: 600 } }
          }
        }
      },
      plugins: [kpiPluginRotuloValorBarras]
    });
    return;
  }

  const tipoChart = grafico.tipo === 'pizza' ? 'doughnut'
    : grafico.tipo === 'linha' || grafico.tipo === 'linha_multipla' ? 'line'
    : 'bar';
  _kpiChartInstance = new Chart(canvas.getContext('2d'), {
    type: tipoChart,
    data: { labels: grafico.labels, datasets: kpiDatasetsGrafico(grafico, kpiCorGrafico(chave)) },
    options: {
      indexAxis: grafico.tipo === 'bar' ? 'y' : 'x',
      plugins: {
        legend: { display: grafico.tipo === 'pizza' || Array.isArray(grafico.series), position: 'bottom' }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function exibirGraficoKpi(chave, grafico) {
  const wrap = document.getElementById('kpiDrillGraficoWrap');
  if (!wrap || !grafico) return;
  wrap.style.display = 'block';
  const el = document.getElementById('dynamicModal');
  if (!el) return;
  // Canvas com largura 0 se desenhado antes do modal terminar de abrir.
  if (el.classList.contains('show')) {
    renderizarGraficoKpi(chave, grafico);
  } else {
    el.addEventListener('shown.bs.modal', () => renderizarGraficoKpi(chave, grafico), { once: true });
  }
}

async function abrirKpiDetalhe(chave) {
  const k = (KPI_LISTA || []).find(x => x.chave === chave);
  if (!k || k.indisponivel) return;
  _kpiDrillAberto = chave;
  modal(`
    <div class="modal-header">
      <h5 class="modal-title fw-bold"><i class="${KPI_ICONES[chave] || 'bi-bar-chart'} me-2"></i>${escapeHtml(k.label)}</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
    </div>
    <div class="modal-body">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <span class="text-muted small">${k.sem_periodo ? 'Situação atual' : `Período: ${escapeHtml(k.periodoTexto || 'Todo o período')}`}</span>
          <div class="fs-4 fw-bold">${kpiFmtValor(k.unidade, k.valor)}</div>
          ${kpiVariacaoBadge(k)}
        </div>
        ${k.descricao ? `<p class="text-muted small mb-0" style="max-width:320px;">${escapeHtml(k.descricao)}</p>` : ''}
      </div>
      <div id="kpiDrillGraficoWrap" class="mb-3" style="height:220px;position:relative;display:none;">
        <canvas id="kpiDrillGrafico"></canvas>
      </div>
      <div id="kpiDetalheBody">
        <div class="dash-loading"><div class="spinner"></div><span>Carregando detalhes...</span></div>
      </div>
    </div>
    <div class="modal-footer">
      ${chave === 'gasto_por_veiculo' ? `
      <a href="#" class="btn btn-outline-primary btn-sm" style="border-radius:8px;font-weight:600;display:inline-flex;align-items:center;gap:6px;" title="Relatório de gastos da frota no mesmo período" onclick="this.href=kpiFrotaReportUrl('pdf')" target="_blank"><i class="fa-solid fa-file-pdf"></i> Relatório da Frota</a>
      <a href="#" class="btn btn-outline-primary btn-sm" style="border-radius:8px;font-weight:600;display:inline-flex;align-items:center;gap:6px;" title="Relatório de gastos da frota no mesmo período" onclick="this.href=kpiFrotaReportUrl('excel')" target="_blank"><i class="fa-solid fa-file-excel"></i> Relatório da Frota</a>` : ''}
      <a href="#" id="kpiExportPdf" class="btn btn-outline-danger btn-sm" style="border-radius:8px;font-weight:600;display:inline-flex;align-items:center;gap:6px;" onclick="this.href=kpiExportUrl('${chave}','pdf')" target="_blank"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</a>
      <a href="#" id="kpiExportExcel" class="btn btn-outline-success btn-sm" style="border-radius:8px;font-weight:600;display:inline-flex;align-items:center;gap:6px;" onclick="this.href=kpiExportUrl('${chave}','excel')" target="_blank"><i class="fa-solid fa-file-excel"></i> Exportar Excel</a>
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
    </div>
  `, 'lg');

  const elModal = document.getElementById('dynamicModal');
  if (elModal) {
    elModal.addEventListener('hidden.bs.modal', () => {
      destruirGraficoKpi();
      if (_kpiDrillAberto === chave) _kpiDrillAberto = null;
    });
  }

  try {
    let url = `/kpis/${chave}/detalhe`;
    if (kpiPeriodo?.dataInicio && kpiPeriodo?.dataFim) {
      url += `?dataInicio=${encodeURIComponent(kpiPeriodo.dataInicio)}&dataFim=${encodeURIComponent(kpiPeriodo.dataFim)}`;
    }
    const dados = await API.get(url);
    if (_kpiDrillAberto !== chave) return;
    const body = document.getElementById('kpiDetalheBody');
    if (body) body.innerHTML = kpiTabelaDetalhe(dados);
    exibirGraficoKpi(chave, dados.grafico);
  } catch (err) {
    const body = document.getElementById('kpiDetalheBody');
    if (body) body.innerHTML = `<div class="alert alert-danger mb-0">${escapeHtml(err.error || 'Erro ao carregar detalhes')}</div>`;
  }
}

// ---------- DASHBOARD ----------
window.placaAtualConsultada = null;

function abrirSeletorPeriodo(formato) {
  const temPlaca = !!window.placaAtualConsultada;
  const statusFilterHtml = temPlaca ? `
      <p class="small fw-bold mb-2" style="margin-bottom:6px;">Status dos pedidos</p>
      <div class="form-check mb-2">
        <input class="form-check-input" type="radio" name="periodoStatusTipo" id="periodoStatusPendente" value="pendente">
        <label class="form-check-label" for="periodoStatusPendente">Pendente</label>
      </div>
      <div class="form-check mb-2">
        <input class="form-check-input" type="radio" name="periodoStatusTipo" id="periodoStatusComprado" value="comprado" checked>
        <label class="form-check-label" for="periodoStatusComprado">Comprado <span class="text-muted small">(todos os demais status)</span></label>
      </div>
      <div class="form-check mb-3">
        <input class="form-check-input" type="radio" name="periodoStatusTipo" id="periodoStatusCancelado" value="cancelado">
        <label class="form-check-label" for="periodoStatusCancelado">Cancelado</label>
      </div>
      <hr class="my-3">` : '';

  modal(`
    <div class="modal-header">
      <h5 class="modal-title fw-bold">Selecionar Periodo do Relatorio</h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
    </div>
    <div class="modal-body">
      ${statusFilterHtml}
      <div class="form-check mb-2">
        <input class="form-check-input" type="radio" name="periodoTipo" id="periodoTodo" value="todo" checked>
        <label class="form-check-label" for="periodoTodo">Todo o periodo</label>
      </div>
      <div class="form-check mb-3">
        <input class="form-check-input" type="radio" name="periodoTipo" id="periodoEspecifico" value="especifico">
        <label class="form-check-label" for="periodoEspecifico">Periodo especifico</label>
      </div>
      <div id="periodoDatas" style="display:none;">
        <div class="row g-2">
          <div class="col-6">
            <label class="form-label small">Data inicio</label>
            <input type="date" class="form-control" id="periodoInicio">
          </div>
          <div class="col-6">
            <label class="form-label small">Data fim</label>
            <input type="date" class="form-control" id="periodoFim">
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button type="button" class="btn btn-primary" onclick="gerarRelatorioComPeriodo('${formato}')">Gerar Relatorio</button>
    </div>
  `, 'sm');

  document.querySelectorAll('input[name="periodoTipo"]').forEach(r =>
    r.addEventListener('change', () => {
      document.getElementById('periodoDatas').style.display =
        document.getElementById('periodoEspecifico').checked ? 'block' : 'none';
    })
  );
}

function gerarRelatorioComPeriodo(formato) {
  const especifico = document.getElementById('periodoEspecifico').checked;
  let query = `formato=${formato}`;
  if (especifico) {
    const inicio = document.getElementById('periodoInicio').value;
    const fim = document.getElementById('periodoFim').value;
    if (!inicio || !fim) { alert('Selecione as duas datas do periodo.'); return; }
    query += `&dataInicio=${inicio}&dataFim=${fim}`;
  }

  const statusSel = document.querySelector('input[name="periodoStatusTipo"]:checked');
  if (statusSel) query += `&status=${encodeURIComponent(statusSel.value)}`;

  const placaAtual = window.placaAtualConsultada;
  const base = placaAtual
    ? `/api/dashboard/relatorio-veiculo/${encodeURIComponent(placaAtual)}/export`
    : `/api/dashboard/relatorio-frota/export`;

  const token = API.token || localStorage.getItem('token') || '';
  const url = `${base}?${query}&token=${encodeURIComponent(token)}`;

  window.open(url, '_blank');
  _lastModal?.hide();
}

PAGES.dashboard = async function () {
  const c = document.getElementById('pageContent');
  c.innerHTML = '<div class="dashboard"><div class="dash-loading"><div class="spinner"></div><span>Carregando dashboard...</span></div></div>';
  try {
    c.innerHTML = `
      <div class="dashboard">
        <div class="dash-header">
          <div>
            <h1><i class="fa-solid fa-gauge-high me-2" style="color:var(--accent)"></i>Dashboard</h1>
            <p class="dash-subtitle"><i class="fa-solid fa-chart-pie me-1"></i>Visão geral de pedidos e gastos</p>
          </div>
          <div class="dash-breadcrumb"><i class="fa-solid fa-house me-1"></i>Home / <span><i class="fa-solid fa-gauge me-1"></i>Dashboard</span></div>
        </div>

        ${kpiIndicadoresSectionHtml()}

        <div class="vehicle-report-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
            <h3 style="font-size:15px;font-weight:700;margin:0;"><i class="fa-solid fa-file-lines me-2" style="color:var(--accent)"></i>Relatorios de Veiculos</h3>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn btn-outline-danger btn-sm" onclick="abrirSeletorPeriodo('pdf')" style="border-radius:8px;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                <i class="fa-solid fa-file-pdf"></i> Relatorio PDF
              </button>
              <button class="btn btn-outline-success btn-sm" onclick="abrirSeletorPeriodo('excel')" style="border-radius:8px;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
                <i class="fa-solid fa-file-excel"></i> Relatorio Excel
              </button>
            </div>
          </div>
          <div class="placa-search-section">
            <div class="placa-search-header">
              <i class="fa-solid fa-magnifying-glass"></i>
              <h3>Consulta por Placa</h3>
            </div>
            <div class="placa-search-box">
              <div class="placa-input-wrapper">
                <input type="text" id="placaInput" placeholder="Digite a placa do veiculo..." autocomplete="off">
                <div id="placaSuggestions" class="placa-suggestions"></div>
              </div>
              <button onclick="buscarPorPlaca()"><i class="fa-solid fa-magnifying-glass"></i> Consultar</button>
            </div>
            <div id="placaResult"></div>
          </div>
        </div>
      </div>`;
    setTimeout(() => {
      initPlacaAutocomplete();
      carregarKpis();
    }, 50);
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
        <ul class="nav nav-tabs mb-3" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#profileTabInfo" type="button" role="tab"><i class="bi bi-person me-1"></i>Informações</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" data-bs-toggle="tab" data-bs-target="#profileTabSecurity" type="button" role="tab"><i class="bi bi-shield-lock me-1"></i>Segurança</button>
          </li>
        </ul>
        <div class="tab-content">
          <div class="tab-pane fade show active" id="profileTabInfo" role="tabpanel">
            <div class="card p-4">
              <h5 class="fw-bold mb-3">Permissões do Perfil</h5>
              <p class="text-muted">${info.desc}</p>
              <hr>
              <h6 class="fw-bold mb-2">Informações</h6>
              <div class="row g-2">
                <div class="col-md-6"><small class="text-muted">ID:</small><p class="mb-0">${user.id}</p></div>
                <div class="col-md-6"><small class="text-muted">Usuário:</small><p class="mb-0">@${user.nick}</p></div>
              </div>
            </div>
          </div>
          <div class="tab-pane fade" id="profileTabSecurity" role="tabpanel">
            <div class="card p-4">
              <h5 class="fw-bold mb-1">Alterar Senha</h5>
              <p class="text-muted mb-3">Defina uma nova senha para o seu acesso.</p>
              <div class="alert alert-warning py-2 mb-3 d-flex align-items-start gap-2">
                <i class="bi bi-exclamation-triangle-fill mt-1"></i>
                <div class="small">
                  A nova senha deve conter:<br>
                  <span class="text-success"><i class="bi bi-check-lg"></i></span> No mínimo <strong>10 caracteres</strong><br>
                  <span class="text-success"><i class="bi bi-check-lg"></i></span> Pelo menos uma <strong>letra</strong><br>
                  <span class="text-success"><i class="bi bi-check-lg"></i></span> Pelo menos um <strong>número</strong><br>
                  <span class="text-success"><i class="bi bi-check-lg"></i></span> Pelo menos um <strong>caractere especial</strong> (ex: @, #, !, $)
                </div>
              </div>
              <form id="profilePwForm" autocomplete="off">
                <div class="mb-3">
                  <label for="ppCurrent" class="form-label">Senha atual</label>
                  <input type="password" class="form-control" id="ppCurrent" autocomplete="current-password">
                </div>
                <div class="mb-3">
                  <label for="ppNew" class="form-label">Nova senha</label>
                  <input type="password" class="form-control" id="ppNew" autocomplete="new-password">
                </div>
                <div class="mb-3">
                  <label for="ppConfirm" class="form-label">Confirmar nova senha</label>
                  <input type="password" class="form-control" id="ppConfirm" autocomplete="new-password">
                </div>
                <div id="ppError" class="alert alert-danger py-2 d-none" role="alert"></div>
                <div id="ppSuccess" class="alert alert-success py-2 d-none" role="alert">Senha alterada com sucesso!</div>
                <button type="submit" class="btn btn-primary" id="ppSubmitBtn">
                  <span id="ppSubmitText">Salvar nova senha</span>
                  <span class="spinner-border spinner-border-sm d-none" id="ppSubmitSpinner"></span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  initProfilePasswordForm();
};

function initProfilePasswordForm() {
  const form = document.getElementById('profilePwForm');
  if (!form) return;
  const cur = document.getElementById('ppCurrent');
  const neu = document.getElementById('ppNew');
  const conf = document.getElementById('ppConfirm');
  const errBox = document.getElementById('ppError');
  const okBox = document.getElementById('ppSuccess');
  const btn = document.getElementById('ppSubmitBtn');
  const txt = document.getElementById('ppSubmitText');
  const spin = document.getElementById('ppSubmitSpinner');

  function showErr(msg) {
    errBox.textContent = msg || '';
    errBox.classList.toggle('d-none', !msg);
    okBox.classList.add('d-none');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showErr('');
    okBox.classList.add('d-none');
    const current = cur.value;
    const next = neu.value;
    const confirm = conf.value;
    if (!current) return showErr('Informe a senha atual.');
    if (!next || next.length < 10) return showErr('A nova senha deve ter no mínimo 10 caracteres.');
    if (!/[A-Za-zÀ-ÿ]/.test(next) || !/\d/.test(next)) return showErr('A nova senha deve conter ao menos uma letra e um número.');
    if (!/[^A-Za-zÀ-ÿ0-9]/.test(next)) return showErr('A nova senha deve conter ao menos um caractere especial (ex: @, #, !, $).');
    if (next !== confirm) return showErr('A confirmação da nova senha não confere.');

    btn.disabled = true;
    spin.classList.remove('d-none');
    txt.textContent = 'Salvando...';
    try {
      await API.post('/auth/change-password', { currentPassword: current, newPassword: next });
      cur.value = ''; neu.value = ''; conf.value = '';
      okBox.classList.remove('d-none');
      showErr('');
    } catch (err) {
      showErr(apiErrorMsg(err) || 'Erro ao alterar a senha. Tente novamente.');
    } finally {
      btn.disabled = false;
      spin.classList.add('d-none');
      txt.textContent = 'Salvar nova senha';
    }
  });
}

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
  let v = { placa: '', modelo_id: '', ano: '', motor: '', observacoes: '', marca_id: '' };
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
            <div class="col-md-3"><label class="form-label">Marca *</label>
              <select class="form-select" name="marca_id" id="vmarca" required>
                <option value="">Selecione...</option>
                ${marcas.map(m => `<option value="${m.id}" ${v.marca_id == m.id ? 'selected' : ''}>${m.nome}</option>`).join('')}
              </select></div>
            <div class="col-md-3"><label class="form-label">Modelo *</label>
              <select class="form-select" name="modelo_id" id="vmodelo" required>
                <option value="">Selecione a marca primeiro</option>
              </select>
              <input class="form-control mt-1" name="modelo_novo_nome" id="vmodeloNovo" placeholder="Nome do novo modelo" style="display:none"></div>
            <div class="col-md-3"><label class="form-label">Ano *</label><input class="form-control" name="ano" type="number" value="${v.ano}" required min="1900" max="2099"></div>
            <div class="col-md-3"><label class="form-label">Motor</label><input class="form-control" name="motor" value="${v.motor || ''}" style="text-transform:uppercase"></div>
            <div class="col-12"><label class="form-label">Observações</label><textarea class="form-control" name="observacoes" rows="2">${v.observacoes || ''}</textarea></div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button class="btn btn-primary" id="vehicleSubmit">${isEdit ? 'Atualizar' : 'Salvar'}</button>
      </div>`, 'lg');

    async function carregarModelosPorMarca(marcaId, modeloSelecionadoId) {
      const sel = document.getElementById('vmodelo');
      const novo = document.getElementById('vmodeloNovo');
      novo.style.display = 'none';
      novo.required = false;
      if (!marcaId) {
        sel.innerHTML = '<option value="">Selecione a marca primeiro</option>';
        sel.required = true;
        return;
      }
      sel.innerHTML = '<option value="">Carregando...</option>';
      const todosModelos = await API.get('/modelos');
      const doMarca = todosModelos
        .filter(m => m.marca_id === Number(marcaId))
        .sort((a, b) => a.nome.localeCompare(b.nome));
      sel.innerHTML = '<option value="">Selecione...</option>' +
        doMarca.map(m => `<option value="${m.id}" ${modeloSelecionadoId && m.id === Number(modeloSelecionadoId) ? 'selected' : ''}>${m.nome}</option>`).join('') +
        '<option value="novo">+ Cadastrar novo modelo</option>';
    }

    document.getElementById('vmarca').addEventListener('change', e => carregarModelosPorMarca(e.target.value));

    document.getElementById('vmodelo').addEventListener('change', e => {
      const novo = document.getElementById('vmodeloNovo');
      const ehNovo = e.target.value === 'novo';
      novo.style.display = ehNovo ? 'block' : 'none';
      novo.required = ehNovo;
    });

    document.getElementById('vehicleSubmit').addEventListener('click', async () => {
      const fd = Object.fromEntries(new FormData(document.getElementById('vehicleForm')));
      if (!fd.marca_id) { toast('Selecione a marca', 'warning'); return; }
      if (!fd.modelo_id) { toast('Selecione o modelo', 'warning'); return; }
      fd.placa = fd.placa.toUpperCase();
      fd.ano = parseInt(fd.ano);
      try {
        if (fd.modelo_id === 'novo') {
          if (!fd.modelo_novo_nome?.trim()) { toast('Informe o nome do novo modelo', 'warning'); return; }
          const modelo = await API.post('/modelos', { nome: fd.modelo_novo_nome.trim(), marca_id: parseInt(fd.marca_id) });
          fd.modelo_id = modelo.id;
        } else {
          fd.modelo_id = parseInt(fd.modelo_id);
        }
        delete fd.modelo_novo_nome;
        delete fd.marca_id;
        if (isEdit) { await API.put(`/vehicles/${id}`, fd); toast('Veículo atualizado'); }
        else { await API.post('/vehicles', fd); toast('Veículo cadastrado'); }
        m.hide(); PAGES.vehicles();
      } catch (err) { toast(err.error || 'Erro ao salvar', 'danger'); }
    });

    if (isEdit && v.marca_id) await carregarModelosPorMarca(v.marca_id, v.modelo_id);
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
        <div class="col-md-6"><label class="form-label">Nome *</label><input class="form-control" name="nome" value="${p.nome}" required style="text-transform:uppercase"></div>
        <div class="col-md-3"><label class="form-label">Cód. Interno *</label><input class="form-control" name="codigo_interno" value="${p.codigo_interno}" required style="text-transform:uppercase"></div>
        <div class="col-md-3"><label class="form-label">Cód. Fabricante</label><input class="form-control" name="codigo_fabricante" value="${p.codigo_fabricante || ''}" style="text-transform:uppercase"></div>
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
    fd.nome = fd.nome.toUpperCase();
    fd.codigo_interno = fd.codigo_interno.toUpperCase();
    fd.codigo_fabricante = fd.codigo_fabricante ? fd.codigo_fabricante.toUpperCase() : fd.codigo_fabricante;
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
        <div class="col-md-6"><label class="form-label">Razão Social *</label><input class="form-control" name="razao_social" value="${f.razao_social || ''}" required style="text-transform:uppercase"></div>
        <div class="col-md-6"><label class="form-label">Nome Fantasia</label><input class="form-control" name="nome_fantasia" value="${f.nome_fantasia || ''}" style="text-transform:uppercase"></div>
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
    if (fd.razao_social) fd.razao_social = fd.razao_social.toUpperCase();
    if (fd.nome_fantasia) fd.nome_fantasia = fd.nome_fantasia.toUpperCase();
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
  const periodoDias = document.getElementById('orderPeriodoFilter')?.value || '';
  let dataInicio = '';
  let dataFim = '';
  if (periodoDias) {
    const hoje = new Date();
    dataFim = hoje.toISOString().slice(0, 10);
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - Number(periodoDias));
    dataInicio = inicio.toISOString().slice(0, 10);
  }
  return {
    status: document.getElementById('orderStatusFilter')?.value || '',
    solicitanteId: document.getElementById('orderSolicitanteFilter')?.value || '',
    search: document.getElementById('orderSearchFilter')?.value || '',
    periodoDias,
    dataInicio,
    dataFim
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
      const { status = '', solicitanteId = '', search = '', periodoDias = '' } = state;
      const userOpts = (Array.isArray(users) ? users : []).map(u =>
        `<option value="${u.id}"${String(u.id) === solicitanteId ? ' selected' : ''}>${u.nome}</option>`
      ).join('');
      c.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div class="d-flex gap-2 align-items-center flex-wrap">
          <div class="input-group input-group-sm" style="width:auto;">
            <span class="input-group-text"><i class="bi bi-upc-scan"></i></span>
            <input type="text" class="form-control" placeholder="Código do pedido ou placa..." id="orderSearchFilter" value="${escapeHtml(search)}" style="min-width:200px" onkeydown="if(event.key==='Enter')applyOrderFilters()">
          </div>
          <select class="form-select form-select-sm" id="orderStatusFilter" style="width:auto;" onchange="applyOrderFilters()">
            <option value="">Todos os status</option>
            ${Object.entries(STATUS_MAP).map(([k, v]) => `<option value="${k}"${k === status ? ' selected' : ''}>${v}</option>`).join('')}
          </select>
          <select class="form-select form-select-sm" id="orderSolicitanteFilter" style="width:auto;" onchange="applyOrderFilters()">
            <option value="">Todos os solicitantes</option>
            ${userOpts}
          </select>
          <select class="form-select form-select-sm" id="orderPeriodoFilter" style="width:auto;" onchange="applyOrderFilters()">
            <option value="">Todo o período</option>
            <option value="7"${periodoDias === '7' ? ' selected' : ''}>Últimos 7 dias</option>
            <option value="15"${periodoDias === '15' ? ' selected' : ''}>Últimos 15 dias</option>
            <option value="30"${periodoDias === '30' ? ' selected' : ''}>Últimos 30 dias</option>
            <option value="60"${periodoDias === '60' ? ' selected' : ''}>Últimos 60 dias</option>
          </select>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openOrder()"><i class="bi bi-plus-lg me-1"></i>Novo Pedido</button>
      </div>
      <div class="card"><div class="table-responsive">
        ${!data.data?.length ? '<div class="empty-state"><i class="bi bi-clipboard-check"></i><p>Nenhum pedido encontrado</p></div>' : `
        <table class="table table-hover"><thead><tr><th>Número</th><th>Veículo</th><th class="d-none d-md-table-cell">Solicitante</th><th class="d-none d-sm-table-cell">Data</th>${isOficinaOrd ? '' : '<th class="d-none d-sm-table-cell">Valor</th>'}<th>Status</th><th class="d-none d-lg-table-cell">Tempo</th><th class="text-end">Ações</th></tr></thead>
        <tbody>${data.data.map(o => `<tr${renderOrderRowClass(o)}>
          <td>${renderOrderNumero(o)}</td><td>${o.placa || '-'}</td><td class="d-none d-md-table-cell">${o.usuario_nome || '-'}</td>
          <td class="d-none d-sm-table-cell">${fmtDate(o.data_pedido)}</td>${isOficinaOrd ? '' : `<td class="d-none d-sm-table-cell">${fmtCurrency(o.valor_total)}</td>`}
          <td>${statusBadge(o.status)}</td>
          <td class="d-none d-lg-table-cell">${renderTempoCell(o)}</td>
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
          <table class="table table-hover"><thead><tr><th>Número</th><th>Veículo</th><th class="d-none d-md-table-cell">Solicitante</th><th class="d-none d-sm-table-cell">Data</th>${isOficinaOrd ? '' : '<th class="d-none d-sm-table-cell">Valor</th>'}<th>Status</th><th class="d-none d-lg-table-cell">Tempo</th><th class="text-end">Ações</th></tr></thead>
          <tbody>${data.data.map(o => `<tr${renderOrderRowClass(o)}>
            <td>${renderOrderNumero(o)}</td><td>${o.placa || '-'}</td><td class="d-none d-md-table-cell">${o.usuario_nome || '-'}</td>
            <td class="d-none d-sm-table-cell">${fmtDate(o.data_pedido)}</td>${isOficinaOrd ? '' : `<td class="d-none d-sm-table-cell">${fmtCurrency(o.valor_total)}</td>`}
            <td>${statusBadge(o.status)}</td>
            <td class="d-none d-lg-table-cell">${renderTempoCell(o)}</td>
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
          <table class="table table-hover"><thead><tr><th>Número</th><th>Veículo</th><th class="d-none d-md-table-cell">Solicitante</th><th class="d-none d-sm-table-cell">Data</th>${isOficinaOrd ? '' : '<th class="d-none d-sm-table-cell">Valor</th>'}<th>Status</th><th>Entrega</th><th class="d-none d-lg-table-cell">Tempo</th><th class="text-end">Ações</th></tr></thead>
          <tbody>${data.data.map(o => `<tr${renderOrderRowClass(o)}>
            <td>${renderOrderNumero(o)}</td><td>${o.placa || '-'}</td><td class="d-none d-md-table-cell">${o.usuario_nome || '-'}</td>
            <td class="d-none d-sm-table-cell">${fmtDate(o.data_pedido)}</td>${isOficinaOrd ? '' : `<td class="d-none d-sm-table-cell">${fmtCurrency(o.valor_total)}</td>`}
            <td>${statusBadge(o.status)}</td>
            <td>${entregaBadge(o.status_entrega)}</td>
            <td class="d-none d-lg-table-cell">${renderTempoCell(o)}</td>
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
  createOrdersPage('aguardando_autorizacao', 'Pedidos Aguardando Autorização');
createOrdersPage('comprado', 'Pedidos Comprados');

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
    const triagem = document.getElementById('triagemFilter_urgentes')?.value || '';
    c.innerHTML = `<div class="loading-screen"><div class="spinner-border"></div></div>`;
    try {
      const params = new URLSearchParams({ page: pg, limit: 15, urgente: 1 });
      if (solicitanteId) params.set('usuario_id', solicitanteId);
      if (search) params.set('search', search);
      if (dataInicio) params.set('data_inicio', dataInicio);
      if (dataFim) params.set('data_fim', dataFim);
      if (triagem) params.set('triagem', triagem);
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
            <select class="form-select form-select-sm" id="triagemFilter_urgentes" style="width:auto;" onchange="PAGES['${pageKey}'](1)">
              <option value="">Todas as triagens</option>
              <option value="urgente"${triagem === 'urgente' ? ' selected' : ''}>Urgente</option>
              <option value="carro_vendido"${triagem === 'carro_vendido' ? ' selected' : ''}>Carro vendido</option>
              <option value="carro_estoque"${triagem === 'carro_estoque' ? ' selected' : ''}>Carro estoque</option>
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
          ${!data.data?.length ? '<div class="empty-state"><i class="bi bi-alarm"></i><p>Nenhum pedido em atenção</p></div>' : `
          <table class="table table-hover"><thead><tr><th>Número</th><th>Veículo</th><th class="d-none d-md-table-cell">Solicitante</th><th class="d-none d-sm-table-cell">Data</th><th class="d-none d-sm-table-cell">Sem resposta</th>${isOficinaOrd ? '' : '<th class="d-none d-sm-table-cell">Valor</th>'}<th>Status</th><th class="d-none d-lg-table-cell">Tempo</th><th class="text-end">Ações</th></tr></thead>
          <tbody>${data.data.map(o => `<tr${renderOrderRowClass(o)}>
            <td>${renderOrderNumero(o)}</td><td>${o.placa || '-'}</td><td class="d-none d-md-table-cell">${o.usuario_nome || '-'}</td>
            <td class="d-none d-sm-table-cell">${fmtDate(o.data_pedido)}</td><td class="d-none d-sm-table-cell text-danger">${o.horas_sem_resposta || 0}h</td>${isOficinaOrd ? '' : `<td class="d-none d-sm-table-cell">${fmtCurrency(o.valor_total)}</td>`}
            <td>${statusBadge(o.status)}</td>
            <td class="d-none d-lg-table-cell">${renderTempoCell(o)}</td>
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

createUrgentesPage('Pedidos de Atenção');
PAGES.urgentes = PAGES.orders_urgentes;

function fecharEAualizarSituacao() {
  if (_lastModal) _lastModal.hide();
  if (currentPage === 'dashboard') {
    const placa = window.placaAtualConsultada;
    PAGES.dashboard().then(() => {
      if (placa) {
        const input = document.getElementById('placaInput');
        if (input) input.value = placa;
        buscarPorPlaca(placa);
      }
    });
    return;
  }
  if (PAGES[currentPage]) PAGES[currentPage]();
}

async function viewOrder(id) {
  try {
    const o = await API.get(`/orders/${id}`);
    const fotos = o.fotos || [];
    const itens = o.itens || [];
    const historico = o.historico || [];

    const timelineFlow = ['pendente', 'aprovado', 'comprado', 'concluido'];
    const timelineSteps = ['Solicitado', 'Aprovado', 'Comprado', 'Recebido', 'Finalizado'];
    const stepLevel = { 'Solicitado': 0, 'Aprovado': 1, 'Comprado': 2, 'Recebido': 3, 'Finalizado': 3 };
    const currentLevel = timelineFlow.indexOf(o.status);

    const statusBadgeClass = {
      pendente: 'pm-badge-neutral', em_compra: 'pm-badge-info',
      aguardando_aprovacao: 'pm-badge-warning', aguardando_autorizacao: 'pm-badge-warning', novo_orcamento: 'pm-badge-warning',
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

    const urgencia = calcularUrgenciaPedido(o);

    const subtotal = itens.reduce(function (s, i) { return s + Number(i.valor_total || 0); }, 0);

    const canManage = user.perfil === 'logistica';

    const showActions = canManage && !['concluido', 'rejeitado'].includes(o.status);

    const precisaDiretor = Number(o.valor_total) > DIRECTOR_APPROVAL_LIMIT;
    const isOwner = Number(o.usuario_id) === Number(user.id);
    const canApprove = o.status === 'aguardando_aprovacao' && isOwner;
    const podeAutorizar = o.status === 'aguardando_autorizacao' && user.perfil === 'diretor';
    const aguardandoAutorizacao = o.status === 'aguardando_autorizacao';

    const hasOC = !!(o.ordens_compra && o.ordens_compra.length > 0);
    const nextLogisticsAction = getNextLogisticsAction(o);

    var mHtml = '';
    mHtml += '<div class="pm-header">';
    mHtml += '  <div class="pm-header-left">';
    mHtml += '    <div class="pm-header-icon"><i data-lucide="shopping-cart"></i></div>';
    mHtml += '    <div class="pm-header-info">';
    mHtml += '      <div class="pm-header-title">' + escapeHtml('Pedido ' + (o.numero || '')) + (urgencia.urgente ? ' <span class="badge rounded-pill text-bg-danger" style="font-size:.62rem;vertical-align:middle;" title="Sem atualiza\u00e7\u00e3o h\u00e1 ' + urgencia.horas + ' horas"><i class="bi bi-alarm"></i> ' + urgencia.horas + 'h sem resposta</span>' : '') + (o.triagem ? triagemBadge(o.triagem) : '') + '</div>';
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
    if (urgencia.urgente) {
      mHtml += '      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.25);margin-bottom:14px;">';
      mHtml += '        <i class="bi bi-alarm" style="color:#dc2626;font-size:1.1rem;"></i>';
      mHtml += '        <div><div style="font-size:.85rem;font-weight:700;color:#b91c1c;">Pedido urgente \u2014 sem atualiza\u00e7\u00e3o h\u00e1 ' + urgencia.horas + 'h</div>';
      mHtml += '        <div style="font-size:.75rem;color:#7f1d1d;">\u00datima movimenta\u00e7\u00e3o em ' + fmtDateTime(o.ultima_atualizacao) + '. Aguardando resposta da log\u00edstica.</div></div>';
      mHtml += '      </div>';
    }
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
    mHtml += '        <div class="pm-card"><div class="pm-card-label"><i data-lucide="circle"></i> Status</div><div><span class="pm-badge ' + statusBadgeClass + '">' + statusLabel(o.status) + '</span>' + (o.duplicidade_ignorada ? ' <span class="badge rounded-pill text-bg-warning" style="font-size:.62rem;" title="Criado mesmo ap\u00f3s aviso de poss\u00edvel duplicidade"><i data-lucide="triangle-alert"></i> Duplicidade confirmada</span>' : '') + '</div></div>';
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
      if (user.perfil === 'logistica' && ['pendente', 'em_compra', 'novo_orcamento'].includes(o.status)) {
        mHtml += '            <button class="pm-btn pm-btn-danger pm-btn-sm" id="cancelOrderBtn"><i data-lucide="x"></i> Cancelar Pedido</button>';
      }
      mHtml += '          </div>';
      mHtml += '        </div>';
      mHtml += '      </div>';
    }
    if (canApprove) {
      mHtml += '      <div class="pm-section">';
      mHtml += '        <div class="pm-section-title"><i data-lucide="check-circle"></i> Confirma\u00e7\u00e3o de Compra</div>';
      mHtml += '        <div class="pm-oc-area" style="border-color:rgba(234,179,8,0.2);background:rgba(234,179,8,0.04);">';
      mHtml += '          <div class="pm-oc-label"><strong>Cota\u00e7\u00e3o pronta.</strong> Valor: ' + fmtCurrency(o.valor_total) + (o.previsao_entrega ? ' \u00b7 Previs\u00e3o de entrega: ' + fmtDate(o.previsao_entrega) : '') + '.</div>';
      if (precisaDiretor) {
        mHtml += '          <div class="pm-oc-label" style="color:#b45309;"><i data-lucide="shield-alert"></i> Pedido acima de ' + fmtCurrency(DIRECTOR_APPROVAL_LIMIT) + ': ao confirmar, ele ser\u00e1 enviado para a autoriza\u00e7\u00e3o do diretor.</div>';
      }
      mHtml += '          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">';
      mHtml += '            <button class="pm-btn pm-btn-success pm-btn-sm" id="approveQuoteBtn"><i data-lucide="check-circle"></i> Confirmar Compra</button>';
      mHtml += '            <button class="pm-btn pm-btn-warning pm-btn-sm" id="requestQuoteBtn"><i data-lucide="refresh-cw"></i> Novo Or\u00e7amento</button>';
      mHtml += '            <button class="pm-btn pm-btn-danger pm-btn-sm" id="cancelQuoteBtn"><i data-lucide="x-circle"></i> Cancelar</button>';
      mHtml += '          </div>';
      mHtml += '        </div>';
      mHtml += '      </div>';
    } else if (podeAutorizar) {
      mHtml += '      <div class="pm-section">';
      mHtml += '        <div class="pm-section-title"><i data-lucide="shield-check"></i> Autoriza\u00e7\u00e3o do Diretor</div>';
      mHtml += '        <div class="pm-oc-area" style="border-color:rgba(234,179,8,0.2);background:rgba(234,179,8,0.04);">';
      mHtml += '          <div class="pm-oc-label"><strong>Compra confirmada pelo solicitante.</strong> Valor: ' + fmtCurrency(o.valor_total) + '. Pedido acima de ' + fmtCurrency(DIRECTOR_APPROVAL_LIMIT) + '.</div>';
      mHtml += '          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">';
      mHtml += '            <button class="pm-btn pm-btn-success pm-btn-sm" id="approveQuoteBtn"><i data-lucide="check-circle"></i> Autorizar</button>';
      mHtml += '            <button class="pm-btn pm-btn-danger pm-btn-sm" id="cancelQuoteBtn"><i data-lucide="x-circle"></i> Rejeitar</button>';
      mHtml += '          </div>';
      mHtml += '        </div>';
      mHtml += '      </div>';
    } else if (aguardandoAutorizacao) {
      mHtml += '      <div class="pm-section">';
      mHtml += '        <div class="pm-section-title"><i data-lucide="shield-check"></i> Autoriza\u00e7\u00e3o do Diretor</div>';
      mHtml += '        <div class="pm-oc-area" style="border-color:rgba(234,179,8,0.2);background:rgba(234,179,8,0.04);">';
      mHtml += '          <div class="pm-oc-label"><i data-lucide="clock"></i> Compra confirmada pelo solicitante. Este pedido aguarda a autoriza\u00e7\u00e3o do diretor.</div>';
      mHtml += '        </div>';
      mHtml += '      </div>';
    }
    mHtml += '      <div class="pm-section">';
    mHtml += '        <div class="pm-section-title"><i data-lucide="file-text"></i> Observa\u00e7\u00f5es</div>';
    mHtml += '        <div class="pm-card pm-card-full">';
    mHtml += '          <textarea class="pm-textarea" placeholder="Nenhuma observa\u00e7\u00e3o registrada..." readonly>' + escapeHtml(o.observacoes || '') + '</textarea>';
    mHtml += '        </div>';
    mHtml += '      </div>';
    if (user.perfil === 'logistica' && ['aprovado', 'comprado', 'concluido'].includes(o.status)) {
      mHtml += '      <div class="pm-section">';
      mHtml += '        <div class="pm-section-title"><i data-lucide="printer"></i> Ordem de Compra</div>';
      mHtml += '        <div class="pm-oc-area">';
      if (hasOC) {
        const ocCount = o.ordens_compra.length;
        const ocLabels = o.ordens_compra.map(oc => escapeHtml(oc.numero || '')).join(', ');
        mHtml += '          <div class="pm-oc-label"><strong>' + ocCount + ' OC(s):</strong> ' + ocLabels + '</div>';
        mHtml += '          <button class="pm-btn pm-btn-primary pm-btn-sm" id="ordemCompraBtn"><i data-lucide="printer"></i> Imprimir OCs</button>';
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
    mHtml += '            <div class="pm-info-item"><span class="pm-info-item-label"><i data-lucide="calendar"></i> Previs\u00e3o de Entrega</span><span class="pm-info-item-value">' + fmtDate(o.previsao_entrega) + '</span></div>';
    if (o.destinatario_id) {
      mHtml += '            <div class="pm-info-item"><span class="pm-info-item-label"><i data-lucide="send"></i> Enviado para</span><span class="pm-info-item-value"><span class="badge rounded-pill text-bg-info" title="Enviado para: ' + escapeHtml(o.destinatario_nome || '') + ' confirmar a compra">' + escapeHtml('Enviado para: ' + (o.destinatario_nome || '---')) + '</span></span></div>';
    }
    mHtml += '          </div>';
    mHtml += '        </div>';
    mHtml += '      </div>';
    mHtml += '      <div class="pm-section">';
    mHtml += '        <div class="pm-section-title"><i data-lucide="history"></i> Hist\u00f3rico</div>';
    mHtml += '        <div class="pm-card">';
    mHtml += '          <div class="pm-section-title" style="margin-bottom:0.75rem;text-transform:none;font-size:0.82rem;"><i data-lucide="clock"></i> Hist\u00f3rico de Altera\u00e7\u00f5es</div>';
    if (historico.length) {
      mHtml += '          <div class="pm-history">';
      for (var h = 0; h < historico.length; h++) {
        var hh = historico[h];
        mHtml += '            <div class="pm-history-item">';
        mHtml += '              <div class="pm-history-time">' + fmtDateTime(hh.created_at) + '</div>';
        mHtml += '              <div class="pm-history-status">' + renderHistoricoBadge(hh.status) + '</div>';
        mHtml += '              <div class="pm-history-desc">' + escapeHtml(hh.descricao || '') + '</div>';
        mHtml += '              <div class="pm-history-user">' + escapeHtml(hh.usuario_nome || 'Sistema') + '</div>';
        mHtml += '            </div>';
      }
      mHtml += '          </div>';
    } else {
      mHtml += '          <div style="font-size:0.85rem;color:#64748b;margin-bottom:1.5rem;">Nenhuma altera\u00e7\u00e3o registrada.</div>';
    }
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
    if (approveBtn) approveBtn.addEventListener('click', function () { confirmQuoteApproval(id, o.status === 'aguardando_autorizacao' ? 'authorize' : 'approve'); });
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
          fecharEAualizarSituacao();
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

let _pecasCache = null;

async function carregarPecasDatalist() {
  if (_pecasCache) return _pecasCache;
  try {
    const resp = await API.get('/parts?limit=500');
    _pecasCache = (resp.data || []).map(p => ({ id: p.id, nome: p.nome }));
  } catch (e) { _pecasCache = []; }
  return _pecasCache;
}

function resolverPecaId(descricao) {
  const termo = String(descricao || '').trim().toLowerCase();
  if (!termo) return null;
  const peca = (_pecasCache || []).find(p => p.nome.trim().toLowerCase() === termo);
  return peca ? peca.id : null;
}

function pedirConfirmacaoDuplicidade(conflitos) {
  return new Promise(function (resolve) {
    var resolvido = false;
    var decidir = function (valor) { if (!resolvido) { resolvido = true; resolve(valor); } };
    var itensHtml = conflitos.map(function (c) {
      return '<li class="mb-2 p-2 border rounded">' +
        '<strong>' + escapeHtml(c.peca_nome || '-') + '</strong> &mdash; Pedido ' + escapeHtml(c.numero || '') + '<br>' +
        '<small class="text-muted">Solicitado por ' + escapeHtml(c.solicitante_nome || '-') + ' em ' + fmtDateTime(c.data_pedido) + '</small>' +
        '</li>';
    }).join('');
    var wrapper = document.createElement('div');
    wrapper.innerHTML =
      '<div class="modal fade" id="dupWarningModal" tabindex="-1">' +
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
      '<div class="modal-header">' +
      '<h5 class="modal-title fw-bold text-warning"><i class="bi bi-exclamation-triangle me-2"></i>Poss\u00edvel pedido duplicado</h5>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal"></button>' +
      '</div>' +
      '<div class="modal-body">' +
      '<p>Encontramos pedido(s) recente(s) para essa mesma pe\u00e7a, nesse mesmo ve\u00edculo:</p>' +
      '<ul class="list-unstyled mb-3">' + itensHtml + '</ul>' +
      '<p class="mb-0">Deseja continuar mesmo assim?</p>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-secondary" id="dupCancelBtn">Cancelar</button>' +
      '<button type="button" class="btn btn-warning" id="dupConfirmBtn">Confirmar mesmo assim</button>' +
      '</div>' +
      '</div></div></div>';
    var el = wrapper.firstElementChild;
    document.body.appendChild(el);
    var m = new bootstrap.Modal(el);
    el.addEventListener('hidden.bs.modal', function () { el.remove(); decidir(false); });
    el.querySelector('#dupCancelBtn').addEventListener('click', function () { m.hide(); });
    el.querySelector('#dupConfirmBtn').addEventListener('click', function () { decidir(true); m.hide(); });
    m.show();
  });
}

async function openOrder(id) {
  try {
    const isEdit = !!id;
    if (isEdit && user.perfil === 'oficina') {
      toast('Perfil oficina não pode editar pedidos', 'warning');
      return;
    }
    let order = null;
    if (isEdit) {
      order = await API.get(`/orders/${id}`);
    }

    let destinatorOptions = '';
    if (user.perfil === 'logistica' && !isEdit) {
      try {
        const [diretores, admins] = await Promise.all([
          API.get('/users/perfil/diretor').catch(() => []),
          API.get('/users/perfil/administrativo').catch(() => [])
        ]);
        const seen = new Set();
        destinatorOptions = [...(Array.isArray(diretores) ? diretores : []), ...(Array.isArray(admins) ? admins : [])]
          .filter(u => u && u.ativo !== 0 && !seen.has(u.id) && seen.add(u.id))
          .map(u => '<option value="' + u.id + '">' + escapeHtml(u.nome) + '</option>')
          .join('');
      } catch (e) { destinatorOptions = ''; }
    }

    const isOficina = user.perfil === 'oficina';
    const hasItems = isEdit && order.itens?.length;

    const editPlaca = isEdit ? (order.placa || '') : '';
    const editModelo = isEdit ? ((order.veiculo_marca ? order.veiculo_marca + ' ' : '') + (order.veiculo_modelo || '')) : '';
    const editVeiculoLabel = editPlaca ? editPlaca + (editModelo ? ' — ' + editModelo : '') : '';
    const editVeiculoId = isEdit ? (order.veiculo_id || '') : '';

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
    mHtml += '          <div class="placa-input-wrapper">';
    mHtml += '            <input type="text" id="veiculoPlacaInput" class="pm-input" placeholder="Digite a placa do veículo..." autocomplete="off" value="' + escapeHtml(editVeiculoLabel) + '" required>';
    mHtml += '            <div id="veiculoSuggestions" class="placa-suggestions"></div>';
    mHtml += '          </div>';
    mHtml += '          <input type="hidden" name="veiculo_id" id="veiculoIdHidden" value="' + escapeHtml(String(editVeiculoId)) + '">';
    mHtml += '        </div>';
    mHtml += '        <div class="pm-section">';
    mHtml += '          <div class="pm-section-title"><i data-lucide="flag"></i> Triagem *</div>';
    mHtml += '          <div class="pm-triagem-group" id="triagemGroup">';
    mHtml += '            <button type="button" class="pm-triagem-btn pm-triagem-urgente" data-valor="urgente"><i class="bi bi-exclamation-triangle"></i> Urgente</button>';
    mHtml += '            <button type="button" class="pm-triagem-btn pm-triagem-vendido" data-valor="carro_vendido"><i class="bi bi-cash-coin"></i> Carro vendido</button>';
    mHtml += '            <button type="button" class="pm-triagem-btn pm-triagem-estoque" data-valor="carro_estoque"><i class="bi bi-box-seam"></i> Carro estoque</button>';
    mHtml += '          </div>';
    mHtml += '          <input type="hidden" name="triagem" id="triagemHidden" value="' + (isEdit ? escapeHtml(order.triagem || '') : '') + '">';
    mHtml += '        </div>';
    mHtml += '        <div class="pm-section">';
    mHtml += '          <div class="pm-section-title"><i data-lucide="file-text"></i> Observações</div>';
    mHtml += '          <textarea class="pm-textarea" name="observacoes" rows="2" placeholder="Observações do pedido">' + (isEdit ? escapeHtml(order.observacoes || '') : '') + '</textarea>';
    mHtml += '        </div>';
    mHtml += '        <div class="pm-section">';
    mHtml += '          <div class="pm-section-title"><i data-lucide="calendar"></i> Previs\u00e3o de Entrega</div>';
    mHtml += '          <input type="date" class="pm-input" name="previsao_entrega" value="' + (isEdit && order.previsao_entrega ? order.previsao_entrega.split('T')[0] : '') + '"' + (user.perfil === 'logistica' ? ' required' : ' disabled') + '>';
    mHtml += '          ' + (user.perfil === 'logistica' ? '' : '<small class="text-muted d-block mt-1">Somente log\u00edstica pode alterar esta data</small>');
    mHtml += '        </div>';
    if (user.perfil === 'logistica' && !isEdit && destinatorOptions) {
      mHtml += '        <div class="pm-section">';
      mHtml += '          <div class="pm-section-title"><i data-lucide="send"></i> Enviar para</div>';
      mHtml += '          <select class="pm-input" name="destinatario_id">';
      mHtml += '            <option value="">— Vis\u00edvel para todos (opcional) —</option>';
      mHtml += destinatorOptions;
      mHtml += '          </select>';
      mHtml += '          <small class="text-muted d-block mt-1">Se selecionado, o pedido ficar\u00e1 vis\u00edvel apenas para voc\u00ea e para o destinat\u00e1rio, que receber\u00e1 uma notifica\u00e7\u00e3o para confirmar a compra.</small>';
      mHtml += '        </div>';
    }
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
        mHtml += '              <input type="text" class="pm-input pm-input-sm desc-input" placeholder="Descrição do item" value="' + escapeHtml(_item.item_nome || '') + '" required style="text-transform:uppercase">';
        mHtml += '              <input type="number" class="pm-input pm-input-sm qtd-input" placeholder="Qtd" min="1" value="' + (_item.quantidade || 1) + '">';
        if (user.perfil === 'logistica') {
          mHtml += '              <input type="number" class="pm-input pm-input-sm valor-input" placeholder="Valor unit." step="0.01" required value="' + (_item.valor_unitario || '') + '">';
          mHtml += '              <input type="text" class="pm-input pm-input-sm fornecedor-input" placeholder="Da onde vem a peça" required value="' + escapeHtml(_item.fornecedor_origem || '') + '" style="text-transform:uppercase">';
        }
        mHtml += '              <button type="button" class="pm-btn pm-btn-danger pm-btn-sm" onclick="this.closest(\'.order-item\').remove();calcTotal()"><i data-lucide="trash-2"></i></button>';
        mHtml += '            </div>';
      }
    } else {
      mHtml += '            <div class="pm-item-row' + (user.perfil === 'logistica' ? '' : ' pm-no-valor') + ' order-item">';
      mHtml += '              <input type="text" class="pm-input pm-input-sm desc-input" placeholder="Descrição do item" required style="text-transform:uppercase">';
      mHtml += '              <input type="number" class="pm-input pm-input-sm qtd-input" placeholder="Qtd" min="1" value="1">';
      if (user.perfil === 'logistica') {
        mHtml += '              <input type="number" class="pm-input pm-input-sm valor-input" placeholder="Valor unit." step="0.01" required>';
        mHtml += '              <input type="text" class="pm-input pm-input-sm fornecedor-input" placeholder="Da onde vem a peça" required style="text-transform:uppercase">';
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
    initVeiculoAutocomplete();

    document.querySelectorAll('#triagemGroup .pm-triagem-btn').forEach(function (btn) {
      if (btn.dataset.valor === (document.getElementById('triagemHidden').value || '')) btn.classList.add('active');
      btn.addEventListener('click', function () {
        document.querySelectorAll('#triagemGroup .pm-triagem-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById('triagemHidden').value = btn.dataset.valor;
        updateOrderSubmitState();
      });
    });

    carregarPecasDatalist().then(pecas => {
      let dl = document.getElementById('pecasDatalist');
      if (!dl) {
        dl = document.createElement('datalist');
        dl.id = 'pecasDatalist';
        document.body.appendChild(dl);
      }
      dl.innerHTML = pecas.map(p => `<option value="${escapeHtml(p.nome)}" data-id="${p.id}"></option>`).join('');
      document.querySelectorAll('#orderItems .desc-input').forEach(inp => inp.setAttribute('list', 'pecasDatalist'));
    });

    const orderForm = document.getElementById('orderForm');
    const orderSubmitBtn = document.getElementById('orderSubmit');
    const orderItemsEl = document.getElementById('orderItems');

    const validateOrderForm = () => {
      if (!orderForm || !orderSubmitBtn) return false;
      if (!orderForm.veiculo_id.value.trim()) return false;
      if (!isEdit && !document.getElementById('triagemHidden')?.value) return false;
      if (user.perfil === 'logistica' && !orderForm.querySelector('[name="previsao_entrega"]')?.value) return false;
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
          descricao: row.querySelector('.desc-input').value.trim().toUpperCase(),
          quantidade: parseInt(row.querySelector('.qtd-input').value) || 1
        };
        if (row.dataset.pecaId) item.peca_id = parseInt(row.dataset.pecaId);
        var valorInput = row.querySelector('.valor-input');
        if (valorInput) item.valor_unitario = parseFloat(valorInput.value) || 0;
        var fornecedorInput = row.querySelector('.fornecedor-input');
        if (fornecedorInput) item.fornecedor_origem = fornecedorInput.value.trim().toUpperCase();
        return item;
      }).filter(function (i) { return i.descricao; });
      if (!itens.length) { toast('Adicione pelo menos um item com descrição', 'warning'); return; }
      if (!validateOrderForm()) { toast('Preencha todos os campos obrigatórios antes de finalizar', 'warning'); return; }
      var btn = document.getElementById('orderSubmit');
      btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
      try {
        var previsao = (user.perfil === 'logistica') ? (document.querySelector('[name="previsao_entrega"]')?.value || undefined) : undefined;
        var triagem = document.getElementById('triagemHidden').value || null;
        if (isEdit) {
          await API.put('/orders/' + id, { veiculo_id: parseInt(veiculo_id), observacoes: form.observacoes.value, itens: itens, previsao_entrega: previsao, triagem: triagem });
          toast('Pedido atualizado');
          bsModal.hide(); PAGES.orders();
        } else {
          var destSel = form.querySelector('[name="destinatario_id"]');
          var destinatarioId = destSel && destSel.value ? parseInt(destSel.value) : undefined;
          var payload = { veiculo_id: parseInt(veiculo_id), observacoes: form.observacoes.value, itens: itens, previsao_entrega: previsao, destinatario_id: destinatarioId, triagem: triagem };
          var newOrder = await API.post('/orders', payload);
          if (newOrder && newOrder.duplicidadeDetectada) {
            var confirmou = await pedirConfirmacaoDuplicidade(newOrder.conflitos || []);
            if (!confirmou) return;
            newOrder = await API.post('/orders', Object.assign({}, payload, { confirmarDuplicidade: true }));
          }
          for (var _fi = 0; _fi < pendingPhotos.length; _fi++) {
            var fd = new FormData();
            fd.append('foto', pendingPhotos[_fi]);
            await API.upload('/orders/' + newOrder.id + '/upload', fd);
          }
          toast('Pedido criado com sucesso');
          bsModal.hide(); PAGES.orders();
        }
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
  delete c.dataset.pecaId;
  c.querySelector('.desc-input')?.setAttribute('list', 'pecasDatalist');
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
document.addEventListener('input', e => {
  const row = e.target.closest?.('.order-item');
  if (!row || !e.target.classList.contains('desc-input')) return;
  const pecaId = resolverPecaId(e.target.value);
  if (pecaId) row.dataset.pecaId = String(pecaId); else delete row.dataset.pecaId;
});

async function delOrder(id) {
  if (!confirm('Excluir este pedido?')) return;
  try { await API.del(`/orders/${id}`); toast('Pedido excluído'); PAGES.orders(); }
  catch (err) { toast(err.error || 'Erro ao excluir', 'danger'); }
}

async function confirmQuoteApproval(id, action) {
  action = action || 'approve';
  const isAuthorize = action === 'authorize';
  const btn = document.getElementById('approveQuoteBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  }
  try {
    await API.post('/orders/' + id + (isAuthorize ? '/autorizar' : '/approve'), {});
    toast(isAuthorize ? 'Pedido autorizado' : 'Pedido confirmado');
    fecharEAualizarSituacao();
  } catch (err) {
    toast(err.error || 'Erro ao processar aprovação', 'danger');
    } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>' + (isAuthorize ? 'Autorizar' : 'Confirmar Compra');
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
      fecharEAualizarSituacao();
    } catch (err) { toast(err.error || 'Erro ao processar', 'danger'); }
    finally { btn.disabled = false; btn.innerHTML = confirmLabel; }
  });
}

// ---------- USERS ----------
PAGES.users = async function () {
  const c = document.getElementById('pageContent');
  if (!['administrativo', 'diretor'].includes(user.perfil)) { c.innerHTML = `<div class="alert alert-danger">Acesso restrito</div>`; return; }
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
          <div class="table-responsive"><table class="table table-hover mb-0"><thead><tr><th>Nome</th><th>Usuário</th><th class="d-none d-sm-table-cell">Setor</th><th>Ativo</th><th class="text-end">Ações</th></tr></thead>
            <tbody>${membros.map(u => `<tr>
              <td><div class="d-flex align-items-center gap-2"><div class="user-avatar-mini bg-${g.color} bg-opacity-10 text-${g.color}">${escapeHtml((u.nome||'U').charAt(0).toUpperCase())}</div>${escapeHtml(u.nome)}</div></td>
              <td><small class="text-muted">@${escapeHtml(u.nick)}</small></td>
              <td class="d-none d-sm-table-cell"><small class="text-muted">${escapeHtml(u.setor || '-')}</small></td>
              <td>${u.ativo ? '<span class="text-success"><i class="bi bi-check-circle-fill"></i></span>' : '<span class="text-danger"><i class="bi bi-x-circle-fill"></i></span>'}</td>
              <td class="text-end"><div class="table-actions justify-content-end">
                <button class="btn btn-outline-primary" onclick="openUser(${u.id})"><i class="bi bi-pencil"></i></button>
                ${['administrativo', 'diretor'].includes(user.perfil) ? `<button class="btn btn-outline-danger" onclick="delUser(${u.id})"><i class="bi bi-trash"></i></button>` : ''}
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
        <div class="mb-3"><label class="form-label">Nome *</label><input class="form-control" name="nome" value="${escapeHtml(u.nome)}" placeholder="Nome do usuário" required style="text-transform:uppercase"></div>
        <div class="mb-3"><label class="form-label">Setor *</label><select class="form-select" name="setor" required><option value="" disabled ${SETORES.includes(u.setor) ? '' : 'selected'}>Selecione o setor</option>${SETORES.map(s => `<option value="${s}" ${u.setor === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="mb-3"><label class="form-label">${isEdit ? 'Nova senha (deixe vazio para manter)' : 'Senha *'}</label><input class="form-control" name="senha" type="password" ${isEdit ? '' : 'required'}>
          <div class="alert alert-warning py-2 mt-2 mb-0 small d-flex align-items-start gap-2">
            <i class="bi bi-exclamation-triangle-fill mt-1"></i>
            <div>A senha deve conter <strong>10+ caracteres</strong>, com pelo menos uma <strong>letra</strong>, um <strong>número</strong> e um <strong>caractere especial</strong> (ex: @, #, !).${isEdit ? ' Se não quiser alterar, deixe vazio.' : ''}</div>
          </div>
        </div>
        <div class="mb-3"><label class="form-label">Perfil</label><select class="form-select" name="perfil">${Object.entries(ROLE_INFO).map(([p, i]) => `<option value="${p}" ${u.perfil===p?'selected':''}>${i.label}</option>`).join('')}</select></div>
        <div class="mb-3"><label class="form-label">Usuário *</label><input class="form-control" name="nick" value="${escapeHtml(u.nick)}" placeholder="Usuário usado no login" required></div>
        <div class="form-check"><input class="form-check-input" type="checkbox" name="ativo" value="1" ${u.ativo?'checked':''} id="userAtivo"><label class="form-check-label" for="userAtivo">Ativo</label></div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
      <button class="btn btn-primary" id="userSubmit">${isEdit ? 'Atualizar' : 'Salvar'}</button>
    </div>`);
  document.getElementById('userSubmit').addEventListener('click', async () => {
    const fd = Object.fromEntries(new FormData(document.getElementById('userForm')));
    fd.nome = fd.nome.toUpperCase();
    fd.ativo = fd.ativo ? 1 : 0;
    if (!fd.senha) delete fd.senha;
    if (fd.nick) fd.nick = fd.nick.trim().toLowerCase();
    try {
      if (isEdit) { await API.put(`/users/${id}`, fd); toast('Usuário atualizado'); }
      else { await API.post('/users', fd); toast('Usuário criado'); }
      m.hide(); PAGES.users();
    } catch (err) { toast(apiErrorMsg(err), 'danger'); }
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
      window.placaAtualConsultada = null;
      resultDiv.innerHTML = '<div class="placa-no-results"><i class="fa-solid fa-car-side"></i><br>Veiculo nao encontrado</div>';
      return;
    }
    window.placaAtualConsultada = data.veiculo?.placa || null;
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
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin:0.75rem 0;">
        <button type="button" class="btn-view" style="width:auto;padding:7px 16px;border:none;border-radius:8px;background:var(--danger,#dc3545);color:#fff;cursor:pointer;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:6px;" onclick="abrirSeletorPeriodo('pdf')"><i class="fa-solid fa-file-pdf"></i> Exportar PDF</button>
        <button type="button" class="btn-view" style="width:auto;padding:7px 16px;border:none;border-radius:8px;background:var(--success,#16a34a);color:#fff;cursor:pointer;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:6px;" onclick="abrirSeletorPeriodo('excel')"><i class="fa-solid fa-file-excel"></i> Exportar Excel</button>
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
    if (q.length < 1) { closeSuggestions(); window.placaAtualConsultada = null; return; }
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

function closeVeiculoSuggestions() {
  const el = document.getElementById('veiculoSuggestions');
  if (el) { el.classList.remove('show'); el.innerHTML = ''; }
}

function selectVeiculoSuggestion(id, placa, modelo) {
  const input = document.getElementById('veiculoPlacaInput');
  const hidden = document.getElementById('veiculoIdHidden');
  if (input) input.value = placa + (modelo ? ' — ' + modelo : '');
  if (hidden) hidden.value = id;
  closeVeiculoSuggestions();
  const form = document.getElementById('orderForm');
  if (form) form.dispatchEvent(new Event('change', { bubbles: true }));
}

function initVeiculoAutocomplete() {
  const input = document.getElementById('veiculoPlacaInput');
  const suggestions = document.getElementById('veiculoSuggestions');
  if (!input || !suggestions) return;
  let timer, selectedIndex = -1, lastSelectedId = input.dataset.selectedId || '';

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (lastSelectedId && input.value !== input.dataset.selectedLabel) {
      const hidden = document.getElementById('veiculoIdHidden');
      if (hidden) hidden.value = '';
      lastSelectedId = '';
      delete input.dataset.selectedId;
      delete input.dataset.selectedLabel;
      const form = document.getElementById('orderForm');
      if (form) form.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (q.length < 2) { closeVeiculoSuggestions(); return; }
    timer = setTimeout(async () => {
      try {
        const data = await API.get('/vehicles/search?q=' + encodeURIComponent(q));
        selectedIndex = -1;
        if (!data || !data.length) {
          suggestions.innerHTML = '<div class="placa-suggest-empty">Nenhum veículo encontrado com essa placa</div>';
          suggestions.classList.add('show');
          return;
        }
        suggestions.innerHTML = data.map((item, i) =>
          `<div class="placa-suggest-item" data-index="${i}" data-id="${item.id}" data-placa="${item.placa}" data-modelo="${(item.marca_nome || '') + ' ' + (item.modelo_nome || '')}">
            <span class="suggest-placa">${escapeHtml(item.placa)}</span>
            <span class="suggest-modelo">${escapeHtml((item.marca_nome || '') + ' ' + (item.modelo_nome || ''))}</span>
          </div>`
        ).join('');
        suggestions.classList.add('show');
      } catch { closeVeiculoSuggestions(); }
    }, 300);
  });

  suggestions.addEventListener('click', (e) => {
    const item = e.target.closest('.placa-suggest-item');
    if (!item) return;
    const id = item.dataset.id;
    const placa = item.dataset.placa;
    const modelo = (item.dataset.modelo || '').trim();
    selectVeiculoSuggestion(id, placa, modelo);
    lastSelectedId = id;
    input.dataset.selectedId = id;
    input.dataset.selectedLabel = placa + (modelo ? ' — ' + modelo : '');
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
      closeVeiculoSuggestions();
    }
  });

  input.addEventListener('blur', () => setTimeout(closeVeiculoSuggestions, 200));

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

(function iniciarVigiaInatividade() {
  const LIMITE_MS = 60 * 60 * 1000;
  let ultimoTimer = null;
  const reiniciar = () => {
    if (ultimoTimer) clearTimeout(ultimoTimer);
    ultimoTimer = setTimeout(() => {
      alert('Sua sessão expirou por inatividade. Faça login novamente.');
      API.logout();
    }, LIMITE_MS);
  };
  ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evento =>
    document.addEventListener(evento, reiniciar, { passive: true })
  );
  reiniciar();
})();

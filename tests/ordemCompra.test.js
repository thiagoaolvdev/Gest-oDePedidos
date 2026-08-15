const request = require('supertest');
const app = require('../app');
const migration005 = require('../database/migrations/005_add_ordens_compra');

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

describe('Ordens de Compra API', () => {
  let adminToken;
  let directorToken;
  let officeToken;
  let logisticaToken;
  let supplier;
  let vehicleId;

  const createOcPayload = (order, discount = 0, includeSupplier = true) => ({
    ...(includeSupplier ? {
      fornecedor_id: supplier.id,
      fornecedor_nome: supplier.razao_social,
      fornecedor_endereco: supplier.endereco || 'Rua de teste, 100',
      fornecedor_telefone: supplier.telefone || '(11) 99999-9999'
    } : {}),
    tipo: 'simples',
    prazo_entrega: '2026-08-05',
    data_emissao: '2026-07-28',
    condicoes_pagamento: '30 dias',
    centro_custo: 'pecas',
    desconto: discount,
    observacoes: 'Teste automático de OC',
    itens: (order.itens || []).map((item) => ({
      descricao: item.item_nome || item.descricao || 'Peça teste',
      quantidade: Number(item.quantidade || 1),
      valor_unitario: Number(item.valor_unitario || 0),
      valor_total: Number(item.valor_total || (Number(item.quantidade || 1) * Number(item.valor_unitario || 0))),
      unidade: item.unidade || 'un',
      ci_os: item.peca_codigo || ''
    }))
  });

  const createOrder = async ({ withSupplier = false, value = 10, token = adminToken } = {}) => {
    const item = { descricao: `Item OC ${Date.now()}`, quantidade: 1, valor_unitario: value };
    if (withSupplier) item.fornecedor_id = supplier.id;
    const res = await request(app)
      .post('/api/orders')
      .set(authHeader(token))
      .send({
        veiculo_id: vehicleId,
        observacoes: 'Pedido para teste de OC',
        itens: [item]
      });
    expect(res.status).toBe(201);
    return res.body;
  };

  beforeAll(async () => {
    await migration005.up();

    const login = await request(app).post('/api/auth/login').send({
      nick: 'admin',
      password: '123456'
    });
    expect(login.status).toBe(200);
    adminToken = login.body.token;

    const vehicles = await request(app).get('/api/vehicles?limit=1').set(authHeader(adminToken));
    expect(vehicles.status).toBe(200);
    expect(vehicles.body.data?.length).toBeGreaterThan(0);
    vehicleId = vehicles.body.data[0].id;

    const suppliers = await request(app).get('/api/fornecedores?limit=1').set(authHeader(adminToken));
    expect(suppliers.status).toBe(200);
    if (suppliers.body.data?.length) {
      supplier = suppliers.body.data[0];
    } else {
      const createdSupplier = await request(app)
        .post('/api/fornecedores')
        .set(authHeader(adminToken))
        .send({
          razao_social: 'Fornecedor Teste OC',
          nome_fantasia: 'Fornecedor Teste OC',
          cnpj: `999999990001${String(Date.now()).slice(-2)}`,
          telefone: '(11) 99999-9999',
          email: `fornecedor-${Date.now()}@teste.com`,
          endereco: 'Rua Teste, 123',
          cidade: 'São Paulo',
          estado: 'SP'
        });
      expect(createdSupplier.status).toBe(201);
      supplier = createdSupplier.body;
    }

    const officeNick = `oficina${Date.now()}`;
    const createdOffice = await request(app)
      .post('/api/users')
      .set(authHeader(adminToken))
      .send({
        nome: 'Logística Teste OC',
        setor: 'Oficina',
        nick: officeNick,
        senha: 'Senha12345',
        perfil: 'oficina'
      });
    expect(createdOffice.status).toBe(201);

    const officeLogin = await request(app).post('/api/auth/login').send({
      nick: officeNick,
      password: 'Senha12345'
    });
    expect(officeLogin.status).toBe(200);
    officeToken = officeLogin.body.token;

    const logisticaLogin = await request(app).post('/api/auth/login').send({
      nick: 'logistica',
      password: '123456'
    });
    expect(logisticaLogin.status).toBe(200);
    logisticaToken = logisticaLogin.body.token;

    const directorLogin = await request(app).post('/api/auth/login').send({
      nick: 'diretor',
      password: '123456'
    });
    expect(directorLogin.status).toBe(200);
    directorToken = directorLogin.body.token;
  });

  it('POST /api/pedidos/:id/ordem-compra - deve falhar sem fornecedor definido', async () => {
    const order = await createOrder({ withSupplier: false, value: 18 });
    const res = await request(app)
      .post(`/api/pedidos/${order.id}/ordem-compra`)
      .set(authHeader(adminToken))
      .send(createOcPayload(order, 0, false));

    expect(res.status).toBe(400);
    expect(res.body.fields).toContain('fornecedor_nome');
  });

  it('POST /api/pedidos/:id/ordem-compra - deve usar a origem da peça como fornecedor', async () => {
    const origem = 'Auto Peças Silva LTDA';
    const item = { descricao: `Item origem ${Date.now()}`, quantidade: 1, valor_unitario: 25, fornecedor_origem: origem };
    const order = await request(app)
      .post('/api/orders')
      .set(authHeader(adminToken))
      .send({ veiculo_id: vehicleId, observacoes: 'Pedido para teste de origem', itens: [item] });
    expect(order.status).toBe(201);

    const payload = createOcPayload(order.body, 0, false);
    payload.fornecedor_nome = origem;
    payload.fornecedor_endereco = 'Rua da Origem, 100';
    payload.fornecedor_telefone = '(11) 98888-7777';
    const res = await request(app)
      .post(`/api/pedidos/${order.body.id}/ordem-compra`)
      .set(authHeader(adminToken))
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.fornecedor_nome).toBe(origem);
  });

  it('POST /api/pedidos/:id/ordem-compra - deve falhar para perfil oficina', async () => {
    const order = await createOrder({ withSupplier: true, value: 22 });
    const res = await request(app)
      .post(`/api/pedidos/${order.id}/ordem-compra`)
      .set(authHeader(officeToken))
      .send(createOcPayload(order));

    expect(res.status).toBe(403);
  });

  it('POST /api/pedidos/:id/ordem-compra - deve manter totais iguais ao valor aprovado do pedido e números únicos', async () => {
    const orderA = await createOrder({ withSupplier: true, value: 30 });
    const orderB = await createOrder({ withSupplier: true, value: 40 });

    const resA = await request(app)
      .post(`/api/pedidos/${orderA.id}/ordem-compra`)
      .set(authHeader(adminToken))
      .send(createOcPayload(orderA, 5));
    const resB = await request(app)
      .post(`/api/pedidos/${orderB.id}/ordem-compra`)
      .set(authHeader(adminToken))
      .send(createOcPayload(orderB, 10));

    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);
    expect(resA.body.numero).not.toBe(resB.body.numero);
    expect(Number(resA.body.subtotal)).toBe(30);
    expect(Number(resA.body.total)).toBe(30);
    expect(Number(resB.body.subtotal)).toBe(40);
    expect(Number(resB.body.total)).toBe(40);
  });

  it('POST /api/orders/:id/status - deve devolver a cotação ao solicitante para aprovação', async () => {
    const requesterOrder = await createOrder({ withSupplier: true, value: 55, token: officeToken });
    const statusPayload = {
      status: 'em_compra',
      valor_total: 55,
      itens: requesterOrder.itens.map((item) => ({
        id: item.id,
        fornecedor_id: item.fornecedor_id || supplier.id,
        valor_unitario: Number(item.valor_unitario || 55),
        quantidade: Number(item.quantidade || 1)
      }))
    };

    const updateRes = await request(app)
      .patch(`/api/orders/${requesterOrder.id}/status`)
      .set(authHeader(logisticaToken))
      .send(statusPayload);

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.status).toBe('aguardando_aprovacao');

    const notifRes = await request(app)
      .get('/api/notifications?limit=20')
      .set(authHeader(officeToken));

    expect(notifRes.status).toBe(200);
    expect(notifRes.body.unread).toBeGreaterThan(0);
    expect(notifRes.body.data.some((n) => String(n.titulo || '').includes('Cotação do pedido'))).toBe(true);

    const approveRes = await request(app)
      .post(`/api/orders/${requesterOrder.id}/approve`)
      .set(authHeader(officeToken));

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('aprovado');
  });

  it('POST /api/orders/:id/approve - pedido acima de R$599 exige autorização do diretor', async () => {
    const highValueOrder = await createOrder({ withSupplier: true, value: 700, token: officeToken });
    expect(highValueOrder.status).toBe('aguardando_aprovacao');

    const officeApprove = await request(app)
      .post(`/api/orders/${highValueOrder.id}/approve`)
      .set(authHeader(officeToken));

    expect(officeApprove.status).toBe(403);
    expect(String(officeApprove.body.error || '')).toContain('diretor');

    const directorApprove = await request(app)
      .post(`/api/orders/${highValueOrder.id}/approve`)
      .set(authHeader(directorToken));

    expect(directorApprove.status).toBe(200);
    expect(directorApprove.body.status).toBe('aprovado');
  });

  it('POST /api/orders/:id/reject - pedido acima de R$599 só pode ser rejeitado pelo diretor', async () => {
    const highValueOrder = await createOrder({ withSupplier: true, value: 800, token: officeToken });
    expect(highValueOrder.status).toBe('aguardando_aprovacao');

    const officeReject = await request(app)
      .post(`/api/orders/${highValueOrder.id}/reject`)
      .set(authHeader(officeToken))
      .send({ motivo: 'Teste de rejeição por oficina' });

    expect(officeReject.status).toBe(403);

    const directorReject = await request(app)
      .post(`/api/orders/${highValueOrder.id}/reject`)
      .set(authHeader(directorToken))
      .send({ motivo: 'Rejeitado pelo diretor' });

    expect(directorReject.status).toBe(200);
    expect(directorReject.body.status).toBe('rejeitado');
  });
});

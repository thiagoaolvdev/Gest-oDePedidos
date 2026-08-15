const request = require('supertest');
const app = require('../app');

describe('Orders API', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      nick: 'admin',
      password: '123456'
    });
    if (res.status === 200) {
      token = res.body.token;
    }
  });

  it('GET /api/orders - deve exigir autenticação', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(401);
  });

  it('GET /api/orders - deve retornar lista', async () => {
    if (!token) return;
    const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });
});

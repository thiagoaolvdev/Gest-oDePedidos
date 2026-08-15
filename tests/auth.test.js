const request = require('supertest');
const app = require('../app');

describe('Auth API', () => {
  it('POST /api/auth/login - deve falhar sem credenciais', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login - deve falhar com credenciais inválidas', async () => {
    const res = await request(app).post('/api/auth/login').send({ nick: 'naoexiste', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/refresh - deve falhar sem token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('GET /api/auth/me - deve falhar sem token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

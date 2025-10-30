import request from 'supertest';
import app from '../../../src/app.js';

describe('Sanity route', () => {
  it('GET /api/ deve responder OK', async () => {
    const res = await request(app).get('/api/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'API da Incubadora - OK' });
  });
});

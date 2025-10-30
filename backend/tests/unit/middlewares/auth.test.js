// backend/tests/unit/middlewares/auth.test.js
import { jest } from '@jest/globals';

// 1) Mockar APENAS o jsonwebtoken (ESM). NÃO mocke o próprio middleware!
jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    verify: jest.fn((token, _secret) => {
      if (token === 'valid') return { id: 1, role: 'ADMIN', name: 'Admin' };
      if (token === 'valid-student') return { id: 2, role: 'ALUNO', name: 'Aluno' };
      throw new Error('invalid token');
    })
  }
}));

// 2) Importar o mock e DEPOIS o middleware real
const jwt = (await import('jsonwebtoken')).default;
const { authRequired, requireRole } = await import('../../../src/middlewares/auth.js');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('middlewares/auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authRequired', () => {
    it('retorna 401 se não houver Authorization', () => {
      const req = { headers: {} };
      const res = makeRes();
      const next = jest.fn();

      authRequired(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('retorna 401 se o token for inválido', () => {
      const req = { headers: { authorization: 'Bearer invalid' } };
      const res = makeRes();
      const next = jest.fn();

      authRequired(req, res, next);

      expect(jwt.verify).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('chama next e popula req.user com token válido', () => {
      const req = { headers: { authorization: 'Bearer valid' } };
      const res = makeRes();
      const next = jest.fn();

      authRequired(req, res, next);

      expect(jwt.verify).toHaveBeenCalled();
      expect(req.user).toEqual({ id: 1, role: 'ADMIN', name: 'Admin' });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('retorna 403 se o papel não corresponder', () => {
      const req = { user: { id: 2, role: 'ALUNO', name: 'Aluno' } };
      const res = makeRes();
      const next = jest.fn();

      requireRole('ADMIN')(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('chama next quando o papel corresponde', () => {
      const req = { user: { id: 1, role: 'ADMIN', name: 'Admin' } };
      const res = makeRes();
      const next = jest.fn();

      requireRole('ADMIN')(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

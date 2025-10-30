// backend/tests/unit/controllers/authController.test.js
import { jest } from '@jest/globals';

// === 1. Mocks de dependências externas ===
jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    compare: jest.fn(),
    hash: jest.fn()
  }
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn()
  }
}));

jest.unstable_mockModule('../../../src/repositories/usersRepo.js', () => ({
  findUserByCPF: jest.fn(),
  findUserByEmail: jest.fn(),
  createUser: jest.fn()
}));

// === 2. Importa mocks e controller real ===
const bcrypt = (await import('bcryptjs')).default;
const jwt = (await import('jsonwebtoken')).default;
const usersRepo = await import('../../../src/repositories/usersRepo.js');
const { login, register } = await import('../../../src/controllers/authController.js');

// === 3. Helper para mockar req/res ===
function makeReqRes(body = {}) {
  const req = { body };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return { req, res };
}

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'secret'; // define segredo para os testes
  });

  // ===================
  // TESTE: LOGIN
  // ===================
  describe('login', () => {
    it('retorna 400 se CPF ou senha não forem informados', async () => {
      const { req, res } = makeReqRes({ cpf: '', password: '' });
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'CPF e senha são obrigatórios' });
    });

    it('retorna 401 se usuário não encontrado', async () => {
      usersRepo.findUserByCPF.mockResolvedValue(null);
      const { req, res } = makeReqRes({ cpf: '123', password: 'x' });
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('retorna 401 se senha incorreta', async () => {
      usersRepo.findUserByCPF.mockResolvedValue({ id: 1, password_hash: 'hash' });
      bcrypt.compare.mockResolvedValue(false);
      const { req, res } = makeReqRes({ cpf: '123', password: 'wrong' });
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('retorna token e dados do usuário se login válido', async () => {
      usersRepo.findUserByCPF.mockResolvedValue({
        id: 1,
        name: 'Admin',
        role: 'ADMIN',
        password_hash: 'hash'
      });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('fake-token');

      const { req, res } = makeReqRes({ cpf: '03342494140', password: 'admin123' });
      await login(req, res);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1, role: 'ADMIN', name: 'Admin' },
        'secret',
        { expiresIn: '2h' }
      );
      expect(res.json).toHaveBeenCalledWith({
        token: 'fake-token',
        user: { id: 1, name: 'Admin', role: 'ADMIN' }
      });
    });
  });

  // ===================
  // TESTE: REGISTER
  // ===================
  describe('register', () => {
    it('retorna 400 se campos obrigatórios ausentes', async () => {
      const { req, res } = makeReqRes({});
      await register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 400 se CPF inválido', async () => {
      const { req, res } = makeReqRes({ name: 'A', cpf: '123', password: 'x' });
      await register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'CPF inválido' });
    });

    it('retorna 409 se CPF já cadastrado', async () => {
      usersRepo.findUserByCPF.mockResolvedValue({ id: 1 });
      const { req, res } = makeReqRes({ name: 'B', cpf: '11111111111', password: 'x' });
      await register(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'CPF já cadastrado' });
    });

    it('retorna 409 se e-mail já cadastrado', async () => {
      usersRepo.findUserByCPF.mockResolvedValue(null);
      usersRepo.findUserByEmail.mockResolvedValue({ id: 2 });
      const { req, res } = makeReqRes({
        name: 'C',
        cpf: '11111111111',
        email: 'a@b.com',
        password: 'x'
      });
      await register(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'E-mail já cadastrado' });
    });

    it('retorna 201 e token se cadastro for bem-sucedido', async () => {
      usersRepo.findUserByCPF.mockResolvedValue(null);
      usersRepo.findUserByEmail.mockResolvedValue(null);
      usersRepo.createUser.mockResolvedValue(10);
      bcrypt.hash.mockResolvedValue('hash');
      jwt.sign.mockReturnValue('new-token');

      const { req, res } = makeReqRes({
        name: 'Novo',
        cpf: '11111111111',
        email: 'a@b.com',
        password: 'senha'
      });

      await register(req, res);

      expect(usersRepo.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Novo', role: 'ALUNO' })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'new-token', id: 10, role: 'ALUNO', name: 'Novo' })
      );
    });
  });
});

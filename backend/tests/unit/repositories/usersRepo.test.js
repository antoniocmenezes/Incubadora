// backend/tests/unit/repositories/usersRepo.test.js
import { jest } from '@jest/globals';

// 1) Mock do módulo de DB em ESM, ANTES de importar o repo
jest.unstable_mockModule('../../../src/config/db.js', () => {
  return {
    pool: {
      query: jest.fn(),
      execute: jest.fn()
    }
  };
});

// 2) Importa o mock e o módulo a testar (DEPOIS de mockar)
const { pool } = await import('../../../src/config/db.js');
const usersRepo = await import('../../../src/repositories/usersRepo.js');

describe('usersRepo.findUserByCPF', () => {
  beforeEach(() => {
    pool.query.mockReset();
    pool.execute.mockReset && pool.execute.mockReset();
  });

  it('retorna usuário quando CPF existe', async () => {
    // Ajuste o retorno conforme sua implementação (query ou execute)
    pool.query.mockResolvedValueOnce([[{ id: 1, cpf: '03342494140', name: 'Admin' }]]);
    const user = await usersRepo.findUserByCPF('03342494140');
    expect(user).toEqual(expect.objectContaining({ id: 1, cpf: '03342494140' }));
    expect(pool.query).toHaveBeenCalledTimes(1);
    const [_sql, params] = pool.query.mock.calls[0];
    expect(params).toContain('03342494140');
  });

  it('retorna null quando CPF não existe', async () => {
    pool.query.mockResolvedValueOnce([[]]); // sem linhas
    const user = await usersRepo.findUserByCPF('00000000000');
    expect(user).toBeNull();
  });
});

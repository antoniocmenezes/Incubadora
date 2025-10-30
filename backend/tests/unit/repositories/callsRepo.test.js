// backend/tests/unit/repositories/callsRepo.test.js
import { jest } from '@jest/globals';

// === Mock do DB (ESM) antes de importar o módulo ===
jest.unstable_mockModule('../../../src/config/db.js', () => ({
  pool: {
    query: jest.fn(),
    execute: jest.fn()
  }
}));

// === Importa o mock e o módulo real após o mock ===
const { pool } = await import('../../../src/config/db.js');
const repo = await import('../../../src/repositories/callsRepo.js');

describe('callsRepo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================
  // TESTE: createCall
  // ===========================
  describe('createCall', () => {
    it('insere um edital e retorna o insertId', async () => {
      pool.execute.mockResolvedValueOnce([{ insertId: 123 }]);

      const id = await repo.createCall({
        title: 'Edital 2025',
        description: 'Chamada para startups',
        start_at: '2025-01-01',
        end_at: '2025-12-31',
        created_by: 1
      });

      expect(pool.execute).toHaveBeenCalledTimes(1);
      expect(id).toBe(123);
    });
  });

  // ===========================
  // TESTE: listCallsByStatus
  // ===========================
  describe('listCallsByStatus', () => {
    it('usa filtro "open" por padrão', async () => {
      pool.query.mockResolvedValueOnce([[{ id: 1, title: 'Aberto' }]]);

      const rows = await repo.listCallsByStatus();
      expect(rows).toEqual([{ id: 1, title: 'Aberto' }]);
      expect(pool.query).toHaveBeenCalledTimes(1);
      const [[sql]] = pool.query.mock.calls;
      expect(sql).toMatch(/WHERE start_at <= NOW\(\) AND end_at >= NOW\(\)/);
    });

    it('usa filtro "upcoming"', async () => {
      pool.query.mockResolvedValueOnce([[{ id: 2, title: 'Futuro' }]]);
      await repo.listCallsByStatus('upcoming');
      const [[sql]] = pool.query.mock.calls;
      expect(sql).toMatch(/start_at {2}> NOW\(\)/);
    });

    it('usa filtro "closed"', async () => {
      pool.query.mockResolvedValueOnce([[{ id: 3, title: 'Encerrado' }]]);
      await repo.listCallsByStatus('closed');
      const [[sql]] = pool.query.mock.calls;
      expect(sql).toMatch(/end_at {4}< NOW\(\)/);
    });

    it('usa filtro "all"', async () => {
      pool.query.mockResolvedValueOnce([[{ id: 4, title: 'Todos' }]]);
      await repo.listCallsByStatus('all');
      const [[sql]] = pool.query.mock.calls;
      expect(sql).not.toMatch(/WHERE/);
    });
  });

  // ===========================
  // TESTE: findCallById
  // ===========================
  describe('findCallById', () => {
    it('retorna o edital quando encontrado', async () => {
      pool.query.mockResolvedValueOnce([
        [{ id: 10, title: 'Edital encontrado' }]
      ]);
      const call = await repo.findCallById(10);
      expect(call).toEqual({ id: 10, title: 'Edital encontrado' });
    });

    it('retorna null quando não encontrado', async () => {
      pool.query.mockResolvedValueOnce([[]]);
      const call = await repo.findCallById(999);
      expect(call).toBeNull();
    });
  });
});

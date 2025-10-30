// backend/tests/unit/repositories/projectsRepo.test.js
import { jest } from '@jest/globals';

// Mock do módulo de DB (ESM) ANTES de importar o repo
jest.unstable_mockModule('../../../src/config/db.js', () => {
  // vamos criar o pool e, em cada teste, injetar uma nova conexão mock
  const pool = {
    query: jest.fn(),
    getConnection: jest.fn() // será configurado no beforeEach
  };
  return { pool };
});

// Importa mocks e o módulo a ser testado (DEPOIS de mockar)
const { pool } = await import('../../../src/config/db.js');
const repo = await import('../../../src/repositories/projectsRepo.js');

describe('projectsRepo', () => {
  let conn;

  beforeEach(() => {
    // nova conexão mock a cada teste
    conn = {
      beginTransaction: jest.fn(),
      query: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn()
    };
    pool.getConnection.mockResolvedValue(conn);

    // limpa chamadas
    pool.query.mockReset();
    conn.query.mockReset();
    conn.beginTransaction.mockReset();
    conn.commit.mockReset();
    conn.rollback.mockReset();
    conn.release.mockReset();
  });

  describe('createProject', () => {
    it('cria projeto SEM equipe e retorna o insertId', async () => {
      // 1ª query (INSERT projects) -> retorna [ { insertId } ]
      conn.query.mockResolvedValueOnce([{ insertId: 10 }]);

      const projectId = await repo.createProject({
        owner_user_id: 1,
        title: 'TCC',
        summary: 'Resumo',
        area: 'Tecnologia',
        team: [] // sem equipe
      });

      expect(conn.beginTransaction).toHaveBeenCalledTimes(1);
      expect(conn.query).toHaveBeenCalledTimes(1);
      expect(conn.commit).toHaveBeenCalledTimes(1);
      expect(conn.rollback).not.toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalledTimes(1);
      expect(projectId).toBe(10);
    });

    it('cria projeto COM equipe e insere membros', async () => {
      conn.query
        // INSERT projects
        .mockResolvedValueOnce([{ insertId: 55 }])
        // INSERT project_team (membro 1)
        .mockResolvedValueOnce([{}])
        // INSERT project_team (membro 2)
        .mockResolvedValueOnce([{}]);

      const team = [
        { member_name: 'Ana', member_email: 'ana@x.com', role_in_team: 'Líder' },
        { member_name: 'Bob', member_email: '', role_in_team: 'Dev' }
      ];

      const projectId = await repo.createProject({
        owner_user_id: 2,
        title: 'Incubadora',
        summary: 'Sistema',
        area: 'TI',
        team
      });

      expect(projectId).toBe(55);
      expect(conn.beginTransaction).toHaveBeenCalled();
      // 1 insert do projeto + 2 inserts da equipe
      expect(conn.query).toHaveBeenCalledTimes(3);
      expect(conn.commit).toHaveBeenCalled();
      expect(conn.rollback).not.toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
    });

    it('faz rollback e relança erro se algo falhar', async () => {
      conn.query.mockRejectedValueOnce(new Error('boom')); // falha no INSERT do projeto

      await expect(
        repo.createProject({
          owner_user_id: 1,
          title: 'Falha',
          summary: 'Erro',
          area: 'TI',
          team: []
        })
      ).rejects.toThrow('boom');

      expect(conn.beginTransaction).toHaveBeenCalled();
      expect(conn.rollback).toHaveBeenCalled();
      expect(conn.commit).not.toHaveBeenCalled();
      expect(conn.release).toHaveBeenCalled();
    });
  });

  describe('getStudentProjects', () => {
    it('mapeia status_label corretamente a partir dos campos retornados', async () => {
      // pool.query (não usa conn aqui)
      pool.query.mockResolvedValueOnce([
        [
          // 1) Incubado -> label 'Incubado'
          {
            project_id: 1,
            project_title: 'Proj A',
            area: 'TI',
            project_status: 'INCUBADO',
            submission_status: null,
            evaluation_status: null,
            call_title: 'Edital X',
            submitted_at: null
          },
          // 2) Em avaliação -> label 'Em avaliação'
          {
            project_id: 2,
            project_title: 'Proj B',
            area: 'Saúde',
            project_status: 'PRE_SUBMISSAO',
            submission_status: 'EM_AVALIACAO',
            evaluation_status: null,
            call_title: null,
            submitted_at: '2025-10-01'
          },
          // 3) Reprovado em avaliação -> label 'Reprovado'
          {
            project_id: 3,
            project_title: 'Proj C',
            area: 'Educação',
            project_status: 'PRE_SUBMISSAO',
            submission_status: 'ENVIADA',
            evaluation_status: 'REPROVADO',
            call_title: 'Edital Y',
            submitted_at: '2025-10-02'
          }
        ]
      ]);

      const out = await repo.getStudentProjects(999);

      expect(out).toHaveLength(3);

      const [a, b, c] = out;
      expect(a).toMatchObject({ project_id: 1, status_label: 'Incubado' });
      expect(b).toMatchObject({ project_id: 2, status_label: 'Em avaliação' });
      expect(c).toMatchObject({ project_id: 3, status_label: 'Reprovado' });
      // call_title null vira '—'
      expect(b.call_title).toBe('—');
    });
  });

  describe('isProjectOwnedByUser', () => {
    it('retorna true quando encontra o projeto do usuário', async () => {
      pool.query.mockResolvedValueOnce([[{ id: 1 }]]);
      const ok = await repo.isProjectOwnedByUser(1, 5);
      expect(ok).toBe(true);
    });

    it('retorna false quando não encontra', async () => {
      pool.query.mockResolvedValueOnce([[]]);
      const ok = await repo.isProjectOwnedByUser(1, 5);
      expect(ok).toBe(false);
    });
  });

  describe('markProjectAsDisengaged', () => {
    it('retorna true quando affectedRows > 0', async () => {
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
      const ok = await repo.markProjectAsDisengaged(10, 1);
      expect(ok).toBe(true);
    });

    it('retorna false quando nada é atualizado', async () => {
      pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);
      const ok = await repo.markProjectAsDisengaged(10, 1);
      expect(ok).toBe(false);
    });
  });

  describe('getMyIncubatedProjects', () => {
    it('retorna lista de projetos incubados do usuário', async () => {
      const rows = [{ id: 1, title: 'Alpha' }, { id: 2, title: 'Beta' }];
      pool.query.mockResolvedValueOnce([rows]);
      const res = await repo.getMyIncubatedProjects(77);
      expect(res).toEqual(rows);
    });
  });
});

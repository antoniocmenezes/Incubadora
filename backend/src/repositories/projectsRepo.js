import { pool } from '../config/db.js';

export async function createProject({ owner_user_id, title, summary, area, team = [] }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [res] = await conn.query(
      `INSERT INTO projects (owner_user_id, title, summary, area, status)
       VALUES (?, ?, ?, ?, 'PRE_SUBMISSAO')`,
      [owner_user_id, title, summary, area]
    );
    const projectId = res.insertId;

    if (Array.isArray(team) && team.length > 0) {
      for (const m of team) {
        if (!m.member_name || !m.role_in_team) continue;
        await conn.query(
          `INSERT INTO project_team (project_id, member_name, member_email, role_in_team)
           VALUES (?, ?, ?, ?)`,
          [projectId, m.member_name, m.member_email || null, m.role_in_team]
        );
      }
    }

    await conn.commit();
    return projectId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
// ===== Repo: listar projetos do aluno com último edital e última avaliação =====
export async function getStudentProjects(userId) {
  const [rows] = await pool.query(
    `
    SELECT
      p.id                AS project_id,
      p.title             AS project_title,
      p.area,
      p.status            AS project_status,
      ls.id               AS submission_id,
      ls.call_id,
      ls.status           AS submission_status,
      ls.submitted_at,
      c.title             AS call_title,
      le.status           AS evaluation_status,
      le.evaluated_at     AS evaluation_date
    FROM projects p
    LEFT JOIN (
      SELECT s.*
      FROM submissions s
      INNER JOIN (
        SELECT project_id, MAX(submitted_at) AS max_submitted_at
        FROM submissions
        GROUP BY project_id
      ) t ON t.project_id = s.project_id AND t.max_submitted_at = s.submitted_at
    ) ls ON ls.project_id = p.id
    LEFT JOIN calls c ON c.id = ls.call_id
    LEFT JOIN (
      SELECT e.*
      FROM evaluations e
      INNER JOIN (
        SELECT submission_id, MAX(evaluated_at) AS max_evaluated_at
        FROM evaluations
        GROUP BY submission_id
      ) te ON te.submission_id = e.submission_id AND te.max_evaluated_at = e.evaluated_at
    ) le ON le.submission_id = ls.id
    WHERE p.owner_user_id = ?
    ORDER BY COALESCE(ls.submitted_at, p.created_at) DESC, p.id DESC
    `,
    [userId]
  );

  // Normaliza um rótulo amigável para a badge da UI
  return rows.map(r => ({
    project_id: r.project_id,
    project_title: r.project_title,
    area: r.area,
    call_title: r.call_title ?? '—',
    status_label: mapStatusLabel(r),
    raw: r
  }));
}

function mapStatusLabel(r) {
  // Se o projeto já está em fase de incubação/desligado, isso prevalece
  if (r.project_status === 'INCUBADO')  return 'Incubado';
  if (r.project_status === 'DESLIGADO') return 'Desligado';

  // Depois, considere a última avaliação (se houver)
  if (r.evaluation_status === 'APROVADO')           return 'Aprovado';
  if (r.evaluation_status === 'REPROVADO')          return 'Reprovado';
  if (r.evaluation_status === 'NECESSITA_AJUSTES')  return 'Necessita ajustes';

  // Senão, reflita o estado da submissão
  if (r.submission_status === 'EM_AVALIACAO')       return 'Em avaliação';
  if (r.submission_status === 'AJUSTES_SOLICITADOS')return 'Ajustes solicitados';
  if (r.submission_status === 'APROVADA')           return 'Aprovada (aguardando publicação)';
  if (r.submission_status === 'REPROVADA')          return 'Reprovada';
  if (r.submission_status === 'ENVIADA')            return 'Enviada';

  // Por fim, estados do projeto antes de submissão
  if (r.project_status === 'SUBMETIDO')             return 'Submetido';
  if (r.project_status === 'AJUSTES')               return 'Ajustes';
  if (r.project_status === 'APROVADO')              return 'Aprovado';
  if (r.project_status === 'REPROVADO')             return 'Reprovado';
  return 'Rascunho';
}

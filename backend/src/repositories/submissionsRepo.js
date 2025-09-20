import { pool } from '../config/db.js';

export async function submitProject({ project_id, call_id }) {
  const [res] = await pool.query(
    `INSERT INTO submissions (project_id, call_id, status) VALUES (?, ?, 'ENVIADA')`,
    [project_id, call_id]
  );
  return res.insertId;
}

// NOVO
export async function listSubmissions({ status = 'all' } = {}) {
  // le = last_evaluation (última avaliação por submissão)
  const sql = `
    WITH last_eval AS (
      SELECT *
      FROM (
        SELECT
          e.*,
          ROW_NUMBER() OVER (PARTITION BY e.submission_id ORDER BY e.evaluated_at DESC, e.id DESC) rn
        FROM evaluations e
      ) ranked
      WHERE ranked.rn = 1
    )
    SELECT
      s.id,
      s.project_id,
      s.call_id,
      s.status           AS submission_status,
      s.submitted_at,
      p.title            AS project_title,
      p.summary          AS project_summary,
      p.area             AS project_area,
      le.status          AS evaluation_status,
      le.comments        AS evaluation_comments,
      le.evaluated_at    AS evaluation_date
    FROM submissions s
    JOIN projects p          ON p.id = s.project_id
    LEFT JOIN last_eval le   ON le.submission_id = s.id
    /**WHERE_CLAUSE**/
    ORDER BY s.submitted_at DESC, s.id DESC
  `;

  const where = [];
  if (status === 'pending')      where.push('le.id IS NULL');      // sem avaliação
  else if (status === 'evaluated') where.push('le.id IS NOT NULL'); // já avaliadas

  const finalSql = sql.replace('/**WHERE_CLAUSE**/', where.length ? `WHERE ${where.join(' AND ')}` : '');
  const [rows] = await pool.query(finalSql);
  return rows;
}

import { pool } from '../config/db.js';
export async function submitProject({ project_id, call_id }) {
  const [res] = await pool.query(
    `INSERT INTO submissions (project_id, call_id, status) VALUES (?, ?, 'ENVIADA')`,
    [project_id, call_id]
  );
  return res.insertId;
}

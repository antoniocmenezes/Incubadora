import { pool } from '../config/db.js';

export async function createProject({ owner_user_id, title, summary, area }) {
  const [res] = await pool.query(
    `INSERT INTO projects (owner_user_id, title, summary, area, status)
     VALUES (?, ?, ?, ?, 'PRE_SUBMISSAO')`,
    [owner_user_id, title, summary, area]
  );
  return res.insertId;
}

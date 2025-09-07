import { pool } from '../config/db.js';
export async function createEvaluation({ submission_id, evaluator_user_id, status, comments }) {
  const [res] = await pool.query(
    `INSERT INTO evaluations (submission_id, evaluator_user_id, status, comments)
     VALUES (?, ?, ?, ?)`,
    [submission_id, evaluator_user_id, status, comments]
  );
  return res.insertId;
}

import { pool } from '../config/db.js';

export async function createEvaluation({ submission_id, evaluator_user_id, status, comments }) {
  const [res] = await pool.query(
    `INSERT INTO evaluations (submission_id, evaluator_user_id, status, comments)
     VALUES (?, ?, ?, ?)`,
    [submission_id, evaluator_user_id, status, comments]
  );
  return res.insertId;
}

export async function listBySubmission(submissionId) {
  const [rows] = await pool.query(
    `SELECT e.id,
            e.submission_id,
            e.status,
            e.comments,
            e.evaluated_at,                
            u.name AS evaluator_name
       FROM evaluations e
  LEFT JOIN users u ON u.id = e.evaluator_user_id   
      WHERE e.submission_id = ?
   ORDER BY e.evaluated_at DESC`,                   
    [submissionId]
  );
  return rows;
}
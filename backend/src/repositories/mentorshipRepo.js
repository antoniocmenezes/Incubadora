// backend/src/repositories/mentorshipRepo.js
import { pool } from '../config/db.js';

export async function create({ project_id, area, justification, created_by }) {
  const [res] = await pool.query(
    `INSERT INTO mentorship_requests (project_id, area, justification, created_by)
     VALUES (?, ?, ?, ?)`,
    [project_id, area, justification, created_by]
  );
  return res.insertId;
}

export async function listByUser(userId) {
  const [rows] = await pool.query(
    `SELECT mr.*, p.title AS project_title
       FROM mentorship_requests mr
       JOIN projects p ON p.id = mr.project_id
      WHERE mr.created_by = ?
      ORDER BY mr.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function listAllWithUserEmail() {
  const [rows] = await pool.query(
    `SELECT 
       mr.id, mr.project_id, p.title AS project_title,
       mr.area, mr.justification, mr.status,
       mr.created_by, u.email AS student_email,
       u.name AS student_name,
       mr.created_at
     FROM mentorship_requests mr
     JOIN projects p ON p.id = mr.project_id
     JOIN users    u ON u.id = mr.created_by
     ORDER BY mr.created_at DESC`
  );
  return rows;
}

export async function updateStatus(id, status) {
  const allowed = ['SOLICITADA','EM_ANDAMENTO','CONCLUIDA','NEGADA'];
  if (!allowed.includes(status)) return false;
  const [res] = await pool.query(
    `UPDATE mentorship_requests SET status = ? WHERE id = ?`,
    [status, id]
  );
  return res.affectedRows > 0;
}

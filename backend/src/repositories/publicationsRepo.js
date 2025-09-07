import { pool } from '../config/db.js';

export async function createPublication({ project_id, logo_path, public_description, published_by }) {
  const [res] = await pool.query(
    `INSERT INTO project_publications (project_id, logo_path, public_description, published_by)
     VALUES (?, ?, ?, ?)`,
    [project_id, logo_path, public_description, published_by]
  );
  return res.insertId;
}

export async function listPublishedProjects() {
  const [rows] = await pool.query(
    `SELECT
        pp.id,
        pp.project_id,
        p.title,
        p.area,
        pp.logo_path,
        pp.public_description,
        pp.published_at
     FROM project_publications pp
     JOIN projects p ON p.id = pp.project_id
     ORDER BY pp.published_at DESC`
  );
  return rows;
}

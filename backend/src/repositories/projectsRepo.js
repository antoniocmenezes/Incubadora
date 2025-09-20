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

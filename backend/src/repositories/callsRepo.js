// src/repositories/callsRepo.js
import { pool } from '../config/db.js'; // ajuste o caminho conforme onde está seu db.js

// Cria um novo edital (call)
export async function createCall({ title, description, start_at, end_at, created_by }) {
  const sql = `
    INSERT INTO calls (title, description, start_at, end_at, created_by)
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [title, description, start_at, end_at, created_by];
  const [result] = await pool.execute(sql, params);
  return result.insertId; // retorna o ID do edital criado
}

// Lista editais conforme status
export async function listCallsByStatus(status = 'open') {
  let sql = `SELECT id, title, description, start_at, end_at, created_by
             FROM calls`;

  const filters = {
    open:     ` WHERE start_at <= NOW() AND end_at >= NOW()`,
    upcoming: ` WHERE start_at  > NOW()`,
    closed:   ` WHERE end_at    < NOW()`,
    all:      ``,
  };

  sql += filters[status] ?? filters.open;
  sql += ` ORDER BY start_at DESC`;

  const [rows] = await pool.query(sql);
  return rows;
}


export async function findCallById(id) {
  const [rows] = await pool.query(
    `SELECT id, title, description, start_at, end_at, created_by
       FROM calls
      WHERE id = ?
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}


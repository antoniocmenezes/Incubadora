import { pool } from '../config/db.js';

export async function findUserByCPF(cpf) {
  const [rows] = await pool.query('SELECT * FROM users WHERE cpf = ? AND deleted_at IS NULL', [cpf]);
  return rows[0] || null;
}

export async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
  return rows[0] || null;
}

export async function createUser({ name, cpf, email, password_hash, role }) {
  const [res] = await pool.query(
    'INSERT INTO users (name, cpf, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    [name, cpf, email, password_hash, role]
  );
  return res.insertId;
}

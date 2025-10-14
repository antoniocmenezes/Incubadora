// backend/src/repositories/usersRepo.js
import { pool } from '../config/db.js';

// ====== READS ======
export async function findAll({ role, limit, offset } = {}) {
  const params = [];
  let sql = `
    SELECT id, name, cpf, email, role, created_at, updated_at
    FROM users
    WHERE deleted_at IS NULL
  `;
  if (role) { sql += ' AND role = ?'; params.push(role); }
  sql += ' ORDER BY id DESC';
  if (Number.isInteger(limit) && Number.isInteger(offset)) {
    sql += ' LIMIT ? OFFSET ?'; params.push(limit, offset);
  }
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function findById(id) {
  const [rows] = await pool.query(
    `SELECT id, name, cpf, email, role, created_at, updated_at
     FROM users
     WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  return rows[0] || null;
}

export async function findUserByCPF(cpf) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE cpf = ? AND deleted_at IS NULL',
    [cpf]
  );
  return rows[0] || null;
}

export async function findUserByEmail(email) {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL',
    [email]
  );
  return rows[0] || null;
}

// ====== CREATE ======
export async function createUser({ name, cpf, email, password_hash, role }) {
  const [res] = await pool.query(
    `INSERT INTO users (name, cpf, email, password_hash, role)
     VALUES (?, ?, ?, ?, ?)`,
    [name, cpf, email, password_hash, role]
  );
  return res.insertId; // controller pode chamar findById(insertId)
}

// ====== UPDATE (patch dinâmico) ======
export async function update(id, { name, cpf, email, role, password_hash }) {
  const fields = [];
  const values = [];

  if (name) { fields.push('name = ?'); values.push(name); }
  if (cpf) { fields.push('cpf = ?'); values.push(cpf); }
  if (email) { fields.push('email = ?'); values.push(email); }
  if (role) { fields.push('role = ?'); values.push(role); }
  if (password_hash !== undefined) {
    fields.push('password_hash = ?'); values.push(password_hash);
  }
  if (!fields.length) return await findById(id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const sql = `UPDATE users SET ${fields.join(', ')}
               WHERE id = ? AND deleted_at IS NULL`;
  const [res] = await pool.query(sql, values);
  return res.affectedRows ? await findById(id) : null;
}

// ====== SOFT DELETE ======
export async function remove(id) {
  const [res] = await pool.query(
    'UPDATE users SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  return res.affectedRows > 0;
}

// ====== (Opcional) dados “prontos” para relatório ======
export async function findAllForReport({ role } = {}) {
  const params = [];
  let sql = `
    SELECT id, name, cpf, email, role, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
    FROM users
    WHERE deleted_at IS NULL
  `;
  if (role) { sql += ' AND role = ?'; params.push(role); }
  sql += ' ORDER BY role, name';
  const [rows] = await pool.query(sql, params);
  return rows;
}

// backend/src/controllers/usersController.js
import * as repo from '../repositories/usersRepo.js';
import bcrypt from 'bcryptjs';

// LIST
export async function listUsersCtrl(req, res) {
  const { role } = req.query; // passa o filtro
  const users = await repo.findAll({ role });
  res.json(users);
}

// GET
export async function getUserCtrl(req, res) {
  const { id } = req.params;
  const user = await repo.findById(id);
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
  res.json(user);
}

// CREATE
export async function createUserCtrl(req, res) {
  const { name, cpf, email, password, role } = req.body;
  if (!name || !cpf || !email || !role) {
    return res.status(400).json({ message: 'Campos obrigatórios: name, cpf, email, role' });
  }

  let password_hash = null;
  if (password) password_hash = await bcrypt.hash(password, 10);

  const insertId = await repo.createUser({ name, cpf, email, password_hash, role });
  const created = await repo.findById(insertId);
  res.status(201).json(created);
}

// UPDATE (patch)
export async function updateUserCtrl(req, res) {
  const { id } = req.params;
  const { name, cpf, email, role, password } = req.body;

  let password_hash;
  if (password !== undefined && password !== '') {
    password_hash = await bcrypt.hash(password, 10);
  }

  const updated = await repo.update(id, { name, cpf, email, role, password_hash });
  if (!updated) return res.status(404).json({ message: 'Usuário não encontrado' });
  res.json(updated);
}

// DELETE (soft)
export async function deleteUserCtrl(req, res) {
  const { id } = req.params;
  const ok = await repo.remove(id);
  if (!ok) return res.status(404).json({ message: 'Usuário não encontrado' });
  res.status(204).end();
}

// REPORT CSV
export async function usersReportCtrl(req, res) {
  const { role } = req.query;
  const users = await repo.findAll({ role });
  const header = 'id,name,cpf,email,role,created_at\n';
  const rows = users.map(u =>
    [u.id, u.name, u.cpf, u.email, u.role, (u.created_at ?? '')]
      .map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')
  ).join('\n');
  const csv = header + rows;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="usuarios.csv"');
  res.send(csv);
}

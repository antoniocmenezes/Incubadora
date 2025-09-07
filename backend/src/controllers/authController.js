import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByCPF } from '../repositories/usersRepo.js';

export async function login(req, res) {
  const { cpf, password } = req.body;
  if (!cpf || !password) return res.status(400).json({ error: 'CPF e senha são obrigatórios' });

  const user = await findUserByCPF(cpf);
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '2h' });
  return res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
}

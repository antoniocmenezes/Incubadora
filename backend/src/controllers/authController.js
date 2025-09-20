import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByCPF, createUser } from '../repositories/usersRepo.js';

// LOGIN ===================================================
export async function login(req, res) {
  const { cpf, password } = req.body;
  if (!cpf || !password) {
    return res.status(400).json({ error: 'CPF e senha são obrigatórios' });
  }

  const user = await findUserByCPF(cpf);
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
  return res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
}

// REGISTER =================================================
export async function register(req, res) {
  try {
    const { name, cpf, email, password } = req.body || {};
    if (!name || !cpf || !password) {
      return res.status(400).json({ message: 'Nome, CPF e senha são obrigatórios' });
    }

    const cleanCpf = String(cpf).replace(/\D/g,'');
    if (cleanCpf.length !== 11) {
      return res.status(400).json({ message: 'CPF inválido' });
    }

    const exists = await findUserByCPF(cleanCpf);
    if (exists) return res.status(409).json({ message: 'CPF já cadastrado' });

    const hash = await bcrypt.hash(password, 10);
    const userId = await createUser({
      name,
      cpf: cleanCpf,
      email: email || null,
      password_hash: hash,
      role: 'ALUNO' // todo cadastro começa como ALUNO
    });

    const token = jwt.sign(
      { id: userId, role: 'ALUNO', name },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.status(201).json({ id: userId, token, role: 'ALUNO', name });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ message: 'Erro ao cadastrar usuário' });
  }
}

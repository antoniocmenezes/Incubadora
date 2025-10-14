// authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByCPF, findUserByEmail, createUser } from '../repositories/usersRepo.js';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import nodemailer from 'nodemailer';

// ============== LOGIN ==============
export async function login(req, res) {
  const { cpf, password } = req.body;
  if (!cpf || !password) return res.status(400).json({ error: 'CPF e senha são obrigatórios' });

  const user = await findUserByCPF(String(cpf).replace(/\D/g,''));
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

  const ok = await bcrypt.compare(password, user.password_hash || '');
  if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

  if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'Configuração JWT ausente' });

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name }, // pode incluir email se quiser
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
  return res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
}

// ============ REGISTER ============
export async function register(req, res) {
  try {
    const { name, cpf, email, password } = req.body || {};
    if (!name || !cpf || !password) {
      return res.status(400).json({ message: 'Nome, CPF e senha são obrigatórios' });
    }

    const cleanCpf = String(cpf).replace(/\D/g,'');
    if (cleanCpf.length !== 11) return res.status(400).json({ message: 'CPF inválido' });

    const existsCpf = await findUserByCPF(cleanCpf);
    if (existsCpf) return res.status(409).json({ message: 'CPF já cadastrado' });

    if (email) {
      const existsEmail = await findUserByEmail(email.toLowerCase().trim());
      if (existsEmail) return res.status(409).json({ message: 'E-mail já cadastrado' });
    }

    const hash = await bcrypt.hash(password, 10);
    const userId = await createUser({
      name,
      cpf: cleanCpf,
      email: email ? email.toLowerCase().trim() : null,
      password_hash: hash,
      role: 'ALUNO'
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

// ============ EMAIL =============
function transporter() {
  if (!process.env.SMTP_HOST) return null; // DEV: sem SMTP
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

// ======= FORGOT PASSWORD ========
export async function forgotPassword(req, res) {
  try {
    const { cpfOrEmail } = req.body;
    if (!cpfOrEmail) return res.status(400).json({ message: 'Informe CPF ou e-mail.' });

    const isEmail = cpfOrEmail.includes('@');
    const value = isEmail ? cpfOrEmail.toLowerCase().trim() : cpfOrEmail.replace(/\D/g,'');

    const [rows] = await pool.query(
      isEmail
        ? 'SELECT id, email, name FROM users WHERE email = ? AND deleted_at IS NULL'
        : 'SELECT id, email, name FROM users WHERE cpf = ? AND deleted_at IS NULL',
      [value]
    );

    // Resposta indistinguível por segurança
    if (!rows.length) return res.json({ ok: true, message: 'Se existir conta, enviaremos instruções por e-mail.' });

    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const ttlMin = Number(process.env.RESET_TTL_MINUTES || 30);
    const expires = new Date(Date.now() + ttlMin * 60 * 1000);

    await pool.query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expires]
    );

    const link = `${process.env.APP_URL || 'http://localhost:3000'}/reset.html?token=${token}`;
    const tx = transporter();

    if (tx && user.email) {
      await tx.sendMail({
        from: process.env.MAIL_FROM || 'no-reply@ypetec.com.br',
        to: user.email,
        subject: 'Recuperação de senha - YpeTec',
        html: `
          <p>Olá ${user.name || ''},</p>
          <p>Para redefinir sua senha, use o link abaixo (válido por ${ttlMin} minutos):</p>
          <p><a href="${link}">${link}</a></p>
          <p>Se não foi você, ignore esta mensagem.</p>
        `
      });
    } else {
      console.log('[RESET LINK DEV]:', link);
    }

    return res.json({ ok: true, message: 'Se existir conta, enviaremos instruções por e-mail.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Erro ao iniciar recuperação.' });
  }
}

// ======== RESET PASSWORD ========
export async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Dados incompletos.' });

    const [rows] = await pool.query(
      'SELECT * FROM password_resets WHERE token = ? AND used_at IS NULL AND expires_at > NOW()',
      [token]
    );
    if (!rows.length) return res.status(400).json({ message: 'Link inválido ou expirado.' });

    const pr = rows[0];
    const hash = await bcrypt.hash(password, 10); // usa bcryptjs

    // Atualiza a coluna correta
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, pr.user_id]);
    await pool.query('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [pr.id]);

    return res.json({ ok: true, message: 'Senha redefinida com sucesso.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Erro ao redefinir a senha.' });
  }
}

// ======== ME (perfil logado) ========
export async function meCtrl(req, res) {
  // req.user deve ser preenchido pelo middleware authRequired
  // Se o middleware NÃO injeta email, faça uma consulta aqui (opcional).
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email ?? null,
    role: req.user.role
  });
}

// src/routes/index.js
import { Router } from 'express';
import { pool } from '../config/db.js';

// controllers
import { login, register, meCtrl } from '../controllers/authController.js';
import { publishCall, getCalls, getCallById } from '../controllers/callsController.js';
import { createProjectCtrl } from '../controllers/projectsController.js';
import { listSubmissionsCtrl, submitProjectCtrl } from '../controllers/submissionsController.js'; // <- UM ÚNICO import
import { evaluateSubmissionCtrl, getBySubmissionCtrl } from '../controllers/evaluationsController.js';
import { publishApprovedProjectCtrl, listPublicationsCtrl } from '../controllers/publicationsController.js';
import { forgotPassword, resetPassword } from '../controllers/authController.js';
import { requestDisengagementCtrl } from '../controllers/projectsController.js';
import {
  listUsersCtrl, getUserCtrl, createUserCtrl,
  updateUserCtrl, deleteUserCtrl, usersReportCtrl
} from '../controllers/usersController.js';

import {
  createMentorshipCtrl,
  listMyMentorshipsCtrl,
  listAllMentorshipsCtrl,
  updateMentorshipStatusCtrl
} from '../controllers/mentorshipController.js';
import { listMyIncubatedProjectsCtrl } from '../controllers/projectsController.js';


// middlewares
import { authRequired, requireRole } from '../middlewares/auth.js';
import { uploadLogo } from '../middlewares/upload.js';


import { listMyProjectsCtrl } from '../controllers/projectsController.js'; // ajuste o caminho conforme seu projeto

const router = Router();

// sanity
router.get('/', (_req, res) => res.json({ message: 'API da Incubadora - OK' }));

// ping DB
router.get('/db-ping', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS pong');
    res.json({ db: 'ok', result: rows[0] });
  } catch (e) {
    res.status(500).json({ db: 'error', message: e.message });
  }
});

// ========================
// RF001 - Autenticação
// ========================
router.post('/auth/login', login);
router.post('/auth/register', register); // << nova rota pública
router.get('/auth/me', authRequired, meCtrl);
router.post('/auth/forgot', forgotPassword);
router.post('/auth/reset', resetPassword);

// ========================
// RF003 - Manter usuário
// ========================
// Relatório (CSV)
router.get('/users/report.csv', authRequired, requireRole('ADMIN'), usersReportCtrl);
// Rotas de administração de usuários (somente ADMIN)
router.get('/users', authRequired, requireRole('ADMIN'), listUsersCtrl);
router.get('/users/:id', authRequired, requireRole('ADMIN'), getUserCtrl);
router.post('/users', authRequired, requireRole('ADMIN'), createUserCtrl);
router.put('/users/:id', authRequired, requireRole('ADMIN'), updateUserCtrl);
router.delete('/users/:id', authRequired, requireRole('ADMIN'), deleteUserCtrl);

// =====================================
// RF004 - Projeto & Submissão (ALUNO)
// =====================================
router.post('/projects', authRequired, requireRole('ALUNO'), createProjectCtrl);
router.post('/submissions', authRequired, requireRole('ALUNO'), submitProjectCtrl);
router.post(
  '/projects/:id/disengage',
  authRequired, requireRole('ALUNO'),
  requestDisengagementCtrl
);

// =============================
// RF005 - Avaliação (ADMIN)
// =============================
router.get('/submissions', authRequired, requireRole('ADMIN'), listSubmissionsCtrl); // GET para listar
router.post('/evaluations', authRequired, requireRole('ADMIN'), evaluateSubmissionCtrl);
router.get('/evaluations', authRequired, requireRole('ADMIN'), getBySubmissionCtrl);

// ========================
// RF006 - Editais (ADMIN)
// ========================
router.post('/calls', authRequired, requireRole('ADMIN'), publishCall);
router.get('/calls', getCalls);
router.get('/calls/:id', getCallById);
router.get('/calls/open', (req, res) => { req.query.status = 'open'; return getCalls(req, res); });

// =========================================
// RF007 - Publicações (ADMIN) + público
// =========================================
router.post('/publications', authRequired, requireRole('ADMIN'), uploadLogo, publishApprovedProjectCtrl);
router.get('/publications', listPublicationsCtrl);

router.post('/auth/forgot', forgotPassword);
router.post('/auth/reset', resetPassword);

router.get('/students/me/projects',
  authRequired, requireRole('ALUNO'),
  listMyProjectsCtrl
);
// ========= Mentorias =========
// Dropdown do aluno: projetos incubados
router.get('/students/me/incubated-projects',
  authRequired, requireRole('ALUNO'),
  listMyIncubatedProjectsCtrl
);

// Aluno cria solicitação
router.post('/mentorship-requests',
  authRequired, requireRole('ALUNO'),
  createMentorshipCtrl
);

// Aluno lista as suas solicitações
router.get('/mentorship-requests/mine',
  authRequired, requireRole('ALUNO'),
  listMyMentorshipsCtrl
);

// Admin lista todas
router.get('/mentorship-requests',
  authRequired, requireRole('ADMIN'),
  listAllMentorshipsCtrl
);

// Admin atualiza status
router.patch('/mentorship-requests/:id/status',
  authRequired, requireRole('ADMIN'),
  updateMentorshipStatusCtrl
);



export default router;

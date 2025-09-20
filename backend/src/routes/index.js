// src/routes/index.js
import { Router } from 'express';
import { pool } from '../config/db.js';

// controllers
import { login } from '../controllers/authController.js';
import { publishCall, getCalls, getCallById } from '../controllers/callsController.js';
import { createProjectCtrl } from '../controllers/projectsController.js';
import { listSubmissionsCtrl, submitProjectCtrl } from '../controllers/submissionsController.js'; // <- UM ÚNICO import
import { evaluateSubmissionCtrl } from '../controllers/evaluationsController.js';
import { publishApprovedProjectCtrl, listPublicationsCtrl } from '../controllers/publicationsController.js';

// middlewares
import { authRequired, requireRole } from '../middlewares/auth.js';
import { uploadLogo } from '../middlewares/upload.js';

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

// =====================================
// RF004 - Projeto & Submissão (ALUNO)
// =====================================
router.post('/projects', authRequired, requireRole('ALUNO'), createProjectCtrl);
router.post('/submissions', authRequired, requireRole('ALUNO'), submitProjectCtrl);

// =============================
// RF005 - Avaliação (ADMIN)
// =============================
router.get('/submissions', authRequired, requireRole('ADMIN'), listSubmissionsCtrl); // GET para listar
router.post('/evaluations', authRequired, requireRole('ADMIN'), evaluateSubmissionCtrl);

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

export default router;

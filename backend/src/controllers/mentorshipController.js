// backend/src/controllers/mentorshipController.js
import * as repo from '../repositories/mentorshipRepo.js';
import { isProjectOwnedByUser } from '../repositories/projectsRepo.js';

export async function createMentorshipCtrl(req, res) {
  const { project_id, area, justification } = req.body || {};
  const userId = req.user?.id;

  if (!project_id || !area || !justification)
    return res.status(400).json({ error: 'project_id, area e justification são obrigatórios' });

  // segurança: o projeto precisa ser do aluno
  const owned = await isProjectOwnedByUser(Number(project_id), Number(userId));
  if (!owned) return res.status(403).json({ error: 'Projeto não pertence ao usuário' });

  const id = await repo.create({ project_id, area, justification, created_by: userId });
  res.status(201).json({ id });
}

export async function listMyMentorshipsCtrl(req, res) {
  const userId = req.user?.id;
  const rows = await repo.listByUser(userId);
  res.json(rows);
}

export async function listAllMentorshipsCtrl(_req, res) {
  const rows = await repo.listAllWithUserEmail();
  res.json(rows);
}

export async function updateMentorshipStatusCtrl(req, res) {
  const { id } = req.params;
  const { status } = req.body || {};
  const ok = await repo.updateStatus(Number(id), String(status || ''));
  if (!ok) return res.status(400).json({ error: 'Status inválido ou solicitação não encontrada' });
  res.json({ id: Number(id), status });
}

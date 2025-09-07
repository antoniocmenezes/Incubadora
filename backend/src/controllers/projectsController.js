import { createProject } from '../repositories/projectsRepo.js';

export async function createProjectCtrl(req, res) {
  const { title, summary, area } = req.body;
  if (!title || !summary || !area) return res.status(400).json({ error: 'Campos obrigatórios' });

  const id = await createProject({ owner_user_id: req.user.id, title, summary, area });
  return res.status(201).json({ id });
}

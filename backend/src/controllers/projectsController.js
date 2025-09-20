import { createProject } from '../repositories/projectsRepo.js';

export async function createProjectCtrl(req, res) {
  const { title, summary, area, team = [] } = req.body;
  if (!title || !summary || !area)
    return res.status(400).json({ error: 'Campos obrigatórios' });

  try {
    const projectId = await createProject({
      owner_user_id: req.user.id,
      title, summary, area,
      team
    });
    return res.status(201).json({ id: projectId });
  } catch (e) {
    console.error('createProjectCtrl error:', e);
    return res.status(500).json({ error: 'Erro ao criar projeto' });
  }
}

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
// ===== Meus Projetos (ALUNO) =====
import { getStudentProjects } from '../repositories/projectsRepo.js';

export async function listMyProjectsCtrl(req, res) {
  try {
    const userId = req.user.id; // vem do token via authRequired
    const rows = await getStudentProjects(userId);
    return res.json(rows);
  } catch (e) {
    console.error('listMyProjectsCtrl error:', e);
    return res.status(500).json({ error: 'Erro ao carregar seus projetos' });
  }
}

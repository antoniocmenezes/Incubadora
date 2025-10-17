import { createProject, getStudentProjects, isProjectOwnedByUser, markProjectAsDisengaged } from '../repositories/projectsRepo.js';

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

export async function requestDisengagementCtrl(req, res) {
  try {
    const projectId = Number(req.params.id);
    const userId = req.user?.id;
    const { reason } = req.body || {};

    if (!projectId || !userId) {
      return res.status(400).json({ message: 'Parâmetros inválidos.' });
    }

    const owned = await isProjectOwnedByUser(projectId, userId);
    if (!owned) {
      return res.status(403).json({ message: 'Você não tem permissão para solicitar desligamento deste projeto.' });
    }

    const ok = await markProjectAsDisengaged(projectId, userId, reason);
    if (!ok) {
      return res.status(409).json({ message: 'Não foi possível solicitar desligamento. Verifique o status atual do projeto.' });
    }

    return res.json({ message: 'Desligamento solicitado com sucesso.' });
  } catch (e) {
    console.error('requestDisengagementCtrl error:', e);
    return res.status(500).json({ message: 'Erro interno ao solicitar desligamento.' });
  }
}
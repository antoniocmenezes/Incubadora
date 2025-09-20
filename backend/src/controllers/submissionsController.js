import { submitProject, listSubmissions } from '../repositories/submissionsRepo.js';

export async function submitProjectCtrl(req, res) {
  const { project_id, call_id } = req.body;
  if (!project_id || !call_id) return res.status(400).json({ error: 'project_id e call_id são obrigatórios' });
  const id = await submitProject({ project_id, call_id });
  return res.status(201).json({ id });
}

// NOVO
export async function listSubmissionsCtrl(req, res) {
  try {
    const { status = 'all' } = req.query; // 'all' | 'pending' | 'evaluated'
    const items = await listSubmissions({ status });
    res.json(items);
  } catch (e) {
    console.error('[listSubmissionsCtrl] ', e);
    res.status(500).json({ error: 'Erro ao listar submissões' });
  }
}

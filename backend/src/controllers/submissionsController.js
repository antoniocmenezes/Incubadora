import { submitProject } from '../repositories/submissionsRepo.js';

export async function submitProjectCtrl(req, res) {
  const { project_id, call_id } = req.body;
  if (!project_id || !call_id) return res.status(400).json({ error: 'project_id e call_id são obrigatórios' });

  const id = await submitProject({ project_id, call_id });
  return res.status(201).json({ id });
}

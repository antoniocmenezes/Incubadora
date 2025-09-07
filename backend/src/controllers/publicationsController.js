import { createPublication, listPublishedProjects } from '../repositories/publicationsRepo.js';

export async function publishApprovedProjectCtrl(req, res) {
  try {
    const { project_id, public_description } = req.body;

    if (!project_id || !public_description) {
      return res.status(400).json({ error: 'project_id e public_description são obrigatórios' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de logotipo (campo "logo") é obrigatório' });
    }

    const base = process.env.APP_PUBLIC_URL || '';
    const logo_path = `${base}/uploads/${req.file.filename}`;

    const id = await createPublication({
      project_id: Number(project_id),
      logo_path,
      public_description,
      published_by: req.user.id
    });

    return res.status(201).json({ id, logo_path });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao publicar projeto' });
  }
}

export async function listPublicationsCtrl(_req, res) {
  try {
    const rows = await listPublishedProjects();
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao listar publicações' });
  }
}

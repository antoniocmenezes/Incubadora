import { createCall, listCallsByStatus, findCallById } from '../repositories/callsRepo.js';

export async function publishCall(req, res) {
  const { title, description, start_at, end_at } = req.body;
  if (!title || !description || !start_at || !end_at)
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });

  const id = await createCall({
    title,
    description,
    start_at,
    end_at,
    created_by: req.user.id
  });
  return res.status(201).json({ id });
}

export async function getCalls(req, res) {
  try {
    const status = (req.query.status || 'open').toLowerCase();
    const rows = await listCallsByStatus(status);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Falha ao buscar editais' });
  }
}

// NOVO: detalhe de um edital por ID
export async function getCallById(req, res) {
  try {
    const { id } = req.params;
    const call = await findCallById(id);
    if (!call) return res.status(404).json({ error: 'Edital não encontrado' });
    return res.json(call);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Falha ao buscar edital' });
  }
}

import { createEvaluation } from '../repositories/evaluationsRepo.js';
import { listBySubmission } from '../repositories/evaluationsRepo.js';

export async function evaluateSubmissionCtrl(req, res) {
  const { submission_id, status, comments } = req.body;
  if (!submission_id || !status || !comments) return res.status(400).json({ error: 'Campos obrigatórios' });

  if (!['APROVADO','REPROVADO','NECESSITA_AJUSTES'].includes(status))
    return res.status(400).json({ error: 'Status inválido' });

  const id = await createEvaluation({ submission_id, evaluator_user_id: req.user.id, status, comments });
  return res.status(201).json({ id });
}


export async function getBySubmissionCtrl(req, res) {
  try {
    const submissionId = Number(req.query.submission_id);
    if (!submissionId) return res.status(400).json({ error: 'submission_id obrigatório' });

    const rows = await listBySubmission(submissionId);
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Falha ao carregar comentários' });
  }
}
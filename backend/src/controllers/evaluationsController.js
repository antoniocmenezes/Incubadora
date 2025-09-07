import { createEvaluation } from '../repositories/evaluationsRepo.js';

export async function evaluateSubmissionCtrl(req, res) {
  const { submission_id, status, comments } = req.body;
  if (!submission_id || !status || !comments) return res.status(400).json({ error: 'Campos obrigatórios' });

  if (!['APROVADO','REPROVADO','NECESSITA_AJUSTES'].includes(status))
    return res.status(400).json({ error: 'Status inválido' });

  const id = await createEvaluation({ submission_id, evaluator_user_id: req.user.id, status, comments });
  return res.status(201).json({ id });
}

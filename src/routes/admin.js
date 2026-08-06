const express = require('express');
const service = require('../services/inscricoes');
const { buildCsv } = require('../utils/csv');

const router = express.Router();

function getToken(req) {
  const header = req.get('authorization') || '';
  const bearerMatch = header.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) return bearerMatch[1];
  if (req.query.token) return String(req.query.token);
  return null;
}

router.use((req, res, next) => {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return res.status(500).json({ error: 'admin_token_nao_configurado' });
  }
  const token = getToken(req);
  if (token !== expected) {
    return res.status(401).json({ error: 'nao_autorizado' });
  }
  next();
});

router.get('/itinerarios', (req, res) => {
  res.json(service.listAllForAdmin());
});

router.put('/itinerarios/:id', (req, res) => {
  const updated = service.updateItinerario(req.params.id, req.body || {});
  if (!updated) {
    return res.status(404).json({ error: 'nao_encontrado' });
  }
  res.json(updated);
});

router.get('/export.csv', (req, res) => {
  const itinerarios = service.listAllForAdmin();
  const filtered = req.query.itinerarioId
    ? itinerarios.filter((it) => String(it.id) === String(req.query.itinerarioId))
    : itinerarios;

  const rows = [];
  for (const it of filtered) {
    for (const aluno of it.alunos) {
      rows.push({
        dia: it.dia === 'terca' ? 'Terça' : 'Quarta',
        titulo: it.titulo,
        professor: it.professor,
        nome: aluno.nome_aluno,
        turma: aluno.turma_aluno,
        inscrito_em: aluno.created_at,
      });
    }
  }

  const csv = buildCsv(
    [
      { key: 'dia', label: 'Dia' },
      { key: 'titulo', label: 'Itinerário' },
      { key: 'professor', label: 'Professor' },
      { key: 'nome', label: 'Aluno' },
      { key: 'turma', label: 'Turma' },
      { key: 'inscrito_em', label: 'Inscrito em' },
    ],
    rows
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="inscricoes.csv"');
  res.send(csv);
});

module.exports = router;

const express = require('express');
const service = require('../services/inscricoes');

const router = express.Router();

const DIAS_VALIDOS = new Set(['terca', 'quarta']);

router.get('/itinerarios/:dia', (req, res) => {
  const { dia } = req.params;
  if (!DIAS_VALIDOS.has(dia)) {
    return res.status(400).json({ error: 'dia_invalido' });
  }
  res.json(service.listByDia(dia));
});

router.get('/minhas-escolhas', (req, res) => {
  const { nome, turma } = req.query;
  if (!nome || !turma) {
    return res.status(400).json({ error: 'nome_e_turma_obrigatorios' });
  }
  res.json(service.getMinhasEscolhas(nome, turma));
});

router.post('/inscricoes', (req, res) => {
  const { nome, turma, itinerarioId } = req.body || {};
  if (!nome || !String(nome).trim() || !turma || !String(turma).trim() || !itinerarioId) {
    return res.status(400).json({ error: 'campos_obrigatorios' });
  }

  const result = service.chooseItinerario(nome, turma, itinerarioId);

  if (result.error === service.CHEIO) {
    return res.status(409).json({ error: 'cheio' });
  }
  if (result.error === service.NAO_ENCONTRADO) {
    return res.status(404).json({ error: 'nao_encontrado' });
  }

  res.json(result);
});

module.exports = router;

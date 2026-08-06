const express = require('express');
const service = require('../services/inscricoes');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

const DIAS_VALIDOS = new Set(['terca', 'quarta']);

router.get(
  '/itinerarios/:dia',
  asyncHandler(async (req, res) => {
    const { dia } = req.params;
    if (!DIAS_VALIDOS.has(dia)) {
      return res.status(400).json({ error: 'dia_invalido' });
    }
    res.json(await service.listByDia(dia));
  })
);

router.get(
  '/minhas-escolhas',
  asyncHandler(async (req, res) => {
    const { nome, turma } = req.query;
    if (!nome || !turma) {
      return res.status(400).json({ error: 'nome_e_turma_obrigatorios' });
    }
    res.json(await service.getMinhasEscolhas(nome, turma));
  })
);

router.post(
  '/inscricoes',
  asyncHandler(async (req, res) => {
    const { nome, turma, itinerarioId } = req.body || {};
    if (!nome || !String(nome).trim() || !turma || !String(turma).trim() || !itinerarioId) {
      return res.status(400).json({ error: 'campos_obrigatorios' });
    }

    const result = await service.chooseItinerario(nome, turma, itinerarioId);

    if (result.error === service.CHEIO) {
      return res.status(409).json({ error: 'cheio' });
    }
    if (result.error === service.NAO_ENCONTRADO) {
      return res.status(404).json({ error: 'nao_encontrado' });
    }

    res.json(result);
  })
);

module.exports = router;

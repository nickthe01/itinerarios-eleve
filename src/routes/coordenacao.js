const express = require('express');
const service = require('../services/inscricoes');
const { buildInscricoesCsv } = require('../services/relatorio');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

function getCredentials(req) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Basic\s+(.+)$/i);
  if (!match) return null;
  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) return null;
  return {
    login: decoded.slice(0, separatorIndex),
    senha: decoded.slice(separatorIndex + 1),
  };
}

router.use((req, res, next) => {
  const expectedLogin = process.env.COORDENACAO_LOGIN;
  const expectedSenha = process.env.COORDENACAO_SENHA;
  if (!expectedLogin || !expectedSenha) {
    return res.status(500).json({ error: 'coordenacao_credenciais_nao_configuradas' });
  }

  const credentials = getCredentials(req);
  if (!credentials || credentials.login !== expectedLogin || credentials.senha !== expectedSenha) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Coordenação"');
    return res.status(401).json({ error: 'nao_autorizado' });
  }
  next();
});

router.get(
  '/relatorio',
  asyncHandler(async (req, res) => {
    res.json(await service.listAllForAdmin());
  })
);

router.get(
  '/export.csv',
  asyncHandler(async (req, res) => {
    const csv = await buildInscricoesCsv(req.query.itinerarioId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="inscricoes.csv"');
    res.send(csv);
  })
);

module.exports = router;

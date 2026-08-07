const service = require('./inscricoes');
const { buildCsv } = require('../utils/csv');

async function buildInscricoesCsv(itinerarioId) {
  const itinerarios = await service.listAllForAdmin();
  const filtered = itinerarioId ? itinerarios.filter((it) => String(it.id) === String(itinerarioId)) : itinerarios;

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

  return buildCsv(
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
}

module.exports = { buildInscricoesCsv };

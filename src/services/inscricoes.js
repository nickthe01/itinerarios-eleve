const db = require('../db');
const { normalize } = require('../utils/normalize');

const DIAS = ['terca', 'quarta'];

function countInscritos(itinerarioId) {
  const row = db.prepare('SELECT COUNT(*) AS count FROM inscricoes WHERE itinerario_id = ?').get(itinerarioId);
  return row.count;
}

function listByDia(dia) {
  const rows = db.prepare('SELECT * FROM itinerarios WHERE dia = ? ORDER BY ordem').all(dia);
  return rows.map((r) => {
    const count = countInscritos(r.id);
    const vagas_restantes = Math.max(0, r.capacidade - count);
    const bloqueado = vagas_restantes <= 0;
    return {
      id: r.id,
      titulo: r.titulo,
      professor: r.professor,
      descricao: r.descricao,
      capacidade: r.capacidade,
      vagas_restantes,
      bloqueado,
      video_url: bloqueado ? null : r.video_url || null,
    };
  });
}

function getMinhasEscolhas(nome, turma) {
  const nomeNorm = normalize(nome);
  const turmaNorm = normalize(turma);
  const result = { terca: null, quarta: null };

  for (const dia of DIAS) {
    const row = db
      .prepare(
        `SELECT ins.dia AS dia, ins.created_at AS created_at,
                it.id AS itinerario_id, it.titulo AS titulo, it.professor AS professor,
                it.descricao AS descricao, it.video_url AS video_url, it.capacidade AS capacidade
         FROM inscricoes ins
         JOIN itinerarios it ON it.id = ins.itinerario_id
         WHERE ins.dia = ? AND ins.nome_norm = ? AND ins.turma_norm = ?`
      )
      .get(dia, nomeNorm, turmaNorm);
    result[dia] = row || null;
  }

  return result;
}

const CHEIO = 'cheio';
const NAO_ENCONTRADO = 'nao_encontrado';

function chooseItinerario(nome, turma, itinerarioId) {
  const nomeTrim = String(nome || '').trim();
  const turmaTrim = String(turma || '').trim();
  const nomeNorm = normalize(nomeTrim);
  const turmaNorm = normalize(turmaTrim);

  db.exec('BEGIN IMMEDIATE');
  try {
    const itinerario = db.prepare('SELECT * FROM itinerarios WHERE id = ?').get(itinerarioId);
    if (!itinerario) {
      db.exec('ROLLBACK');
      return { error: NAO_ENCONTRADO };
    }

    const existing = db
      .prepare('SELECT * FROM inscricoes WHERE dia = ? AND nome_norm = ? AND turma_norm = ?')
      .get(itinerario.dia, nomeNorm, turmaNorm);
    const isSameSeat = existing && existing.itinerario_id === itinerario.id;

    const count = countInscritos(itinerario.id);
    if (count >= itinerario.capacidade && !isSameSeat) {
      db.exec('ROLLBACK');
      return { error: CHEIO };
    }

    db.prepare(
      `INSERT INTO inscricoes (itinerario_id, dia, nome_aluno, turma_aluno, nome_norm, turma_norm, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(dia, nome_norm, turma_norm) DO UPDATE SET
         itinerario_id = excluded.itinerario_id,
         nome_aluno = excluded.nome_aluno,
         turma_aluno = excluded.turma_aluno,
         updated_at = datetime('now')`
    ).run(itinerario.id, itinerario.dia, nomeTrim, turmaTrim, nomeNorm, turmaNorm);

    db.exec('COMMIT');
    return {
      ok: true,
      itinerario: { id: itinerario.id, titulo: itinerario.titulo, dia: itinerario.dia },
    };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function listAllForAdmin() {
  const itinerarios = db.prepare('SELECT * FROM itinerarios ORDER BY dia DESC, ordem').all();
  return itinerarios.map((it) => {
    const alunos = db
      .prepare('SELECT nome_aluno, turma_aluno, created_at FROM inscricoes WHERE itinerario_id = ? ORDER BY created_at')
      .all(it.id);
    const vagas_restantes = Math.max(0, it.capacidade - alunos.length);
    return {
      ...it,
      vagas_restantes,
      bloqueado: vagas_restantes <= 0,
      alunos,
    };
  });
}

function updateItinerario(id, fields) {
  const current = db.prepare('SELECT * FROM itinerarios WHERE id = ?').get(id);
  if (!current) return null;

  const merged = {
    titulo: fields.titulo !== undefined ? String(fields.titulo).trim() : current.titulo,
    professor: fields.professor !== undefined ? String(fields.professor).trim() : current.professor,
    descricao: fields.descricao !== undefined ? String(fields.descricao).trim() : current.descricao,
    video_url: fields.video_url !== undefined ? String(fields.video_url).trim() : current.video_url,
    capacidade:
      fields.capacidade !== undefined ? Math.max(1, parseInt(fields.capacidade, 10) || current.capacidade) : current.capacidade,
    placeholder: fields.placeholder !== undefined ? (fields.placeholder ? 1 : 0) : current.placeholder,
  };

  db.prepare(
    'UPDATE itinerarios SET titulo = ?, professor = ?, descricao = ?, video_url = ?, capacidade = ?, placeholder = ? WHERE id = ?'
  ).run(merged.titulo, merged.professor, merged.descricao, merged.video_url, merged.capacidade, merged.placeholder, id);

  return db.prepare('SELECT * FROM itinerarios WHERE id = ?').get(id);
}

module.exports = {
  listByDia,
  getMinhasEscolhas,
  chooseItinerario,
  listAllForAdmin,
  updateItinerario,
  CHEIO,
  NAO_ENCONTRADO,
};

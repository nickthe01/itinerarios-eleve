const pool = require('../db');
const { normalize } = require('../utils/normalize');

const DIAS = ['terca', 'quarta'];
const CHEIO = 'cheio';
const NAO_ENCONTRADO = 'nao_encontrado';
const CONFIRMADO = 'confirmado';
const INCOMPLETO = 'incompleto';

async function countInscritos(queryable, itinerarioId) {
  const { rows } = await queryable.query('SELECT COUNT(*)::int AS count FROM inscricoes WHERE itinerario_id = $1', [
    itinerarioId,
  ]);
  return rows[0].count;
}

async function listByDia(dia) {
  const { rows } = await pool.query('SELECT * FROM itinerarios WHERE dia = $1 ORDER BY ordem', [dia]);

  const result = [];
  for (const r of rows) {
    const count = await countInscritos(pool, r.id);
    const vagas_restantes = Math.max(0, r.capacidade - count);
    const bloqueado = vagas_restantes <= 0;
    result.push({
      id: r.id,
      titulo: r.titulo,
      professor: r.professor,
      descricao: r.descricao,
      capacidade: r.capacidade,
      vagas_restantes,
      bloqueado,
      video_url: bloqueado ? null : r.video_url || null,
    });
  }
  return result;
}

async function getMinhasEscolhas(nome, turma) {
  const nomeNorm = normalize(nome);
  const turmaNorm = normalize(turma);
  const result = { terca: null, quarta: null };

  for (const dia of DIAS) {
    const { rows } = await pool.query(
      `SELECT ins.dia AS dia, ins.created_at AS created_at, ins.confirmado AS confirmado,
              it.id AS itinerario_id, it.titulo AS titulo, it.professor AS professor,
              it.descricao AS descricao, it.video_url AS video_url, it.capacidade AS capacidade
       FROM inscricoes ins
       JOIN itinerarios it ON it.id = ins.itinerario_id
       WHERE ins.dia = $1 AND ins.nome_norm = $2 AND ins.turma_norm = $3`,
      [dia, nomeNorm, turmaNorm]
    );
    result[dia] = rows[0] || null;
  }

  return result;
}

async function chooseItinerario(nome, turma, itinerarioId) {
  const nomeTrim = String(nome || '').trim();
  const turmaTrim = String(turma || '').trim();
  const nomeNorm = normalize(nomeTrim);
  const turmaNorm = normalize(turmaTrim);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: itinerarioRows } = await client.query('SELECT * FROM itinerarios WHERE id = $1 FOR UPDATE', [
      itinerarioId,
    ]);
    const itinerario = itinerarioRows[0];
    if (!itinerario) {
      await client.query('ROLLBACK');
      return { error: NAO_ENCONTRADO };
    }

    const { rows: existingRows } = await client.query(
      'SELECT * FROM inscricoes WHERE dia = $1 AND nome_norm = $2 AND turma_norm = $3',
      [itinerario.dia, nomeNorm, turmaNorm]
    );
    const existing = existingRows[0];
    if (existing && existing.confirmado) {
      await client.query('ROLLBACK');
      return { error: CONFIRMADO };
    }
    const isSameSeat = existing && existing.itinerario_id === itinerario.id;

    const count = await countInscritos(client, itinerario.id);
    if (count >= itinerario.capacidade && !isSameSeat) {
      await client.query('ROLLBACK');
      return { error: CHEIO };
    }

    await client.query(
      `INSERT INTO inscricoes (itinerario_id, dia, nome_aluno, turma_aluno, nome_norm, turma_norm, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (dia, nome_norm, turma_norm) DO UPDATE SET
         itinerario_id = excluded.itinerario_id,
         nome_aluno = excluded.nome_aluno,
         turma_aluno = excluded.turma_aluno,
         updated_at = now()`,
      [itinerario.id, itinerario.dia, nomeTrim, turmaTrim, nomeNorm, turmaNorm]
    );

    await client.query('COMMIT');
    return {
      ok: true,
      itinerario: { id: itinerario.id, titulo: itinerario.titulo, dia: itinerario.dia },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listAllForAdmin() {
  const { rows: itinerarios } = await pool.query('SELECT * FROM itinerarios ORDER BY dia DESC, ordem');

  const result = [];
  for (const it of itinerarios) {
    const { rows: alunos } = await pool.query(
      'SELECT id, nome_aluno, turma_aluno, created_at FROM inscricoes WHERE itinerario_id = $1 ORDER BY created_at',
      [it.id]
    );
    const vagas_restantes = Math.max(0, it.capacidade - alunos.length);
    result.push({
      ...it,
      vagas_restantes,
      bloqueado: vagas_restantes <= 0,
      alunos,
    });
  }
  return result;
}

async function updateItinerario(id, fields) {
  const { rows } = await pool.query('SELECT * FROM itinerarios WHERE id = $1', [id]);
  const current = rows[0];
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

  const { rows: updatedRows } = await pool.query(
    `UPDATE itinerarios SET titulo = $1, professor = $2, descricao = $3, video_url = $4, capacidade = $5, placeholder = $6
     WHERE id = $7 RETURNING *`,
    [merged.titulo, merged.professor, merged.descricao, merged.video_url, merged.capacidade, merged.placeholder, id]
  );

  return updatedRows[0];
}

async function removerMinhaEscolha(nome, turma, dia) {
  const nomeNorm = normalize(nome);
  const turmaNorm = normalize(turma);

  const { rows: existingRows } = await pool.query(
    'SELECT * FROM inscricoes WHERE dia = $1 AND nome_norm = $2 AND turma_norm = $3',
    [dia, nomeNorm, turmaNorm]
  );
  const existing = existingRows[0];
  if (!existing) {
    return { error: NAO_ENCONTRADO };
  }
  if (existing.confirmado) {
    return { error: CONFIRMADO };
  }

  await pool.query('DELETE FROM inscricoes WHERE id = $1', [existing.id]);
  return { ok: true };
}

async function confirmarInscricoes(nome, turma) {
  const nomeNorm = normalize(nome);
  const turmaNorm = normalize(turma);

  const { rows } = await pool.query('SELECT dia FROM inscricoes WHERE nome_norm = $1 AND turma_norm = $2', [
    nomeNorm,
    turmaNorm,
  ]);
  const dias = rows.map((r) => r.dia);
  if (!DIAS.every((dia) => dias.includes(dia))) {
    return { error: INCOMPLETO };
  }

  await pool.query(
    'UPDATE inscricoes SET confirmado = true, updated_at = now() WHERE nome_norm = $1 AND turma_norm = $2',
    [nomeNorm, turmaNorm]
  );

  return { ok: true };
}

async function removerInscricao(id) {
  const { rows } = await pool.query('DELETE FROM inscricoes WHERE id = $1 RETURNING *', [id]);
  return rows[0] || null;
}

module.exports = {
  listByDia,
  getMinhasEscolhas,
  chooseItinerario,
  listAllForAdmin,
  updateItinerario,
  removerInscricao,
  removerMinhaEscolha,
  confirmarInscricoes,
  CHEIO,
  NAO_ENCONTRADO,
  CONFIRMADO,
  INCOMPLETO,
};

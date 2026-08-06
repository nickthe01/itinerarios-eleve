const db = require('./db');
const itinerarios = require('./seed-itinerarios');

const insert = db.prepare(`
  INSERT INTO itinerarios (slug, dia, titulo, professor, descricao, video_url, capacidade, ordem, placeholder)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(slug) DO NOTHING
`);

for (const it of itinerarios) {
  insert.run(
    it.slug,
    it.dia,
    it.titulo,
    it.professor,
    it.descricao,
    it.video_url,
    it.capacidade,
    it.ordem,
    it.placeholder
  );
}

console.log(`Seed concluído: ${itinerarios.length} itinerários verificados/inseridos.`);

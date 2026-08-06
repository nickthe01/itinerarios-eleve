const pool = require('./db');
const itinerarios = require('./seed-itinerarios');

async function main() {
  for (const it of itinerarios) {
    await pool.query(
      `INSERT INTO itinerarios (slug, dia, titulo, professor, descricao, video_url, capacidade, ordem, placeholder)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (slug) DO NOTHING`,
      [it.slug, it.dia, it.titulo, it.professor, it.descricao, it.video_url, it.capacidade, it.ordem, it.placeholder]
    );
  }
  console.log(`Seed concluído: ${itinerarios.length} itinerários verificados/inseridos.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

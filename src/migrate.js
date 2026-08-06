const fs = require('node:fs');
const path = require('node:path');
const pool = require('./db');

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Schema aplicado com sucesso.');
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

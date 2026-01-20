const mysql = require('mysql2/promise');
const fs = require('fs');

async function dump() {
  const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'root', database: 'labs' });
  const [tables] = await conn.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'labs'");
  const out = [];
  for (const row of tables) {
    const table = row.TABLE_NAME || row.table_name;
    const [create] = await conn.execute(`SHOW CREATE TABLE \`${table}\``);
    out.push(create[0]['Create Table']);
    out.push('\n');
  }
  const file = 'labs_structure_backup.sql';
  fs.writeFileSync(file, out.join('\n\n'));
  console.log('Wrote', file);
  await conn.end();
}

dump().catch(e => { console.error(e); process.exit(1); });

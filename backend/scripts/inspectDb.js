const mysql = require('mysql2/promise');

async function inspect() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'labs',
  });

  console.log('Connected. Querying foreign keys...');

  const [fks] = await conn.execute(
    `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'transactions' AND REFERENCED_TABLE_NAME IS NOT NULL`,
    ['labs']
  );

  console.log('Foreign keys on transactions:');
  console.table(fks);

  const [indexes] = await conn.execute(`SHOW INDEX FROM transactions`);
  console.log('Indexes on transactions:');
  console.table(indexes);

  await conn.end();
}

inspect().catch(err => { console.error('Error:', err); process.exit(1); });

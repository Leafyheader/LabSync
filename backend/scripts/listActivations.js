const mysql = require('mysql2/promise');
(async function(){
  const c = await mysql.createConnection({host:'localhost', user:'root', password:'root', database:'labs'});
  const [rows] = await c.execute("SELECT id, code, status, activateAt, createdAt, updatedAt FROM activations");
  console.table(rows);
  await c.end();
})().catch(e=>{ console.error(e); process.exit(1); });

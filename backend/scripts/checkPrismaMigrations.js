const mysql = require('mysql2/promise');
(async function(){
  const c = await mysql.createConnection({host:'localhost', user:'root', password:'root', database:'labs'});
  const [rows] = await c.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='labs' AND TABLE_NAME='_prisma_migrations'");
  console.log(rows);
  await c.end();
})().catch(e=>{ console.error(e); process.exit(1); });

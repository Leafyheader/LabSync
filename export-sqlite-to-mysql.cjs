// Export SQLite database to MySQL-compatible SQL
// Usage: node export-sqlite-to-mysql.js

const fs = require('fs');
const path = require('path');

// Use better-sqlite3 from backend node_modules
const Database = require('./backend/node_modules/better-sqlite3');

const dbPath = path.join(__dirname, 'medlab.db');
const outputPath = path.join(__dirname, 'medlab_mysql_export.sql');

console.log('📊 Exporting SQLite database to MySQL format...');
console.log('Source:', dbPath);
console.log('Output:', outputPath);

try {
  const db = new Database(dbPath, { readonly: true });
  
  let sql = `-- MySQL Export from SQLite Database
-- Database: medlab.db
-- Export Date: ${new Date().toISOString()}
-- 
-- This file contains data export from SQLite in MySQL-compatible format

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET AUTOCOMMIT = 0;
START TRANSACTION;

`;

  // Get all table names
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE 'sqlite_%'
    AND name NOT LIKE '_prisma%'
    ORDER BY name
  `).all();

  console.log('\n📋 Found tables:', tables.map(t => t.name).join(', '));

  // Export each table
  for (const table of tables) {
    const tableName = table.name;
    console.log(`\n🔄 Exporting table: ${tableName}`);
    
    // Get table info
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    
    // Create DROP TABLE statement
    sql += `\n-- Table: ${tableName}\n`;
    sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n\n`;
    
    // Create CREATE TABLE statement (MySQL syntax)
    sql += `CREATE TABLE \`${tableName}\` (\n`;
    const columnDefs = columns.map(col => {
      let type = col.type.toUpperCase();
      
      // Convert SQLite types to MySQL types
      if (type.includes('TEXT') || type === '') {
        type = col.name === 'id' ? 'VARCHAR(191)' : 'TEXT';
      } else if (type.includes('DECIMAL')) {
        type = 'DECIMAL(10,2)';
      } else if (type.includes('INTEGER')) {
        type = 'INT';
      } else if (type.includes('BOOLEAN')) {
        type = 'TINYINT(1)';
      } else if (type.includes('DATETIME')) {
        type = 'DATETIME(3)';
      }
      
      let def = `  \`${col.name}\` ${type}`;
      if (col.notnull) def += ' NOT NULL';
      if (col.dflt_value) {
        let defaultVal = col.dflt_value;
        // Handle MySQL default values
        if (defaultVal === 'CURRENT_TIMESTAMP') {
          def += ` DEFAULT CURRENT_TIMESTAMP(3)`;
        } else if (defaultVal === 'true' || defaultVal === '1') {
          def += ' DEFAULT 1';
        } else if (defaultVal === 'false' || defaultVal === '0') {
          def += ' DEFAULT 0';
        } else {
          def += ` DEFAULT ${defaultVal}`;
        }
      }
      if (col.pk) def += ' PRIMARY KEY';
      
      return def;
    });
    
    sql += columnDefs.join(',\n');
    sql += `\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;
    
    // Export data
    const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
    
    if (rows.length > 0) {
      console.log(`  📝 Exporting ${rows.length} rows`);
      
      // Get column names
      const colNames = columns.map(c => `\`${c.name}\``).join(', ');
      
      // Insert in batches of 100 for better performance
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, Math.min(i + batchSize, rows.length));
        
        sql += `INSERT INTO \`${tableName}\` (${colNames}) VALUES\n`;
        
        const values = batch.map(row => {
          const vals = columns.map(col => {
            const val = row[col.name];
            if (val === null) return 'NULL';
            if (typeof val === 'boolean') return val ? '1' : '0';
            if (typeof val === 'number') return val;
            // Escape strings for MySQL
            return `'${String(val).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
          });
          return `(${vals.join(', ')})`;
        });
        
        sql += values.join(',\n');
        sql += ';\n\n';
      }
    } else {
      console.log(`  ℹ️  Table is empty`);
    }
  }

  // Add footer
  sql += `\nCOMMIT;
SET FOREIGN_KEY_CHECKS = 1;

-- Export completed successfully!
SELECT 'Database export completed!' AS Status;\n`;

  // Write to file
  fs.writeFileSync(outputPath, sql, 'utf8');
  
  console.log('\n✅ Export completed successfully!');
  console.log('📄 Output file:', outputPath);
  console.log('📊 File size:', Math.round(fs.statSync(outputPath).size / 1024), 'KB');
  
  db.close();
  
} catch (error) {
  console.error('❌ Export failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

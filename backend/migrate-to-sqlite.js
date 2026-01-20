#!/usr/bin/env node
/**
 * MySQL to SQLite Migration Script
 * Exports data from MySQL database and imports to SQLite using Prisma only
 */

const { PrismaClient: MySQLPrismaClient } = require('@prisma/client');
const { PrismaClient: SQLitePrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function migrate() {
  console.log('🔄 Starting MySQL to SQLite migration...');

  // Connect to MySQL source
  const mysqlUrl = process.env.MYSQL_DATABASE_URL || process.env.DATABASE_URL;
  if (!mysqlUrl || !mysqlUrl.includes('mysql://')) {
    console.error('❌ Please set MYSQL_DATABASE_URL environment variable');
    process.exit(1);
  }

  const mysql = new MySQLPrismaClient({
    datasources: { db: { url: mysqlUrl } }
  });

  // Setup SQLite target
  const sqliteFile = process.env.SQLITE_FILE || './data/medlab.db';
  const sqliteDir = path.dirname(sqliteFile);
  if (!fs.existsSync(sqliteDir)) {
    fs.mkdirSync(sqliteDir, { recursive: true });
  }

  const sqlite = new SQLitePrismaClient({
    datasources: { db: { url: `file:${sqliteFile}` } }
  });

  try {
    // Ensure SQLite database is ready 
    console.log('📋 Connecting to SQLite database...');
    await sqlite.$connect();

    // Migrate users
    console.log('👥 Migrating users...');
    const users = await mysql.user.findMany();
    for (const user of users) {
      await sqlite.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          username: user.username,
          password: user.password,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
    }
    console.log(`✅ Migrated ${users.length} users`);

    // Migrate lab tests
    console.log('🧪 Migrating lab tests...');
    const labTests = await mysql.labTest.findMany();
    for (const test of labTests) {
      await sqlite.labTest.upsert({
        where: { id: test.id },
        update: {},
        create: {
          id: test.id,
          name: test.name,
          price: test.price,
          category: test.category,
          description: test.description,
          isActive: test.isActive,
          createdAt: test.createdAt,
          updatedAt: test.updatedAt
        }
      });
    }
    console.log(`✅ Migrated ${labTests.length} lab tests`);

    // Migrate customers
    console.log('👤 Migrating customers...');
    const customers = await mysql.customer.findMany();
    for (const customer of customers) {
      await sqlite.customer.upsert({
        where: { id: customer.id },
        update: {},
        create: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt
        }
      });
    }
    console.log(`✅ Migrated ${customers.length} customers`);
        referenceNumber TEXT UNIQUE NOT NULL,
        totalCost TEXT NOT NULL,
        paymentMethod TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        customerId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customerId) REFERENCES customers(id)
      );

      CREATE TABLE IF NOT EXISTS transaction_tests (
        id TEXT PRIMARY KEY,
        quantity INTEGER DEFAULT 1,
        transactionId TEXT NOT NULL,
        labTestId TEXT NOT NULL,
        FOREIGN KEY (transactionId) REFERENCES transactions(id),
        FOREIGN KEY (labTestId) REFERENCES lab_tests(id),
        UNIQUE(transactionId, labTestId)
      );

      CREATE TABLE IF NOT EXISTS activations (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'OFF',
        activateAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrate data
    console.log('👥 Migrating users...');
    const users = await mysql.user.findMany();
    const insertUser = sqlite.prepare(`
      INSERT OR REPLACE INTO users (id, username, password, name, role, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const user of users) {
      insertUser.run(
        user.id, user.username, user.password, user.name, user.role,
        user.createdAt.toISOString(), user.updatedAt.toISOString()
      );
    }

    console.log('🧪 Migrating lab tests...');
    const labTests = await mysql.labTest.findMany();
    const insertLabTest = sqlite.prepare(`
      INSERT OR REPLACE INTO lab_tests (id, name, price, category, description, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const test of labTests) {
      insertLabTest.run(
        test.id, test.name, test.price.toString(), test.category, test.description,
        test.isActive ? 1 : 0, test.createdAt.toISOString(), test.updatedAt.toISOString()
      );
    }

    console.log('👤 Migrating customers...');
    const customers = await mysql.customer.findMany();
    const insertCustomer = sqlite.prepare(`
      INSERT OR REPLACE INTO customers (id, name, phone, email, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const customer of customers) {
      insertCustomer.run(
        customer.id, customer.name, customer.phone, customer.email,
        customer.createdAt.toISOString(), customer.updatedAt.toISOString()
      );
    }

    console.log('💳 Migrating transactions...');
    const transactions = await mysql.transaction.findMany({
      include: { selectedTests: true }
    });
    const insertTransaction = sqlite.prepare(`
      INSERT OR REPLACE INTO transactions (id, referenceNumber, totalCost, paymentMethod, status, customerId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertTransactionTest = sqlite.prepare(`
      INSERT OR REPLACE INTO transaction_tests (id, quantity, transactionId, labTestId)
      VALUES (?, ?, ?, ?)
    `);

    for (const transaction of transactions) {
      insertTransaction.run(
        transaction.id, transaction.referenceNumber, transaction.totalCost.toString(),
        transaction.paymentMethod, transaction.status, transaction.customerId,
        transaction.createdAt.toISOString(), transaction.updatedAt.toISOString()
      );

      for (const test of transaction.selectedTests) {
        insertTransactionTest.run(test.id, test.quantity, test.transactionId, test.labTestId);
      }
    }

    console.log('🔑 Migrating activations...');
    const activations = await mysql.activation.findMany();
    const insertActivation = sqlite.prepare(`
      INSERT OR REPLACE INTO activations (id, code, status, activateAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const activation of activations) {
      insertActivation.run(
        activation.id, activation.code, activation.status,
        activation.activateAt?.toISOString() || null,
        activation.createdAt.toISOString(), activation.updatedAt.toISOString()
      );
    }

    console.log('✅ Migration completed successfully!');
    console.log(`📁 SQLite database saved to: ${sqliteFile}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mysql.$disconnect();
    sqlite.close();
  }
}

migrate();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import labTestRoutes from './routes/labTests';
import customerRoutes from './routes/customers';
import transactionRoutes from './routes/transactions';
import activationRoutes from './routes/activation';
import userRoutes from './routes/users';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';
import DatabaseOptimizer from './utils/database';

const app = express();
const prisma = new PrismaClient();
const dbOptimizer = new DatabaseOptimizer(prisma);

// Middleware
app.use(helmet());

// Configure CORS to allow both file:// protocol (Electron) and localhost
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost', 'http://localhost:80'];

// Add file:// protocol support for Electron
const allowedOrigins = [
  ...corsOrigins,
  /^file:\/\/.*/, // Allow any file:// protocol
  'null' // Some browsers send 'null' for file:// origins
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Electron, or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers middleware to prevent password storage and caching
app.use((req, res, next) => {
  // Prevent caching of sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database seeding status check (no auth required for initial setup)
app.get('/api/db-status', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    const labTestCount = await prisma.labTest.count();
    
    res.json({ 
      seeded: userCount > 0 && labTestCount > 0,
      userCount,
      labTestCount,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Database status check failed:', error);
    res.status(500).json({ 
      seeded: false, 
      error: 'Database not accessible',
      timestamp: new Date().toISOString() 
    });
  }
});

// System info endpoint for debugging
app.get('/api/system-info', async (req, res) => {
  try {
    const systemInfo = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
        workingDirectory: process.cwd()
      },
      database: {
        status: 'unknown',
        tables: {}
      }
    };

    // Test database connection and get table counts
    try {
      await prisma.$connect();
      
      const [customerCount, testCount, transactionCount, activationCount, userCount] = await Promise.all([
        prisma.customer.count().catch(() => -1),
        prisma.labTest.count().catch(() => -1),
        prisma.transaction.count().catch(() => -1),
        prisma.activation.count().catch(() => -1),
        prisma.user.count().catch(() => -1)
      ]);

      systemInfo.database = {
        status: 'connected',
        tables: {
          customers: customerCount,
          labTests: testCount,
          transactions: transactionCount,
          activations: activationCount,
          users: userCount
        }
      };
    } catch (dbError) {
      systemInfo.database.status = `error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`;
    }

    res.json(systemInfo);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Database test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const customerCount = await prisma.customer.count();
    const testCount = await prisma.labTest.count();
    const transactionCount = await prisma.transaction.count();
    
    res.json({
      status: 'Database connected',
      data: {
        customers: customerCount,
        labTests: testCount,
        transactions: transactionCount
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Database connection failed', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Database statistics endpoint
app.get('/api/database-stats', authenticateToken, async (req, res) => {
  try {
    const stats = await dbOptimizer.getStats();
    const needsOptimization = await dbOptimizer.needsOptimization();
    
    res.json({
      ...stats,
      needsOptimization,
      recommendations: needsOptimization ? ['Consider running database optimization'] : []
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Database optimization endpoint (for admin use)
app.post('/api/database-optimize', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin privileges (you might want to add role checking middleware)
    await dbOptimizer.optimizeIfNeeded();
    
    res.json({
      status: 'SUCCESS',
      message: 'Database optimization completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/lab-tests', authenticateToken, labTestRoutes);
app.use('/api/customers', authenticateToken, customerRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/activation', activationRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT signal, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM signal, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

// SQLite optimization function
async function optimizeSQLite() {
  try {
    console.log('🔧 Applying SQLite optimizations...');
    
    // Use $queryRawUnsafe for all PRAGMA statements since they return results in SQLite
    // Enable WAL mode for better concurrency
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    
    // Set synchronous mode to NORMAL for better performance
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    
    // Set cache size to 64MB (negative value means KB)
    await prisma.$queryRawUnsafe('PRAGMA cache_size = -65536;');
    
    // Enable foreign key constraints
    await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
    
    // Set temp store to memory for better performance
    await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;');
    
    // Set mmap size to 256MB for memory-mapped I/O
    await prisma.$queryRawUnsafe('PRAGMA mmap_size = 268435456;');
    
    // Optimize busy timeout for better concurrency
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 30000;');
    
    console.log('✅ SQLite optimizations applied successfully');
    
    // Log current pragma settings using $queryRawUnsafe since these return values
    try {
      const walMode = await prisma.$queryRawUnsafe('PRAGMA journal_mode;');
      const syncMode = await prisma.$queryRawUnsafe('PRAGMA synchronous;');
      const cacheSize = await prisma.$queryRawUnsafe('PRAGMA cache_size;');
      
      console.log('📊 SQLite Configuration:');
      console.log('  - Journal Mode:', walMode);
      console.log('  - Synchronous Mode:', syncMode);
      console.log('  - Cache Size:', cacheSize);
    } catch (queryError) {
      console.log('⚠️ Could not query PRAGMA settings:', queryError);
    }
    
  } catch (error) {
    console.log('⚠️ Failed to apply some SQLite optimizations:', error);
    // Don't throw error, let the app continue
  }
}

// Database maintenance function
// Currently commented out to avoid lint errors since it's only used in scheduled tasks
/* async function performDatabaseMaintenance() {
  try {
    console.log('🧹 Performing database maintenance...');
    
    // Analyze tables for better query planning
    await prisma.$executeRaw`ANALYZE;`;
    
    // Rebuild database to reclaim space (optional, expensive operation)
    // await prisma.$executeRaw`VACUUM;`;
    
    // Incremental vacuum to reclaim some space without full rebuild
    await prisma.$executeRaw`PRAGMA incremental_vacuum(1000);`;
    
    console.log('✅ Database maintenance completed');
    
  } catch (error) {
    console.log('⚠️ Database maintenance failed:', error);
    // Don't throw error, let the app continue
  }
} */

// Database initialization function
async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database...');
    
    // Ensure database file and directory exist for SQLite
    const databaseUrl = process.env.DATABASE_URL;
    console.log('🔍 DATABASE_URL:', databaseUrl);
    
      const isSqlite = !!(databaseUrl && (databaseUrl.startsWith('file:') || databaseUrl.includes('sqlite')));
      const isMySql = !!(databaseUrl && databaseUrl.startsWith('mysql'));

      if (isSqlite) {
      const fs = await import('fs');
      const path = await import('path');
      
      // Extract file path from file:// URL
      const dbFilePath = databaseUrl.replace('file:', '');
      const dbDir = path.dirname(dbFilePath);
      
      console.log('📁 Database file path:', dbFilePath);
      console.log('📁 Database directory:', dbDir);
      
      // Create database directory if it doesn't exist
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('✅ Created database directory:', dbDir);
      }
      
      // If database file doesn't exist, create an empty one
      if (!fs.existsSync(dbFilePath)) {
        fs.writeFileSync(dbFilePath, '');
        console.log('✅ Created empty database file:', dbFilePath);
      }
    }
    
    // Test database connection with retries
    let connected = false;
    let retries = 5; // Increased retries
    
    while (!connected && retries > 0) {
      try {
        await prisma.$connect();
        connected = true;
        console.log('✅ Database connected successfully');
        // Enable SQLite optimizations only when using SQLite
        if (isSqlite) {
          await optimizeSQLite();
        } else if (isMySql) {
          console.log('ℹ️ MySQL detected — skipping SQLite-specific optimizations');
          // Apply light MySQL session settings if needed (non-destructive)
          try {
            await prisma.$executeRawUnsafe("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION';");
            // ensure foreign keys checks are enabled
            await prisma.$executeRawUnsafe('SET SESSION FOREIGN_KEY_CHECKS = 1;');
            console.log('✅ Applied lightweight MySQL session settings');
          } catch (mysqlOptErr) {
            console.log('⚠️ Could not apply MySQL session settings:', mysqlOptErr);
          }
        }
        
      } catch (error) {
        retries--;
        console.log(`❌ Database connection failed, retries left: ${retries}`);
        console.log('❌ Error details:', error);
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        }
      }
    }
    
    if (!connected) {
      throw new Error('Failed to connect to database after retries');
    }
    
    // Ensure database schema exists (run migrations)
    try {
      console.log('🔧 Checking database schema...');
      
      // Try to run schema push to ensure tables exist
      try {
        console.log('📊 Ensuring database schema is up to date...');
        
        // Test if tables exist by trying to count activation records
        const activationCount = await prisma.activation.count();
        console.log(`📊 Found ${activationCount} activation record(s)`);
        
        if (activationCount === 0) {
          console.log('🌱 No activation records found, creating activation data...');
          
          await prisma.activation.create({
            data: {
              code: 'MEDLAB2025',
              status: 'ON'
            }
          });
          
          console.log('✅ Activation data created successfully');
        }
        
      } catch (schemaError) {
        console.log('❌ Database schema issue detected:', schemaError);
        console.log('🔧 This might be a fresh database - tables may need to be created');
        
        // For SQLite, we can try to create tables manually using raw SQL
  if (isSqlite) {
          console.log('🛠️ Attempting to create SQLite tables...');
          
          try {
            // Create activation table
            await prisma.$executeRaw`
              CREATE TABLE IF NOT EXISTS "activations" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "code" TEXT NOT NULL UNIQUE,
                "status" TEXT NOT NULL DEFAULT 'OFF',
                "activateAt" DATETIME,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
              )
            `;
            
            // Create user table
            await prisma.$executeRaw`
              CREATE TABLE IF NOT EXISTS "users" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "username" TEXT NOT NULL UNIQUE,
                "password" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "role" TEXT NOT NULL DEFAULT 'STAFF',
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
              )
            `;
            
            // Create other essential tables
            await prisma.$executeRaw`
              CREATE TABLE IF NOT EXISTS "customers" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "name" TEXT NOT NULL,
                "email" TEXT,
                "phone" TEXT,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
              )
            `;
            
            await prisma.$executeRaw`
              CREATE TABLE IF NOT EXISTS "lab_tests" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "name" TEXT NOT NULL,
                "description" TEXT,
                "price" TEXT NOT NULL,
                "category" TEXT NOT NULL,
                "isActive" INTEGER NOT NULL DEFAULT 1,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
              )
            `;
            
            await prisma.$executeRaw`
              CREATE TABLE IF NOT EXISTS "transactions" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "referenceNumber" TEXT NOT NULL UNIQUE,
                "totalCost" TEXT NOT NULL,
                "paymentMethod" TEXT NOT NULL,
                "status" TEXT NOT NULL DEFAULT 'PENDING',
                "customerId" TEXT NOT NULL,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
              )
            `;
            
            await prisma.$executeRaw`
              CREATE TABLE IF NOT EXISTS "transaction_tests" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "quantity" INTEGER NOT NULL DEFAULT 1,
                "transactionId" TEXT NOT NULL,
                "labTestId" TEXT NOT NULL,
                FOREIGN KEY ("transactionId") REFERENCES "transactions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                FOREIGN KEY ("labTestId") REFERENCES "lab_tests" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                UNIQUE("transactionId", "labTestId")
              )
            `;
            
            console.log('✅ Database tables created successfully');
            
            // Create indexes for better performance
            console.log('📊 Creating database indexes for optimization...');
            try {
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`;
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_users_created ON users(createdAt);`;
              
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);`;
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);`;
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(createdAt);`;
              
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_labtests_category ON lab_tests(category);`;
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_labtests_active ON lab_tests(isActive);`;
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_labtests_name ON lab_tests(name);`;
              
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customerId);`;
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);`;
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(createdAt);`;
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_transactions_customer_date ON transactions(customerId, createdAt);`;
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_transactions_status_date ON transactions(status, createdAt);`;
              
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_transaction_tests_transaction ON transaction_tests(transactionId);`;
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_transaction_tests_labtest ON transaction_tests(labTestId);`;
              
              await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_activations_status ON activations(status);`;
              
              console.log('✅ Database indexes created successfully');
            } catch (indexError) {
              console.log('⚠️ Some indexes may already exist:', indexError);
            }
            
            // Now try to create activation record again using Prisma create method
            try {
              const existingActivation = await prisma.activation.findFirst();
              if (!existingActivation) {
                await prisma.activation.create({
                  data: {
                    code: 'MEDLAB2025',
                    status: 'ON'
                  }
                });
                console.log('✅ Activation data created successfully');
              }
            } catch (activationError) {
              console.log('⚠️ Could not create activation data:', activationError);
            }
            
          } catch (tableCreationError) {
            console.log('❌ Failed to create tables:', tableCreationError);
          }
        }
        else if (isMySql) {
          console.log('ℹ️ Detected MySQL. Attempting to run `prisma migrate deploy` to apply migrations...');
          try {
            const { execSync } = await import('child_process');
            // Run prisma migrate deploy synchronously so server startup waits for schema application
            execSync('npx prisma migrate deploy', { cwd: process.cwd(), stdio: 'inherit', env: { ...process.env } });
            console.log('✅ prisma migrate deploy completed successfully');
          } catch (migrateErr) {
            console.log('⚠️ prisma migrate deploy failed or no migrations to apply:', migrateErr instanceof Error ? migrateErr.message : String(migrateErr));
            console.log('ℹ️ If this is an existing database, consider creating a baseline migration and marking it applied so Prisma doesn\'t attempt destructive changes. See https://pris.ly/d/migrate-baseline');
          }
        }
      }
      
    } catch (tableError) {
      console.log('❌ Database tables may not exist, this might be a fresh database');
      console.log('🔧 Table error:', tableError);
      
      // If tables don't exist, we need to handle this gracefully
      // The app should still start but may need manual database setup
    }
    
    // Check users table and run full seeding if empty
    try {
      const userCount = await prisma.user.count();
      console.log(`👤 Found ${userCount} user(s)`);
      
      if (userCount === 0) {
        console.log('🌱 No users found, running full database seeding...');
        
        // Import and run the full seeding process
        try {
          const { execSync } = await import('child_process');
          const path = await import('path');
          
          // Check if we're in a packaged environment
          const isPackaged = process.env.NODE_ENV === 'production' && __dirname.includes('dist');
          
          if (isPackaged) {
            // In packaged app, use the compiled seed.js
            const seedPath = path.join(__dirname, 'seed.js');
            console.log('📂 Running compiled seed script from:', seedPath);
            
            // Import and run the seed function directly
            const { main: seedMain } = await import('./seed.js');
            if (seedMain && typeof seedMain === 'function') {
              await seedMain();
            } else {
              // Fallback: try to run with node
              execSync(`node "${seedPath}"`, { 
                cwd: process.cwd(), 
                stdio: 'inherit',
                env: { ...process.env }
              });
            }
          } else {
            // In development, use ts-node for TypeScript files
            const seedPath = path.join(__dirname, 'seed.ts');
            console.log('📂 Running seed script from:', seedPath);
            
            execSync('npx ts-node src/seed.ts', { 
              cwd: process.cwd(), 
              stdio: 'inherit',
              env: { ...process.env, NODE_ENV: 'development' }
            });
          }
          
          console.log('✅ Full database seeding completed successfully');
        } catch (seedError) {
          console.log('⚠️ Full seeding failed, creating minimal setup...');
          console.log('Seed error:', seedError instanceof Error ? seedError.message : String(seedError));
          
          // Fallback: create just the superadmin user
          const bcrypt = await import('bcryptjs');
          const hashedPassword = await bcrypt.default.hash('Infinity@97', 12);
          
          await prisma.user.create({
            data: {
              username: 'superadmin',
              password: hashedPassword,
              name: 'System Administrator',
              role: 'SUPERADMIN'
            }
          });
          
          console.log('✅ Default superadmin created successfully');
          console.log('⚠️ Note: Lab tests will need to be added manually through the app');
        }
      }
    } catch (userError) {
      console.log('❌ User table check failed:', userError);
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('📝 Full error details:', error);
    
    // Log environment info for debugging
    console.log('🔍 Environment info:');
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - DATABASE_URL:', process.env.DATABASE_URL);
    console.log('  - Working directory:', process.cwd());
    
    // Don't throw the error, let the server continue
    // The app might still work in limited mode
  }
}

// Schedule maintenance tasks
function scheduleMaintenanceTasks() {
  console.log('📅 Scheduling database maintenance tasks...');
  
  // Run comprehensive maintenance every 24 hours - DISABLED FOR TESTING
  // setInterval(async () => {
  //   console.log('🕐 Running scheduled database maintenance...');
  //   await performDatabaseMaintenance();
    
  //   // Check if optimization is needed weekly
  //   const now = new Date();
  //   if (now.getDay() === 0) { // Sunday
  //     await dbOptimizer.optimizeIfNeeded();
  //   }
  // }, 24 * 60 * 60 * 1000);
  
  // Run light maintenance every 6 hours - DISABLED FOR TESTING
  // setInterval(async () => {
  //   try {
  //     console.log('🔍 Running light database check...');
  //     await prisma.$executeRaw`ANALYZE;`;
      
  //     // Log database stats periodically
  //     const stats = await dbOptimizer.getStats();
  //     if (stats) {
  //       console.log('📊 Database Stats:', {
  //         transactions: stats.recordCounts.transactions,
  //         customers: stats.recordCounts.customers,
  //         size: `${Math.round((stats.databaseInfo.size || 0) / 1024 / 1024)}MB`
  //       });
  //     }
      
  //     console.log('✅ Light maintenance completed');
  //   } catch (error) {
  //     console.log('⚠️ Light maintenance failed:', error);
  //   }
  // }, 6 * 60 * 60 * 1000);
  
  // Semi-annual cleanup of old data (keeping 2 years) - DISABLED FOR TESTING/DEVELOPMENT
  // setInterval(async () => {
  //   try {
  //     console.log('🗑️ Running semi-annual data cleanup...');
  //     await dbOptimizer.cleanupOldData(730); // 2 years
  //   } catch (error) {
  //     console.log('⚠️ Semi-annual cleanup failed:', error);
  //   }
  // }, 6 * 30 * 24 * 60 * 60 * 1000); // 6 months (180 days)
  
  console.log('✅ Maintenance tasks scheduled');
}

// Initialize database before starting server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    
    // Schedule periodic database maintenance
    scheduleMaintenanceTasks();
  });
}).catch((error) => {
  console.error('❌ Failed to initialize database, starting server anyway:', error);
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} (with database initialization errors)`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    
    // Still schedule maintenance even if initialization failed
    scheduleMaintenanceTasks();
  });
});

export { prisma };

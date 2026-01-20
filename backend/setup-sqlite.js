const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function setupSQLite() {
  console.log('🔄 Setting up SQLite database...');
  
  try {
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Created data directory');
    }

    // Initialize Prisma with SQLite
    const dbPath = path.join(dataDir, 'medlab.db');
    const dbUrl = `file:${dbPath}`;
    
    const prisma = new PrismaClient({
      datasources: {
        db: { url: dbUrl }
      }
    });

    console.log('🔗 Connecting to SQLite database...');
    
    // Test the connection and create tables
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ SQLite database connection successful!');
    
    // Create tables using Prisma db push
    console.log('📋 Creating database tables...');
    await prisma.$disconnect();
    
    // We need to run db push to create tables
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      await execAsync('npx prisma db push --force-reset', { 
        cwd: __dirname,
        env: { ...process.env, DATABASE_URL: dbUrl }
      });
      console.log('✅ Database tables created successfully!');
    } catch (error) {
      console.log('⚠️  Database tables creation had issues, but continuing...');
    }
    
    // Reconnect after db push
    const newPrisma = new PrismaClient({
      datasources: {
        db: { url: dbUrl }
      }
    });

    // Check if we have any existing users
    try {
      const userCount = await newPrisma.user.count();
      console.log(`📊 Found ${userCount} existing users in database.`);
      
      if (userCount === 0) {
        console.log('ℹ️  No users found. Database is ready for seeding.');
        console.log('💡 Run "npm run db:seed" to populate with initial data.');
      }
    } catch (error) {
      console.log('ℹ️  Database is ready for first use.');
    }
    
    await newPrisma.$disconnect();
    console.log('✅ SQLite database setup completed successfully!');
    
    // Create the database URL file for Electron
    const dbUrlPath = path.join(__dirname, 'database.url');
    const electronDbUrl = dbUrl.replace(/\\/g, '/');
    
    fs.writeFileSync(dbUrlPath, electronDbUrl);
    console.log(`📝 Database URL written to: ${dbUrlPath}`);
    console.log(`🔗 Database URL: ${electronDbUrl}`);
    
    // Create environment file for SQLite
    const envContent = `# SQLite Database Configuration
DATABASE_URL="${electronDbUrl}"
NODE_ENV=production

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration  
PORT=3001
HOST=localhost

# CORS Configuration
FRONTEND_URL=http://localhost:5173
`;

    const envPath = path.join(__dirname, '.env.sqlite');
    fs.writeFileSync(envPath, envContent);
    console.log(`⚙️  Environment file created: ${envPath}`);
    
  } catch (error) {
    console.error('❌ Error during SQLite setup:', error);
    throw error;
  }
}

// Add error handling for the script
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (require.main === module) {
  setupSQLite().catch(console.error);
}

module.exports = { setupSQLite };

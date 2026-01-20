import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const hashedStaffPassword = await bcrypt.hash('staff123', 12);
  const hashedSuperAdminPassword = await bcrypt.hash('Infinity@97', 12);

  const superAdmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {
      password: hashedSuperAdminPassword,
      name: 'System Administrator',
      role: 'SUPERADMIN'
    },
    create: {
      username: 'superadmin',
      password: hashedSuperAdminPassword,
      name: 'System Administrator',
      role: 'SUPERADMIN'
    }
  });

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: 'Dr. Kwame Asante',
      role: 'ADMIN'
    }
  });

  const staff = await prisma.user.upsert({
    where: { username: 'staff' },
    update: {},
    create: {
      username: 'staff',
      password: hashedStaffPassword,
      name: 'Ama Osei',
      role: 'STAFF'
    }
  });

  // Create lab tests
  const labTests = [
    {
      name: 'Complete Blood Count (CBC)',
      price: 80.00,
      category: 'Hematology',
      description: 'Comprehensive blood cell analysis'
    },
    {
      name: 'Lipid Profile',
      price: 120.00,
      category: 'Chemistry',
      description: 'Cholesterol and triglyceride levels'
    },
    {
      name: 'Blood Glucose (Fasting)',
      price: 25.00,
      category: 'Chemistry',
      description: 'Fasting blood sugar test'
    },
    {
      name: 'HbA1c (Diabetes Control)',
      price: 150.00,
      category: 'Chemistry',
      description: '3-month average blood sugar'
    },
    {
      name: 'Liver Function Tests',
      price: 130.00,
      category: 'Chemistry',
      description: 'Comprehensive liver health panel'
    },
    {
      name: 'Kidney Function Tests',
      price: 120.00,
      category: 'Chemistry',
      description: 'Creatinine, BUN, and GFR'
    },
    {
      name: 'Thyroid Function (TSH, T3, T4)',
      price: 180.00,
      category: 'Endocrinology',
      description: 'Complete thyroid hormone panel'
    },
    {
      name: 'Complete Urine Analysis',
      price: 35.00,
      category: 'Urinalysis',
      description: 'Comprehensive urine examination'
    },
    {
      name: 'Malaria Rapid Test',
      price: 15.00,
      category: 'Parasitology',
      description: 'Quick malaria detection'
    },
    {
      name: 'HIV Screening Test',
      price: 30.00,
      category: 'Serology',
      description: 'HIV antibody detection'
    }
  ];

  for (const test of labTests) {
    // Check if test already exists
    const existingTest = await prisma.labTest.findFirst({
      where: { name: test.name }
    });
    
    if (!existingTest) {
      await prisma.labTest.create({
        data: test
      });
    }
  }

  // Create sample customers
  const customers = [
    {
      name: 'John Mensah',
      phone: '+233244123456',
      email: 'john.mensah@email.com'
    },
    {
      name: 'Mary Asante',
      phone: '+233501234567',
      email: 'mary.asante@email.com'
    },
    {
      name: 'Kwame Osei',
      phone: '+233261234567',
      email: null
    }
  ];

  for (const customer of customers) {
    // Check if customer already exists
    const existingCustomer = await prisma.customer.findFirst({
      where: { name: customer.name }
    });
    
    if (!existingCustomer) {
      await prisma.customer.create({
        data: customer
      });
    }
  }

  console.log('✅ Database seeded successfully!');
  console.log('👤 Users created:');
  console.log('   - SuperAdmin: superadmin/Infinity@97');
  console.log('   - Admin: admin/admin123');
  console.log('   - Staff: staff/staff123');
  console.log(`🧪 ${labTests.length} lab tests created`);
  console.log(`👥 ${customers.length} sample customers created`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

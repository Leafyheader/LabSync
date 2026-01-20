import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedActivation } from './seedActivation';

const prisma = new PrismaClient();

export async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const hashedAdminPassword = await bcrypt.hash('admin123', 12);
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
    update: {
      password: hashedAdminPassword,
      name: 'admin',
      role: 'ADMIN'
    },
    create: {
      username: 'admin',
      password: hashedAdminPassword,
      name: 'admin',
      role: 'ADMIN'
    }
  });

  const staff = await prisma.user.upsert({
    where: { username: 'staff' },
    update: {
      password: hashedStaffPassword,
      name: 'staff',
      role: 'STAFF'
    },
    create: {
      username: 'staff',
      password: hashedStaffPassword,
      name: 'staff',
      role: 'STAFF'
    }
  });

  console.log('✅ Users created:', {
    superAdmin: superAdmin.username,
    admin: admin.username,
    staff: staff.username
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
    },
    {
      name: 'Hepatitis B Surface Antigen',
      price: 45.00,
      category: 'Serology',
      description: 'HBsAg screening test'
    },
    {
      name: 'Hepatitis C Antibody',
      price: 50.00,
      category: 'Serology',
      description: 'Anti-HCV screening'
    },
    {
      name: 'Pregnancy Test (Beta-hCG)',
      price: 25.00,
      category: 'Hormones',
      description: 'Quantitative pregnancy hormone test'
    },
    {
      name: 'Prostate Specific Antigen (PSA)',
      price: 80.00,
      category: 'Tumor Markers',
      description: 'Prostate cancer screening'
    },
    {
      name: 'Vitamin D (25-OH)',
      price: 90.00,
      category: 'Vitamins',
      description: 'Vitamin D deficiency test'
    },
    {
      name: 'Vitamin B12',
      price: 70.00,
      category: 'Vitamins',
      description: 'B12 deficiency screening'
    },
    {
      name: 'Iron Studies',
      price: 85.00,
      category: 'Hematology',
      description: 'Serum iron, TIBC, ferritin'
    },
    {
      name: 'C-Reactive Protein (CRP)',
      price: 40.00,
      category: 'Inflammatory Markers',
      description: 'Inflammation indicator'
    },
    {
      name: 'Erythrocyte Sedimentation Rate (ESR)',
      price: 20.00,
      category: 'Inflammatory Markers',
      description: 'Non-specific inflammation test'
    },
    {
      name: 'Stool Analysis',
      price: 30.00,
      category: 'Parasitology',
      description: 'Comprehensive stool examination'
    },
    {
      name: 'Blood Group & Rh Typing',
      price: 15.00,
      category: 'Immunohematology',
      description: 'ABO and Rh blood typing'
    },
    {
      name: 'Widal Test',
      price: 25.00,
      category: 'Serology',
      description: 'Typhoid fever screening'
    },
    {
      name: 'Tuberculosis (TB) Test',
      price: 35.00,
      category: 'Microbiology',
      description: 'TB screening test'
    },
    {
      name: 'Electrolytes Panel',
      price: 60.00,
      category: 'Chemistry',
      description: 'Sodium, potassium, chloride levels'
    },
    {
      name: 'Cardiac Enzymes (Troponin)',
      price: 120.00,
      category: 'Cardiology',
      description: 'Heart attack markers'
    },
    {
      name: 'Rheumatoid Factor (RF)',
      price: 45.00,
      category: 'Immunology',
      description: 'Rheumatoid arthritis screening'
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
  
  // Seed activation data
  await seedActivation();
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

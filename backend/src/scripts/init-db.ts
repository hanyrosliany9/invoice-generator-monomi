import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function initDatabase() {
  try {
    console.log('🔧 Starting database initialization...');

    // Check if database is accessible
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Check if admin user exists
    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@monomi.id' }
    });

    if (!existingAdmin) {
      console.log('👤 Creating default admin user...');
      
      // Use simple hashing for development to avoid bcrypt Alpine issues
      let hashedPassword;
      try {
        hashedPassword = await bcrypt.hash('password123', 10);
      } catch (error) {
        console.warn('bcrypt failed, using fallback hash');
        hashedPassword = '$2b$10$dummy.hash.for.development.password123';
      }
      
      await prisma.user.create({
        data: {
          email: 'admin@monomi.id',
          name: 'Administrator',
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true,
        },
      });
      
      console.log('✅ Default admin user created (admin@monomi.id / password123)');
    } else {
      console.log('👤 Admin user already exists');
    }

    // Create sample client if none exist
    const clientCount = await prisma.client.count();
    if (clientCount === 0) {
      console.log('🏢 Creating sample client...');
      
      await prisma.client.create({
        data: {
          name: 'PT Sample Client',
          email: 'client@sample.com',
          phone: '+62811234567',
          address: 'Jl. Sample Street No. 123, Jakarta',
          company: 'PT Sample Client Indonesia',
          contactPerson: 'John Doe',
          paymentTerms: 'NET 30',
        },
      });
      
      console.log('✅ Sample client created');
    } else {
      console.log('🏢 Clients already exist');
    }

    // Create sample project if none exist
    const projectCount = await prisma.project.count();
    if (projectCount === 0) {
      console.log('📋 Creating sample project...');
      
      const client = await prisma.client.findFirst();
      if (client) {
        await prisma.project.create({
          data: {
            number: 'PRJ-202501-001',
            description: 'Sample Website Development Project',
            output: 'Responsive website with admin panel',
            type: 'PRODUCTION',
            status: 'PLANNING',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            estimatedBudget: 50000000, // 50 million IDR
            clientId: client.id,
          },
        });
        
        console.log('✅ Sample project created');
      }
    } else {
      console.log('📋 Projects already exist');
    }

    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { initDatabase };
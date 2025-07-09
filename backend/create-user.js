const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
  const prisma = new PrismaClient();
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.upsert({
      where: { email: 'admin@bisnis.co.id' },
      update: {},
      create: {
        email: 'admin@bisnis.co.id',
        password: hashedPassword,
        name: 'Admin Sistem',
        role: 'ADMIN',
      },
    });
    console.log('✅ Admin user created:', user.email);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
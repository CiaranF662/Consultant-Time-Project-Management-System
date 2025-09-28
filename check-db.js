const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Check connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check users
    const userCount = await prisma.user.count();
    console.log(`📊 Total users in database: ${userCount}`);
    
    if (userCount === 0) {
      console.log('⚠️  No users found. Creating test user...');
      
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      const testUser = await prisma.user.create({
        data: {
          email: 'admin@test.com',
          name: 'Test Admin',
          password: hashedPassword,
          role: 'GROWTH_TEAM',
          status: 'APPROVED'
        }
      });
      
      console.log('✅ Test user created:');
      console.log('   Email: admin@test.com');
      console.log('   Password: password123');
      console.log('   Role: GROWTH_TEAM');
    } else {
      // Show existing users
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          password: true
        }
      });
      
      console.log('👥 Existing users:');
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.role}, ${user.status}) ${user.password ? '🔒' : '❌ No password'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
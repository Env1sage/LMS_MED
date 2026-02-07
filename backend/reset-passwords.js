const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

async function resetPasswords() {
  // Parse DATABASE_URL for pg Pool
  const dbUrl = new URL(process.env.DATABASE_URL);
  const pool = new Pool({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port),
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1),
    ssl: false,
  });
  const adapter = new PrismaPg(pool);

  const prisma = new PrismaClient({ adapter });
  
  try {
    await prisma.$connect();
    
    const password123 = await bcrypt.hash('Password123!', 10);
    const ownerPassword = await bcrypt.hash('BitflowAdmin@2026', 10);
    
    const result1 = await prisma.users.updateMany({
      where: { email: 'owner@bitflow.com' },
      data: { passwordHash: ownerPassword }
    });
    console.log('Updated owner:', result1.count);
    
    const result2 = await prisma.users.updateMany({
      where: { 
        email: { 
          in: [
            'admin@elsevier.com',
            'admin@aiimsnagpur.edu.in',
            'faculty@aiimsnagpur.edu.in',
            'priya.sharma@student.aiimsnagpur.edu.in'
          ]
        }
      },
      data: { passwordHash: password123 }
    });
    console.log('Updated other users:', result2.count);
    
    const users = await prisma.users.findMany({
      select: { email: true, role: true }
    });
    
    console.log('\nPassword reset complete for users:');
    users.forEach(u => console.log('  - ' + u.email + ' (' + u.role + ')'));
    
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

resetPasswords().catch(console.error);

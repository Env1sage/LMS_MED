import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;

async function main() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'bitflow_lms',
  });

  console.log('Connecting to database...');

  const ownerPassword = await bcrypt.hash('BitflowAdmin@2026', 10);
  const stdPassword = await bcrypt.hash('Password123!', 10);
  
  // Update owner
  const r1 = await pool.query(
    'UPDATE users SET "passwordHash" = $1 WHERE email = $2 RETURNING email',
    [ownerPassword, 'owner@bitflow.com']
  );
  console.log('Updated owner:', r1.rowCount > 0 ? 'owner@bitflow.com' : 'NOT FOUND');

  // Update publisher admin  
  const r2 = await pool.query(
    'UPDATE users SET "passwordHash" = $1 WHERE email = $2 RETURNING email',
    [stdPassword, 'admin@elsevier.com']
  );
  console.log('Updated publisher:', r2.rowCount > 0 ? 'admin@elsevier.com' : 'NOT FOUND');

  // Update college admin
  const r3 = await pool.query(
    'UPDATE users SET "passwordHash" = $1 WHERE email = $2 RETURNING email',
    [stdPassword, 'admin@aiimsnagpur.edu.in']
  );
  console.log('Updated college admin:', r3.rowCount > 0 ? 'admin@aiimsnagpur.edu.in' : 'NOT FOUND');

  // List all users
  const users = await pool.query('SELECT email, role, status FROM users ORDER BY role LIMIT 20');
  console.log('\n📋 All users in database:');
  users.rows.forEach(u => console.log(`  ${u.email} - ${u.role} - ${u.status}`));

  console.log('\n✅ Passwords updated! Try logging in with:');
  console.log('  owner@bitflow.com / BitflowAdmin@2026');
  console.log('  admin@elsevier.com / Password123!');
  console.log('  admin@aiimsnagpur.edu.in / Password123!');

  await pool.end();
}

main().catch(console.error);

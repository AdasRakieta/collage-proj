import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || '100.103.184.90',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'journey_planner',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
});

async function createAdminUser() {
  console.log('🔄 Creating admin user...');

  try {
    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE role = $1',
      ['admin']
    );

    if (existingAdmin.rows.length > 0) {
      console.log('✅ Admin user already exists');
      console.log(`Admin user ID: ${existingAdmin.rows[0].id}`);
      process.exit(0);
      return;
    }

    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@journeyplanner.com';
    const adminUsername = 'admin';
    const adminPassword = 'Admin123!'; // Default password - MUST BE CHANGED

    console.log('\n📝 Creating admin user:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!\n`);

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Insert admin user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, email_verified, is_active)
       VALUES ($1, $2, $3, 'admin', TRUE, TRUE)
       RETURNING id, username, email, role, created_at`,
      [adminUsername, adminEmail, passwordHash]
    );

    console.log('✅ Admin user created successfully!');
    console.table(result.rows);

    console.log('\n🔐 Login credentials:');
    console.log(`   Email/Username: ${adminUsername} or ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   ⚠️  PLEASE CHANGE THIS PASSWORD IMMEDIATELY!`);

    process.exit(0);
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique violation
      console.log('✅ Admin user with this email/username already exists');
    } else {
      console.error('❌ Failed to create admin user:', error);
    }
    process.exit(1);
  }
}

createAdminUser();

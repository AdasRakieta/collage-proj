import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || '100.103.184.90',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'journey_planner',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
});

async function addInvitationTokensTable() {
  console.log('🔄 Creating database schema...');

  try {
    // First, create users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        is_active BOOLEAN DEFAULT TRUE,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token TEXT,
        reset_token TEXT,
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created');

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // Create updated_at trigger function
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create trigger for users table
    await pool.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
          BEFORE UPDATE ON users
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    // Create invitation_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invitation_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        invited_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Invitation tokens table created');

    // Create indexes for invitation_tokens
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token ON invitation_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_invitation_tokens_email ON invitation_tokens(email);
    `);

    console.log('✅ Migration completed successfully!');

    // Display table info
    const result = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('users', 'invitation_tokens')
      ORDER BY table_name, ordinal_position;
    `);

    console.log('\n📋 Table structure:');
    console.table(result.rows);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addInvitationTokensTable();

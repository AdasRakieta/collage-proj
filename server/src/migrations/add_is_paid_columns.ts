import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'journey_planner',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function addIsPaidColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration: Adding is_paid columns...');
    
    // Add is_paid to stops
    await client.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'stops' 
              AND column_name = 'is_paid'
          ) THEN
              ALTER TABLE stops ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;
              RAISE NOTICE 'Added is_paid column to stops table';
          ELSE
              RAISE NOTICE 'is_paid column already exists in stops table';
          END IF;
      END $$;
    `);
    
    // Add is_paid to transports
    await client.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'transports' 
              AND column_name = 'is_paid'
          ) THEN
              ALTER TABLE transports ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;
              RAISE NOTICE 'Added is_paid column to transports table';
          ELSE
              RAISE NOTICE 'is_paid column already exists in transports table';
          END IF;
      END $$;
    `);
    
    // Add is_paid to attractions
    await client.query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'attractions' 
              AND column_name = 'is_paid'
          ) THEN
              ALTER TABLE attractions ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;
              RAISE NOTICE 'Added is_paid column to attractions table';
          ELSE
              RAISE NOTICE 'is_paid column already exists in attractions table';
          END IF;
      END $$;
    `);
    
    // Verify columns exist
    const result = await client.query(`
      SELECT 
          table_name,
          column_name,
          data_type,
          column_default
      FROM 
          information_schema.columns
      WHERE 
          table_schema = 'public'
          AND table_name IN ('stops', 'transports', 'attractions')
          AND column_name = 'is_paid'
      ORDER BY 
          table_name;
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Columns added:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
addIsPaidColumns()
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });

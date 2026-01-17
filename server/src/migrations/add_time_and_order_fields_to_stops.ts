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

async function addTimeAndOrderFieldsToStops() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting migration: Adding time and order fields to stops...');

    // Add check_in_time column
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'stops' AND column_name = 'check_in_time'
        ) THEN
          ALTER TABLE stops ADD COLUMN check_in_time VARCHAR(5);
          RAISE NOTICE 'Added check_in_time column to stops';
        ELSE
          RAISE NOTICE 'check_in_time column already exists in stops';
        END IF;
      END $$;
    `);

    // Add check_out_time column
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'stops' AND column_name = 'check_out_time'
        ) THEN
          ALTER TABLE stops ADD COLUMN check_out_time VARCHAR(5);
          RAISE NOTICE 'Added check_out_time column to stops';
        ELSE
          RAISE NOTICE 'check_out_time column already exists in stops';
        END IF;
      END $$;
    `);

    // Add order_index column
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'stops' AND column_name = 'order_index'
        ) THEN
          ALTER TABLE stops ADD COLUMN order_index INTEGER DEFAULT 0;
          RAISE NOTICE 'Added order_index column to stops';
        ELSE
          RAISE NOTICE 'order_index column already exists in stops';
        END IF;
      END $$;
    `);

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addTimeAndOrderFieldsToStops()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });

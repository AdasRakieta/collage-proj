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

async function addAddressFieldsToStops() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting migration: Adding address fields to stops...');

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'stops' AND column_name = 'address_street'
        ) THEN
          ALTER TABLE stops ADD COLUMN address_street VARCHAR(255);
          RAISE NOTICE 'Added address_street column to stops';
        ELSE
          RAISE NOTICE 'address_street column already exists in stops';
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'stops' AND column_name = 'address_house_number'
        ) THEN
          ALTER TABLE stops ADD COLUMN address_house_number VARCHAR(64);
          RAISE NOTICE 'Added address_house_number column to stops';
        ELSE
          RAISE NOTICE 'address_house_number column already exists in stops';
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'stops' AND column_name = 'address_postal_code'
        ) THEN
          ALTER TABLE stops ADD COLUMN address_postal_code VARCHAR(32);
          RAISE NOTICE 'Added address_postal_code column to stops';
        ELSE
          RAISE NOTICE 'address_postal_code column already exists in stops';
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

addAddressFieldsToStops()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Fatal error:', err);
    process.exit(1);
  });

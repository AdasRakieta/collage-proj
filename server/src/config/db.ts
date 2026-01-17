import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

// Flag whether DB is available; fallback to JSON when false
export let DB_AVAILABLE = true;

// Connection pool configuration (similar to Python psycopg2)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'journey_planner',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test connection on startup
export const connectDB = async () => {
  console.log('🔍 Database connection details:');
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Port: ${process.env.DB_PORT}`);
  console.log(`   Database: ${process.env.DB_NAME}`);
  console.log(`   User: ${process.env.DB_USER}`);
  console.log('');

  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT version()');
      console.log('✅ PostgreSQL connected successfully!');
      console.log('📊 Version:', result.rows[0].version.split('\n')[0]);
      
      // Test if tables exist
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      console.log('📋 Available tables:', tables.rows.map(r => r.table_name).join(', '));
      DB_AVAILABLE = true;
      return DB_AVAILABLE;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    console.warn('⚠️ Falling back to JSON data store. Server will still start but some operations are limited.');
    DB_AVAILABLE = false;
    return DB_AVAILABLE;
  }
};

// Execute query with automatic connection handling
export const query = async (text: string, params?: any[]) => {
  if (!DB_AVAILABLE) {
    throw new Error('DB unavailable');
  }
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Get a client from the pool for transactions
export const getClient = async (): Promise<PoolClient> => {
  if (!DB_AVAILABLE) throw new Error('DB unavailable');
  return await pool.connect();
};

// Graceful shutdown
export const closePool = async () => {
  if (DB_AVAILABLE) {
    await pool.end();
    console.log('Database connection pool closed');
  }
};

export default pool;

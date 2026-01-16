import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'journey_planner',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

export const connectSequelize = async () => {
  try {
    await sequelize.authenticate();
    console.log(' Sequelize connection successful!');
    await sequelize.sync({ alter: true });
    console.log(' Database models synchronized!');
  } catch (error: any) {
    console.error(' Sequelize connection failed:', error.message);
    throw error;
  }
};

export default sequelize;

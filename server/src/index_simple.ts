import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB } from './config/db';
import journeyRoutes from './routes/journeys';
import stopRoutes from './routes/stops';
import attractionRoutes from './routes/attractions';
import transportRoutes from './routes/transports';
import currencyRoutes from './routes/currency';
import { startAutoRefresh } from './services/currencyService';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/journeys', journeyRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/attractions', attractionRoutes);
app.use('/api/transports', transportRoutes);
app.use('/api/currency', currencyRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
  try {
    await connectDB();
    console.log('✅ Database connected successfully');
    
    // Start currency auto-refresh
    startAutoRefresh();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
      console.log(`❤️  Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

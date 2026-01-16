import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Load stack.env if exists (Portainer)
const stackEnvPath = path.resolve(__dirname, '../../stack.env');
if (require('fs').existsSync(stackEnvPath)) {
  console.log('📦 Loading Portainer stack.env...');
  dotenv.config({ path: stackEnvPath, override: true });
}

import { connectDB } from './config/db';
import journeyRoutes from './routes/journeys';
import stopRoutes from './routes/stops';
import attractionRoutes from './routes/attractions';
import transportRoutes from './routes/transports';
import currencyRoutes from './routes/currency';
import { startAutoRefresh } from './services/currencyService';

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
// Allow any origin in MVP/dev so the frontend can run on any Vite port (e.g. 5173/5174/5175)
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware: Attach dummy user for MVP (no authentication)
app.use((req, res, next) => {
  (req as any).user = { id: 1, userId: 1, username: 'guest', role: 'user' };
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Journey Planner API is running'
  });
});

// Routes
app.use('/api/journeys', journeyRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/attractions', attractionRoutes);
app.use('/api/transports', transportRoutes);
app.use('/api/currency', currencyRoutes);

// Error handling
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
    // Try to connect to database (optional - will fallback to JSON if failed)
    const dbConnected = await connectDB();
    
    if (dbConnected) {
      console.log('✅ Using PostgreSQL database');
    } else {
      console.log('⚠️  Database unavailable - using JSON fallback');
      console.log('   Data stored in: server/data/example/');
    }

    // Start currency auto-refresh if enabled
    if (process.env.ENABLE_RATES_AUTO_REFRESH === '1') {
      startAutoRefresh({ intervalMs: 24 * 60 * 60 * 1000, bases: ['PLN'] });
      console.log('🕒 Currency auto-refresh enabled');
    }

    app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(60));
      console.log('🚀 Journey Planner Backend Started');
      console.log('='.repeat(60));
      console.log(`📍 Server:      http://localhost:${PORT}`);
      console.log(`❤️  Health:      http://localhost:${PORT}/api/health`);
      console.log(`🗺️  API:         http://localhost:${PORT}/api`);
      console.log('='.repeat(60));
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

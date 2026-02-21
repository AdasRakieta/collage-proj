import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import helmet from 'helmet';
import crypto from 'crypto';

// Wymuś ładowanie .env z katalogu głównego
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Jeśli istnieje stack.env (Portainer), załaduj dodatkowo i nadpisz zmienne
const stackEnvPath = path.resolve(__dirname, '../../stack.env');
if (require('fs').existsSync(stackEnvPath)) {
  console.log('📦 Loading Portainer stack.env...');
  dotenv.config({ path: stackEnvPath, override: true });
}

import { Server } from 'socket.io';
import { connectDB, DB_AVAILABLE } from './config/db';
import jsonStore from './config/jsonStore';
import { hashPassword } from './utils/auth';
import journeyRoutes from './routes/journeys';
import stopRoutes from './routes/stops';
import attractionRoutes from './routes/attractions';
import transportRoutes from './routes/transports';
import attachmentRoutes from './routes/attachments';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import userRoutes from './routes/user';
import currencyRoutes from './routes/currency';
import proxyRoutes from './routes/proxy';
import proxyRenderRoutes from './routes/proxyRender';
import { startAutoRefresh } from './services/currencyService';

// Validate required environment variables
const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Make sure these variables are set in your .env file or Docker environment');
  process.exit(1);
}

// Fail-fast if JWT secrets are insecure (default/example values)
const insecureSecrets = [
  'your-super-secret-jwt-key-change-in-production',
  'your-super-secret-jwt-key-change-this-in-production',
  'your-super-secret-refresh-key-change-this-in-production',
  'changeme',
  'secret',
  'jwt_secret',
  'jwt_refresh_secret'
];

const insecureJwtSecret = insecureSecrets.includes(process.env.JWT_SECRET!.toLowerCase());
const insecureRefreshSecret = insecureSecrets.includes(process.env.JWT_REFRESH_SECRET!.toLowerCase());

if (insecureJwtSecret || insecureRefreshSecret) {
  console.error('❌ CRITICAL SECURITY ERROR: JWT secrets are set to default/insecure values!');
  if (insecureJwtSecret) console.error('   - JWT_SECRET is insecure');
  if (insecureRefreshSecret) console.error('   - JWT_REFRESH_SECRET is insecure');
  console.error('\n💡 Please set strong, random secrets in your .env file.');
  console.error('   Generate with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  console.error('   You need TWO different secrets (one for JWT_SECRET, one for JWT_REFRESH_SECRET)');
  process.exit(1);
}

// Ensure JWT_SECRET and JWT_REFRESH_SECRET are different
if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
  console.error('❌ CRITICAL SECURITY ERROR: JWT_SECRET and JWT_REFRESH_SECRET must be different!');
  console.error('   Generate two different secrets with:');
  console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

console.log('✅ All required environment variables are set');
console.log(`📊 Database configuration:`);
console.log(`   Host: ${process.env.DB_HOST}`);
console.log(`   Port: ${process.env.DB_PORT}`);
console.log(`   Database: ${process.env.DB_NAME}`);
console.log(`   User: ${process.env.DB_USER}`);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 5001;

// Make io accessible to routes
app.set('io', io);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      connectSrc: ["'self'", process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173'],
      workerSrc: ["'self'", 'blob:'],
    },
  },
  crossOriginEmbedderPolicy: false, // Umożliwia Leaflet tiles z zewnętrznych źródeł
}));

// CORS middleware
// Allow a set of trusted origins and handle localhost/127.0.0.1 variants during development.
const allowedOrigins = new Set([
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
].filter(Boolean));

app.use((req, res, next) => {
    const origin = req.headers.origin || process.env.CORS_ORIGIN || 'http://localhost:5173';
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  // Always allow common CORS preflight headers for API routes
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    return res.status(200).end();
  }
  next();
});

// Also keep the CORS package to ensure robust behavior for other clients
// app.use(cors({
//   origin: (origin, callback) => {
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.has(origin as string)) return callback(null, true);
//     // Allow non-browser requests (curl, server-to-server) when no origin
//     return callback(new Error('CORS not allowed'));
//   },
//   credentials: true,
// }));
app.use(express.json());

// Connect to PostgreSQL and offer retry if connection fails
const tryConnect = async () => {
  const ok = await connectDB();
  return !!ok;
};

// Startup: attempt DB, if unreachable fall back to JSON store automatically
(async () => {
  try {
    const ok = await tryConnect();
    if (!ok) {
      console.warn('\nDatabase not reachable - server will run using JSON fallback. Continuing automatically.');
      
      // Ensure JSON users store has at least one user (create admin only if empty)
      try {
        const users = await jsonStore.getAll('users');
        if (users.length === 0) {
          // Generate secure random password (only when no users exist)
          const randomPassword = crypto.randomBytes(16).toString('hex');
          const pwHash = await hashPassword(randomPassword);
          const adminUser = {
            username: 'admin',
            email: 'admin@local',
            password_hash: pwHash,
            role: 'admin',
            is_active: true,
            email_verified: true,
            created_at: new Date().toISOString()
          };
          await jsonStore.insert('users', adminUser);
          console.log('\n' + '='.repeat(80));
          console.log('⚙️  JSON FALLBACK: Database not available - created initial admin user');
          console.log('='.repeat(80));
          console.log('   Username: admin');
          console.log(`   Password: ${randomPassword}`);
          console.log('   ⚠️  SAVE THIS PASSWORD - it will not be shown again!');
          console.log('='.repeat(80) + '\n');
        }
      } catch (e) {
        console.error('Failed to ensure admin user in JSON store:', e);
      }
    } else {
      console.log('✅ Using PostgreSQL database - JSON fallback disabled');
    }

    // no interactive prompt - continue automatically

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        console.log(`❌ Client disconnected: ${socket.id}`);
      });
    });

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/journeys', journeyRoutes);
    app.use('/api/stops', stopRoutes);
    app.use('/api/attractions', attractionRoutes);
    app.use('/api/transports', transportRoutes);
    app.use('/api/attachments', attachmentRoutes);
    app.use('/api/proxy', proxyRoutes);
    app.use('/api/proxy', proxyRenderRoutes);
    app.use('/api/currency', currencyRoutes);

    // Start periodic currency rates refresh (background) only if explicitly enabled
    // by environment variable ENABLE_RATES_AUTO_REFRESH=1. By default the app will
    // use cached values and only fetch when a requested base is missing or when
    // an admin triggers a manual refresh.
    try {
      if (process.env.ENABLE_RATES_AUTO_REFRESH === '1') {
        // Refresh once per day (24h) for PLN base to match provider daily updates and API limits
        startAutoRefresh({ intervalMs: 24 * 60 * 60 * 1000, bases: ['PLN'] });
        console.log('🕒 Currency auto-refresh started (daily) for PLN');
      } else {
        console.log('🕒 Currency auto-refresh is disabled (ENABLE_RATES_AUTO_REFRESH != 1)');
      }
    } catch (e) {
      console.warn('Failed to start currency auto-refresh:', e);
    }

    app.get('/api/health', (req, res) => {
      res.json({ status: 'OK', message: 'Journey Planner API is running' });
    });

    httpServer.listen(PORT, () => {
      // Wyświetl rzeczywiste adresy z ENV zamiast localhost
      const backendUrl = process.env.VITE_API_URL?.replace('/api', '') || 
                         process.env.FRONTEND_URL?.replace(/:\d+$/, `:${PORT}`) ||
                         (process.env.DB_HOST ? `http://${process.env.DB_HOST}:${PORT}` : `http://localhost:${PORT}`);
      
      const apiBase = process.env.VITE_API_URL || 
                      (process.env.DB_HOST ? `http://${process.env.DB_HOST}:${PORT}/api` : `http://localhost:${PORT}/api`);
      
      console.log(`\n🚀 Server is running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 Backend URL: ${backendUrl}`);
      console.log(`📡 API Base URL: ${apiBase}`);
      console.log(`\n📋 API endpoints:`);
      console.log(`   - GET    ${apiBase}/health`);
      console.log(`   - POST   ${apiBase}/auth/login`);
      console.log(`   - POST   ${apiBase}/auth/register`);
      console.log(`   - GET    ${apiBase}/journeys`);
      console.log(`   - POST   ${apiBase}/journeys`);
      console.log(`\n🔐 Authentication endpoints available at ${apiBase}/auth`);
      console.log(`👤 User endpoints available at ${apiBase}/user`);
      console.log(`👑 Admin endpoints available at ${apiBase}/admin`);
      console.log(`🔌 WebSocket ready for real-time updates`);
      console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      console.log(``);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
})();

export default app;

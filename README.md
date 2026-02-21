# Journey Planner 🗺️

A modern web application for planning trips with interactive map integration, accommodation management, transportation tracking, and cost estimation. Built with a PostgreSQL database backend designed to run on Raspberry Pi.

![Journey Planner](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

---

## 🚀 Quick Start

**New to this project?** ➡️ **[START HERE - START_HERE.md](START_HERE.md)**

**Need Nginx config?** ➡️ **[NGINX_QUICK_COPY.md](NGINX_QUICK_COPY.md)** (5 minutes)

**Have 404 error?** ➡️ **[DEBUG_404.md](DEBUG_404.md)** (8 common causes + fixes)

---

## ✨ Features

- 🗺️ **Interactive Map**: Click on the map to add stops to your journey using OpenStreetMap
- 🏨 **Accommodation Management**: Save hotels with links (e.g., from Booking.com) and prices
- ✈️ **Transportation Tracking**: Support for flights, trains, buses, cars, and other transport types
- 🎯 **Attraction Planning**: Plan and budget for activities at each destination
- 💰 **Cost Estimation**: Automatic calculation of total trip costs including accommodations, transport, and attractions
- 📱 **iOS-Inspired UI**: Modern, clean interface inspired by iPhone system apps and Apple Maps
- 🔄 **Real-time Updates**: Instant synchronization between frontend and backend

## 🏗️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for iOS-inspired styling
- **Leaflet** with React-Leaflet for interactive maps
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Sequelize ORM** for database management
- **PostgreSQL** as the database
- **CORS** enabled for cross-origin requests

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- Raspberry Pi (recommended for deployment) or any Linux/macOS/Windows system

## 🚀 Installation

### 1. Clone the repository
```bash
git clone https://github.com/AdasRakieta/journey-planner.git
cd journey-planner
```

### 2. Install dependencies
```bash
# Install all dependencies (root, server, and client)
npm run install:all
```

### 3. Set up PostgreSQL database
```bash
sudo -u postgres psql
```

In PostgreSQL shell:
```sql
CREATE DATABASE journey_planner;
CREATE USER journey_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE journey_planner TO journey_user;
\q
```

### 4. Configure environment variables

#### Backend configuration
```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
```env
PORT=5001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=journey_planner
DB_USER=journey_user
DB_PASSWORD=your_secure_password
```

#### Frontend configuration
```bash
cp client/.env.example client/.env
```

Edit `client/.env`:
```env
VITE_API_URL=http://localhost:5001/api
```

## 🖥️ Development

### Option 1: Quick Start (Recommended)
Run both frontend and backend together:
```bash
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5001`

### Option 2: Python HTTP Server (Frontend Only)
For quick frontend testing with built application:

**Using Python script:**
```bash
# Build first
npm run build:all

# Serve with Python (Terminal 1)
python scripts/serve-local.py

# Or with custom port
python scripts/serve-local.py --port 3000

# Run backend separately (Terminal 2)
cd server && npm run dev
```

**Using PowerShell script (Windows):**
```powershell
# Build first
npm run build:all

# Serve with PowerShell (Terminal 1)
.\scripts\serve-local.ps1

# Or with custom port
.\scripts\serve-local.ps1 -Port 3000

# Run backend separately (Terminal 2)
cd server; npm run dev
```

**Direct Python command:**
```bash
cd client/dist
python -m http.server 8000
```
Then open `http://localhost:8000`

> **Note:** When using Python server, backend must run separately on port 5001

### Option 3: Separate Terminals
Run frontend and backend in separate terminals for better control:

**Backend only:**
```bash
npm run server:dev
```
The API will be available at `http://localhost:5001`

**Frontend only:**
```bash
npm run client:dev
```
The UI will be available at `http://localhost:5173`

### 🧪 Testing & Troubleshooting

**Check if backend is running:**
```bash
curl http://localhost:5001/api/health
```

**Full setup guide:**
```bash
# Python
python scripts/serve-local.py --full-guide

# PowerShell
.\scripts\serve-local.ps1 -FullGuide
```

## 🏭 Production Build

### Build both applications:
```bash
npm run build:all
```

### Or build separately:

**Backend:**
```bash
npm run server:build
```

**Frontend:**
```bash
npm run client:build
```

## 🍓 Deployment on Raspberry Pi

Journey Planner can be deployed alongside existing applications (like SmartHome) using shared Nginx.

### 📚 Deployment Options:

1. **🎯 Nginx Multi-App Stack** ⭐ **RECOMMENDED** ⭐
   - See [QUICK_NGINX_DEPLOY.md](./QUICK_NGINX_DEPLOY.md) - 3 steps to deploy (5 minutes)
   - See [NGINX_DEPLOYMENT.md](./NGINX_DEPLOYMENT.md) - Complete documentation
   - **One Nginx** for Journey Planner + SmartHome + other apps
   - **Simple, stable, proven technology** - no Traefik complications



### Quick Manual Deployment:

1. **Build the applications:**
```bash
npm run build:all
```

2. **Install PM2 for process management:**
```bash
sudo npm install -g pm2
cd server
pm2 start dist/index.js --name journey-planner-api
pm2 save
pm2 startup
```

3. **Configure nginx** (see documentation files above)

4. **Access your application:**
   - Local: `http://raspberry-pi-ip:5001`
   - Via nginx: `http://your-domain/journey/`

## 📡 API Endpoints

### Journeys
- `GET /api/journeys` - Get all journeys
- `GET /api/journeys/:id` - Get a specific journey
- `POST /api/journeys` - Create a new journey
- `PUT /api/journeys/:id` - Update a journey
- `DELETE /api/journeys/:id` - Delete a journey
- `POST /api/journeys/:id/calculate-cost` - Calculate total cost

### Health Check
- `GET /api/health` - Check API status

## 🎨 Design Philosophy

The UI is inspired by iOS design principles:
- Clean, minimalist interface
- Smooth transitions and interactions
- iOS color palette (SF symbols-style)
- Card-based layouts with proper shadows
- Rounded corners (iOS-style 10px/20px radius)
- SF Pro-inspired typography

## 🗂️ Project Structure

```
journey-planner/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API service layer
│   │   ├── types/         # TypeScript type definitions
│   │   ├── App.tsx        # Main application component
│   │   └── index.css      # Global styles with Tailwind
│   ├── public/            # Static assets
│   └── package.json
├── server/                # Backend Express application
│   ├── src/
│   │   ├── config/       # Database configuration
│   │   ├── controllers/  # Request handlers
│   │   ├── models/       # Sequelize models
│   │   ├── routes/       # API routes
│   │   └── index.ts      # Server entry point
│   └── package.json
├── NGINX_SETUP.md        # Nginx configuration guide
└── package.json          # Root package.json with scripts
```

## 🔧 Configuration

### Port Configuration
- **Backend API**: Port 5001 (configurable via `.env`)
- **Frontend Dev Server**: Port 5173 (Vite default)
- **PostgreSQL**: Port 5432 (default)

**Note:** Port 5001 is used instead of 5000 to avoid conflicts with other applications (e.g., SmartHome on port 5000).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🐛 Troubleshooting

### Database connection issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# View logs
sudo journalctl -u postgresql
```

### Port already in use
```bash
# Check what's using port 5001
sudo lsof -i :5001

# Kill the process if needed
kill -9 <PID>
```

### Frontend can't connect to backend
- Verify `VITE_API_URL` in client `.env` file
- Check that backend is running on the correct port
- Ensure CORS is properly configured in backend

## 📞 Support

For issues and questions, please open an issue on GitHub.

## 📚 Documentation

### Quick Start Guides
- **[QUICK_START.md](QUICK_START.md)** - ✅ 5-step checklist for GitHub Actions setup
- **[QUICK_NGINX_DEPLOY.md](QUICK_NGINX_DEPLOY.md)** - 🚀 **NEW!** 3 steps to Nginx deployment (5 minutes)
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - ✅ **NEW!** Complete deployment checklist
- **[NGINX_QUICK_COPY.md](NGINX_QUICK_COPY.md)** - 📋 Copy-paste Nginx configuration

### Deployment & Configuration (Nginx - Recommended!)
- **[NGINX_DEPLOYMENT.md](NGINX_DEPLOYMENT.md)** - 🎯 **NEW!** Complete Nginx deployment guide ⭐
- **[NGINX_ARCHITECTURE.md](NGINX_ARCHITECTURE.md)** - 🏗️ **NEW!** Architecture diagrams & flow
- **[MIGRATION_TRAEFIK_TO_NGINX.md](MIGRATION_TRAEFIK_TO_NGINX.md)** - 🔄 **NEW!** Migrate from Traefik to Nginx
- **[NGINX_SETUP.md](NGINX_SETUP.md)** - 📝 Detailed Nginx reverse proxy configuration
- **[NGINX_INTEGRATION.md](NGINX_INTEGRATION.md)** - 🔗 Complete Nginx setup for SmartHome + Journey Planner



### Configuration & Troubleshooting
- **[FRONTEND_BUILD_CRITICAL.md](FRONTEND_BUILD_CRITICAL.md)** - 🚨 VITE_API_URL i compile-time config
- **[URL_CONFIGURATION_GUIDE.md](URL_CONFIGURATION_GUIDE.md)** - 🌐 Kiedy używać `/journey/` w URL
- **[DEBUG_404.md](DEBUG_404.md)** - 🔍 Comprehensive guide for fixing 404 errors
- **[QUICKSTART.md](QUICKSTART.md)** - 🏃 Fast local development setup
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - 📖 Project overview and architecture

### Contributing
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - 🤝 How to contribute to the project
- **[USER_GUIDE.md](USER_GUIDE.md)** - 📱 End-user documentation

### Helper Scripts
- `scripts/verify-deployment.sh` - **NEW!** Verify Nginx deployment (10 checks)
- `validate-env.sh` - Validate environment variables
- `find-postgres-ip.sh` - Find existing PostgreSQL container
- `deploy-on-pi.sh` - Automated deployment script
- `switch-env-mode.sh` - Switch between direct/Nginx modes

---

Made with ❤️ for travel enthusiasts
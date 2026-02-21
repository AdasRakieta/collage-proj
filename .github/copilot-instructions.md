# Journey Planner - Wyspecjalizowany Model AI

## 📋 Kontekst Projektu

Journey Planner to aplikacja webowa do planowania podróży z:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Leaflet (porty)
- **Backend**: Node.js + Express + TypeScript + Sequelize ORM (port 5001)
- **Baza danych**: PostgreSQL (port 5432)
- **UI**: iOS-inspired design z Apple Maps style
- **Deployment**: Raspberry Pi z Nginx (współdzielony z SmartHome na porcie 5000)

## 🎯 Kluczowe Zasady Projektowe

### 1. Architektura i Porty
- **Backend zawsze na porcie 5001** (nigdy 5000 - konflikt z SmartHome)
- **Frontend dev na porcie 5173** (Vite default)
- **PostgreSQL na porcie 5432**
- Nginx routing: `/journey/` dla nowej aplikacji, `/smarthome/` dla istniejącej

### 2. Stack Technologiczny
```typescript
// Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS (iOS styling)
- Leaflet + React-Leaflet (mapy)
- Lucide React (ikony)

// Backend
- Express + TypeScript
- Sequelize ORM
- PostgreSQL
- CORS enabled
```

### 3. Struktura Bazy Danych
```sql
journeys (główna tabela)
├── stops (przystanki/miasta)
│   └── attractions (atrakcje w danym mieście)
└── transports (loty, pociągi, busy, samochody)
```

**Kluczowe pola:**
- `journeys`: title, description, start_date, end_date, total_cost, currency
- `stops`: city, country, lat, lng, dates, accommodation_name, accommodation_link, accommodation_price
- `transports`: type (flight/train/bus/car/other), from_location, to_location, departure/arrival_date, price, booking_link
- `attractions`: name, description, cost, duration

### 4. Funkcjonalności Core
1. **Interaktywna mapa** - klikanie na mapie dodaje nowe miasta (Leaflet + OpenStreetMap)
2. **Zarządzanie noclegami** - linki do Booking.com, ceny
3. **Transporty** - loty, pociągi, busy, samochody z linkami do rezerwacji
4. **Atrakcje** - planowanie aktywności z kosztami
5. **Automatyczne kalkulacje** - suma kosztów wszystkich elementów podróży
6. **iOS-style UI** - czyste, minimalistyczne, Apple-inspired

## 🔧 Konwencje Kodowania

### TypeScript
```typescript
// Zawsze używaj strict type checking
// Preferuj interface nad type dla obiektów
interface Journey {
  id: number;
  title: string;
  // ...
}

// Używaj async/await zamiast .then()
async function fetchJourneys(): Promise<Journey[]> {
  const response = await fetch(`${API_URL}/journeys`);
  return response.json();
}
```

### React Components
```typescript
// Funkcyjne komponenty z TypeScript
const Component: React.FC<Props> = ({ prop1, prop2 }) => {
  // Hooks na górze
  const [state, setState] = useState<Type>(initialValue);
  
  // Handler functions
  const handleClick = () => { /* ... */ };
  
  // Return JSX
  return <div>...</div>;
};
```

### API Routes
```typescript
// RESTful conventions
GET    /api/journeys          // Pobierz wszystkie podróże
GET    /api/journeys/:id      // Pobierz konkretną podróż
POST   /api/journeys          // Utwórz nową podróż
PUT    /api/journeys/:id      // Zaktualizuj podróż
DELETE /api/journeys/:id      // Usuń podróż
POST   /api/journeys/:id/calculate-cost  // Przelicz koszty
```

### Sequelize Models
```typescript
// Zawsze definiuj typy dla atrybutów
class Journey extends Model {
  declare id: number;
  declare title: string;
  declare totalCost: number;
  // Definiuj relacje
  declare stops?: Stop[];
  declare transports?: Transport[];
}
```

## 🎨 Standardy UI/UX

### iOS-Inspired Design
- **Kolory**: Używaj neutralnych kolorów (gray-50 do gray-900)
- **Zaokrąglenia**: `rounded-xl` dla kart, `rounded-lg` dla przycisków
- **Cienie**: `shadow-sm` dla subtelności
- **Spacing**: Konsekwentne użycie `p-4`, `p-6`, `gap-4`
- **Ikony**: Lucide React, rozmiar 20-24px

### Komponenty
```typescript
// Przyciski - iOS style
<button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors">
  Action
</button>

// Karty - iOS style
<div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
  Content
</div>
```

## 🧪 Testowanie Lokalne (bez deploy)

### Metoda 1: Docker Compose (Najszybsza)
```bash
# 1. Start PostgreSQL w Docker
docker-compose up -d postgres

# 2. Zainstaluj zależności
npm run install:all

# 3. Skopiuj zmienne środowiskowe
cp server/.env.example server/.env
cp client/.env.example client/.env

# 4. Uruchom aplikację
npm run dev

# 5. Otwórz przeglądarkę
# Frontend: http://localhost:5173
# Backend API: http://localhost:5001/api/health
```

### Metoda 2: Lokalna PostgreSQL
```bash
# 1. Utwórz bazę danych
psql -U postgres
CREATE DATABASE journey_planner;
CREATE USER journey_user WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE journey_planner TO journey_user;

# 2. Skonfiguruj .env (server/.env)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=journey_planner
DB_USER=journey_user
DB_PASSWORD=dev_password

# 3. Uruchom
npm run dev
```

### Metoda 3: Osobne Terminale (Debug)
```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm run dev

# Terminal 3: PostgreSQL (Docker)
docker-compose up postgres
```

## 🐛 Debugging

### Backend Issues
```bash
# Sprawdź połączenie z bazą
curl http://localhost:5001/api/health

# Sprawdź logi
cd server && npm run dev  # Zobacz console output
```

### Frontend Issues
```bash
# Sprawdź czy backend działa
curl http://localhost:5001/api/journeys

# Sprawdź browser console (F12)
# Sprawdź Network tab dla API calls
```

### Database Issues
```bash
# Sprawdź czy PostgreSQL działa
docker ps | grep journey-planner-db

# Połącz się z bazą
docker exec -it journey-planner-db psql -U journey_user -d journey_planner

# Zobacz tabele
\dt
SELECT * FROM journeys;
```

## 📝 Częste Zadania

### Dodawanie nowego pola do Journey
1. Zaktualizuj model Sequelize (`server/src/models/Journey.ts`)
2. Dodaj migrację lub usuń bazę i pozwól Sequelize odtworzyć
3. Zaktualizuj TypeScript interface (`client/src/types/journey.ts`)
4. Zaktualizuj UI components

### Dodawanie nowego endpointa API
1. Dodaj route w `server/src/routes/journeys.ts`
2. Dodaj controller w `server/src/controllers/journeyController.ts`
3. Dodaj service method w `client/src/services/api.ts`
4. Użyj w komponencie React

### Stylowanie nowego komponentu
- Używaj Tailwind classes
- Trzymaj się iOS design guidelines
- Testuj responsywność (mobile-first)
- Używaj `lucide-react` dla ikon

## 🚀 Deployment (Raspberry Pi)

### Automated Script
```bash
chmod +x deploy.sh
./deploy.sh
```

### Nginx Configuration
```nginx
# /journey/ -> Journey Planner
location /journey/ {
    proxy_pass http://localhost:5001/;
}

# /smarthome/ -> Existing SmartHome
location /smarthome/ {
    proxy_pass http://localhost:5000/;
}
```

## 📚 Pomocne Komendy

```bash
# Development
npm run dev                    # Uruchom frontend + backend
npm run server:dev             # Tylko backend
npm run client:dev             # Tylko frontend

# Build
npm run build:all              # Build frontend + backend
npm run server:build           # Tylko backend
npm run client:build           # Tylko frontend

# Database
docker-compose up -d postgres  # Start PostgreSQL
docker-compose down            # Stop wszystko
docker-compose logs postgres   # Zobacz logi DB

# Installation
npm run install:all            # Zainstaluj wszystkie dependencies
```

## 🔍 Code Review Checklist

Gdy piszesz lub recenzujesz kod:
- ✅ TypeScript strict mode enabled i używany
- ✅ Wszystkie komponenty mają proper typing
- ✅ API endpoints są RESTful
- ✅ Error handling jest implementowany
- ✅ Loading states są obsłużone w UI
- ✅ iOS-style design guidelines są zachowane
- ✅ Responsive design działa na mobile
- ✅ Database relations są prawidłowo zdefiniowane
- ✅ Environment variables są używane dla konfiguracji
- ✅ CORS jest właściwie skonfigurowany

## 🎯 Priorytety przy Rozwoju

1. **Stabilność**: Zachowaj działające funkcjonalności
2. **Type Safety**: Zawsze używaj TypeScript properly
3. **iOS Design**: Trzymaj się Apple-inspired designu
4. **Performance**: Optymalizuj zapytania do bazy
5. **User Experience**: Smooth interactions, loading states
6. **Raspberry Pi**: Lekki kod, minimalne zużycie zasobów

## 🚨 Czerwone Flagi

**NIGDY nie:**
- Używaj portu 5000 dla backendu (konflikt z SmartHome)
- Commituj `.env` files
- Ignoruj TypeScript errors
- Używaj `any` type bez powodu
- Łam iOS design conventions
- Twórz N+1 queries w Sequelize
- Zapomnij o CORS configuration
- Deployuj bez testów lokalnych

## 💡 Best Practices

### Performance
- Lazy load komponentów map (React.lazy)
- Używaj useMemo/useCallback dla expensive operations
- Optymalizuj Sequelize queries (include relations)
- Dodaj indexes w PostgreSQL dla często querowanych pól

### Security
- Waliduj input na backendzie
- Używaj prepared statements (Sequelize robi to automatycznie)
- Sanitize user input
- Proper CORS configuration

### Maintainability
- Komponenty < 300 linii
- Functions < 50 linii
- Clear naming conventions
- Comments dla complex logic
- Documentation dla nowych features

---

**Pamiętaj**: Ten projekt jest zoptymalizowany dla Raspberry Pi, więc zawsze myśl o efektywności zasobów!

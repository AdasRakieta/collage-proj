# Journey Planner 🗺️ - MVP Faza 1

Uproszczona aplikacja webowa do planowania podróży stworzona przez 3-osobowy zespół studencki.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

---

## 🚀 Quick Start

### Krok 1: Sklonuj Repozytorium

```bash
git clone https://github.com/AdasRakieta/collage-proj.git
cd collage-proj
```

### Krok 2: Uruchom Backend

```bash
cd server
npm install
npm run dev
```

Backend: **http://localhost:5001**

### Krok 3: Uruchom Frontend

```bash
cd client
npm install
npm run dev
```

Frontend: **http://localhost:5173**

### Krok 4: Zaloguj się

- **Username:** `admin`
- **Password:** `admin123`

---

## ✨ Funkcjonalności MVP

✅ **Zarządzanie Podróżami**
- Tworzenie, edycja, usuwanie podróży
- Lista wszystkich podróży

✅ **Przystanki (Miasta)**
- Dodawanie miast do podróży
- Informacje o noclegach (nazwa, link, cena)
- Geolokalizacja

✅ **Transport**
- Różne typy: samolot, pociąg, autobus, samochód
- Ceny i linki do rezerwacji

✅ **Atrakcje**
- Dodawanie do przystanków
- Szacowany koszt i czas
- Priorytety

✅ **Kalkulacja Kosztów**
- Automatyczne sumowanie
- Podział na kategorie

✅ **Mapa Interaktywna**
- Wyświetlanie przystanków
- Markery i trasy

---

## 🏗️ Stack Technologiczny

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Leaflet (mapy)

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL (opcjonalne - JSON fallback)

---

## 📚 Dokumentacja

| Plik | Opis |
|------|------|
| [URUCHOMIENIE.md](URUCHOMIENIE.md) | 🚀 Szczegółowe instrukcje uruchomienia |
| [DANE_LOGOWANIA.md](DANE_LOGOWANIA.md) | 🔐 Dane dostępowe i zarządzanie użytkownikami |
| [README_MVP.md](README_MVP.md) | 📖 Pełna dokumentacja MVP |
| [UPROSZCZENIE_PODSUMOWANIE.md](UPROSZCZENIE_PODSUMOWANIE.md) | 📝 Historia zmian i uproszczenia |
| [scripts/team_gaussian.html](scripts/team_gaussian.html) | 📊 Wykres Gaussa zespołu |

---

## 🐳 Docker

### Tryb Developerski

Najszybszy sposób - uruchom lokalnie bez Dockera (patrz Quick Start).

### Tryb Produkcyjny

```bash
# Konfiguracja
cp stack.env.example stack.env
# Edytuj stack.env (ustaw JWT_SECRET, DB, etc.)

# Uruchomienie
docker-compose up -d

# Sprawdź status
docker-compose ps

# Logi
docker-compose logs -f
```

**Dostęp:**
- Frontend: http://localhost:5173
- Backend: http://localhost:5001/api

---

## 🗄️ Baza Danych (Opcjonalna)

### JSON Fallback (Domyślnie)

Aplikacja automatycznie używa JSON, jeśli PostgreSQL nie jest dostępny.
- ✅ Brak konfiguracji
- ✅ Szybki start
- ⚠️ Dane nie są persystentne

### PostgreSQL (Produkcja)

```bash
# Utwórz bazę
createdb journey_planner

# Inicjalizuj tabele
psql -d journey_planner -f database/init_simple.sql
```

Skonfiguruj `.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=journey_planner
DB_USER=journey_user
DB_PASSWORD=StrongPassword123!

JWT_SECRET=wygeneruj-64-znaki-node-crypto
JWT_REFRESH_SECRET=inny-64-znaki-sekret
```

---

## 🎯 Struktura Projektu

```
collage-proj/
├── client/               # Frontend (React)
│   ├── src/
│   │   ├── components/   # Komponenty UI
│   │   ├── pages/        # Strony (Itinerary)
│   │   ├── services/     # API client
│   │   └── types/        # TypeScript types
│   └── package.json
│
├── server/               # Backend (Node.js)
│   ├── src/
│   │   ├── controllers/  # Logika biznesowa
│   │   ├── routes/       # API endpoints
│   │   ├── config/       # Konfiguracja DB
│   │   └── services/     # Serwisy (currency)
│   ├── data/example/     # JSON fallback
│   └── package.json
│
├── database/
│   └── init_simple.sql   # Schema bazy danych
│
├── scripts/
│   └── team_gaussian.html # Wykres zespołu
│
└── Dokumentacja/         # Faza 1 dokumentacja
```

---

## 📊 Zespół

Projekt realizowany przez 3-osobowy zespół:

- **Backend Developer** - API, baza danych, logika biznesowa
- **Frontend Developer** - UI/UX, React, mapy
- **Fullstack/Integrator** - Integracja, testy, dokumentacja

Zobacz [wizualizację Gaussa](scripts/team_gaussian.html) rozkładu umiejętności zespołu.

---

## 🔧 API Endpoints

### Journeys
- `GET /api/journeys` - Lista podróży
- `GET /api/journeys/:id` - Szczegóły
- `POST /api/journeys` - Nowa podróż
- `PUT /api/journeys/:id` - Edytuj
- `DELETE /api/journeys/:id` - Usuń
- `GET /api/journeys/:id/total-cost` - Koszty

### Stops, Transports, Attractions
Analogiczne endpointy dla przystanków, transportu i atrakcji.

Pełna dokumentacja: [README_MVP.md](README_MVP.md)

---

## ⚠️ Ważne

- **Zmień hasło** `admin123` przed wdrożeniem
- **Wygeneruj JWT secrets** dla produkcji
- **JSON fallback** traci dane po restarcie
- **PostgreSQL** zalecany dla persystencji

---

## 📈 Status Projektu

✅ **Faza 1: ZAKOŃCZONA** - Analiza, projektowanie, MVP  
📅 **Faza 2:** Rozwój backend  
📅 **Faza 3:** Zaawansowany frontend  
📅 **Faza 4:** Testy i integracja  
📅 **Faza 5:** Autentykacja i bezpieczeństwo  
📅 **Faza 6:** Deployment i finalizacja

---

## 📝 Licencja

MIT License - Projekt edukacyjny

---

## 🆘 Pomoc

Problemy? Zobacz:
- [URUCHOMIENIE.md](URUCHOMIENIE.md) - Troubleshooting
- [DANE_LOGOWANIA.md](DANE_LOGOWANIA.md) - Reset hasła
- Issues: https://github.com/AdasRakieta/collage-proj/issues

---

**Wersja:** MVP Faza 1 (bez Nginx)  
**Data:** 16 stycznia 2026  
**Zespół:** 3-osobowy zespół studencki

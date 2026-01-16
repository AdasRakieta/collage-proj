# Journey Planner - MVP Faza 1

## Cel Projektu

Uproszczona wersja aplikacji Journey Planner stworzona przez 3-osobowy zespół studencki w ramach Fazy 1 (Miesiąc 1 - Analiza i Projektowanie). Aplikacja pozwala na podstawowe planowanie podróży bez zaawansowanych funkcji.

## Zakres MVP

### Funkcjonalności Zrealizowane

✅ **Zarządzanie Podróżami**
- Tworzenie nowej podróży
- Edycja podróży
- Usuwanie podróży
- Lista wszystkich podróży

✅ **Zarządzanie Przystankami**
- Dodawanie przystanku do podróży
- Edycja przystanku
- Usuwanie przystanku
- Informacje o noclegach (nazwa, link, cena)

✅ **Zarządzanie Transportem**
- Dodawanie środka transportu
- Różne typy transportu (samolot, pociąg, autobus, samochód)
- Edycja i usuwanie transportów
- Cena i link do rezerwacji

✅ **Zarządzanie Atrakcjami**
- Dodawanie atrakcji do przystanku
- Edycja i usuwanie atrakcji
- Szacowany koszt i czas zwiedzania
- Priorytet (wysoki, średni, niski)

✅ **Kalkulacja Kosztów**
- Automatyczne sumowanie kosztów
- Podział na noclegi, transport i atrakcje
- Wyświetlanie całkowitego kosztu podróży

✅ **Interaktywna Mapa**
- Wyświetlanie przystanków na mapie
- Markery dla miast
- Wizualizacja trasy

### Funkcjonalności Usunięte (Planowane na Późniejsze Fazy)

❌ Autentykacja użytkowników
❌ System współdzielenia podróży
❌ Panel administracyjny
❌ Załączniki i dokumenty
❌ Email service
❌ Zaawansowane importy/exporty
❌ OAuth integracje

## Struktura Projektu

```
collage-proj/
├── client/               # Frontend (React + TypeScript + Vite)
│   ├── src/
│   │   ├── components/   # Komponenty UI
│   │   ├── pages/        # Główna strona z podróżami
│   │   ├── services/     # API client
│   │   └── types/        # TypeScript typy
│   └── package.json
│
├── server/               # Backend (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── controllers/  # Logika biznesowa
│   │   ├── routes/       # Endpointy API
│   │   ├── config/       # Konfiguracja DB
│   │   └── services/     # Dodatkowe serwisy
│   └── package.json
│
├── database/             # Skrypty SQL
│   └── init_simple.sql  # Uproszczony schema
│
└── Dokumentacja/         # Dokumentacja projektu
    └── FAZA1_ANALIZA_I_PROJEKTOWANIE.md
```

## Technologie

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Typowanie
- **Vite** - Build tool
- **Tailwind CSS** - Stylowanie
- **Leaflet** - Interaktywne mapy
- **Axios** - HTTP client

### Backend
- **Node.js 18+** - Runtime
- **Express.js** - Framework webowy
- **TypeScript** - Typowanie
- **PostgreSQL 15+** - Baza danych
- **pg** - PostgreSQL driver

## Instalacja i Uruchomienie

### Wymagania
- Node.js 18+
- PostgreSQL 15+
- npm lub yarn

### Backend

```bash
cd server
npm install
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev
```

### Baza Danych

```bash
# Utwórz bazę danych
createdb journey_planner

# Uruchom skrypt inicjalizujący
psql -d journey_planner -f database/init_simple.sql
```

## API Endpoints

### Journeys
- `GET /api/journeys` - Lista podróży
- `GET /api/journeys/:id` - Szczegóły podróży
- `POST /api/journeys` - Nowa podróż
- `PUT /api/journeys/:id` - Edytuj podróż
- `DELETE /api/journeys/:id` - Usuń podróż
- `GET /api/journeys/:id/total-cost` - Kalkulacja kosztów

### Stops
- `GET /api/stops?journey_id=:id` - Przystanki podróży
- `POST /api/stops` - Nowy przystanek
- `PUT /api/stops/:id` - Edytuj przystanek
- `DELETE /api/stops/:id` - Usuń przystanek

### Transports
- `GET /api/transports?journey_id=:id` - Transport podróży
- `POST /api/transports` - Nowy transport
- `PUT /api/transports/:id` - Edytuj transport
- `DELETE /api/transports/:id` - Usuń transport

### Attractions
- `GET /api/attractions?stop_id=:id` - Atrakcje przystanku
- `POST /api/attractions` - Nowa atrakcja
- `PUT /api/attractions/:id` - Edytuj atrakcję
- `DELETE /api/attractions/:id` - Usuń atrakcję

## Podział Pracy - Zespół 3-osobowy

### Backend Developer
- Implementacja API RESTful
- Tworzenie modeli danych
- Logika biznesowa (kalkulacja kosztów)
- Testy jednostkowe backendu

### Frontend Developer
- Projektowanie interfejsu użytkownika
- Implementacja komponentów React
- Integracja z API
- Implementacja map (Leaflet)
- Responsywność UI

### Fullstack Developer / Integrator
- Koordynacja między frontendem a backendem
- Testy end-to-end
- Dokumentacja projektu
- Setup środowiska (Docker, CI/CD)

## Metryki Zespołu (Wykres Gaussa)

Zobacz wizualizację w pliku: `scripts/team_gaussian.html`

## Status Projektu

🎯 **Faza 1: ZAKOŃCZONA** ✅
- Analiza wymagań
- Projektowanie architektury
- Prototypy interfejsu
- Podstawowa implementacja MVP

📅 **Następne Kroki:**
- Faza 2: Rozwój Backend (pełna funkcjonalność)
- Faza 3: Rozwój Frontend (zaawansowane komponenty)
- Faza 4: Integracja i testowanie
- Faza 5: Autentykacja użytkowników
- Faza 6: Finalizacja i deployment

## Licencja

MIT License - Projekt edukacyjny

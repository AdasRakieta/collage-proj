# Faza 1: Analiza i Projektowanie
## Miesiąc 1 - Journey Planner

---

## 1. Analiza Wymagań Funkcjonalnych

### 1.1 Zarządzanie Podróżami
- **Tworzenie nowej podróży** - użytkownik może utworzyć nową podróż z podstawowymi informacjami (nazwa, opis, daty)
- **Edycja podróży** - możliwość modyfikacji szczegółów istniejącej podróży
- **Usuwanie podróży** - usunięcie podróży wraz ze wszystkimi powiązanymi danymi
- **Lista podróży** - wyświetlanie wszystkich podróży użytkownika w formie listy lub kafelków

### 1.2 Zarządzanie Przystankami (Miasta)
- **Dodawanie przystanku** - możliwość dodania miasta/miejsca do podróży
- **Wybór na mapie** - interaktywne dodawanie przystanków poprzez kliknięcie na mapie
- **Geolokalizacja** - automatyczne pobieranie współrzędnych geograficznych
- **Informacje o przystanku**:
  - Nazwa miasta
  - Kraj
  - Daty pobytu (przyjazd, wyjazd)
  - Notatki
- **Kolejność przystanków** - możliwość zmiany kolejności odwiedzanych miejsc

### 1.3 Zarządzanie Noclegami
- **Dodawanie noclegu** - przypisanie noclegu do przystanku
- **Szczegóły noclegu**:
  - Nazwa hotelu/mieszkania
  - Adres
  - Link do rezerwacji (np. Booking.com)
  - Cena za noc
  - Liczba nocy
  - Notatki
- **Kalkulacja kosztów** - automatyczne obliczanie kosztów noclegów

### 1.4 Zarządzanie Transportem
- **Dodawanie środka transportu** między przystankami
- **Typy transportu**:
  - Samolot
  - Pociąg
  - Autobus
  - Samochód (własny/wypożyczony)
  - Inny
- **Szczegóły transportu**:
  - Miejsce wyjazdu
  - Miejsce przyjazdu
  - Data i godzina wyjazdu
  - Data i godzina przyjazdu
  - Numer lotu/pociągu (opcjonalnie)
  - Cena biletu
  - Link do rezerwacji
  - Notatki

### 1.5 Zarządzanie Atrakcjami
- **Dodawanie atrakcji** do konkretnego przystanku
- **Szczegóły atrakcji**:
  - Nazwa atrakcji
  - Opis
  - Koszt wstępu
  - Szacowany czas zwiedzania
  - Priorytet (wysoki, średni, niski)
  - Notatki
- **Geolokalizacja atrakcji** - współrzędne na mapie

### 1.6 Kalkulacja Kosztów
- **Automatyczne sumowanie**:
  - Suma kosztów noclegów
  - Suma kosztów transportu
  - Suma kosztów atrakcji
  - Całkowity koszt podróży
- **Obsługa walut** - możliwość wprowadzania kosztów w różnych walutach (PLN, EUR, USD)
- **Podgląd kosztów** - wyświetlanie szczegółowego zestawienia kosztów

### 1.7 Interaktywna Mapa
- **Wyświetlanie trasy** - wizualizacja wszystkich przystanków na mapie
- **Markery** - oznaczenia dla każdego przystanku i atrakcji
- **Linie połączeń** - wizualizacja tras między przystankami
- **Interakcja** - kliknięcie w marker wyświetla szczegóły

### 1.8 Autentykacja Użytkowników (opcjonalnie - MVP+)
- Rejestracja użytkownika
- Logowanie
- Zarządzanie profilem
- Resetowanie hasła

---

## 2. Analiza Wymagań Niefunkcjonalnych

### 2.1 Wydajność
- **Czas ładowania strony** - maksymalnie 3 sekundy przy standardowym połączeniu internetowym
- **Responsywność UI** - płynne animacje i przejścia (60 FPS)
- **Optymalizacja zapytań** - minimalizacja liczby requestów do API
- **Lazy loading** - ładowanie map i obrazów tylko gdy są potrzebne

### 2.2 Skalowalność
- **Architektura modularna** - możliwość łatwego dodawania nowych funkcji
- **Separacja warstw** - frontend, backend, baza danych jako niezależne komponenty
- **API RESTful** - standardowe endpointy umożliwiające przyszłą integrację

### 2.3 Bezpieczeństwo
- **Walidacja danych** - po stronie backendu i frontendu
- **Ochrona przed SQL Injection** - wykorzystanie ORM (parametryzowane zapytania)
- **Szyfrowanie haseł** - jeśli będzie autentykacja (bcrypt, argon2)
- **HTTPS** - szyfrowana komunikacja (w fazie wdrożenia)
- **CORS** - prawidłowa konfiguracja dla bezpieczeństwa API

### 2.4 Użyteczność (Usability)
- **Intuicyjny interfejs** - minimalistyczny design, iOS-inspired
- **Responsywność** - aplikacja działa na desktop, tablet, mobile
- **Accessibility** - podstawowa obsługa czytników ekranu
- **Komunikaty błędów** - czytelne komunikaty dla użytkownika
- **Loading states** - informowanie użytkownika o przetwarzaniu danych

### 2.5 Kompatybilność
- **Przeglądarki**:
  - Chrome (ostatnie 2 wersje)
  - Firefox (ostatnie 2 wersje)
  - Safari (ostatnia wersja)
  - Edge (ostatnia wersja)
- **Urządzenia mobilne** - iOS 14+, Android 10+

### 2.6 Utrzymywalność
- **Czytelny kod** - stosowanie konwencji nazewnictwa
- **Dokumentacja kodu** - komentarze dla złożonej logiki
- **Testy** - pokrycie testami kluczowych funkcji
- **Git** - kontrola wersji, jasne commity

---

## 3. Projektowanie Architektury Systemu

### 3.1 Architektura Trójwarstwowa

```
┌─────────────────────────────────────────┐
│         FRONTEND (Client-side)          │
│   React/Vue/Angular + TypeScript        │
│   • Komponenty UI                       │
│   • State Management                    │
│   • Routing                             │
│   • API Client                          │
└─────────────────┬───────────────────────┘
                  │ HTTP/HTTPS
                  │ REST API
┌─────────────────▼───────────────────────┐
│          BACKEND (Server-side)          │
│   Node.js + Express + TypeScript        │
│   • Controllers (logika biznesowa)      │
│   • Routes (endpointy API)              │
│   • Middleware (walidacja, auth)        │
│   • Services (logika aplikacji)         │
└─────────────────┬───────────────────────┘
                  │ SQL
                  │ ORM (Sequelize/Prisma)
┌─────────────────▼───────────────────────┐
│         DATABASE (Data Layer)           │
│         PostgreSQL / MySQL              │
│   • Tabela: journeys                    │
│   • Tabela: stops                       │
│   • Tabela: accommodations              │
│   • Tabela: transports                  │
│   • Tabela: attractions                 │
│   • Tabela: users (opcjonalnie)         │
└─────────────────────────────────────────┘
```

### 3.2 Przepływ Danych

**Przykład: Tworzenie nowej podróży**

1. **Frontend**: Użytkownik wypełnia formularz "Nowa Podróż"
2. **Frontend**: Walidacja danych po stronie klienta
3. **Frontend**: Wysłanie żądania POST do `/api/journeys`
4. **Backend**: Middleware waliduje dane
5. **Backend**: Controller przekazuje dane do Service
6. **Backend**: Service zapisuje podróż do bazy danych (ORM)
7. **Database**: Zwraca ID nowo utworzonej podróży
8. **Backend**: Zwraca response (status 201, dane podróży)
9. **Frontend**: Aktualizuje stan aplikacji i przekierowuje użytkownika

### 3.3 Endpointy API (Przykłady)

**Journeys (Podróże):**
- `GET /api/journeys` - Pobierz wszystkie podróże
- `GET /api/journeys/:id` - Pobierz konkretną podróż (z przystankami, transportem, atrakcjami)
- `POST /api/journeys` - Utwórz nową podróż
- `PUT /api/journeys/:id` - Zaktualizuj podróż
- `DELETE /api/journeys/:id` - Usuń podróż
- `GET /api/journeys/:id/total-cost` - Oblicz całkowity koszt podróży

**Stops (Przystanki):**
- `GET /api/stops` - Pobierz wszystkie przystanki
- `POST /api/journeys/:journeyId/stops` - Dodaj przystanek do podróży
- `PUT /api/stops/:id` - Zaktualizuj przystanek
- `DELETE /api/stops/:id` - Usuń przystanek

**Transports (Transport):**
- `POST /api/journeys/:journeyId/transports` - Dodaj transport
- `PUT /api/transports/:id` - Zaktualizuj transport
- `DELETE /api/transports/:id` - Usuń transport

**Attractions (Atrakcje):**
- `POST /api/stops/:stopId/attractions` - Dodaj atrakcję do przystanku
- `PUT /api/attractions/:id` - Zaktualizuj atrakcję
- `DELETE /api/attractions/:id` - Usuń atrakcję

---

## 4. Projekt Struktury Bazy Danych

### 4.1 Diagram ERD (Entity Relationship Diagram)

```
┌─────────────────────┐
│      JOURNEYS       │
├─────────────────────┤
│ id (PK)             │
│ title               │
│ description         │
│ start_date          │
│ end_date            │
│ currency            │
│ created_at          │
│ updated_at          │
└──────────┬──────────┘
           │ 1
           │
           │ N
┌──────────▼──────────┐         ┌─────────────────────┐
│       STOPS         │         │     TRANSPORTS      │
├─────────────────────┤         ├─────────────────────┤
│ id (PK)             │         │ id (PK)             │
│ journey_id (FK)     │◄────────┤ journey_id (FK)     │
│ city                │    1:N  │ type                │
│ country             │         │ from_location       │
│ latitude            │         │ to_location         │
│ longitude           │         │ departure_date      │
│ arrival_date        │         │ arrival_date        │
│ departure_date      │         │ price               │
│ accommodation_name  │         │ currency            │
│ accommodation_link  │         │ booking_link        │
│ accommodation_price │         │ flight_number       │
│ notes               │         │ notes               │
└──────────┬──────────┘         └─────────────────────┘
           │ 1
           │
           │ N
┌──────────▼──────────┐
│    ATTRACTIONS      │
├─────────────────────┤
│ id (PK)             │
│ stop_id (FK)        │
│ name                │
│ description         │
│ estimated_cost      │
│ duration_hours      │
│ priority            │
│ latitude            │
│ longitude           │
│ notes               │
└─────────────────────┘
```

### 4.2 Definicje Tabel (SQL Schema)

**Tabela: journeys**
```sql
CREATE TABLE journeys (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    currency VARCHAR(3) DEFAULT 'PLN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Tabela: stops**
```sql
CREATE TABLE stops (
    id SERIAL PRIMARY KEY,
    journey_id INTEGER NOT NULL,
    city VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    arrival_date DATE NOT NULL,
    departure_date DATE NOT NULL,
    accommodation_name VARCHAR(255),
    accommodation_link TEXT,
    accommodation_price DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
);
```

**Tabela: transports**
```sql
CREATE TABLE transports (
    id SERIAL PRIMARY KEY,
    journey_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('flight', 'train', 'bus', 'car', 'other')),
    from_location VARCHAR(255) NOT NULL,
    to_location VARCHAR(255) NOT NULL,
    departure_date TIMESTAMP NOT NULL,
    arrival_date TIMESTAMP NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PLN',
    booking_link TEXT,
    flight_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
);
```

**Tabela: attractions**
```sql
CREATE TABLE attractions (
    id SERIAL PRIMARY KEY,
    stop_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_cost DECIMAL(10, 2),
    duration_hours INTEGER,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stop_id) REFERENCES stops(id) ON DELETE CASCADE
);
```

### 4.3 Indeksy i Optymalizacja

```sql
-- Indeksy dla wydajności
CREATE INDEX idx_stops_journey_id ON stops(journey_id);
CREATE INDEX idx_transports_journey_id ON transports(journey_id);
CREATE INDEX idx_attractions_stop_id ON attractions(stop_id);
CREATE INDEX idx_journeys_dates ON journeys(start_date, end_date);
```

---

## 5. Prototypy Interfejsu Użytkownika (Wireframes)

### 5.1 Ekran Główny - Lista Podróży

```
┌────────────────────────────────────────────────┐
│  Journey Planner            [+ Nowa Podróż]    │
├────────────────────────────────────────────────┤
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │  🗺️ Wakacje w Europie                   │  │
│  │  15 lip 2025 - 30 lip 2025              │  │
│  │  5 miast • ~8,500 PLN                   │  │
│  │  [Szczegóły] [Edytuj] [Usuń]           │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │  🏖️ Weekend w Krakowie                  │  │
│  │  10 sie 2025 - 12 sie 2025              │  │
│  │  1 miasto • ~1,200 PLN                  │  │
│  │  [Szczegóły] [Edytuj] [Usuń]           │  │
│  └─────────────────────────────────────────┘  │
│                                                │
└────────────────────────────────────────────────┘
```

### 5.2 Ekran Szczegółów Podróży

```
┌────────────────────────────────────────────────┐
│  ← Powrót          Wakacje w Europie           │
│                                    [Edytuj]    │
├────────────────────────────────────────────────┤
│  Zakładki: [Przystanki] [Transport] [Mapa]    │
├────────────────────────────────────────────────┤
│                                                │
│  📍 Warszawa                                   │
│     15-17 lip 2025 • Hotel Centrum • 600 PLN  │
│     Atrakcje: Stare Miasto, Pałac Kultury     │
│     [Szczegóły]                                │
│                                                │
│  ✈️ LOT 1234  Warszawa → Berlin                │
│     17 lip 10:00 - 11:30 • 450 PLN            │
│                                                │
│  📍 Berlin                                     │
│     17-20 lip 2025 • Hostel Mitte • 800 PLN   │
│     Atrakcje: Brama Brandenburska, Muzeum     │
│     [Szczegóły]                                │
│                                                │
│  🚂 ICE 789  Berlin → Praga                    │
│     20 lip 14:00 - 18:30 • 350 PLN            │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │  Całkowity koszt: 8,500 PLN             │ │
│  │  Noclegi: 3,200 PLN                     │ │
│  │  Transport: 2,800 PLN                   │ │
│  │  Atrakcje: 2,500 PLN                    │ │
│  └──────────────────────────────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

### 5.3 Ekran Mapy (Interaktywna)

```
┌────────────────────────────────────────────────┐
│  ← Powrót          Mapa Podróży                │
├────────────────────────────────────────────────┤
│                                                │
│      🗺️ [Interaktywna Mapa]                   │
│                                                │
│         📍 ──────────────────> 📍              │
│      Warszawa       ✈️         Berlin          │
│                                 │              │
│                                 │ 🚂           │
│                                 ▼              │
│                               📍               │
│                             Praga              │
│                                                │
│  [+ Dodaj przystanek przez kliknięcie]        │
│                                                │
│  Legenda:                                      │
│  📍 Przystanek  ✈️ Samolot  🚂 Pociąg         │
│                                                │
└────────────────────────────────────────────────┘
```

### 5.4 Formularz Dodawania Przystanku

```
┌────────────────────────────────────────────────┐
│  Dodaj Przystanek                              │
├────────────────────────────────────────────────┤
│                                                │
│  Miasto: [___________________________]         │
│                                                │
│  Kraj:   [___________________________]         │
│                                                │
│  Współrzędne (automatyczne lub ręczne):       │
│  Lat:  [____________]  Lng: [____________]    │
│  [📍 Wybierz na mapie]                         │
│                                                │
│  Data przyjazdu:  [DD/MM/YYYY] [HH:MM]        │
│  Data wyjazdu:    [DD/MM/YYYY] [HH:MM]        │
│                                                │
│  ─── Nocleg (opcjonalnie) ───                 │
│                                                │
│  Nazwa:  [___________________________]         │
│  Link:   [___________________________]         │
│  Cena:   [__________] PLN                     │
│                                                │
│  Notatki:                                      │
│  [________________________________]            │
│  [________________________________]            │
│                                                │
│  [Anuluj]                    [Zapisz]         │
│                                                │
└────────────────────────────────────────────────┘
```

### 5.5 Design System (iOS-inspired)

**Kolory:**
- Primary: #007AFF (niebieski)
- Success: #34C759 (zielony)
- Warning: #FF9500 (pomarańczowy)
- Danger: #FF3B30 (czerwony)
- Tło: #F2F2F7 (jasny szary)
- Karty: #FFFFFF (biały)
- Tekst: #000000 (czarny), #8E8E93 (szary)

**Typografia:**
- Nagłówki: 24px, bold
- Podtytuły: 18px, semibold
- Tekst: 16px, regular
- Małe: 14px, regular

**Komponenty:**
- Zaokrąglone rogi: 12px
- Cienie: subtlne (0 2px 8px rgba(0,0,0,0.1))
- Przyciski: wysokość 44px (touch-friendly)
- Odstępy: 8px, 16px, 24px (konsystentne)

---

## 6. Podział Zadań w Zespole

### 6.1 Tydzień 1-2: Analiza i Planowanie (Wszyscy)

**Backend Developer:**
- Analiza wymagań funkcjonalnych dla API
- Projekt struktury bazy danych
- Wybór ORM (Sequelize vs Prisma vs TypeORM)
- Dokumentacja endpointów API

**Frontend Developer:**
- Analiza wymagań UI/UX
- Prototypy interfejsu (wireframes)
- Wybór biblioteki do map (Leaflet vs Mapbox)
- Projekt komponentów i struktury aplikacji

**Fullstack/Integrator:**
- Koordynacja między backendem a frontendem
- Ustalenie kontraktów API (request/response schemas)
- Wybór narzędzi do testowania
- Setup repozytorium Git i struktura projektu

### 6.2 Tydzień 3: Setup Projektu

**Backend Developer:**
- Inicjalizacja projektu Node.js + TypeScript
- Konfiguracja bazy danych (PostgreSQL/MySQL)
- Setup ORM i migracje
- Struktura folderów (models, controllers, routes, services)

**Frontend Developer:**
- Inicjalizacja projektu (React/Vue + TypeScript + Vite)
- Konfiguracja Tailwind CSS
- Setup routingu
- Struktura folderów (components, pages, services, hooks)

**Fullstack/Integrator:**
- Konfiguracja Git (branching strategy)
- Setup narzędzi (ESLint, Prettier)
- CI/CD (opcjonalnie - GitHub Actions)
- Dokumentacja setup'u dla zespołu

### 6.3 Tydzień 4: Pierwsze Prototypy

**Backend Developer:**
- Implementacja modelu `Journey`
- Endpoint: POST /api/journeys
- Endpoint: GET /api/journeys
- Podstawowe testy jednostkowe

**Frontend Developer:**
- Komponenty: Navbar, Footer
- Strona główna z listą podróży (mock data)
- Formularz dodawania podróży
- Podstawowa integracja z API (fetch)

**Fullstack/Integrator:**
- Integracja frontendu z backendem
- Testy integracyjne (Postman/Insomnia)
- Code review
- Dokumentacja postępów

### 6.4 Deliverables (Koniec Miesiąca 1)

✅ **Dokumentacja:**
- Specyfikacja wymagań funkcjonalnych i niefunkcjonalnych
- Diagram architektury systemu
- Schema bazy danych (ERD)
- Wireframes interfejsu użytkownika
- Dokumentacja API (endpoints)

✅ **Kod:**
- Projekt backend z podstawową strukturą
- Projekt frontend z podstawową strukturą
- Tabela `journeys` w bazie danych
- Podstawowe endpointy dla podróży (CRUD)
- Podstawowy interfejs (lista podróży, formularz)

✅ **Testy:**
- Testy jednostkowe dla backendu (podstawowe)
- Manualne testy integracyjne

✅ **Git:**
- Repozytorium z commits
- README.md z instrukcją setup'u
- .gitignore poprawnie skonfigurowany

---

## 7. Narzędzia i Technologie (Proponowane)

### Frontend:
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Mapy**: Leaflet + react-leaflet
- **Routing**: React Router
- **HTTP Client**: Axios / Fetch API
- **State Management**: Context API / Zustand (dla prostszych projektów)

### Backend:
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Sequelize
- **Validation**: Joi / Zod
- **Testing**: Jest

### Database:
- **RDBMS**: PostgreSQL 15+
- **Client**: pg (PostgreSQL driver)

### Dev Tools:
- **Version Control**: Git + GitHub
- **Code Quality**: ESLint, Prettier
- **API Testing**: Postman / Insomnia
- **Documentation**: Markdown

---

## 8. Ryzyka i Mitigation

| Ryzyko | Prawdopodobieństwo | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Opóźnienia w jednym module blokują innych | Średnie | Wysoki | Jasne API contracts, mock data dla frontendu |
| Problemy z integracją map | Niskie | Średni | Wybór sprawdzonej biblioteki (Leaflet), dokumentacja |
| Przekroczenie scope'u | Wysokie | Wysoki | Ścisłe trzymanie się MVP, priorytetyzacja funkcji |
| Problemy wydajnościowe | Niskie | Średni | Optymalizacja zapytań, indeksy w bazie |
| Brak doświadczenia z technologią | Średnie | Średni | Dokumentacja, tutoriale, code review |

---

## Podsumowanie Fazy 1

Po zakończeniu pierwszego miesiąca zespół będzie miał:
- ✅ Jasno zdefiniowane wymagania
- ✅ Zaprojektowaną architekturę systemu
- ✅ Kompletną strukturę bazy danych
- ✅ Prototypy interfejsu użytkownika
- ✅ Podział zadań i harmonogram
- ✅ Działające środowisko deweloperskie
- ✅ Podstawowy kod (backend + frontend)

To stanowi solidny fundament do kontynuacji prac w Fazie 2 (Backend Development) i Fazie 3 (Frontend Development).

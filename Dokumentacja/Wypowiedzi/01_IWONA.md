# Journey Planner — Prezentacja Iwona (Backend)

> **Czas prezentacji:** ok. 5–7 minut  
> **Temat:** Jak zbudowany jest backend — Express, PostgreSQL, Zod, auth, email

---

## Co robiłam w projekcie

Jestem odpowiedzialna za **całą warstwę serwerową** aplikacji:

| Obszar | Pliki |
|--------|-------|
| Serwer Express + middleware | `server/src/index.ts` |
| Baza danych (PostgreSQL + fallback) | `server/src/config/db.ts`, `jsonStore.ts` |
| Walidacja schematów (Zod) | `server/src/middleware/validation.ts`, `server/src/schemas/` |
| Routes & Controllers (CRUD) | `server/src/routes/`, `server/src/controllers/journeyController.ts`, `stopController.ts`, `transportController.ts`, `attractionController.ts` |
| Uwierzytelnianie JWT | `server/src/controllers/authController.ts` |
| Serwis e-mail (zaproszenia, reset hasła) | `server/src/services/emailService.ts` |
| Serwis walutowy | `server/src/services/currencyService.ts` |
| Baza danych — schemat | `database/init.sql` |

---

## Co zrobiłam — szczegóły

### 1. Serwer Express (`server/src/index.ts`)
- Konfiguracja CORS (obsługa wszystkich portów Vite dev: 5173–5175)
- Middleware JSON, limit 10 MB dla załączników
- Dummy user w MVP → wymiana na JWT auth
- Global error handler + 404

### 2. Double-storage: PostgreSQL + JSON fallback (`db.ts`, `jsonStore.ts`)
- Aplikacja uruchamia się nawet bez PostgreSQL — fallback na pliki JSON
- Flaga `DB_AVAILABLE` przełącza kontrolery między trybami
- Na zajęciach można uruchomić **bez stawiania bazy danych**

```ts
export let DB_AVAILABLE = true;
connectDB().catch(() => {
  DB_AVAILABLE = false; // automatyczny fallback
});
```

### 3. Walidacja Zod (`validation.ts`, `schemas/`)
- Każdy endpoint ma własny schemat Zod (journey, stop, transport, attraction)
- Middleware `validate(schema)` zwraca czytelny błąd 400 z polem i komunikatem
- Fix: `datetime-local` (format `YYYY-MM-DDTHH:MM`) tolerowany i normalizowany do ISO

```ts
// transport.schema.ts — obsługa skróconego formatu datetime-local
if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return `${val}:00`;
```

### 4. CRUD API (`routes/` + `controllers/`)
- REST endpoints dla: journeys, stops, transports, attractions, attachments, admin
- Każda mutacja (add/edit/delete) przelicza łączny koszt podróży przez `journeyService`
- Paginacja na listach, wyszukiwanie tekstowe (`?q=`)

### 5. Uwierzytelnianie JWT (`authController.ts`)
- Rejestracja przez zaproszenie (token) lub Google OAuth
- Login zwraca `accessToken` (1h) + `refreshToken` (7 dni)
- Middleware `auth.ts` weryfikuje token na chronionych endpointach
- Ograniczone widoki admina (`/api/admin/`) — zarządzanie użytkownikami i zaproszeniami

### 6. Serwis e-mail (`emailService.ts`)
- Nodemailer z konfiguracją SMTP z `.env`
- Dev mode: mailw e-maile zapisywane jako podgląd w `server/data/email_previews/` (bez wysyłki)
- Wysyłane typy maili:
  - Zaproszenie do rejestracji
  - Zaproszenie do podróży (share)
  - Reset hasła (kod 6-cyfrowy)
  - Potwierdzenie rejestracji
  - Powiadomienie admina o nowym wniosku

### 7. Schemat bazy danych (`database/init.sql`)
Tabele: `users`, `invitations`, `journeys`, `journey_shares`, `stops`, `transports`, `attractions`, `attachments`, `currency_rates`

---

## Fragment do pokazania na demo

**Flow: dodanie transportu → automatyczny update kosztu podróży**

```
POST /api/transports/journey/:journeyId
  ↓ validate(transportSchema)   ← mój middleware
  ↓ insert transport do DB
  ↓ journeyService.recalcTotals(journeyId)  ← mój serwis
  ↓ UPDATE journeys SET total_estimated_cost = ...
  ↓ return 201 + nowy transport
```

Frontend pobiera świeżą podróż → użytkownik widzi zaktualizowany budżet.

---

## Trudności, które rozwiązałam

1. **Problem z datami w Zodzie** — `datetime-local` nie wysyła sekund, backend odrzucał jako błąd → dodałam preprocessor który dopisuje `:00`
2. **Dual storage** — każdy kontroler musiał obsługiwać dwa tryby (DB/JSON) bez duplikacji logiki
3. **Google OAuth** — skonfigurowanie callback URL, wymiana code → token → profil → powiązanie z kontem

---

## Na co zwrócić uwagę w kodzie

- `server/src/middleware/validation.ts` — elegancki pattern `validate(schema)` jako higher-order middleware
- `server/src/controllers/authController.ts` — pełny flow auth z odświeżaniem tokenów
- `server/src/services/emailService.ts` — dev fallback z podglądem HTML emaili

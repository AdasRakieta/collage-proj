# Journey Planner — Prezentacja (Iwona / Backend)

## Cel

- Pokazać jak backend przyjmuje requesty z frontu, waliduje (Zod), zapisuje dane w DB albo w JSON fallback, a potem zwraca „kanoniczną” odpowiedź.
- Podkreślić decyzje MVP: brak logowania (tymczasowy `dummy user`), brak Socket.IO w runtime, dopasowanie walidacji do `datetime-local`.

## Demo flow (co klikamy na żywo)

1. Utworzenie podróży (POST `/api/journeys`).
2. Dodanie stopu (POST `/api/stops/journey/:journeyId`).
3. Dodanie transportu (POST `/api/transports/journey/:journeyId`).
4. Dodanie atrakcji (POST `/api/attractions/stop/:stopId`).
5. Zwrócenie odświeżonej podróży z totalami.

## Kolejność omawiania plików (najpierw “szkielet”, potem szczegóły)

1) [server/src/index.ts](../server/src/index.ts)
2) [server/src/config/db.ts](../server/src/config/db.ts) i [server/src/config/jsonStore.ts](../server/src/config/jsonStore.ts)
3) Routing: [server/src/routes/journeys.ts](../server/src/routes/journeys.ts) + analogicznie `stops.ts`, `transports.ts`, `attractions.ts`, `currency.ts`
4) Walidacja: [server/src/middleware/validation.ts](../server/src/middleware/validation.ts)
5) Schemy: [server/src/schemas/journey.schema.ts](../server/src/schemas/journey.schema.ts), [server/src/schemas/stop.schema.ts](../server/src/schemas/stop.schema.ts), [server/src/schemas/transport.schema.ts](../server/src/schemas/transport.schema.ts)
6) Serwisy: [server/src/services/journeyService.ts](../server/src/services/journeyService.ts)
7) Kontrolery (wyrywkowo): [server/src/controllers/journeyController.ts](../server/src/controllers/journeyController.ts)

---

## 1) Entry point: server/src/index.ts

### Co robi

- Konfiguruje Express (`cors`, `json`, `urlencoded`).
- W MVP podpina „udawanego usera” do `req.user`.
- Rejestruje trasy `/api/*`.
- Obsługuje błąd globalnie + 404.
- Startuje serwer i opcjonalne auto-refresh kursów.

### Fragment do pokazania (szukaj w pliku: `Attach dummy user for MVP`)

```ts
app.use((req, res, next) => {
  (req as any).user = { id: 1, userId: 1, username: 'guest', role: 'user' };
  next();
});
```

### Dlaczego tak

- MVP bez auth: szybciej dowozimy CRUD i UI.
- Ten middleware jest „punkt do wymiany” przy wdrożeniu logowania.

---

## 2) DB + fallback: server/src/config/db.ts i server/src/config/jsonStore.ts

### Co robi db.ts

- Utrzymuje pool do Postgres.
- Ustala flagę `DB_AVAILABLE`; jeśli DB padnie, backend nadal wstaje.

Fragment do pokazania (szukaj: `DB_AVAILABLE = false`)

```ts
export let DB_AVAILABLE = true;
...
} catch (error: any) {
  DB_AVAILABLE = false;
  return DB_AVAILABLE;
}
```

### Co robi jsonStore.ts

- Minimalny „storage w plikach JSON” (CRUD), używany gdy DB nie działa.

Dlaczego tak:

- Na zajęciach da się uruchomić projekt bez stawiania Postgresa.
- Ta warstwa jest też przydatna do szybkich testów/dem.

---

## 3) Routing: server/src/routes/journeys.ts (i analogiczne)

### Co robi

- Definiuje endpointy i podpina walidację Zod (`validate`, `validateQuery`).

Fragment do pokazania (szukaj: `router.post('/', validate(createJourneySchema)`)

```ts
router.post('/', validate(createJourneySchema), createJourney);
router.get('/', validateQuery(getJourneysSchema), getAllJourneys);
```

### Uwagi MVP

- W tym pliku nadal są endpointy „share” (dziedzictwo funkcji), ale UI MVP ich nie używa.

---

## 4) Walidacja: server/src/middleware/validation.ts

### Co robi

- Centralnie przechwytuje ZodError i zwraca czytelne `errors[]`.

Fragment do pokazania (szukaj: `Validation failed`)

```ts
return res.status(400).json({
  message: 'Validation failed',
  errors: error.issues.map((err: any) => ({
    path: err.path.join('.'),
    message: err.message,
    received: err.received,
  })),
});
```

Dlaczego tak:

- Frontend może wyświetlić konkretny komunikat (ważne na demo).

---

## 5) Schemy Zod: journey/stop/transport

Najważniejszy “case z zajęć”: `datetime-local`.

### transport.schema.ts — akceptacja `YYYY-MM-DDTHH:MM` bez sekund

Fragment (szukaj: `add seconds`)

```ts
if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) {
  return `${val}:00`;
}
```

Dlaczego tak:

- HTML input `datetime-local` często nie daje sekund; backend musi to tolerować.

---

## 6) Liczenie totalu: server/src/services/journeyService.ts

### Co robi

- Przelicza koszt podróży na walutę główną.
- W trybie JSON/DB próbuje też zapisać wartości “converted” do rekordów.

Fragment do pokazania (szukaj: `const total = sumStops + sumTrans + sumAttr`)

```ts
const total = sumStops + sumTrans + sumAttr;
await jsonStore.updateById('journeys', journeyId, { total_estimated_cost: total });
return total;
```

Dlaczego tak:

- Jedno źródło prawdy na backendzie; frontend po operacjach robi odświeżenie.

---

## Spis plików backend (krótko, po jednym zdaniu)

### server/src/config

- [server/src/config/db.ts](../server/src/config/db.ts) — Postgres + flaga `DB_AVAILABLE`.
- [server/src/config/jsonStore.ts](../server/src/config/jsonStore.ts) — CRUD na plikach JSON jako fallback.
- [server/src/config/database.ts](../server/src/config/database.ts) — konfiguracja Sequelize/bazy (historyczne / zależne od użycia).

### server/src/middleware

- [server/src/middleware/validation.ts](../server/src/middleware/validation.ts) — wspólna walidacja Zod.

### server/src/routes

- [server/src/routes/journeys.ts](../server/src/routes/journeys.ts) — CRUD journeys (+ legacy share endpoints).
- [server/src/routes/journeys_simple.ts](../server/src/routes/journeys_simple.ts) — prostsze/alternatywne endpointy (legacy).
- [server/src/routes/stops.ts](../server/src/routes/stops.ts) — CRUD stops.
- [server/src/routes/transports.ts](../server/src/routes/transports.ts) — CRUD transports.
- [server/src/routes/attractions.ts](../server/src/routes/attractions.ts) — CRUD attractions.
- [server/src/routes/currency.ts](../server/src/routes/currency.ts) — kursy walut.

### server/src/controllers

- [server/src/controllers/journeyController.ts](../server/src/controllers/journeyController.ts) — główny kontroler journeys (DB/JSON, export/import, legacy share).
- [server/src/controllers/journeyController_simple.ts](../server/src/controllers/journeyController_simple.ts) — uproszczony kontroler (legacy).
- [server/src/controllers/stopController.ts](../server/src/controllers/stopController.ts) — CRUD stops.
- [server/src/controllers/transportController.ts](../server/src/controllers/transportController.ts) — CRUD transports.
- [server/src/controllers/attractionController.ts](../server/src/controllers/attractionController.ts) — CRUD attractions.

### server/src/schemas

- [server/src/schemas/journey.schema.ts](../server/src/schemas/journey.schema.ts) — walidacja journeys.
- [server/src/schemas/stop.schema.ts](../server/src/schemas/stop.schema.ts) — walidacja stops.
- [server/src/schemas/transport.schema.ts](../server/src/schemas/transport.schema.ts) — walidacja transports.
- [server/src/schemas/attraction.schema.ts](../server/src/schemas/attraction.schema.ts) — walidacja attractions.
- [server/src/schemas/auth.schema.ts](../server/src/schemas/auth.schema.ts) — gotowe schemy pod login/register (do wdrożenia).

### server/src/services

- [server/src/services/journeyService.ts](../server/src/services/journeyService.ts) — liczenie totalu.
- [server/src/services/currencyService.ts](../server/src/services/currencyService.ts) — pobieranie/refresh kursów.

### server/src/models

- [server/src/models/Journey.ts](../server/src/models/Journey.ts), [server/src/models/User.ts](../server/src/models/User.ts) — modele DB.
- [server/src/models/Attachment.ts](../server/src/models/Attachment.ts), [server/src/models/TransportAttachment.ts](../server/src/models/TransportAttachment.ts) — legacy załączniki (MVP UI usunięte).
- [server/src/models/index.ts](../server/src/models/index.ts) — rejestracja modeli.

### server/src/migrations

- [server/src/migrations/add_is_paid_columns.ts](../server/src/migrations/add_is_paid_columns.ts) — pola płatności.
- [server/src/migrations/add_time_and_order_fields_to_stops.ts](../server/src/migrations/add_time_and_order_fields_to_stops.ts) — check-in/out + kolejność.
- [server/src/migrations/add_stop_address_fields.ts](../server/src/migrations/add_stop_address_fields.ts) — adresy stopów.
- [server/src/migrations/add_tags_to_attractions.ts](../server/src/migrations/add_tags_to_attractions.ts) — tagi.
- [server/src/migrations/20241209_add_time_fields_to_attractions.ts](../server/src/migrations/20241209_add_time_fields_to_attractions.ts) — pola czasu atrakcji.

### server/src/utils + types

- [server/src/utils/auth.ts](../server/src/utils/auth.ts) — helpery pod auth (do rozbudowy).
- [server/src/utils/fileCrypto.ts](../server/src/utils/fileCrypto.ts) — legacy wsparcie załączników.
- [server/src/types/node-fetch.d.ts](../server/src/types/node-fetch.d.ts) — deklaracje typów (kompilacja TS).

---

## Kolejne kroki (roadmapa) — login/rejestracja + rozwój ustawień

### Login/Rejestracja (Backend)

1. Dodać routing: `server/src/routes/auth.ts`.
2. Dodać kontroler: `server/src/controllers/authController.ts`.
3. Dodać serwis: `server/src/services/authService.ts` (hashowanie haseł, JWT, refresh token).
4. Dodać middleware: `server/src/middleware/auth.ts` (weryfikacja JWT -> `req.user`).
5. Usunąć `dummy user` z [server/src/index.ts](../server/src/index.ts) i zastąpić go prawdziwym auth.
6. Rozszerzyć DB: tabela refresh tokenów / sesji (opcjonalnie) + indeksy.

### Settings (Backend)

- W MVP settings są głównie frontendowe (localStorage), ale docelowo:
  - endpoint `GET/PUT /api/users/me/settings` (język, domyślna waluta, preferencje mapy, itp.)
  - walidacja Zod + zapis do tabeli `user_settings`.

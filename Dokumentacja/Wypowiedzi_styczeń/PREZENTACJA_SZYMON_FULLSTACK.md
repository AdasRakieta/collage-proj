# Journey Planner — Prezentacja (Szymon / Fullstack)

## Cel

- Jak “spina się” frontend i backend: trasy API → walidacja → kontroler → DB/JSON → odpowiedź → odświeżenie stanu w UI.
- Pokazać 2–3 decyzje architektoniczne, które rozwiązują realne problemy: total kosztów, walidacja dat, fallback bez DB.

## Najlepszy flow do zaprezentowania (end-to-end)

1. Start: `npm run dev` (root) i szybki healthcheck `/api/health`.
2. Utwórz podróż → dodaj stop → dodaj transport → dodaj atrakcję.
3. Zwróć uwagę: po każdej mutacji UI pobiera ponownie podróż i total kosztów jest natychmiast poprawny.
4. Pokaż itinerary + geocode (adres → marker) + dark mode.

---

## “Architektura w 1 slajdzie” 

### Frontend

- React Router: [client/src/main.tsx](../client/src/main.tsx)
- Główne widoki: [client/src/App.tsx](../client/src/App.tsx), [client/src/pages/ItineraryPage.tsx](../client/src/pages/ItineraryPage.tsx), [client/src/pages/SettingsPage.tsx](../client/src/pages/SettingsPage.tsx)
- API layer: [client/src/services/api.ts](../client/src/services/api.ts)

### Backend

- Express entry: [server/src/index.ts](../server/src/index.ts)
- Walidacja: [server/src/middleware/validation.ts](../server/src/middleware/validation.ts)
- Routes: `server/src/routes/*`
- Kontrolery: `server/src/controllers/*`
- Serwisy: [server/src/services/journeyService.ts](../server/src/services/journeyService.ts) (total), `currencyService.ts`
- Storage: Postgres ([server/src/config/db.ts](../server/src/config/db.ts)) albo JSON fallback ([server/src/config/jsonStore.ts](../server/src/config/jsonStore.ts))

---

## Najważniejsze „historie problem → fix”

## 1) Problem: total kosztów nie odświeżał się bez refresh

### Rozwiązanie (koncept)

- Backend ma być “single source of truth” dla sum.
- Frontend po CRUD robi GET po świeżą podróż i renderuje nowe total.

Gdzie w kodzie

- Backend liczenie: [server/src/services/journeyService.ts](../server/src/services/journeyService.ts)
- Frontend odświeżanie danych po mutacjach: [client/src/App.tsx](../client/src/App.tsx)

Fragment do pokazania (backend)

```ts
const total = sumStops + sumTrans + sumAttr;
await query('UPDATE journeys SET total_estimated_cost = $1 WHERE id = $2', [total, journeyId]);
```

Dlaczego tak:

- Ucina masę edge-case’ów (różne waluty, rounding, rozjechany stan UI).

---

## 2) Problem: `datetime-local` wysyła format bez sekund → backend walidował jako błąd

### Rozwiązanie

- Walidacja Zod toleruje `YYYY-MM-DDTHH:MM` i dopisuje `:00`.

Gdzie

- [server/src/schemas/transport.schema.ts](../server/src/schemas/transport.schema.ts)

Fragment

```ts
if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) {
  return `${val}:00`;
}
```

---

## 3) Problem: backend potrafił “paść” przy emitowaniu eventów socketów

### Rozwiązanie

- Socket.IO usunięte w runtime (MVP), a w UI zostawiony no-op, żeby TS się kompilował.

Gdzie

- Front no-op: [client/src/services/socket.ts](../client/src/services/socket.ts)

Fragment

```ts
emit(_event: string, ..._args: any[]): void {
  // no-op
}
```

Dlaczego tak:

- Bezpiecznie: nie rozwala buildów i nie generuje błędów WS na demo.

---

## 4) Fallback storage: DB może nie działać, a app i tak wstaje

### Gdzie

- [server/src/config/db.ts](../server/src/config/db.ts)
- [server/src/config/jsonStore.ts](../server/src/config/jsonStore.ts)

Jak o tym opowiedzieć

- “Na zajęciach nie zawsze mamy Postgresa. Ten projekt umie działać też na JSON plikach, więc demo jest niezawodne.”

---

## Pliki “fullstack glue” (co pokazać w kolejności)

1) [README.md](../README.md) — jak odpalić.
2) [server/src/index.ts](../server/src/index.ts) — entrypoint, routes, dummy user.
3) [server/src/routes/journeys.ts](../server/src/routes/journeys.ts) — endpoint + walidacja.
4) [server/src/middleware/validation.ts](../server/src/middleware/validation.ts) — co dostaje frontend w błędzie.
5) [client/src/services/api.ts](../client/src/services/api.ts) — fetch wrapper.
6) [client/src/App.tsx](../client/src/App.tsx) — UI CRUD.

---

## Roadmapa (następne zajęcia): logowanie/rejestracja + rozwój ustawień

## A) Logowanie i rejestracja — minimalny plan (MVP+)

### Backend

- Dodać `POST /api/auth/login` i `POST /api/auth/register`.
- Wykorzystać istniejące schemy: [server/src/schemas/auth.schema.ts](../server/src/schemas/auth.schema.ts).
- Dodać JWT + middleware `auth`:
  - request bez tokena → 401,
  - request z tokenem → `req.user`.
- Wywalić dummy user z [server/src/index.ts](../server/src/index.ts).

### Frontend

- Dodać `/login` i `/register`.
- Po loginie zapisać `accessToken` do localStorage (API już to wspiera w nagłówkach).
- Dodać ochronę tras (np. itinerary i tworzenie podróży tylko po loginie).

## B) Rozwinięcie Settings

- Theme “System” (wykrywanie `prefers-color-scheme`).
- Domyślna waluta użytkownika (frontend i backend totaly).
- Język (i18n).
- Sekcja konto: logout, zmiana hasła (po wdrożeniu auth).
- Opcjonalnie: zapisywanie ustawień w DB (endpoint `users/me/settings`).

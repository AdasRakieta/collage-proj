# Journey Planner — Prezentacja (Tomasz / Frontend)

## Cel

- Pokazać, że frontend to: routing, główna strona CRUD, itinerary planner (mapa + kolejność atrakcji), ustawienia (dark mode).
- Podkreślić decyzje MVP: brak logowania (public routes), brak załączników/share UI, po operacjach zawsze „refresh z backendu”.

## Demo flow (co klikamy)

1. Lista podróży → wybór podróży.
2. Dodanie stopu i pokazanie go na mapie.
3. Dodanie transportu z `datetime-local`.
4. Dodanie atrakcji + geokodowanie adresu.
5. Wejście w itinerary: `/journey/:id/itinerary`, sortowanie/priorytety.
6. Wejście w settings: `/settings`, zmiana theme.

## Kolejność omawiania plików

1) [client/src/main.tsx](../client/src/main.tsx) — routing
2) [client/src/contexts/ThemeContext.tsx](../client/src/contexts/ThemeContext.tsx) + [client/src/index.css](../client/src/index.css) — dark mode
3) [client/src/services/api.ts](../client/src/services/api.ts) — komunikacja z backendem
4) [client/src/App.tsx](../client/src/App.tsx) — główny CRUD UI
5) [client/src/pages/ItineraryPage.tsx](../client/src/pages/ItineraryPage.tsx) — planner
6) [client/src/pages/SettingsPage.tsx](../client/src/pages/SettingsPage.tsx) — ustawienia
7) Komponenty UI: toast/confirm/map

---

## 1) Routing: client/src/main.tsx

### Co robi

- Definiuje publiczne ścieżki (MVP bez auth).

Fragment do pokazania

```tsx
<Routes>
  <Route path="/" element={<App />} />
  <Route path="/journey/:id/itinerary" element={<ItineraryPage />} />
  <Route path="/settings" element={<SettingsPage />} />
  <Route path="*" element={<App />} />
</Routes>
```

Dlaczego tak:

- Na zajęciach demo jest szybkie: brak “blokad” i przekierowań.

---

## 2) Dark mode: ThemeContext + Tailwind

### ThemeContext — client/src/contexts/ThemeContext.tsx

Co pokazujemy:

- trzymanie `theme` w localStorage,
- dodawanie/ściąganie klasy `dark` na `<html>`.

Fragment

```tsx
if (theme === 'dark') {
  root.classList.add('dark');
} else {
  root.classList.remove('dark');
}
localStorage.setItem('theme', theme);
```

### Tailwind v4 variant — client/src/index.css

W prezentacji: pokaż, że klasy typu `dark:bg[...]` działają dzięki klasie `.dark` na root.

---

## 3) Warstwa API: client/src/services/api.ts

### Co robi

- Wszystkie fetch-e do backendu w jednym miejscu.
- Przygotowanie pod auth: token w localStorage (`accessToken`) jest już obsługiwany.

Fragment do pokazania

```ts
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};
```

Dlaczego tak:

- Jedno miejsce na zmianę, gdy dojdzie logowanie.

---

## 4) Główna aplikacja: client/src/App.tsx

To największy plik – na zajęciach nie omawiamy „wszystkiego”, tylko 3–4 rzeczy, które pokazują architekturę.

### A) Formatowanie dat (zgodne z inputami HTML)

Fragment (szukaj: `formatDateTimeForInput`)

```ts
const pad = (n: number) => String(n).padStart(2, '0');
return `${year}-${month}-${day}T${hours}:${minutes}`;
```

Dlaczego tak:

- `datetime-local` oczekuje formatu bez strefy czasowej.

### B) Refresh po mutacjach (żeby total kosztów był zawsze aktualny)

W prezentacji: pokaż, że po create/update/delete nie liczymy wszystkiego lokalnie, tylko pobieramy “fresh” podróż.

### C) UX: toasty i confirm

- Komponenty: [client/src/components/Toast.tsx](../client/src/components/Toast.tsx), [client/src/components/ConfirmDialog.tsx](../client/src/components/ConfirmDialog.tsx)
- Hook: [client/src/hooks/useConfirm.ts](../client/src/hooks/useConfirm.ts)

Dlaczego tak:

- UI wygląda “produkcyjnie” mimo MVP.

---

## 5) Itinerary planner: client/src/pages/ItineraryPage.tsx

### Co robi

- Organizuje atrakcje (priorytety, sortowanie), ma mapę i geokodowanie.

Fragment do pokazania: „heurystyka optymalizacji”

```ts
const optimizeRoute = (attractions: Attraction[], startLat?: number, startLon?: number): Attraction[] => {
  // nearest neighbor (TSP approximation)
}
```

Fragment do pokazania: geokodowanie (wspiera adres → lat/lon)

- Serwis: [client/src/services/geocoding.ts](../client/src/services/geocoding.ts)

```ts
const url = `https://nominatim.openstreetmap.org/search?...`;
return { latitude: parseFloat(result.lat), longitude: parseFloat(result.lon) };
```

### Socket.IO (MVP)

- W kodzie jest import `socketService`, ale to no-op.
- Plik: [client/src/services/socket.ts](../client/src/services/socket.ts)

Dlaczego tak:

- Po usunięciu socketów z backendu chcieliśmy utrzymać kompilację i nie rozbijać całej strony itinerary.

---

## 6) Settings: client/src/pages/SettingsPage.tsx

### Co robi

- UI do wyboru theme (light/dark).

Fragment do pokazania

```tsx
<button onClick={() => setTheme('dark')}>...</button>
```

Dlaczego tak:

- Prosty, działający feature w MVP + ładny do pokazania.

---

## Spis plików frontend (krótko)

### client/src (root)

- [client/src/main.tsx](../client/src/main.tsx) — routing.
- [client/src/App.tsx](../client/src/App.tsx) — główna strona CRUD.
- [client/src/index.css](../client/src/index.css) — style + dark mode warianty.

### pages

- [client/src/pages/ItineraryPage.tsx](../client/src/pages/ItineraryPage.tsx) — planowanie dnia/atrakcji.
- [client/src/pages/SettingsPage.tsx](../client/src/pages/SettingsPage.tsx) — ustawienia theme.

### contexts

- [client/src/contexts/ThemeContext.tsx](../client/src/contexts/ThemeContext.tsx) — theme + localStorage.

### services

- [client/src/services/api.ts](../client/src/services/api.ts) — fetch wrapper dla CRUD.
- [client/src/services/currencyApi.ts](../client/src/services/currencyApi.ts) — kursy walut.
- [client/src/services/geocoding.ts](../client/src/services/geocoding.ts) — Nominatim geocode.
- [client/src/services/socket.ts](../client/src/services/socket.ts) — no-op (po usunięciu Socket.IO).

### components

- [client/src/components/JourneyMap.tsx](../client/src/components/JourneyMap.tsx) — mapa Leaflet.
- [client/src/components/JourneyMapWrapper.tsx](../client/src/components/JourneyMapWrapper.tsx) — opakowanie mapy.
- [client/src/components/Toast.tsx](../client/src/components/Toast.tsx) i [client/src/components/ToastContainer.tsx](../client/src/components/ToastContainer.tsx) — powiadomienia.
- [client/src/components/ConfirmDialog.tsx](../client/src/components/ConfirmDialog.tsx) — potwierdzenia.
- [client/src/components/PaymentCheckbox.tsx](../client/src/components/PaymentCheckbox.tsx) — status płatności.

### hooks

- [client/src/hooks/useToast.ts](../client/src/hooks/useToast.ts) — helper do toast.
- [client/src/hooks/useConfirm.ts](../client/src/hooks/useConfirm.ts) — confirm modal.

### utils

- [client/src/utils/date.ts](../client/src/utils/date.ts) — parsowanie/format YMD.
- [client/src/utils/date.test.ts](../client/src/utils/date.test.ts) — testy date utils.
- [client/src/utils/paymentCalculations.ts](../client/src/utils/paymentCalculations.ts) — pomocnicze kalkulacje.
- [client/src/utils/attractionTags.ts](../client/src/utils/attractionTags.ts) — tagi + kolory.

### types

- [client/src/types/journey.ts](../client/src/types/journey.ts) — typy Journey/Stop/Transport/Attraction.
- [client/src/types/auth.ts](../client/src/types/auth.ts) — typy auth (pod przyszłe logowanie).

---

## Kolejne kroki (roadmapa) — login/rejestracja + rozwój ustawień

### Login/Rejestracja (Frontend)

1. Dodać strony: `client/src/pages/LoginPage.tsx` i `client/src/pages/RegisterPage.tsx`.
2. Dodać routing w [client/src/main.tsx](../client/src/main.tsx): `/login`, `/register`.
3. Dodać serwis `client/src/services/authApi.ts` (login/register/refresh token).
4. Po loginie: zapisać `accessToken` do localStorage i włączyć ochronę tras (np. wrapper `RequireAuth`).

### Settings (Frontend)

- Rozszerzyć [client/src/pages/SettingsPage.tsx](../client/src/pages/SettingsPage.tsx) o:
  - „System theme” (auto wykrywanie),
  - język (i18n),
  - domyślną walutę,
  - ustawienia mapy (np. domyślny zoom),
  - sekcję konta (logout, zmiana hasła — po wdrożeniu auth).

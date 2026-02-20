# Journey Planner — Prezentacja Szymon (Fullstack / Integracja)

> **Czas prezentacji:** ok. 5–7 minut  
> **Temat:** Architektura integracji F↔B, geocoding, custom DatePicker, stabilizacja, dokumentacja

---

## Co robiłem w projekcie

Byłem odpowiedzialny za **klejenie backendu z frontendem** — architekturę integracyjną, rozwiązywanie problemów cross-layer, geocoding, stabilizację i dokumentację:

| Obszar | Pliki |
|--------|-------|
| Analiza wymagań & stack decyzje | Architecture docs, copilot-instructions.md |
| Geocoding atrakcji (adres → mapa) | `client/src/services/geocoding.ts` |
| Custom DatePicker (bez natywnego) | `client/src/components/DateInput.tsx` |
| Serwis kosztów podróży (totals) | `server/src/services/journeyService.ts` (razem z Iwoną) |
| Socket.IO stub (real-time ready) | `client/src/services/socket.ts` |
| Fix: datetime walidacja Zod | `server/src/schemas/transport.schema.ts` |
| Integracja end-to-end | Wszystkie flows F↔B |
| Dokumentacja | `Dokumentacja/`, `README.md` |
| Utils | `client/src/utils/date.ts`, `attractionTags.ts`, `paymentCalculations.ts` |

---

## Co zrobiłem — szczegóły

### 1. Architektura na start — analiza i wybór stacku

Przed rozpoczęciem kodowania przeprowadziłem analizę wymagań:
- Porównanie ORM (Sequelize vs raw SQL) → raw SQL z Postgresem dla kontroli
- Zdecydowałem o **JSON fallback** — demo-ready bez konfiguracji DB
- Wybrałem Leaflet + OpenStreetMap zamiast Google Maps (zero licencji)
- Zaproponowałem port 5001 dla backendu (nie 5000 — konflikt ze SmartHome na Pi)

### 2. Geocoding atrakcji (`geocoding.ts`)

```ts
// Adres → współrzędne (Nominatim/OSM), bez płatnego Google API
export async function geocodeAddress(address: string): Promise<{lat, lng} | null>
```

- Użytkownik wpisuje ulicę, miasto → marker pojawia się na mapie automatycznie
- Reverse geocoding: kliknięcie mapy → wypełnienie pola adresu
- Obsługa błędów rate-limitu Nominatim (retry z opóźnieniem)

### 3. Custom DatePicker (`DateInput.tsx`)

Problem: natywny `<input type="date">` wygląda różnie w każdej przeglądarce i nie pasuje do iOS designu.

Rozwiązanie: opakowałem `react-datepicker` w `DateInput` który:
- Wygląda w stylu iOS (ciemny, zaokrąglone rogi, Tailwind)
- Obsługuje format `YYYY-MM-DD` (API-friendly)
- Działa spójnie na Chrome/Safari/Firefox
- Użyty w schedulu, modalu edycji atrakcji, transporte, stopie

### 4. Serwis kosztów podróży (`journeyService.ts`, razem z Iwoną)

Problem: total kosztów w UI nie odświeżał się po każdej zmianie.

Rozwiązanie architektoniczne: **backend = single source of truth**

```ts
// Po każdej mutacji (add/edit/delete stop/transport/attraction):
const total = sumStops + sumTransports + sumAttractions;
await query('UPDATE journeys SET total_estimated_cost = $1 WHERE id = $2', [total, id]);
// Frontend pobiera świeżą podróż → zawsze poprawne sumy
```

To eliminowało klasę błędów: rozbieżne stany UI, problemy z zaokrąglaniem walut.

### 5. Fix datetime walidacja (`transport.schema.ts`)

Problem: `<input type="datetime-local">` wysyła `2025-06-15T14:30` (bez sekund) → Zod odrzucał jako błąd ISO.

Fix:
```ts
z.string().transform(val => {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return `${val}:00`;
  return val;
})
```

Bez tego **żaden transport nie mógł być zapisany** — krytyczny bug integracyjny.

### 6. Socket.IO stub (`socket.ts`)

Real-time kolaboracja jest w roadmapie. Zamiast wyłączać Socket.IO kompletnie:
- Stub serwisu który eksportuje identyczne API jak prawdziwy socket
- Frontend używa `socketService.emit()` / `socketService.on()` — kod gotowy
- Gdy backend Socket.IO zostanie włączony → zero zmian w frontendzie

### 7. Utility helpers (`date.ts`, `attractionTags.ts`, `paymentCalculations.ts`)

- `date.ts` — `parseYMDToDate()`, `toYMD()`, `formatYMDForDisplay()` — obsługa timezone shift bez bibliotek
- `attractionTags.ts` — centralna konfiguracja tagów i priorytetów z kolorami (używana w UI i na mapie)
- `paymentCalculations.ts` — logika śledzenia płatności (kto zapłacił co, summary per osoba)

---

## Integracja end-to-end — demo flow który proponuję

```
1. Utwórz podróż (POST /journeys)
2. Dodaj stop klikając w mapę → geocoding adresu → marker pojawia się
3. Dodaj atrakcję z adresem → marker kolorowy wg priorytetu
4. Dodaj transport z datetime-local → Zod fix przepuszcza
5. Zobacz total koszt → przeliczony automatycznie przez journeyService
6. Zaproś użytkownika → e-mail z tokenem → rejestracja → akceptacja
```

To jeden przebieg który pokazuje wszystkie warstwy stacku.

---

## Trudności, które rozwiązałem

1. **Circular dependency** między kontrolerami a serwisy — reorganizacja importów
2. **Nominatim rate-limit** (1 req/s) — dodałem throttle i informację UX
3. **React strict mode double mount** — socket stub inicjalizował się dwa razy → guard `initialized` flag
4. **Timezone off-by-one** — odkryłem że `new Date('2025-06-15')` daje `2025-06-14 22:00 CEST` → `parseYMDToDate` jako fix

---

## Na co zwrócić uwagę w kodzie

- `client/src/utils/date.ts` — dlaczego NIE używamy `new Date(dateString)` dla dat bez czasu
- `client/src/utils/attractionTags.ts` — jeden plik konfiguracji, używany wszędzie (mapa, lista, modal)
- `server/src/services/journeyService.ts` — centralne przeliczanie sum kosztów
- `client/src/services/geocoding.ts` — integracja z Nominatim OSM bez Google Maps API

---

## Dokumentacja którą stworzyłem

- `README.md` — setup instrukcje dla wszystkich trybów (Docker, local DB, osobne terminale)
- `Dokumentacja/` — wykres Gantta, analiza biznesowa, pliki prezentacyjne
- `copilot-instructions.md` — konwencje i reguły projektu (stack, porty, patterns)
- `server/data/example/` — przykładowe dane JSON do demo bez bazy

# Journey Planner — Pliki do prezentacji (podział na osoby)

## Ogólny opis projektu (dla przewodniczącego grupy)

### Stan na dziś (MVP)

- Działa CRUD: podróże → przystanki → transporty → atrakcje + planowanie itinerary.
- Aplikacja buduje się poprawnie (`npm run build:all`).
- MVP decyzje: brak logowania (public routes), brak real-time socketów w runtime, nacisk na stabilność i czytelne błędy walidacji.

### Jak uruchomić na zajęciach (najprościej)

- Start całości: `npm run client:dev oraz npm run server:dev w drugim terminalu`.
- Frontend: `http://localhost:5173` (Vite).
- Backend: `http://localhost:5001`.
- Healthcheck: `GET http://localhost:5001/api/health`.

### Technologie (stack)

- Frontend: React + TypeScript + Vite + Tailwind CSS + Leaflet.
- Backend: Node.js + Express + TypeScript + Zod.
- Storage: PostgreSQL (gdy dostępny) lub JSON fallback (gdy DB niedostępna).

### Najważniejsze paczki (co warto wymienić)

- Root [package.json](../package.json)
  - `typescript`
- Frontend [client/package.json](../client/package.json)
  - `react`, `react-router-dom`
  - `tailwindcss`
  - `leaflet`, `react-leaflet`
  - `axios`
- Backend [server/package.json](../server/package.json)
  - `express`, `cors`, `dotenv`
  - `zod` (walidacja)
  - `pg`, `sequelize` (DB)

### Najbliższe plany (kolejny etap)

- Logowanie i rejestracja:
  - Backend: `POST /api/auth/register`, `POST /api/auth/login`, JWT + middleware auth.
  - Frontend: strony `/login`, `/register`, ochrona tras (np. itinerary tylko po zalogowaniu).
- Rozwinięcie ustawień:
  - theme “system”, język (i18n), domyślna waluta użytkownika, ustawienia mapy.
  - Docelowo zapis ustawień na backendzie: `GET/PUT /api/users/me/settings`.

---

## Wykres Gaussa zespołu

Plik do pokazania: [scripts/team_gaussian.html](../scripts/team_gaussian.html)

### Co przedstawia

- Trzy krzywe rozkładu normalnego (Gaussa) opisujące „profil pracy” każdej osoby.
- Oś X: poziom umiejętności / wydajności (0–100%).
- Oś Y: gęstość prawdopodobieństwa (jak często trafia się dany poziom).

### Jak to wytłumaczyć prosto

- Każda krzywa ma średnią $\mu$ i odchylenie standardowe $\sigma$.
- $\mu$ przesuwa krzywą w prawo/lewo (typowy poziom).
- $\sigma$ odpowiada za „szerokość” krzywej:
  - mniejsze $\sigma$ → bardziej przewidywalna praca (węższa krzywa, wyższy szczyt),
  - większe $\sigma$ → większa zmienność / elastyczność (szersza krzywa).

Wzór (opcjonalnie na zajęciach):

$$
f(x)=\frac{1}{\sigma\sqrt{2\pi}}\,\exp\left(-\frac{(x-\mu)^2}{2\sigma^2}\right)
$$

### Parametry w pliku

- Iwona (Backend): $\mu=70$, $\sigma=15$ — najwyższa średnia.
- Tomasz (Frontend): $\mu=65$, $\sigma=12$ — stabilna, przewidywalna krzywa.
- Szymon (Fullstack): $\mu=60$, $\sigma=18$ — najszerszy rozkład (największa zmienność / szeroki zakres zadań integracyjnych).

### Jak to spiąć z podziałem ról

- Backend: większa „głębokość” w API/DB i logice.
- Frontend: większy nacisk na UX, mapy, spójność UI.
- Fullstack: łączenie modułów, uruchomienia, build, stabilizacja i dokumentacja.

## Iwona (Backend)

- [Dokumentacja/PREZENTACJA_IWONA_BACKEND.md](PREZENTACJA_IWONA_BACKEND.md)

## Tomasz (Frontend)

- [Dokumentacja/PREZENTACJA_TOMASZ_FRONTEND.md](PREZENTACJA_TOMASZ_FRONTEND.md)

## Szymon (Fullstack)

- [Dokumentacja/PREZENTACJA_SZYMON_FULLSTACK.md](PREZENTACJA_SZYMON_FULLSTACK.md)

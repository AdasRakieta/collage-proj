# Journey Planner — Prezentacja Tomasz (Frontend)

> **Czas prezentacji:** ok. 5–7 minut  
> **Temat:** Jak zbudowany jest frontend — React, Tailwind, Leaflet, iOS design, UX

---

## Co robiłem w projekcie

Odpowiadam za **całą warstwę interfejsu użytkownika**:

| Obszar | Pliki |
|--------|-------|
| Routing & entry point | `client/src/main.tsx` |
| Główny widok aplikacji (CRUD) | `client/src/App.tsx` |
| System motywów (dark/light) | `client/src/contexts/ThemeContext.tsx` |
| Mapa interaktywna | `client/src/components/JourneyMap.tsx`, `JourneyMapWrapper.tsx` |
| Widok harmonogramu | `client/src/pages/ItineraryPage.tsx` |
| Ustawienia użytkownika | `client/src/pages/SettingsPage.tsx` |
| Strony auth | `client/src/pages/LoginPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordPage.tsx` |
| Komponenty pomocnicze | `Toast.tsx`, `ConfirmDialog.tsx`, `ImportMapModal.tsx`, `ManageSharesModal.tsx` |
| Tailwind config | `client/tailwind.config.js` |

---

## Co zrobiłem — szczegóły

### 1. iOS-inspired design system (`tailwind.config.js` + `index.css`)
- Rozszerzone kolory Apple: `apple-dark-bg-*`, `apple-dark-text-*`, `apple-dark-accent-*`
- Utility klasy: `gh-btn-primary`, `gh-btn-secondary`, `gh-input`, `gh-select`, `gh-card`
- Dark mode przez Tailwind class strategy (`darkMode: 'class'`) — zmiana drzewa CSS na żądanie

```css
/* Index.css — przykład globalne gh-klasy */
.gh-btn-primary {
  @apply bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors;
}
```

### 2. Kontekst motywu (`ThemeContext.tsx`)
- `useTheme()` hook dostępny w całej aplikacji
- Klasa `dark` na `<html>` przełącza przez `classList.toggle`
- Preferencja zapisywana w `localStorage` i przywracana przy starcie

### 3. Główny CRUD UI (`App.tsx`)
- Zarządzanie stanem podróży, przystanków, transportów, atrakcji
- Wszystkie formularze (Create/Edit) jako modale z walidacją po stronie klienta
- Auto-fill z Booking.com/Ryanair/Wizz Air/LOT przez scraper API
- Paginacja + wyszukiwanie tekstowe listy podróży
- Drag-and-drop dla porządku elementów
- Przeliczanie walut integrowane w UI (z globalnymi kursami)

### 4. Interaktywna mapa Leaflet (`JourneyMap.tsx`)
- Markery per stop z tooltipem (nazwa-miasto)
- Oznaczenie kliknięcia → modal dodania przystanku z reverse geocodingiem
- Markery atrakcji kolorowane według:
  - **priorytetu** (must-see=czerwony, high=pomarańczowy, medium=żółty, low=zielony, skip=szary)
  - **tagu** (landmark, nature, airport, food…)
- `FlyToCenter` — animowane przesunięcie mapy do wybranego stopu
- Lazy loading przez `JourneyMapWrapper` (React.lazy) — mapa nie blokuje ładowania UI

### 5. Widok harmonogramu (`ItineraryPage.tsx`)
- Zakładki: **Schedule** (per-dzień), **Map View**, **List View**
- Drag-and-drop atrakcji między dniami (even-day granularity)
- Priorytety atrakcji: must-see → high → medium → low → skip z kolorami
- Custom DatePicker (bez natywnego kalendarza przeglądarki)
- Tryb edycji atrakcji z selektorem priorytetu, tagami, geocodingiem adresu
- Optymalizacja kolejności odwiedzin przez odległości Haversine

### 6. Strony autentykacji
- `LoginPage` — logowanie email/hasło + przycisk Google OAuth
- `RegisterPage` — rejestracja z tokenem zaproszenia
- `ForgotPasswordPage` — reset hasła (kod SMS-style)
- `ProtectedRoute` — HOC przekierowujący niezalogowanych do `/login`

### 7. Komponenty UX
- **Toast** — systemowe notifikacje (success/error/warning) z auto-hide
- **ConfirmDialog** — potwierdzenie destruktywnych akcji (usunięcie podróży)
- **ManageSharesModal** — zarządzanie dostępem (dodaj zaproszenie, zmień rolę, usuń)
- **ImportMapModal** — import trasy z zewnętrznego formatu

---

## Fragment do pokazania na demo

**Dark mode switch + live preview:**

```tsx
// ThemeContext.tsx
const toggleTheme = () => {
  const newTheme = theme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  document.documentElement.classList.toggle('dark', newTheme === 'dark');
  localStorage.setItem('theme', newTheme);
};
```

Klikamy toggle w ustawieniach → cała aplikacja zmienia się natychmiast bez przeładowania.

---

## Trudności, które rozwiązałem

1. **Mapa Leaflet z SSR/Vite** — konflikt window/document przy lazy load → `JourneyMapWrapper` z `React.lazy` i `Suspense`
2. **Timezone shift** — daty z API wracały przesunięte o strefę → `parseYMDToDate()` z lokalnym parsowaniem zamiast `new Date()`
3. **App.tsx (5000+ linii)** — monolit wymagał starannego zarządzania stanem; planowany refaktor na osobne hooki i komponenty po MVP

---

## Na co zwrócić uwagę w kodzie

- `client/src/contexts/ThemeContext.tsx` — prosty, elegancki pattern kontekstu
- `client/src/components/JourneyMap.tsx` — kolorowanie markerów według priorytetu (`PRIORITY_COLORS`)
- `client/src/pages/ItineraryPage.tsx` — złożona logika DnD + widok per-dzień
- `client/tailwind.config.js` — rozszerzony design system z Apple-inspired tokenami

# Journey Planner – Dokumentacja Projektu

## 1. Opis Projektu

Journey Planner to nowoczesna aplikacja webowa do planowania podróży, umożliwiająca użytkownikom:

- Tworzenie tras z przystankami (miasta, noclegi, atrakcje)
- Zarządzanie transportem (loty, pociągi, busy, samochody)
- Interaktywne mapy (dodawanie miast przez kliknięcie)
- Automatyczne kalkulacje kosztów
- iOS-inspired UI (czysty, minimalistyczny design)

Projekt jest w pełni wykonalny przez 3-osobowy zespół w ciągu 6 miesięcy.

---

## 2. Technologie

### Stack Technologiczny

**Frontend:**

- Framework JavaScript/TypeScript (React, Vue lub Angular)
- Narzędzie do budowania (Vite, Webpack)
- Framework CSS (Tailwind CSS, Bootstrap lub Material UI)
- Biblioteka map (Leaflet, Mapbox lub Google Maps)

**Backend:**

- Node.js z frameworkiem (Express, NestJS)
- Język: TypeScript lub JavaScript
- ORM/Query Builder (Sequelize, TypeORM, Prisma)
- RESTful API lub GraphQL

**Baza Danych:**

- PostgreSQL lub MySQL
- Struktura: tabele dla podróży, przystanków, atrakcji, transportów

**Dodatkowe narzędzia:**

- Git (kontrola wersji)
- Docker (opcjonalnie, do konteneryzacji)
- Narzędzia testowe (Jest, Mocha, Cypress)

---

## 3. Harmonogram Realizacji (6 miesięcy, 3 osoby)

### Miesiąc 1: Analiza i Projektowanie

- Analiza wymagań funkcjonalnych i niefunkcjonalnych
- Projektowanie architektury systemu
- Projekt struktury bazy danych
- Prototypy interfejsu użytkownika (wireframes)
- Podział zadań w zespole

### Miesiąc 2-3: Rozwój Backend

- Konfiguracja środowiska deweloperskiego
- Implementacja modeli danych (podróże, przystanki, atrakcje, transport)
- Tworzenie API RESTful (endpointy CRUD)
- Logika biznesowa (kalkulacja kosztów, walidacja danych)
- Testy jednostkowe backendu

### Miesiąc 2-4: Rozwój Frontend

- Konfiguracja projektu frontendowego
- Implementacja routingu i nawigacji
- Tworzenie komponentów UI (formularze, listy, karty)
- Integracja biblioteki map
- Obsługa stanów (loading, error handling)
- Responsywny design (mobile-first)

### Miesiąc 4-5: Integracja i Testowanie

- Połączenie frontendu z backendem
- Testy integracyjne
- Testy end-to-end
- Poprawki błędów i optymalizacja wydajności
- Code review i refaktoryzacja

### Miesiąc 6: Finalizacja

- Dokumentacja techniczna
- Dokumentacja użytkownika
- Przygotowanie prezentacji demo
- Ostateczne testy akceptacyjne

---

## 4. Podział Zadań w Zespole

**Backend Developer:**

- Projektowanie i implementacja API
- Tworzenie modeli danych i struktur bazodanowych
- Implementacja logiki biznesowej
- Testy jednostkowe i integracyjne backendu

**Frontend Developer:**

- Projektowanie interfejsu użytkownika
- Implementacja komponentów i widoków
- Integracja z API backendu
- Implementacja map interaktywnych
- Responsywność i optymalizacja UI/UX

**Fullstack Developer / Integrator:**

- Koordynacja pracy między frontendem a backendem
- Testy end-to-end
- Integracja zewnętrznych API (mapy, geolokalizacja)
- Dokumentacja projektu

*Uwaga: Role mogą być elastyczne - członkowie zespołu mogą rotować zadania w zależności od potrzeb projektu.*

---

## 5. Uzasadnienie Wykonalności

**Dlaczego projekt jest realny w 6 miesięcy?**

1. **Jasno zdefiniowany zakres funkcjonalności** - aplikacja ma konkretne, ograniczone cele (planowanie podróży, mapy, koszty)
2. **Dostępność gotowych technologii** - wykorzystanie sprawdzonych frameworków i bibliotek znacznie przyspiesza rozwój
3. **Podział na niezależne moduły** - backend i frontend mogą być rozwijane równolegle
4. **Minimalne MVP (Minimum Viable Product)** - skupienie na podstawowych funkcjach, z możliwością rozbudowy w przyszłości
5. **3-osobowy zespół** - wystarczająca liczba osób do równoległej pracy nad różnymi aspektami projektu
6. **Wykorzystanie istniejących rozwiązań** - API map (Google Maps, OpenStreetMap), gotowe komponenty UI, ORM dla bazy danych

---

## 6. Przykładowe Ekrany i Funkcje

- Interaktywna mapa z dodawaniem miast
- Zarządzanie noclegami i transportem (linki do Booking, rezerwacje)
- Planowanie atrakcji z kosztami i czasem
- Automatyczne sumowanie kosztów
- Responsive, iOS-style UI

---

## 7. Podsumowanie

Projekt Journey Planner stanowi realistyczny cel do osiągnięcia przez 3-osobowy zespół w ciągu 6 miesięcy. Aplikacja wykorzystuje sprawdzone technologie webowe, ma jasno zdefiniowany zakres funkcjonalności i może być rozwijana iteracyjnie.

Kluczowe elementy sukcesu:

- Dobry podział pracy między członków zespołu
- Wykorzystanie nowoczesnych frameworków i bibliotek
- Skupienie na funkcjonalnościach core (MVP)
- Regularne testy i code review
- Elastyczność w doborze konkretnych technologii

Projekt może służyć jako praktyczna implementacja wiedzy z zakresu: inżynierii oprogramowania, baz danych, programowania webowego i zarządzania projektem.

---

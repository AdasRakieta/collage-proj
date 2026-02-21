# Journey Planner — Pełna wypowiedź o projekcie

> **Stan na:** luty 2026 · Faza 2 implementacji
> Projekt realizowany przez 3-osobowy zespół studencki w ramach zajęć projektowych.

---

## Wstęp — czym jest Journey Planner

Journey Planner to aplikacja webowa do kompleksowego planowania podróży. Pozwala użytkownikowi
stworzyć strukturę podróży złożoną z przystanków — czyli miast, w których się zatrzymujemy —
transportów między nimi oraz atrakcji w każdym mieście. Do każdego przystanku można przypisać
nocleg z ceną i linkiem do rezerwacji, a aplikacja automatycznie sumuje wszystkie koszty
i przelicza je na wybraną przez użytkownika walutę.

Projekt powstał z myślą o realnym, codziennym zastosowaniu: planowaniu backpackerskich tras,
wyjazdów grupowych i długich podróży, gdzie liczba lotów, autobusów i noclegów jest zbyt duża,
by ogarnąć to w arkuszu kalkulacyjnym.

---

## Architektura systemu

Aplikacja jest podzielona na trzy warstwy, które komunikują się ze sobą przez sieć.

### Frontend — `client/`

Napisany w **React 18** z **TypeScript** i **Vite** jako narzędziem budującym. Stylowanie
opiera się na **Tailwind CSS** w stylu inspirowanym iOS — czyste karty, zaokrąglone
narożniki, neutralna paleta kolorów. Mapy obsługuje **Leaflet** z providerem
OpenStreetMap — bez żadnych kluczy API i bez kosztów.

Routing jest zrealizowany przez `react-router-dom` v6 z trasami chronionymi
(`ProtectedRoute`), które wymagają zalogowania. Ścieżki publiczne to logowanie,
rejestracja, reset hasła i akceptacja zaproszenia przez token z e-maila.

Cały stan aplikacji jest zarządzany lokalnie w głównym komponencie `App.tsx`
z hakami `useState` i `useEffect`. Komunikacja z backendem odbywa się przez
serwis `api.ts` oparty na natywnym `fetch` z nagłówkami autoryzacji JWT.

### Backend — `server/`

Serwer zbudowany na **Node.js** + **Express** z **TypeScript**. Nasłuchuje na porcie 5001.
Walidacja wszystkich danych wejściowych odbywa się przez bibliotekę **Zod** — schematy
definiują dokładnie, które pola są wymagane, jakie mają typy i zakresy. Odpowiedź
walidatora zawiera zawsze czytelne komunikaty błędów, które frontend wyświetla
użytkownikowi.

Serwer wystawia RESTful API zgrupowane w routes:

- `/api/journeys` — podróże
- `/api/stops` — przystanki / miasta
- `/api/transports` — transporty
- `/api/attractions` — atrakcje
- `/api/auth` — logowanie, rejestracja, odświeżanie tokenów
- `/api/user` — ustawienia profilu
- `/api/admin` — panel administracyjny
- `/api/currency` — kursy walut
- `/api/proxy` — proxy dla zewnętrznych zasobów (np. podgląd linków)

### Warstwa danych

Przechowywanie danych jest **dwutrybowe**. Gdy PostgreSQL jest dostępny, serwer używa go
poprzez bibliotekę `pg` z pisanymi ręcznie zapytaniami SQL. Gdy baza jest niedostępna
(np. lokalne uruchomienie bez Dockera), automatycznie włącza się **JSON fallback**
zaimplementowany w `jsonStore.ts` — dane są przechowywane w plikach JSON w katalogu
`server/data/`. Przełącznik to zmienna `DB_AVAILABLE` ustawiana przy starcie serwera.

Taki projekt umożliwia pracę i testowanie bez potrzeby stawiania bazy danych, co
znacznie ułatwiło współpracę w zespole.

### Real-time — Socket.IO

Aplikacja obsługuje pracę wielu użytkowników nad tą samą podróżą w czasie
rzeczywistym. Serwer emituje zdarzenia Socket.IO dla każdej operacji:
`journey:updated`, `stop:created`, `stop:deleted`, `attraction:created`,
`attraction:deleted`, `transport:created`, `transport:deleted`.

Frontend nasłuchuje tych zdarzeń w `App.tsx` oraz w `ItineraryPage.tsx` i aktualizuje
stan bez przeładowania strony. Dzięki temu jeśli jeden użytkownik doda atrakcję,
drugi widzi ją natychmiast.

---

## Schemat bazy danych

Struktura jest hierarchiczna i odpowiada logice planowania podróży:

```
users
└── journeys          (podróż: tytuł, daty, waluta, suma kosztów)
    ├── stops         (przystanek: miasto, kraj, noclegi, koordynaty)
    │   └── attractions (atrakcja: nazwa, opis, koszt, czas, tagi, adres)
    └── transports    (transport: typ, skąd, dokąd, daty, cena, link)
```

Tabela `journey_shares` realizuje system udostępniania: właściciel podróży może
zaprosić innych użytkowników przez e-mail, przyznając im rolę `viewer` (tylko
odczyt) lub `editor` (pełne uprawnienia). Zaproszenie zawiera jednorazowy token
JWT wysyłany e-mailem.

---

## Funkcjonalności — co jest zaimplementowane

### Zarządzanie podróżami

Użytkownik może tworzyć, edytować i usuwać podróże. Każda podróż ma tytuł, opis,
daty graniczne i walutę bazową. Lista podróży obsługuje paginację i wyszukiwanie
pełnotekstowe po stronie backendu. Suma kosztów jest przeliczana automatycznie
przez endpoint `POST /api/journeys/:id/calculate-cost`, który sumuje ceny noclegów,
transportów i atrakcji.

### Przystanki i mapa

Przystanki to serce aplikacji — każde miasto, w którym się zatrzymujemy. Przy
dodaniu przystanku można wpisać adres, a geokoder (Nominatim / OpenStreetMap) automatycznie
uzupełnia koordynaty geograficzne. Mapa Leaflet wyświetla wszystkie przystanki
jako markery połączone linią trasy. Można też kliknąć bezpośrednio na mapę, żeby
dodać nowy przystanek.

Każdy przystanek może mieć przypisany nocleg — nazwę hotelu lub apartamentu,
link do Booking.com lub Airbnb oraz cenę za cały pobyt.

### Transporty

Obsługiwane typy transportu: samolot, pociąg, autobus, samochód, inne. Każdy
transport ma miejsca wylotu i przyjazdu, daty i godziny (pole `datetime-local`),
cenę oraz opcjonalny link do biletu lub rezerwacji. Suma kosztów transportów
wchodzi do całkowitego kosztu podróży.

### Atrakcje i Itinerary Planner

Atrakcje są przypisane do przystanków. Każda ma nazwę, opis, szacowany koszt,
czas trwania, priorytet (1–5) i tagi tematyczne — kultura, jedzenie, natura,
sport itd.

Widok `/journey/:id/itinerary` to dedykowany planer dzienny: atrakcje można
przeciągać i upuszczać (drag & drop), grupować po dniach i wyświetlać je
na mini-mapie.

### System uwierzytelniania

Aplikacja ma pełny przepływ autoryzacji:

- Rejestracja z walidacją hasła po stronie backendu
- Logowanie zwracające parę tokenów: `accessToken` (JWT, 15 min) +
  `refreshToken` (JWT, 7 dni przechowywany w HTTP-only cookie)
- Automatyczne odświeżanie tokenu przy każdym żądaniu API
- Reset hasła przez e-mail z tokenem jednorazowym
- Strona ustawień profilu z możliwością zmiany hasła i nazwy

Bezpieczeństwo: serwer waliduje silność secretów JWT przy starcie i odmawia
uruchomienia, jeśli znajdzie domyślne wartości — zapobiega to przypadkowemu
deployowi z niezabezpieczonymi kluczami.

### Udostępnianie podróży

Właściciel podróży może wejść w panel udostępniania i zaprosić innych użytkowników
przez e-mail. Backend wysyła wiadomość HTML z linkiem zawierającym token.
Po kliknięciu token jest weryfikowany, a użytkownik zostaje dodany do tabeli
`journey_shares` z odpowiednią rolą. Jeśli zaproszony nie ma konta, link
przekierowuje najpierw na stronę rejestracji z parametrem `redirect`.

### Przeliczanie walut

Serwis `currencyService.ts` pobiera kursy z zewnętrznego API NBP / ECB
i cache'uje je lokalnie. Frontend przy wyświetlaniu kosztów podróży zawsze
przelicza kwoty ze źródłowej waluty (np. EUR) do waluty bazowej podróży (np. PLN),
używając aktualnych kursów.

### Panel administratora

Trasa `/api/admin` pozwala administratorowi przeglądać listę użytkowników,
zarządzać e-mailami i podglądać podglądy wysłanych wiadomości (`emailPreviewController.ts`).
Dostęp jest zabezpieczony middlewarem sprawdzającym rolę `admin` w tokenie JWT.

### Dark mode

Kontekst `ThemeContext.tsx` przechowuje preferencje motywu (jasny/ciemny).
Ustawienie jest zapisywane w `localStorage` i stosowane globalnie przez klasę CSS
na elemencie `<html>`.

---

## Deployment

Aplikacja jest przygotowana do uruchomienia na **Raspberry Pi** z **Nginx** jako
reverse proxy. Backend nasłuchuje na porcie 5001 (nigdy 5000 — zarezerwowany dla
istniejącej aplikacji SmartHome na tym samym serwerze). Nginx routuje:

- `/journey/` → Journey Planner (port 5001)
- `/smarthome/` → aplikacja SmartHome (port 5000)

Skrypt `deploy.sh` automatyzuje cały proces. Konfiguracja środowiskowa jest
podzielona na `.env` (git-ignored) i `stack.env` dla Portainera.

Aplikacja działa również w **Docker Compose** — `docker-compose.yml` definiuje
serwis PostgreSQL gotowy do lokalnego testowania.

---

## Stan projektu — co działa, co jest w trakcie

### Zaimplementowane i działające

- Pełny CRUD: podróże, przystanki, transporty, atrakcje
- System uwierzytelniania (JWT, refresh tokeny, reset hasła)
- Mapa interaktywna z geokodowaniem
- Itinerary planner z drag & drop
- Real-time sync przez Socket.IO
- Udostępnianie podróży z zaproszeniami e-mail
- Przeliczanie walut z cache'owaniem kursów
- Dark mode
- Paginacja i wyszukiwanie listy podróży
- Panel administratora
- JSON fallback gdy baza danych jest niedostępna
- Zabezpieczenia: walidacja Zod, JWT fail-fast, helmet, CORS

### Elementy do dopracowania / roadmapa

- Testy jednostkowe i integracyjne (napisany jeden plik testowy `date.test.ts`)
- Eksport podróży do PDF
- Import planu z zewnętrznych źródeł (plik JSON)
- Powiadomienia push / e-mailowe o zmianach w udostępnionej podróży
- Widok współpracy — kto aktualnie edytuje (kursory innych użytkowników)
- Aplikacja mobilna (PWA lub React Native)

---

## Podsumowanie techniczne

Journey Planner to projekt, który przeszedł od prostego CRUD-a (Faza 1 MVP)
do pełnoprawnej, wieloużytkownikowej aplikacji z autoryzacją, real-timem i systemem
udostępniania (Faza 2). Każda decyzja architektoniczna była podyktowana dwoma
priorytetami: możliwością uruchomienia na małym sprzęcie (Raspberry Pi) i czytelną
struktura kodu, którą może rozumieć cały 3-osobowy zespół.

Stack jest celowo "klasyczny" — React, Express, PostgreSQL — bez nadmiarowych
abstrakcji, co oznacza że kod jest łatwy do debugowania i rozszerzania. Jedynym
niestandardowym elementem jest dwutrybow** zapis (DB + JSON fallback), który w
praktyce bardzo ułatwił równoległą pracę w zespole

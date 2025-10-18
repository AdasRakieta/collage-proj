# Pomysły na projekt - Szymon

## Pomysł 1: Aplikacja do zarządzania zadaniami zespołowymi z integracją kalendarza

### Opis projektu
Aplikacja webowa umożliwiająca zespołom projektowym efektywne zarządzanie zadaniami, przypisywanie odpowiedzialności, śledzenie postępów i integrację z kalendarzem. System pozwala na tworzenie projektów, dodawanie zadań z terminami, przypisywanie członków zespołu oraz wizualizację obciążenia pracą.

### Problem, który rozwiązuje
- Brak centralnego miejsca do zarządzania zadaniami w małych zespołach
- Trudności w śledzeniu, kto jest odpowiedzialny za jakie zadanie
- Problemy z harmonogramowaniem pracy i unikaniem konfliktów terminów
- Brak przejrzystości w postępach projektu dla całego zespołu

### Zalety
- **Łatwość użycia**: Intuicyjny interfejs dostosowany do potrzeb małych zespołów
- **Integracja**: Synchronizacja z popularnymi kalendarzami (Google Calendar, Outlook)
- **Wizualizacja**: Wykresy Gantta i tablice Kanban do śledzenia postępów
- **Notyfikacje**: Automatyczne przypomnienia o zbliżających się terminach
- **Dostępność**: Aplikacja webowa dostępna z dowolnego urządzenia
- **Skalowalność**: Możliwość rozwoju o dodatkowe funkcje w przyszłości

### Wady
- **Konkurencja**: Istnieją już rozbudowane rozwiązania (Trello, Asana, Jira)
- **Czas realizacji**: Może wymagać więcej czasu na implementację wszystkich funkcji
- **Bezpieczeństwo**: Konieczność zapewnienia odpowiedniej ochrony danych użytkowników
- **Utrzymanie**: Wymaga ciągłego wsparcia technicznego po wdrożeniu

### Narzędzia w użyciu
- **Frontend**: React.js + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express.js
- **Baza danych**: PostgreSQL lub MongoDB
- **Uwierzytelnianie**: JWT + OAuth 2.0
- **API kalendarzy**: Google Calendar API, Microsoft Graph API
- **Hosting**: Vercel (frontend) + Railway/Heroku (backend)
- **Version Control**: Git + GitHub
- **Testowanie**: Jest + React Testing Library

### Adekwatność do zrealizowania
Projekt jest wykonalny w zespole 3-5 osób w ciągu semestru. Można zacząć od MVP z podstawowymi funkcjami (tworzenie zadań, przypisywanie użytkowników, proste terminy) i stopniowo dodawać zaawansowane funkcje. Technologie są dobrze udokumentowane i mają silne wsparcie społeczności.

---

## Pomysł 2: System do monitorowania wydatków grupowych i rozliczania kosztów

### Opis projektu
Aplikacja mobilna/webowa do śledzenia wspólnych wydatków w grupach (współlokatorzy, podróże, projekty grupowe). System automatycznie oblicza, kto komu ile jest winien, uwzględniając różne metody podziału kosztów (równo, proporcjonalnie, według udziału).

### Problem, który rozwiązuje
- Trudności w rozliczaniu wspólnych wydatków w grupach
- Kłopotliwe ręczne obliczanie, kto komu ile jest winien
- Brak transparentności w wydatkach grupowych
- Konflikty wynikające z niejasnych rozliczeń finansowych
- Czasochłonne prowadzenie notatek o wydatkach na kartce/w Excelu

### Zalety
- **Praktyczność**: Rozwiązuje realny problem spotykany codziennie
- **Prostota**: Łatwe dodawanie wydatków i natychmiastowe rozliczenia
- **Automatyzacja**: System sam oblicza optymalne transfery między użytkownikami
- **Wielowalutowość**: Wsparcie dla różnych walut z automatyczną konwersją
- **Historia**: Pełna historia transakcji i możliwość eksportu do PDF/CSV
- **Powiadomienia**: Przypomnienia o zaległych płatnościach
- **Offline**: Możliwość pracy w trybie offline z synchronizacją

### Wady
- **Konkurencja**: Istnieją aplikacje jak Splitwise, Settle Up
- **Zaufanie**: Wymaga, aby wszyscy członkowie grupy korzystali z aplikacji
- **Prywatność**: Wrażliwe dane finansowe wymagają szczególnej ochrony
- **Motywacja użytkowników**: Potrzeba przekonać wszystkich do korzystania z systemu

### Narzędzia w użyciu
- **Frontend**: React Native (aplikacja mobilna) lub Vue.js (wersja webowa)
- **Backend**: Python + FastAPI lub Django REST Framework
- **Baza danych**: PostgreSQL z migracyjnymi schematami
- **Uwierzytelnianie**: Firebase Authentication lub Auth0
- **API wymiany walut**: ExchangeRate-API lub Fixer.io
- **Hosting**: AWS Amplify lub Firebase Hosting
- **Płatności (opcjonalnie)**: Stripe API do bezpośrednich rozliczeń
- **Version Control**: Git + GitHub
- **Testowanie**: Pytest (backend) + Jest (frontend)

### Adekwatność do zrealizowania
Projekt jest bardzo dobrze dopasowany do możliwości zespołu studenckiego. Można zacząć od prostej wersji web z podstawowymi funkcjami (dodawanie wydatków, podział równy, proste rozliczenia) i rozwijać o zaawansowane algorytmy optymalizacji rozliczeń. MVP można zrealizować w 6-8 tygodni, a następnie iteracyjnie dodawać funkcje. Problem jest zrozumiały i dobrze zdefiniowany, co ułatwia planowanie i realizację.


---

## Pomysł 3: Aplikacja webowa do szczegółowego planowania podróży

### Opis projektu
Kompleksowa aplikacja webowa służąca do planowania i organizacji wszystkich aspektów podróży. System umożliwia zarządzanie transportem, zakwaterowaniem, atrakcjami turystycznymi oraz listami pakowania. Aplikacja zapewnia centralne miejsce do przechowywania wszystkich informacji związanych z podróżą, włączając rezerwacje, koszty, harmonogram i niezbędne dokumenty.

### Problem, który rozwiązuje
- Rozproszenie informacji o podróży w różnych miejscach (maile, notatki, zdjęcia)
- Brak przejrzystego widoku całkowitych kosztów podróży
- Trudności w zarządzaniu harmonogramem podczas planowania wieloetapowej podróży
- Zapominanie o ważnych rzeczach do spakowania
- Problemy z szybkim dostępem do informacji kontaktowych (hotele, linie lotnicze)
- Brak możliwości łatwego udostępniania planu podróży współtowarzyszom

### Funkcjonalności

#### 1. Zarządzanie komunikacją
- **Loty**: Numer lotu, linia lotnicza, lotnisko wylotu i przylotu, godziny, czas trwania, cena, klasa
- **Taxi/Transport naziemny**: Typ pojazdu, cena, lokalizacja odbioru/docelowa, godzina, przewoźnik
- **Pociągi/Autobusy**: Numer połączenia, stacje, rozkład jazdy, cena biletu, rezerwacja miejsca
- **Wynajem samochodów**: Firma, model, cena, lokalizacja odbioru/zwrotu, dane kontaktowe
- **Harmonogram podróży**: Wizualizacja wszystkich środków transportu na osi czasu

#### 2. Lista do pakowania
- Tworzenie personalizowanych list rzeczy do spakowania
- Gotowe szablony dla różnych typów podróży (plaża, góry, miasto, służbowa)
- Możliwość oznaczania spakowanych przedmiotów
- Kategoryzacja (ubrania, elektronika, dokumenty, higiena, leki)
- Przypomnienia o rzeczach, które trzeba spakować w ostatniej chwili

#### 3. Zarządzanie zakwaterowaniem
- **Informacje o hotelach**: Nazwa, adres, numer telefonu, email
- **Rezerwacje**: Data zameldowania i wymeldowania, numer rezerwacji
- **Szczegóły pokoju**: Typ pokoju, liczba osób, cena za noc, całkowity koszt
- **Dodatki**: Informacje o śniadaniu, parkingu, Wi-Fi, innych usługach
- **Dojazd**: Wskazówki dojazdu z lotniska/dworca, mapka lokalizacji

#### 4. Planowanie atrakcji i aktywności
- **Baza atrakcji**: Muzea, zabytki, restauracje, wydarzenia
- **Szczegóły**: Lokalizacja (adres, współrzędne GPS), godziny otwarcia, cena wstępu
- **Planowanie czasu**: Szacowany czas zwiedzania, priorytet (obowiązkowe/opcjonalne)
- **Rezerwacje**: Bilety wstępu, wycieczki z przewodnikiem, stoliki w restauracjach
- **Budżet**: Śledzenie planowanych i rzeczywistych wydatków na atrakcje
- **Mapa podróży**: Wizualizacja wszystkich lokalizacji na interaktywnej mapie

#### 5. Dodatkowe funkcje
- **Dashboard**: Przegląd całej podróży w jednym miejscu
- **Budżet podróży**: Automatyczne sumowanie wszystkich kosztów z podziałem na kategorie
- **Dokumenty**: Przechowywanie skanów paszportów, wiz, ubezpieczeń, potwierdzeń rezerwacji
- **Notatki**: Możliwość dodawania własnych uwag i wskazówek
- **Udostępnianie**: Możliwość współdzielenia planu podróży z innymi osobami
- **Eksport**: Generowanie PDF z kompletnym planem podróży
- **Tryb offline**: Dostęp do kluczowych informacji bez połączenia z internetem

### Zalety
- **Centralizacja**: Wszystkie informacje o podróży w jednym miejscu
- **Przejrzystość kosztów**: Automatyczne obliczanie całkowitego budżetu podróży
- **Wygoda**: Łatwy dostęp do wszystkich danych z dowolnego urządzenia
- **Organizacja**: Uporządkowany harmonogram i plan zwiedzania
- **Współpraca**: Możliwość wspólnego planowania podróży przez kilka osób
- **Praktyczność**: Gotowe szablony list pakowania oszczędzają czas
- **Dostępność offline**: Kluczowe informacje dostępne bez internetu
- **Intuicyjność**: Prosty, przyjazny interfejs użytkownika
- **Skalowalność**: Możliwość rozbudowy o API do rezerwacji, pogodę, kursy walut

### Wady
- **Konkurencja**: Istnieją już aplikacje jak TripIt, Google Trips, Roadtrippers
- **Ręczne wprowadzanie danych**: Większość informacji musi być dodana manualnie
- **Integracje**: Brak automatycznego importu rezerwacji z maili (w podstawowej wersji)
- **Zależność od urządzenia**: Wymaga smartfona lub komputera z dostępem do internetu
- **Początkowy nakład pracy**: Wprowadzenie wszystkich danych może być czasochłonne
- **Utrzymanie**: Wymaga aktualizacji baz danych atrakcji i miejsc

### Narzędzia w użyciu
#### Frontend
- **HTML5**: Struktura semantyczna aplikacji
- **CSS3** + **Tailwind CSS** lub **Bootstrap**: Responsywny design i stylizacja
- **JavaScript (ES6+)**: Logika interfejsu użytkownika i interakcje
- **React.js** lub **Vue.js**: Framework do budowy komponentowego UI
- **Leaflet.js** lub **Google Maps API**: Interaktywne mapy do wizualizacji lokalizacji

#### Backend
- **Python 3.x**: Główny język backendu
- **Flask** lub **Django**: Framework webowy do obsługi API i logiki biznesowej
- **SQLAlchemy**: ORM do komunikacji z bazą danych
- **Flask-RESTful** lub **Django REST Framework**: Tworzenie RESTful API

#### Baza danych
- **PostgreSQL**: Relacyjna baza danych do przechowywania danych podróży
- **Redis**: Cache do przyspieszenia działania aplikacji i sesji użytkowników

#### Uwierzytelnianie i bezpieczeństwo
- **JWT (JSON Web Tokens)**: Token-based authentication
- **Flask-Login** lub **Django AllAuth**: Zarządzanie sesjami użytkowników
- **Bcrypt**: Hashowanie haseł
- **HTTPS/SSL**: Szyfrowanie połączeń

#### Dodatkowe narzędzia
- **API walut**: ExchangeRate-API lub Fixer.io do konwersji walut
- **API pogody**: OpenWeatherMap do prognozy pogody
- **Chart.js** lub **D3.js**: Wizualizacja budżetu i statystyk
- **jsPDF**: Generowanie PDF z planem podróży
- **LocalStorage/IndexedDB**: Przechowywanie danych offline

#### Development & Deployment
- **Version Control**: Git + GitHub
- **Frontend Build**: Webpack lub Vite
- **Package Manager**: npm lub yarn (JS), pip (Python)
- **Testowanie**: Jest (frontend), Pytest (backend)
- **Linting**: ESLint (JS), Pylint/Flake8 (Python)
- **Hosting**: 
  - Frontend: Vercel, Netlify lub GitHub Pages
  - Backend: Heroku, Railway lub PythonAnywhere
  - Baza danych: ElephantSQL (PostgreSQL) lub Heroku Postgres

### Adekwatność do zrealizowania
Projekt jest **bardzo dobrze dopasowany** do realizacji przez zespół studencki w ciągu semestru:

**Plusy realizacji:**
- **Jasno zdefiniowany zakres**: Funkcjonalności są konkretne i dobrze określone
- **Modułowość**: Można realizować poszczególne moduły (transport, zakwaterowanie, atrakcje) niezależnie
- **Popularne technologie**: HTML, CSS, JavaScript i Python są dobrze znane i udokumentowane
- **Stopniowy rozwój**: Możliwość stworzenia MVP z podstawowymi funkcjami i rozbudowy w kolejnych iteracjach
- **Realny problem**: Projekt rozwiązuje rzeczywisty problem, co zwiększa motywację zespołu
- **Portfolio**: Końcowy produkt może być wartościowym elementem portfolio

**Plan realizacji (fazy):**
1. **Faza 1 (2-3 tygodnie)**: Setup projektu, podstawowy interfejs, system logowania
2. **Faza 2 (2-3 tygodnie)**: Moduł zakwaterowania i transportu
3. **Faza 3 (2-3 tygodnie)**: Moduł atrakcji i list pakowania
4. **Faza 4 (2 tygodnie)**: Dashboard, budżet, eksport do PDF
5. **Faza 5 (1-2 tygodnie)**: Testy, poprawki, dokumentacja

**Wymagany zespół**: 3-5 osób
- 2 osoby - frontend (HTML/CSS/JavaScript/React)
- 1-2 osoby - backend (Python/Flask/Django)
- 1 osoba - baza danych i integracje

Projekt pozwala na wykorzystanie zarówno technologii frontendowych (HTML, CSS, JS), jak i backendowych (Python), co czyni go idealnym do nauki full-stack development. Minimalna wersja (MVP) może być gotowa w 6-8 tygodni, co mieści się w terminie do 15.11.


# Pomysły na projekt - Szymon
## Pomysł 1: Aplikacja webowa do szczegółowego planowania podróży

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

**Wymagany zespół**: 
- 1 osoby - frontend (HTML/CSS/JavaScript/React/TypeScript)
- 1 osoby - backend (TypeScript)
- 1 osoba - baza danych i integracje

Projekt pozwala na wykorzystanie zarówno technologii frontendowych (HTML, CSS, JS), jak i backendowych (Python), co czyni go idealnym do nauki full-stack development. Minimalna wersja (MVP) może być gotowa w 6-8 tygodni, co mieści się w terminie do 


---


2. Pomysł na aplikację do Inwentaryzacji

Opis projektu

Koncepcja aplikacji do zarządzania zasobami magazynowymi, stworzonej z myślą o usprawnieniu ewidencjonowania produktów, kontroli stanów magazynowych i efektywnej pracy osób zajmujących się gospodarką magazynową.

Główne funkcjonalności

• Dodawanie produktówUmożliwienie wprowadzania nowych produktów z informacjami takimi jak nazwa, opis, kategoria oraz ilość.

• Przeglądanie stanu magazynowegoSzybka możliwość sprawdzania dostępności produktów oraz ich wyszukiwania według różnych kryteriów.

• Edytowanie i usuwanie produktówOpcja aktualizacji informacji o produktach oraz usuwania zbędnych pozycji.

• Historia zmianLogowanie operacji na produktach w celu monitorowania przepływu towaru.

• Możliwość rozbudowyOtwartość na dodawanie funkcjonalności, takich jak powiadomienia o niskim stanie magazynowym lub integracja z innymi systemami.


Proponowane technologie

Backend

• Node.jsPopularny środowisko uruchomieniowe dla JavaScript na serwerze. Szybkie, skalowalne, szeroko wspierane przez społeczność.

• Express.jsLekki framework dla Node.js, umożliwiający tworzenie API REST do obsługi operacji CRUD (Create, Read, Update, Delete).

• MongoDBNoSQL baza danych - elastyczna, dobrze nadaje się do przechowywania dokumentów produktów, łatwo skalowalna.

Frontend

• ReactNowoczesna biblioteka JavaScript do budowy interfejsów użytkownika. Umożliwia tworzenie dynamicznych i responsywnych aplikacji webowych.

• Material-UIBiblioteka komponentów UI oparta na designie Material Design od Google, przyspieszająca proces tworzenia estetycznego interfejsu.

Narzędzia dodatkowe

• Git & GitHubSystem kontroli wersji i platforma do współpracy zespołowej oraz hostowania kodu.

• DockerNarzędzie do konteneryzacji aplikacji, co ułatwia wdrażanie i testowanie w różnych środowiskach.

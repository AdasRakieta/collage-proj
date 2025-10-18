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

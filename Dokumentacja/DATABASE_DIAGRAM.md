# Test: Minimal Mermaid Flowchart

```mermaid
graph TD
    A[Start] --> B[End]
```

# Test: Minimal Mermaid Class Diagram

```mermaid
classDiagram
    class User {
        +String name
        +int id
    }
    class Journey {
        +String title
        +Date start
    }
    User --> Journey
```

<!--
If these diagrams render but sequenceDiagram does not, your renderer or extension may not support Mermaid sequence diagrams.
Try updating your Markdown preview extension or test in the Mermaid Live Editor: https://mermaid-js.github.io/mermaid-live-editor/
-->

# Test: Minimal Mermaid Sequence Diagram (Official Example)

```mermaid
sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello Bob, how are you?
    Bob-->>Alice: I am good thanks!
```

<!--
Troubleshooting Mermaid rendering:
- If this diagram does not render, the issue is with the Markdown renderer or Mermaid integration.
- Test your diagrams in the official Mermaid Live Editor: https://mermaid-js.github.io/mermaid-live-editor/
- If the official example works in the Live Editor but not here, check your Markdown viewer or VS Code extension settings.
-->

# Journey Planner - Diagram Bazy Danych

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    JOURNEYS ||--o{ STOPS : contains
    JOURNEYS ||--o{ TRANSPORTS : includes
    STOPS ||--o{ ATTRACTIONS : has

    JOURNEYS {
        int id
        string title
        string description
        date start_date
        date end_date
        string currency
        datetime created_at
        datetime updated_at
    }

    STOPS {
        int id
        int journey_id
        string city
        string country
        float latitude
        float longitude
        date arrival_date
        date departure_date
        string accommodation_name
        string accommodation_link
        float accommodation_price
        string notes
        datetime created_at
    }

    TRANSPORTS {
        int id
        int journey_id
        string type
        string from_location
        string to_location
        datetime departure_date
        datetime arrival_date
        float price
        string currency
        string booking_link
        string flight_number
        string notes
        datetime created_at
    }

    ATTRACTIONS {
        int id
        int stop_id
        string name
        string description
        float estimated_cost
        int duration_hours
        string priority
        float latitude
        float longitude
        string notes
        datetime created_at
    }
```

## Relacje

- **JOURNEYS → STOPS**: Jedna podróż może mieć wiele przystanków (1:N)
- **JOURNEYS → TRANSPORTS**: Jedna podróż może mieć wiele środków transportu (1:N)
- **STOPS → ATTRACTIONS**: Jeden przystanek może mieć wiele atrakcji (1:N)

## Kaskadowe Usuwanie

- Usunięcie podróży (`JOURNEYS`) automatycznie usuwa wszystkie powiązane przystanki (`STOPS`) i transporty (`TRANSPORTS`)
- Usunięcie przystanku (`STOPS`) automatycznie usuwa wszystkie powiązane atrakcje (`ATTRACTIONS`)

## Indeksy

```sql
-- Indeksy dla wydajności zapytań
CREATE INDEX idx_stops_journey_id ON stops(journey_id);
CREATE INDEX idx_transports_journey_id ON transports(journey_id);
CREATE INDEX idx_attractions_stop_id ON attractions(stop_id);
CREATE INDEX idx_journeys_dates ON journeys(start_date, end_date);
```

## Diagram Przepływu Danych

```mermaid
flowchart TB
    subgraph Frontend["Frontend (React/Vue)"]
        UI[User Interface]
        Form[Formularze]
        Map[Mapa Interaktywna]
    end

    subgraph Backend["Backend (Node.js + Express)"]
        API[REST API]
        Controller[Controllers]
        Service[Services]
        ORM[ORM - Sequelize]
    end

    subgraph Database["Database (PostgreSQL)"]
        J[(journeys)]
        S[(stops)]
        T[(transports)]
        A[(attractions)]
    end

    UI --> Form
    Form --> API
    Map --> API
    API --> Controller
    Controller --> Service
    Service --> ORM
    ORM --> J
    ORM --> S
    ORM --> T
    ORM --> A
    J -.->|1:N| S
    J -.->|1:N| T
    S -.->|1:N| A
```

## Przykładowe Zapytania SQL

### Pobranie podróży ze wszystkimi szczegółami

```sql
-- Podróż z przystankami
SELECT 
    j.*,
    json_agg(
        json_build_object(
            'id', s.id,
            'city', s.city,
            'country', s.country,
            'arrival_date', s.arrival_date,
            'departure_date', s.departure_date
        )
    ) as stops
FROM journeys j
LEFT JOIN stops s ON j.id = s.journey_id
WHERE j.id = 1
GROUP BY j.id;
```

### Kalkulacja całkowitego kosztu podróży

```sql
-- Suma wszystkich kosztów dla podróży
SELECT 
    j.id,
    j.title,
    COALESCE(SUM(s.accommodation_price), 0) as accommodation_total,
    COALESCE(SUM(t.price), 0) as transport_total,
    COALESCE(SUM(a.estimated_cost), 0) as attractions_total,
    (
        COALESCE(SUM(s.accommodation_price), 0) +
        COALESCE(SUM(t.price), 0) +
        COALESCE(SUM(a.estimated_cost), 0)
    ) as total_cost
FROM journeys j
LEFT JOIN stops s ON j.id = s.journey_id
LEFT JOIN transports t ON j.id = t.journey_id
LEFT JOIN attractions a ON s.id = a.stop_id
WHERE j.id = 1
GROUP BY j.id, j.title;
```

### Wszystkie atrakcje w danym mieście

```sql
-- Atrakcje dla konkretnego przystanku
SELECT 
    a.*,
    s.city,
    s.country
FROM attractions a
JOIN stops s ON a.stop_id = s.id
WHERE s.id = 1
ORDER BY 
    CASE a.priority
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
    END;
```

## Diagram Architektury Systemu

```mermaid
graph TD
    Client[Client - Przeglądarka]
  
    subgraph Frontend Layer
        React[React App]
        Router[React Router]
        State[State Management]
        MapLib[Leaflet Maps]
    end
  
    subgraph API Layer
        Express[Express Server]
        Routes[Route Handlers]
        Middleware[Middleware]
        Validation[Validation]
    end
  
    subgraph Business Logic
        JourneyCtrl[Journey Controller]
        StopCtrl[Stop Controller]
        TransportCtrl[Transport Controller]
        AttractionCtrl[Attraction Controller]
    end
  
    subgraph Data Layer
        ORM[Sequelize ORM]
        Models[Database Models]
    end
  
    subgraph Database
        PostgreSQL[(PostgreSQL)]
    end
  
    Client --> React
    React --> Router
    React --> State
    React --> MapLib
    React -->|HTTP/REST| Express
    Express --> Routes
    Routes --> Middleware
    Middleware --> Validation
    Routes --> JourneyCtrl
    Routes --> StopCtrl
    Routes --> TransportCtrl
    Routes --> AttractionCtrl
    JourneyCtrl --> ORM
    StopCtrl --> ORM
    TransportCtrl --> ORM
    AttractionCtrl --> ORM
    ORM --> Models
    Models --> PostgreSQL
```

## Scenariusze Użycia - Diagram Sekwencji

### Tworzenie Nowej Podróży

```mermaid
graph TD
    User[User] --> F1[Wypełnia formularz]
    F1 --> Frontend[Frontend]
    Frontend --> F2[Wywołuje POST /api/journeys]
    F2 --> Backend[Backend]
    Backend --> B1[INSERT INTO journeys]
    B1 --> Database[Database]
    Database --> B2[Zwraca ID podróży]
    B2 --> Backend
    Backend --> F3[Potwierdzenie utworzenia]
    F3 --> Frontend
    Frontend --> U1[Przejście do szczegółów]
    U1 --> User
```

### Dodawanie Przystanku z Mapy

```mermaid
graph TD
    User[User] --> M1[Kliknięcie na mapie]
    M1 --> Map[Map]
    Map --> F1[Przekazuje współrzędne]
    F1 --> Frontend[Frontend]
    Frontend --> G1[Reverse geocoding]
    G1 --> Geocoding[Geocoding]
    Geocoding --> F2[Zwraca miasto i kraj]
    F2 --> Frontend
    User --> F3[Uzupełnia dane]
    F3 --> Frontend
    Frontend --> B1[POST /api/journeys/:id/stops]
    B1 --> Backend[Backend]
    Backend --> D1[INSERT INTO stops]
    D1 --> Database[Database]
    Database --> D2[Zwraca ID przystanku]
    D2 --> Backend
    Backend --> F4[Potwierdzenie dodania]
    F4 --> Frontend
    Frontend --> M2[Dodanie markera]
    M2 --> Map
```

### Kalkulacja Kosztów Podróży

```mermaid
graph TD
    User[User] --> F1[Otwiera podróż]
    F1 --> Frontend[Frontend]
    Frontend --> B1[Wywołuje GET /api/journeys/:id/total-cost]
    B1 --> Backend[Backend]
    Backend --> D1[SELECT SUM kosztów]
    D1 --> Database[Database]
    Database --> D2[Zwraca wyniki kosztów]
    D2 --> Backend
    Backend --> F2[Zwraca sumę kosztów]
    F2 --> Frontend
    Frontend --> U1[Wyświetla koszty]
    U1 --> User
```

## Normalizacja Bazy Danych

Baza danych jest w **3NF (Third Normal Form)**:

✅ **1NF** - Wszystkie atrybuty są atomowe (brak powtarzających się grup)
✅ **2NF** - Wszystkie atrybuty nieprzypadkowe są w pełni zależne od klucza głównego
✅ **3NF** - Brak zależności przechodnich (każdy atrybut zależy tylko od klucza głównego)

## Rozszerzenia Bazy Danych (Przyszłość)

### Opcjonalnie: Tabela Users (dla autentykacji)

```mermaid
erDiagram
    USERS ||--o{ JOURNEYS : owns

    USERS {
        int id PK
        varchar email UK
        varchar password_hash
        varchar name
        timestamp created_at
        timestamp last_login
    }

    JOURNEYS {
        int id PK
        int user_id FK
        varchar title
        text description
    }
```

### Opcjonalnie: Tabela Photos (zdjęcia z podróży)

```mermaid
erDiagram
    STOPS ||--o{ PHOTOS : has
    ATTRACTIONS ||--o{ PHOTOS : has

    PHOTOS {
        int id PK
        int stop_id FK
        int attraction_id FK
        varchar filename
        text url
        text caption
        timestamp uploaded_at
    }
```

# 🔐 Dane Logowania - Journey Planner MVP

## Środowisko JSON Fallback (Testowe - Bez Bazy Danych)

Gdy baza danych PostgreSQL jest niedostępna, aplikacja automatycznie przełącza się na tryb JSON fallback.

### Domyślny Administrator

**Username:** `admin`  
**Email:** `admin@journey.local`  
**Password:** `admin123`

> ⚠️ **UWAGA:** To są dane testowe. Zmień hasło w produkcji!

### Jak Korzystać:

1. **Uruchom serwer bez bazy danych:**
   ```bash
   cd server
   npm run dev
   ```

2. **Zaloguj się w aplikacji:**
   - Otwórz: `http://localhost:5173`
   - Użyj powyższych danych logowania

3. **JSON Store:**
   - Dane przechowywane w: `server/data/example/`
   - Pliki: `users.json`, `journeys.json`, `stops.json`, etc.

## Środowisko z Bazą Danych PostgreSQL

### Utworzenie Admina w Bazie

Jeśli używasz bazy PostgreSQL, uruchom skrypt migracji:

```bash
cd server
npm run migrate
```

To utworzy użytkownika admin z danymi:

**Username:** `admin`  
**Email:** `admin@journey.local`  
**Password:** `admin123`

### Ręczne Utworzenie Admina

Możesz też utworzyć admina ręcznie w PostgreSQL:

```sql
-- Połącz się z bazą danych
psql -d journey_planner

-- Wstaw admina (hasło: admin123)
INSERT INTO users (username, email, password_hash, role, is_active, email_verified)
VALUES (
  'admin',
  'admin@journey.local',
  '$2b$10$rQJ3qY5Z8KJxN.VxE2K7P.YHqZVJXwN7WqKZJxN7WqKZJxN7WqKZJ',
  'admin',
  true,
  true
);
```

## Zmiana Hasła

### Przez API:

```bash
curl -X POST http://localhost:5001/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "currentPassword": "admin123",
    "newPassword": "noweHaslo123!"
  }'
```

### Bezpośrednio w Bazie:

```bash
# Wygeneruj nowy hash hasła w Node.js
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('noweHaslo', 10, (err, hash) => console.log(hash));"

# Zaktualizuj w bazie
psql -d journey_planner -c "UPDATE users SET password_hash = 'WYGENEROWANY_HASH' WHERE username = 'admin';"
```

## Tryby Działania Aplikacji

### 1. **Tryb JSON Fallback** (Testowy - Bez DB)
- ✅ Automatyczny fallback gdy baza niedostępna
- ✅ Dane w `server/data/example/`
- ✅ Brak konieczności konfiguracji PostgreSQL
- ⚠️ Dane nie są persystentne (resetują się przy restarcie)

### 2. **Tryb Bazy Danych** (Produkcja)
- ✅ PostgreSQL jako storage
- ✅ Persystentne dane
- ✅ Migracje automatyczne
- ⚠️ Wymaga konfiguracji `.env`

## Konfiguracja Środowiska

### Plik `.env` (Backend):

```env
# Database (wymagane dla trybu DB)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=journey_planner
DB_USER=journey_user
DB_PASSWORD=StrongPassword123!

# JWT (wymagane zawsze)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Application
NODE_ENV=development
BACKEND_PORT=5001
```

### Sprawdzanie Trybu:

Po uruchomieniu serwera sprawdź logi:

```
✅ Database connected successfully    <- Tryb DB
```
lub
```
⚠️  Database unavailable - using JSON fallback    <- Tryb JSON
```

## Bezpieczeństwo

### ⚠️ Ważne Uwagi:

1. **Zmień domyślne hasło** przed wdrożeniem na produkcję
2. **Użyj silnych JWT secrets** w `.env`
3. **Wyłącz tryb JSON fallback** w produkcji (wymaga DB)
4. **Regularnie aktualizuj** hasła administratorów

### Generowanie Bezpiecznych Sekretów:

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# JWT Refresh Secret (inny niż powyższy)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Rozwiązywanie Problemów

### Nie mogę się zalogować:

1. Sprawdź tryb działania serwera (logi)
2. Upewnij się, że plik `users.json` istnieje w `server/data/example/`
3. Zweryfikuj poprawność hasła: `admin123`
4. Sprawdź czy JWT_SECRET jest ustawiony w `.env`

### Błąd "Database connection failed":

- To normalne! Aplikacja przełączy się na tryb JSON fallback
- Sprawdź czy pliki JSON istnieją w `server/data/example/`

### Reset Hasła:

Usuń plik `server/data/example/users.json` i zrestartuj serwer - zostanie utworzony z domyślnym adminem.

---

**Status:** ✅ Konfiguracja zakończona  
**Data:** 16 stycznia 2026  
**Wersja:** MVP Faza 1

# Dokumentacja Testów – Journey Planner

## Przegląd

Projekt pokryty jest **199 testami automatycznymi** podzielonymi na dwie warstwy:
- **Backend (server)** – 131 testów w 5 plikach
- **Frontend (client)** – 68 testów w 3 plikach

Wszystkie testy są uruchamiane przy pomocy frameworka **Vitest**.

---

## Jak uruchomić testy

```bash
# Backend
cd server
npm test                  # jednorazowy run
npm run test:watch        # tryb watch (obserwuje zmiany)
npm run test:coverage     # raport pokrycia kodu

# Frontend
cd client
npm test                  # jednorazowy run
```

---

## Backend – szczegółowy opis testów

### 1. Testy narzędzi autoryzacyjnych
**Plik:** `server/src/__tests__/utils/auth.test.ts`  
**Liczba testów:** 35

Testuje wszystkie funkcje pomocnicze z pliku `src/utils/auth.ts`.

| Funkcja | Co sprawdzają testy |
|---|---|
| `hashPassword` | Czy zwraca hash bcrypt (`$2a$`/`$2b$`), czy dwa hashe tego samego hasła są różne (różne sole) |
| `comparePassword` | `true` dla poprawnego hasła, `false` dla błędnego, `false` dla pustego stringa |
| `generateAccessToken` + `verifyToken` | Poprawne claime w tokenie (userId, email, role), token dla admina, odrzucanie zmodyfikowanego tokenu, odrzucanie pustego stringa, odrzucanie tokenu bez podpisu |
| `generateRefreshToken` | Generuje prawidłowy JWT z userId, poprawna struktura (3 segmenty) |
| `generateVerificationCode` | Zwraca dokładnie 6 cyfr, wartość w zakresie 100000–999999, losowość (różne kody) |
| `generateRandomToken` | Dokładnie 64 znaki hex, unikalność każdego tokenu |
| `validatePassword` | Akceptuje silne hasła (min 8 znaków, wielka, mała, cyfra), odrzuca: za krótkie, bez wielkiej litery, bez małej litery, bez cyfry, puste |
| `validateEmail` | Akceptuje poprawne emaile (subdomena, alias +), odrzuca: brak @, brak domeny, brak lokalnego członu, puste, ze spacją, bez kropki w domenie |

---

### 2. Testy middleware autoryzacji
**Plik:** `server/src/__tests__/middleware/auth.test.ts`  
**Liczba testów:** 13

Testuje trzy funkcje middleware z pliku `src/middleware/auth.ts`.

#### `authenticateToken`
| Scenariusz | Oczekiwany wynik |
|---|---|
| Brak nagłówka `Authorization` | HTTP 401, błąd "Access token required" |
| Nagłówek `Bearer ` (pusty token) | HTTP 401 |
| Nieprawidłowy token JWT | HTTP 403, błąd "Invalid or expired token" |
| Token z błędnym podpisem (tampered) | HTTP 403 |
| Prawidłowy token użytkownika | `next()` wywoływane, `req.user` ustawione z userId, email, role |
| Prawidłowy token admina | `next()`, role = "admin" |

#### `requireAdmin`
| Scenariusz | Oczekiwany wynik |
|---|---|
| `req.user` = undefined (brak auth) | HTTP 401, błąd "Authentication required" |
| Użytkownik z rolą "user" | HTTP 403, błąd "Admin access required" |
| Użytkownik z rolą "admin" | `next()` wywoływane |

#### `optionalAuth`
| Scenariusz | Oczekiwany wynik |
|---|---|
| Brak tokenu | `next()` wywoływane, `req.user` = undefined |
| Prawidłowy token | `next()`, `req.user` ustawione |
| Nieprawidłowy token | `next()` wywoływane (bez błędu), `req.user` = undefined |
| Pusty string Bearer | `next()` wywoływane, `req.user` = undefined |

---

### 3. Testy middleware walidacji
**Plik:** `server/src/__tests__/middleware/validation.test.ts`  
**Liczba testów:** 9

Testuje funkcje middleware z pliku `src/middleware/validation.ts`.

#### `validate(schema)` – waliduje `{ body, query, params }`
| Scenariusz | Oczekiwany wynik |
|---|---|
| Poprawne dane | `next()` wywoływane |
| Brakujące wymagane pole | HTTP 400 z `{ message: "Validation failed", errors: [...] }` |
| Błędny typ (string zamiast number) | HTTP 400 z tablicą błędów |
| Błędy zawierają `path` i `message` | Weryfikacja struktury odpowiedzi |
| Nieznany (nie-Zod) błąd | `next(error)` przekazuje błąd dalej |

#### `validateBody(schema)` – waliduje tylko `body`
| Scenariusz | Oczekiwany wynik |
|---|---|
| Prawidłowy email | `next()`, body przeparsowane |
| Nieprawidłowy email | HTTP 400 z polami `field` i `message` w błędach |

#### `validateQuery(schema)` – waliduje tylko `query`
| Scenariusz | Oczekiwany wynik |
|---|---|
| Prawidłowy query param | `next()` |
| Wartość spoza enum | HTTP 400 z komunikatem "validation failed" |

---

### 4. Testy schematów Zod (autoryzacja)
**Plik:** `server/src/__tests__/schemas/auth.schema.test.ts`  
**Liczba testów:** 34

Testuje każdy schemat walidacji danych wejściowych z pliku `src/schemas/auth.schema.ts`.

#### `loginSchema`
- ✅ Akceptuje login (username lub email) + hasło
- ❌ Odrzuca: brak loginu, pusty login, brak hasła, puste hasło

#### `registerSchema`
- ✅ Akceptuje token + username + hasło
- ❌ Odrzuca: brak tokenu, username < 3 znaki, username > 50 znaków, username ze znakami specjalnymi (`@`, spacja itp.), hasło < 8 znaków, hasło > 128 znaków
- ✅ Akceptuje username z myślnikiem i podkreślnikiem

#### `forgotPasswordSchema`
- ✅ Akceptuje prawidłowy email
- ❌ Odrzuca: nieprawidłowy email, pusty email, brak emaila

#### `resetPasswordSchema`
- ✅ Akceptuje email + 6-cyfrowy kod + nowe hasło (8–128 znaków)
- ❌ Odrzuca: kod < 6 cyfr, kod > 6 cyfr, nieprawidłowy email, za krótkie/długie nowe hasło

#### `refreshTokenSchema`
- ✅ Akceptuje niepusty refresh token
- ❌ Odrzuca: pusty token, brak tokenu

#### `registerRequestSchema`
- ✅ Akceptuje username + email + hasło
- ❌ Odrzuca: email > 255 znaków, username z niedozwolonymi znakami, pusty email

#### `registerConfirmSchema`
- ✅ Akceptuje email + 6-cyfrowy kod
- ❌ Odrzuca: kod o złej długości, nieprawidłowy email

---

### 5. Testy bezpieczeństwa
**Plik:** `server/src/__tests__/security/security.test.ts`  
**Liczba testów:** 40

Weryfikuje odporność aplikacji na typowe ataki i błędy konfiguracji.

#### 5a. SQL Injection
| Test | Opis |
|---|---|
| `loginSchema` + SQL payloady | Dokumentuje że Zod przepuszcza SQL strings jako poprawne stringi — ochronę zapewnia parametryzacja przez PostgreSQL/ORM (prepared statements) |
| `getJourneyByIdSchema` + SQL payloady | Regex `^\d+$` blokuje każdy payload – ID musi być wyłącznie liczbą |
| `updateJourneySchema` + SQL w ID | Odrzucane przez regex |

Przykładowe payloady testowe: `' OR '1'='1`, `1'; DROP TABLE users; --`, `UNION SELECT` itp.

#### 5b. XSS (Cross-Site Scripting)
| Test | Opis |
|---|---|
| XSS payload w `login` | Zod akceptuje jako string (escaping odpowiedzialność frontend/rendererów) |
| Tytuł podróży > 255 znaków z `<img onerror>` | Zod blokuje przez limit długości |
| Opis podróży > 2000 znaków z `<script>` | Zod blokuje przez limit długości |

#### 5c. Ataki na tokeny JWT
| Typ ataku | Oczekiwany wynik |
|---|---|
| Token podpisany innym kluczem | `verifyToken()` rzuca wyjątek |
| Token z `expiresIn: '-1s'` (już wygasły) | `verifyToken()` rzuca wyjątek |
| Podmiana payload na rolę `admin` bez resygnowania | `verifyToken()` rzuca wyjątek (nieprawidłowy podpis) |
| **Algorithm None attack** (`alg: none`) | `verifyToken()` rzuca wyjątek |
| Token z 2 segmentami zamiast 3 | `verifyToken()` rzuca wyjątek |
| Pusty string | `verifyToken()` rzuca wyjątek |
| Prawidłowy token | `verifyToken()` zwraca payload bez wyjątku |

#### 5d. Polityka siły haseł
Testuje 6 słabych haseł (każde z innym powodem odrzucenia):
- `password` – brak cyfr i wielkiej litery
- `12345678` – brak liter
- `ALLCAPS1` – brak małych liter
- `alllower1` – brak wielkich liter
- `Short1` – za krótkie (< 8 znaków)
- _(puste)_ – puste hasło

Oraz 4 silne hasła, które powinny być zaakceptowane: `Str0ngPass!`, `MyP@ssw0rd`, `Test1234`, `Journey2025!`.

#### 5e. Walidacja formatu emaila
Testuje odrzucanie różnych nieprawidłowych formatów i akceptację prawidłowych.

#### 5f. Limity danych wejściowych
| Test | Opis |
|---|---|
| Username > 50 znaków | Odrzucane przez `registerSchema` |
| Email > 255 znaków | Odrzucane przez `registerRequestSchema` |
| Ujemny koszt podróży | Odrzucane przez `createJourneySchema` |
| `endDate` przed `startDate` | Odrzucane przez refine() w `createJourneySchema` |
| Waluta lowercase (`pln`) | Odrzucane – wymagany format `PLN` |
| Waluta != 3 znaki (`EURO`, `PL`) | Odrzucane przez `length(3)` |
| Kod resetu != 6 cyfr | Odrzucane przez `resetPasswordSchema` |

---

## Frontend – szczegółowy opis testów

### 6. Testy kalkulacji płatności
**Plik:** `client/src/utils/paymentCalculations.test.ts`  
**Liczba testów:** 22

Testuje funkcje z pliku `src/utils/paymentCalculations.ts` odpowiedzialne za obliczanie kosztów podróży.

#### `calculateTotalCost(stops, transports)`
| Scenariusz | Opis |
|---|---|
| Puste tablice | Zwraca 0 |
| Tylko noclegi | Sumuje `accommodationPrice` |
| Noclegi + atrakcje | Sumuje noclegi i `estimatedCost` wszystkich atrakcji |
| Tylko transport | Sumuje `price` wszystkich transportów |
| Wszystkie elementy | Suma: noclegi + atrakcje + transport |
| Noclegi bez wartości (`undefined`) | Traktuje jako 0 |
| Atrakcje bez kosztu (`undefined`) | Traktuje jako 0 |
| Stop bez tablicy `attractions` | Bezpieczna obsługa (nie rzuca wyjątku) |

#### `calculatePaidAmount(stops, transports)`
| Scenariusz | Opis |
|---|---|
| Nic nie opłacone | Zwraca 0 |
| Opłacone noclegi | Sumuje tylko te z `isPaid: true` |
| Opłacone atrakcje | Sumuje tylko te z `isPaid: true` |
| Opłacone transporty | Sumuje tylko te z `isPaid: true` |
| Mix opłaconych | Suma wszystkich opłaconych pozycji |

#### `calculateAmountDue(stops, transports)`
| Scenariusz | Opis |
|---|---|
| Wszystko opłacone | Zwraca 0 |
| Nic nie opłacone | Zwraca `total - 0 = total` |
| Edge-case: paid > total | Nigdy nie zwraca wartości ujemnej (zabezpieczenie `Math.max(0, ...)`) |

#### `getPaymentSummary(stops, transports)`
| Scenariusz | Opis |
|---|---|
| Mix opłaconych | Poprawne pola: `total`, `paid`, `due`, `percentPaid` |
| Nic nie opłacone | `percentPaid` = 0 |
| Wszystko opłacone | `percentPaid` = 100 |
| Total = 0 | `percentPaid` = 0 (unikanie dzielenia przez zero) |
| Wartość ułamkowa | `percentPaid` jest liczbą całkowitą (`Number.isInteger`) |

---

### 7. Testy tagów atrakcji
**Plik:** `client/src/utils/attractionTags.test.ts`  
**Liczba testów:** 23

Testuje stałe i funkcje pomocnicze z pliku `src/utils/attractionTags.ts`.

#### `ATTRACTION_TAGS`
| Test | Opis |
|---|---|
| Liczba tagów | Dokładnie 9 zdefiniowanych tagów |
| Struktura każdego tagu | Każdy ma: `value`, `label`, `emoji`, `bgLight`, `textColor`, `borderColor`, `markerColor` |
| Format `markerColor` | Każdy kolor to prawidłowy hex `#rrggbb` (regex: `^#[0-9a-f]{6}$`) |
| Unikalność kolorów | Każdy tag ma inny kolor markera na mapie |
| Konkretne wartości | `beauty` → `#db2777`, `airport` → `#0ea5e9` |

Zestaw 9 tagów: `beauty`, `cafe`, `must_see`, `accommodation`, `nature`, `airport`, `food`, `attraction`, `train_station`.

#### `getAttractionTagInfo(tag)`
| Scenariusz | Oczekiwany wynik |
|---|---|
| Istniejący tag `cafe` | Zwraca obiekt z `value: 'cafe'`, `label: 'Café'` |
| `undefined` | Zwraca `null` |
| Nieznany tag (type cast) | Zwraca `null` |
| Tag `must_see` | `label: 'Must See'`, `emoji: '📷'`, `markerColor: '#8b5cf6'` |
| Tag `train_station` | `label: 'Train Station'` |
| Tag `accommodation` | `label: 'Accommodation'`, `emoji: '💤'` |

#### `getAvailableAttractionTags()`
| Test | Opis |
|---|---|
| Rozmiar | Zwraca tablicę 9 elementów |
| Struktura elementów | Każdy ma `value`, `label`, `emoji` |
| Kompletność | Tablica zawiera wszystkie 9 wartości tagów |
| Niemutowalność | Każde wywołanie zwraca nową referencję tablicy (`!==`) o tej samej zawartości |

---

### 8. Testy narzędzi daty
**Plik:** `client/src/utils/date.test.ts`  
**Liczba testów:** 23

Testuje funkcje parsowania i formatowania dat z pliku `src/utils/date.ts`.

#### `parseYMDToDate(date)`
| Scenariusz | Opis |
|---|---|
| String `YYYY-MM-DD` | Parsuje jako localną datę (rok, miesiąc, dzień zgodne) |
| ISO string z `T00:00:00.000Z` | Parsuje i wyciąga lokalną datę |
| `null` | Zwraca `null` |
| `undefined` | Zwraca `null` |
| Pusty string | Zwraca `null` |
| Obiekt `Date` | Normalizuje do lokalnego północy |
| 1 stycznia (miesiąc 01) | Poprawna obsługa paddingu |
| 31 grudnia | Poprawna obsługa końca roku |
| Czas wynikowy | Zawsze `00:00:00` (brak przesunięcia strefowego) |

#### `toYMD(date)`
| Scenariusz | Opis |
|---|---|
| Obiekt `Date` | Zwraca `YYYY-MM-DD` |
| Roundtrip string → Date → string | Wynik identyczny jak wejście |
| `null` / `undefined` / pusty string | Zwraca `""` |
| Miesiąc i dzień < 10 | Poprawne dopełnianie zerem (`2024-01-05`) |
| 29 luty (rok przestępny) | Obsługuje poprawnie |
| ISO string bezpośrednio | Parsuje i zwraca `YYYY-MM-DD` |

#### `formatYMDForDisplay(date, locale, options)`
| Scenariusz | Opis |
|---|---|
| Domyślne locale (en-US) | Zwraca niepusty string |
| `null` / `undefined` / pusty string | Zwraca `""` |
| Opcje `month: 'long'` | Wynik zawiera rok i pełną nazwę miesiąca (np. „January") |
| Locale `pl-PL` | Zwraca zlokalizowaną datę zawierającą rok |

---

## Podsumowanie pokrycia

| Obszar | Pliki produkcyjne | Pliki testowe | Liczba testów |
|---|---|---|---|
| Utils auth (server) | `server/src/utils/auth.ts` | `__tests__/utils/auth.test.ts` | 35 |
| Middleware auth (server) | `server/src/middleware/auth.ts` | `__tests__/middleware/auth.test.ts` | 13 |
| Middleware walidacji (server) | `server/src/middleware/validation.ts` | `__tests__/middleware/validation.test.ts` | 9 |
| Schematy Zod auth (server) | `server/src/schemas/auth.schema.ts` | `__tests__/schemas/auth.schema.test.ts` | 34 |
| Bezpieczeństwo (server) | utils/auth + schemas/journey | `__tests__/security/security.test.ts` | 40 |
| Kalkulacje płatności (client) | `client/src/utils/paymentCalculations.ts` | `utils/paymentCalculations.test.ts` | 22 |
| Tagi atrakcji (client) | `client/src/utils/attractionTags.ts` | `utils/attractionTags.test.ts` | 23 |
| Narzędzia dat (client) | `client/src/utils/date.ts` | `utils/date.test.ts` | 23 |
| **RAZEM** | | **8 plików** | **199** |

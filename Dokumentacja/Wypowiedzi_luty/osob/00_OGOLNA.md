# Journey Planner — Wypowiedź ogólna (cały zespół)

## Co to jest Journey Planner?

Journey Planner to webowa aplikacja do **współpracy przy planowaniu podróży**. Zamiast trzymać plany w arkuszach kalkulacyjnych i wysyłać je Messengierem, użytkownicy:

- dodają **przystanki i noclegi** na interaktywnej mapie,
- planują **transporty** (lot, pociąg, bus, samochód) z linkami do rezerwacji,
- organizują **atrakcje** per miasto z priorytetami, tagami i szacowanym czasem,
- widzą **automatycznie wyliczony budżet** całej podróży z przelicznikiem walut,
- **zapraszają innych** użytkowników przez e-mail i wspólnie edytują plan.

---

## Skład zespołu i podział odpowiedzialności

| Osoba            | Rola                   | Zakres                                                              |
| ---------------- | ---------------------- | ------------------------------------------------------------------- |
| **Iwona**  | Backend                | Express API, PostgreSQL, Zod, auth JWT, email service, walidacja    |
| **Tomasz** | Frontend               | React UI, Tailwind iOS-design, mapa Leaflet, dark mode, settings    |
| **Szymon** | Fullstack / Integracja | Łączenie F+B, geocoding, DatePicker, Socket.IO stub, dokumentacja |

---

## Architektura — kilka zdań

```
[Przeglądarka]                    [Node.js / Express :5001]
  React + TypeScript   ──HTTP──▶   Routes → Middleware → Controller
  Tailwind CSS                      ↓ Zod walidacja
  Leaflet (OSM)                    Service layer
  react-datepicker                  ↓
                                  PostgreSQL  ◀ fallback ▶  JSON files
```

**Stack:** React 18 · TypeScript · Vite · Tailwind · Leaflet | Node.js · Express · Sequelize/raw SQL · Zod · Nodemailer | PostgreSQL

---

## Demo flow (co pokażemy na żywo)

1. **Logowanie** → strona główna z listą podróży.
2. **Nowa podróż** → dodanie przystanku kliknięciem w mapę → geocoding adresu.
3. **Transport** → lot z linkiem do biletu; auto-kalkulacja kosztu.
4. **Atrakcja** → priorytet, tag, koszt; widok Schedule z drag-and-drop.
5. **Udostępnianie** → zaproszenie przez e-mail, zmiana roli.
6. **Dark mode / ustawienia** → live preview zmiany motywu.

---

## Co wyróżnia projekt?

- **JSON fallback** — działa w trybie demo bez PostgreSQL (zero konfiguracji na zajęciach).
- **Auto-kalkulator** — każda mutacja danych odświeża sumy kosztów na backendzie.
- **iOS-inspired design** — dark mode, zaokrąglone karty, Lucide icons, płynne przejścia.
- **Pełna walidacja** — Zod na backendzie, TypeScript end-to-end eliminuje błędy integracyjne.
- **Zaproszenia e-mail** — pełny flow: token → mail → rejestracja → przyjęcie zaproszenia.

---

## Metryki projektu

| Metryka             | Wartość                                                    |
| ------------------- | ------------------------------------------------------------ |
| Linie kodu (client) | ~8 000                                                       |
| Linie kodu (server) | ~4 500                                                       |
| Endpointy API       | 40+                                                          |
| Główne widoki     | 6 (Home, Itinerary, Login, Register, Settings, AuthCallback) |
| Komponenty React    | 15+                                                          |
| Tygodnie pracy      | 10                                                           |

---

## Pytania, które mogą paść

**Q: Dlaczego nie React Native?**
A: Priorytetem było MVP z pełnym CRUD i kolaboracją — web jest wystarczający i szybszy w dostarczeniu. Architektura API jest gotowa na RN.

**Q: Jak skalować na więcej użytkowników?**
A: PostgreSQL + indeksy, Redis cache, Nginx load balancer. Raspberry Pi to deployment demonstracyjny.

**Q: Czy to działa offline?**
A: Nie — zaplanowane jako PWA w roadmapie, ale poza zakresem MVP.

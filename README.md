# german-weather

Eine abhängigkeitsfreie Web-App, die für jedes der 16 deutschen Bundesländer eine stündliche 24h-Wettervorschau anzeigt: **Temperatur**, **Bewölkung**, **Luftfeuchte** und **Regen** — jeweils mit farbigem Bewertungs-Badge.

## Features

- 16 Bundesländer als auf-/zuklappbare Panels (Accordion), Lazy Loading + Caching
- Stündliche Werte für den heutigen Tag (lokale Zeit, Europe/Berlin)
- Bewertungs-Badges (z.B. Kühl / Bewölkt / Schwül) mit Farbcodierung
- Regen-Spalte kombiniert Niederschlag (mm) und Wahrscheinlichkeit (%)
- Topbar mit „Alle aus-/einklappen", „Aktualisieren" und Zeitstempel
- Sticky Tabellenkopf, Hover-Highlight, Toast-Benachrichtigungen
- Links zur regionalen DWD-Vorhersage je Bundesland

## Datenquelle

Live-Daten von der [Bright Sky API](https://brightsky.dev) (basiert auf dem [Deutschen Wetterdienst](https://www.dwd.de)). Kein API-Key nötig.

## Test

```bash
node test-urls.mjs
```

Prüft, dass alle hinterlegten DWD-Vorhersage-Links erreichbar sind (HTTP 200).

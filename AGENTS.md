# Spec: Wetter-App nach Bundesland (Vanilla HTML/CSS/JS)

## Ziel

Eine einzelne, abhängigkeitsfreie Web-App (kein Framework, kein Build-Step), die für jedes der 16 deutschen Bundesländer eine stündliche 24h-Vorschau als Tabelle anzeigt: **Temperatur**, **Bewölkung**, **Luftfeuchte** und **Regen (Niederschlag inkl. Wahrscheinlichkeit)**. Jeder Messwert wird zusätzlich mit einem farbigen Bewertungs-Badge (z.B. "Kalt", "Bewölkt", "Schwül") eingeordnet.

## Tech-Constraints

- Vanilla HTML/CSS/JS, keine externen JS-Libraries, keine CSS-Frameworks. Reines `fetch` + DOM-APIs.
- Keine Build-Tools, kein npm. Muss direkt im Browser per Doppelklick auf `index.html` funktionieren.
- Datendatei (`bundeslaender.js`) wird als normales `<script>` vor `script.js` geladen und stellt die Variable `bundeslaender` global bereit (kein ES-Module-`import` im Browser, da das bei `file://` durch CORS blockiert wird).
- Responsive ist nicht erforderlich, sollte aber auf Desktop-Breite sauber aussehen.

## Dateien

| Datei              | Zweck                                                                      |
| ------------------ | -------------------------------------------------------------------------- |
| `index.html`       | Grundgerüst: Topbar (Buttons + Zeitstempel), Titel, Accordion, Footer.     |
| `style.css`        | Gesamtes Styling inkl. Badge-Farbklassen, Toast, Footer.                   |
| `script.js`        | App-Logik: Fetch, Rendering, Bewertung, Caching, UI-Interaktionen.         |
| `bundeslaender.js` | Geteilte Stammdaten: Array `bundeslaender` mit `{name, lat, lon, dwdUrl}`. |
| `test-urls.mjs`    | Node-Testskript, das alle `dwdUrl`-Links per HTTP prüft (Status 200).      |

`bundeslaender.js` ist die **einzige Quelle** für die Stammdaten — sie wird sowohl von `script.js` (Browser, global) als auch von `test-urls.mjs` (Node, eingelesen + evaluiert) verwendet, keine Duplikate.

## Datenquelle: Bright Sky API

- Basis-URL: `https://api.brightsky.dev/weather`
- Kein API-Key nötig, CORS ist für alle Origins erlaubt.
- Request-Beispiel:
  ```
  GET https://api.brightsky.dev/weather?lat=52.52&lon=13.405&date=2026-06-19
  ```
- `date` = heutiges Datum im Format `YYYY-MM-DD` (lokal berechnet).
- Antwort enthält ein Array `weather`, jeder Eintrag ist ein Stundenwert (UTC-Zeitstempel) mit u.a.:
  - `timestamp` (ISO-String, UTC)
  - `temperature` (°C, Zahl)
  - `cloud_cover` (Prozent, 0–100, kann `null` sein)
  - `relative_humidity` (Prozent, 0–100, kann `null` sein)
  - `precipitation` (mm, Zahl, kann `null` sein)
  - `precipitation_probability` (Prozent, nur in Forecasts, kann `null` sein)
- Zeitstempel sind UTC — für die Anzeige in lokale Zeit (Europe/Berlin) umrechnen. Es werden nur die Einträge angezeigt, die in lokaler Zeit auf das heutige Datum fallen.
- Fehlende Werte (`null`) in der Tabelle als `–` anzeigen, nicht als `null`/`undefined`.

### Weitere verfügbare Felder (aktuell nicht genutzt)

Bright Sky liefert pro Stunde außerdem: `wind_speed`, `wind_gust_speed`, `wind_direction`, `pressure_msl`, `visibility`, `sunshine`, `solar`, `dew_point`, `condition`, `icon`. Diese können bei Bedarf als zusätzliche Spalten ergänzt werden.

## Bundesländer & Koordinaten

Pro Bundesland eine repräsentative Koordinate (Landeshauptstadt) sowie ein Link zur regionalen DWD-Vorhersageseite, fest in `bundeslaender.js`:

| Bundesland             | Stadt       | lat     | lon     | DWD-Region                 |
| ---------------------- | ----------- | ------- | ------- | -------------------------- |
| Baden-Württemberg      | Stuttgart   | 48.7758 | 9.1829  | baden-wuerttemberg         |
| Bayern                 | München     | 48.1374 | 11.5755 | suedbayern                 |
| Berlin                 | Berlin      | 52.5200 | 13.4050 | berlin_brandenburg         |
| Brandenburg            | Potsdam     | 52.3989 | 13.0657 | berlin_brandenburg         |
| Bremen                 | Bremen      | 53.0793 | 8.8017  | niedersachsen_bremen       |
| Hamburg                | Hamburg     | 53.5511 | 9.9937  | schleswig_holstein_hamburg |
| Hessen                 | Wiesbaden   | 50.0826 | 8.2493  | hessen                     |
| Mecklenburg-Vorpommern | Schwerin    | 53.6355 | 11.4012 | mecklenburg_vorpommern     |
| Niedersachsen          | Hannover    | 52.3759 | 9.7320  | niedersachsen_bremen       |
| Nordrhein-Westfalen    | Düsseldorf  | 51.2277 | 6.7735  | nordrhein_westfalen        |
| Rheinland-Pfalz        | Mainz       | 49.9929 | 8.2473  | rheinland-pfalz_saarland   |
| Saarland               | Saarbrücken | 49.2401 | 6.9969  | rheinland-pfalz_saarland   |
| Sachsen                | Dresden     | 51.0504 | 13.7373 | sachsen                    |
| Sachsen-Anhalt         | Magdeburg   | 52.1205 | 11.6276 | sachen_anhalt (DWD-Tippf.) |
| Schleswig-Holstein     | Kiel        | 54.3233 | 10.1228 | schleswig_holstein_hamburg |
| Thüringen              | Erfurt      | 50.9848 | 11.0299 | thueringen                 |

DWD-URLs nach dem Muster `https://www.dwd.de/DE/wetter/vorhersage_aktuell/<region>/vhs_<kürzel>_node.html`. Die Korrektheit aller Links lässt sich mit `node test-urls.mjs` prüfen.

## UI / Layout

- **Topbar** (oben, klebt):
  - Links: Button **"Alle ausklappen" / "Alle einklappen"** (toggelt alle Panels gleichzeitig).
  - Mitte: Zeitstempel der letzten Aktualisierung.
  - Rechts: Button **"Aktualisieren"** (lädt alle bereits geöffneten Panels neu).
- **Titel** mit eingeblendetem heutigem Datum, z.B. „Wetter heute (19.06.2026) nach Bundesland".
- Darunter eine **vertikal scrollbare Liste** aller 16 Bundesländer als **collapsible Panels** (Accordion):
  - Geschlossen: nur der Name sichtbar, mit ▶/▼-Indikator.
  - Aufgeklappt: Wetter-Tabelle + Link zur DWD-Vorhersage des jeweiligen Bundeslandes.
  - Mehrere Panels dürfen gleichzeitig offen sein, alle unabhängig togglebar.
- **Lazy Loading**: Daten pro Bundesland erst beim ersten Öffnen laden, danach cachen (kein erneuter Fetch beim Wieder-Öffnen).
- Während des Ladens: Lade-Indikator „Lade…" im Panel.
- Bei Fetch-Fehler: Fehlermeldung „Daten konnten nicht geladen werden." im Panel, kein Crash der App.
- **Toast-Benachrichtigungen** (oben zentriert, ein-/ausblendend) für Aktionen wie das Aktualisieren.
- **Footer** (klebt unten): Quellenangabe DWD (Deutscher Wetterdienst) + Bright Sky API.

## Tabellenformat (pro Bundesland-Panel)

5 Spalten, eine Zeile je Stunde des heutigen Tages (lokale Zeit, aufsteigend sortiert):

| Uhrzeit | Temperatur     | Bewölkung    | Feuchte       | Regen                     |
| ------- | -------------- | ------------ | ------------- | ------------------------- |
| 00:00   | 14.2 °C `Kühl` | 80 % `Stark` | 72 % `Feucht` | 0.0 mm · 10 % `–`         |
| 01:00   | 13.8 °C `Kühl` | 75 % `Stark` | 75 % `Feucht` | 0.3 mm · 46 % `Leicht 💧` |

- **Temperatur**: `°C`, eine Nachkommastelle. Badge: Eisig / Kalt / Kühl / Angenehm / Warm / Heiß.
- **Bewölkung**: `%`, ganze Zahl. Badge: Klar / Leicht / Bewölkt / Stark / Bedeckt.
- **Feuchte**: `relative_humidity` in `%`, ganze Zahl. Badge: Trocken / Angenehm / Feucht / Schwül.
- **Regen**: `precipitation` in `mm` (eine Nachkommastelle) kombiniert mit `precipitation_probability` in `%` (`mm · %`). Badge: – / Leicht / Mäßig / Stark / Sehr stark.
- Jeder Wert sitzt in einer farblich passend hinterlegten Zelle (Badge-Farbklasse).

## Styling

- Klare Lesbarkeit, abgehobener Tabellenkopf, Panels mit Rahmen/Trennlinie.
- Farbige Badge-Klassen je Kategorie (temp-_, cloud-_, humidity-_, rain-_).
- Sticky Topbar und sticky Footer.
- Toast mit Ein-/Ausblend-Animation, oben zentriert.

## Akzeptanzkriterien

- [ ] App läuft als reine `index.html` im Browser ohne Server/Build (Doppelklick).
- [ ] Alle 16 Bundesländer als scrollbare, einzeln auf-/zuklappbare Einträge sichtbar.
- [ ] Jedes aufgeklappte Bundesland zeigt eine Tabelle mit einer Zeile je Stunde des heutigen Tages (lokale Zeit) und den Spalten Uhrzeit/Temperatur/Bewölkung/Feuchte/Regen, jeweils mit Bewertungs-Badge.
- [ ] Daten kommen live von `api.brightsky.dev`, kein Hardcoding von Wetterwerten.
- [ ] Erneutes Öffnen eines bereits geladenen Bundeslandes verursacht keinen erneuten Netzwerk-Request.
- [ ] „Aktualisieren" lädt geöffnete Panels neu; „Alle aus-/einklappen" toggelt alle Panels.
- [ ] Stammdaten (Koordinaten + DWD-URLs) liegen ausschließlich in `bundeslaender.js` und werden von App und Test gemeinsam genutzt.
- [ ] `node test-urls.mjs` bestätigt, dass alle DWD-Links HTTP 200 liefern.
- [ ] Fehlerfälle (z.B. kein Internet) führen zu einer sichtbaren Fehlermeldung statt zu einem Absturz/leerer Seite.

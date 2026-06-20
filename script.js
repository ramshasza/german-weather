const cache = new Map();

function getDateFor(day) {
  const now = new Date();
  if (day === "tomorrow") now.setDate(now.getDate() + 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${d}`;
}

function getToday() {
  return getDateFor("today");
}

let activeDay = "today";

async function fetchWeather(lat, lon, date) {
  const url = `https://api.brightsky.dev/weather?lat=${lat}&lon=${lon}&date=${date}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.weather;
}

async function fetchAlerts(lat, lon) {
  const url = `https://api.brightsky.dev/alerts?lat=${lat}&lon=${lon}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.alerts ?? [];
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

// --- Bewertungsfunktionen ---

function rateTemp(val) {
  if (val == null) return { label: "–", cls: "" };
  if (val < 0) return { label: "Eisig", cls: "temp-freezing" };
  if (val < 10) return { label: "Kalt", cls: "temp-cold" };
  if (val < 18) return { label: "Kühl", cls: "temp-cool" };
  if (val < 25) return { label: "Angenehm", cls: "temp-nice" };
  if (val < 30) return { label: "Warm", cls: "temp-warm" };
  return { label: "Heiß", cls: "temp-hot" };
}

function rateCloud(val) {
  if (val == null) return { label: "–", cls: "" };
  if (val <= 10) return { label: "Klar ☀️", cls: "cloud-clear" };
  if (val <= 30) return { label: "Leicht", cls: "cloud-light" };
  if (val <= 60) return { label: "Bewölkt", cls: "cloud-medium" };
  if (val <= 90) return { label: "Stark", cls: "cloud-heavy" };
  return { label: "Bedeckt", cls: "cloud-overcast" };
}

function rateRain(val) {
  if (val == null) return { label: "–", cls: "" };
  if (val === 0) return { label: "–", cls: "" };
  if (val <= 1) return { label: "Leicht 💧", cls: "rain-light" };
  if (val <= 5) return { label: "Mäßig 🌧️", cls: "rain-moderate" };
  if (val <= 15) return { label: "Stark 🌧️🌧️", cls: "rain-heavy" };
  return { label: "Sehr stark ⛈️", cls: "rain-extreme" };
}

// --- Formatierungsfunktionen ---

function formatTemp(val) {
  if (val == null) return "–";
  return `${val.toFixed(1)} °C`;
}

function formatCloud(val) {
  if (val == null) return "–";
  return `${Math.round(val)} %`;
}

function formatRain(val, prob) {
  const parts = [];
  if (val != null) parts.push(`${val.toFixed(1)} mm`);
  if (prob != null) parts.push(`${prob} %`);
  if (parts.length === 0) return "–";
  return parts.join(" · ");
}

function formatHumidity(val) {
  if (val == null) return "–";
  return `${Math.round(val)} %`;
}

function rateHumidity(val) {
  if (val == null) return { label: "–", cls: "" };
  if (val < 30) return { label: "Trocken", cls: "humidity-low" };
  if (val < 60) return { label: "Angenehm", cls: "humidity-ok" };
  if (val < 80) return { label: "Feucht", cls: "humidity-high" };
  return { label: "Schwül", cls: "humidity-vhigh" };
}

function rateCondition(val) {
  if (val == null) return { label: "–", cls: "" };
  const map = {
    dry: { label: "Trocken", cls: "cond-dry" },
    fog: { label: "Nebel 🌫️", cls: "cond-fog" },
    rain: { label: "Regen 🌧️", cls: "cond-rain" },
    sleet: { label: "Schneeregen 🌨️", cls: "cond-sleet" },
    snow: { label: "Schnee ❄️", cls: "cond-snow" },
    hail: { label: "Hagel 🌨️", cls: "cond-hail" },
    thunderstorm: { label: "Gewitter ⛈️", cls: "cond-thunderstorm" },
  };
  return map[val] ?? { label: val, cls: "" };
}

function buildTable(weatherData, alerts = [], targetDate = getToday()) {
  const table = document.createElement("table");
  table.innerHTML = `
        <thead>
            <tr>
                <th>Uhrzeit</th>
                <th>Temperatur</th>
                <th>Bewölkung</th>
                <th>Feuchte</th>
                <th>Regen</th>
                <th>Zustand</th>
                <th>Warnung ⚠️</th>
            </tr>
        </thead>
    `;
  const tbody = document.createElement("tbody");

  // Filter to target day's entries in Europe/Berlin and sort by hour
  const entries = weatherData.filter((entry) => {
    const localDate = new Date(entry.timestamp).toLocaleDateString("sv-SE", {
      timeZone: "Europe/Berlin",
    });
    return localDate === targetDate;
  });

  entries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Aktuelle Stunde in lokaler Zeit (Europe/Berlin) bestimmen
  const currentHour = new Date().toLocaleString("de-DE", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Europe/Berlin",
  });

  for (const entry of entries) {
    const tr = document.createElement("tr");
    const entryHour = new Date(entry.timestamp).toLocaleString("de-DE", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Europe/Berlin",
    });
    if (targetDate === getToday() && entryHour === currentHour)
      tr.classList.add("current-hour");
    const tempRating = rateTemp(entry.temperature);
    const cloudRating = rateCloud(entry.cloud_cover);
    const humidityRating = rateHumidity(entry.relative_humidity);
    const rainRating = rateRain(entry.precipitation);
    const condRating = rateCondition(entry.condition);
    const ts = new Date(entry.timestamp).getTime();
    const activeAlerts = alerts.filter((a) => {
      const onset = new Date(a.onset).getTime();
      const expires = a.expires ? new Date(a.expires).getTime() : Infinity;
      return onset <= ts && ts < expires;
    });
    const alertHtml =
      activeAlerts.length === 0
        ? '<span class="badge">–</span>'
        : activeAlerts
            .map(
              (a) =>
                `<span class="badge alert-${a.severity}" title="${a.headline_de}">${a.event_de}</span>`,
            )
            .join(" ");

    tr.innerHTML = `
      <td>${formatTime(entry.timestamp)}</td>
      <td class="${tempRating.cls}">
        <span class="val">${formatTemp(entry.temperature)}</span>
        <span class="badge">${tempRating.label}</span>
      </td>
      <td class="${cloudRating.cls}">
        <span class="val">${formatCloud(entry.cloud_cover)}</span>
        <span class="badge">${cloudRating.label}</span>
      </td>
      <td class="${humidityRating.cls}">
        <span class="val">${formatHumidity(entry.relative_humidity)}</span>
        <span class="badge">${humidityRating.label}</span>
      </td>
      <td class="${rainRating.cls}">
        <span class="val">${formatRain(entry.precipitation, entry.precipitation_probability)}</span>
        <span class="badge">${rainRating.label}</span>
      </td>
      <td class="${condRating.cls}">
        <span class="badge">${condRating.label}</span>
      </td>
      <td class="alert-cell">${alertHtml}</td>
    `;
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  tableWrap.appendChild(table);
  return tableWrap;
}

async function loadPanelContent(land, body) {
  const cacheKey = `${land.name}:${activeDay}`;
  if (cache.has(cacheKey)) {
    const { weather, alerts } = cache.get(cacheKey);
    body.innerHTML = "";
    body.appendChild(buildTable(weather, alerts, getDateFor(activeDay)));
    body.insertAdjacentHTML(
      "beforeend",
      `<a class="dwd-link" href="${land.dwdUrl}" target="_blank" rel="noopener">🔗 DWD-Vorhersage für ${land.name}</a>`,
    );
    return;
  }
  body.innerHTML = '<p class="loading">Lade…</p>';
  try {
    const date = getDateFor(activeDay);
    const [data, alerts] = await Promise.all([
      fetchWeather(land.lat, land.lon, date),
      fetchAlerts(land.lat, land.lon),
    ]);
    cache.set(cacheKey, { weather: data, alerts });
    body.innerHTML = "";
    body.appendChild(buildTable(data, alerts, date));
    body.insertAdjacentHTML(
      "beforeend",
      `<a class="dwd-link" href="${land.dwdUrl}" target="_blank" rel="noopener">🔗 DWD-Vorhersage für ${land.name}</a>`,
    );
  } catch (e) {
    body.innerHTML = '<p class="error">Daten konnten nicht geladen werden.</p>';
  }
}

function renderPanels() {
  const accordion = document.getElementById("accordion");

  for (const land of bundeslaender) {
    const panel = document.createElement("div");
    panel.className = "panel";

    const header = document.createElement("div");
    header.className = "panel-header";
    header.innerHTML = `<span class="indicator">▶</span><span class="land-name">${land.name}</span><img class="wappen" src="${land.wappen}" alt="Wappen ${land.name}" loading="lazy" onerror="this.style.display='none'">`;

    const body = document.createElement("div");
    body.className = "panel-body";

    header.addEventListener("click", async () => {
      const isOpen = panel.classList.toggle("open");
      header.querySelector(".indicator").textContent = isOpen ? "▼" : "▶";
      if (isOpen) await loadPanelContent(land, body);
    });

    panel.appendChild(header);
    panel.appendChild(body);
    accordion.appendChild(panel);
  }
}

// Datum in Überschrift setzen
function updateTitle() {
  const dateStr = getDateFor(activeDay);
  const displayDate = new Date(dateStr + "T12:00:00").toLocaleDateString(
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
  const dayLabel = activeDay === "today" ? "heute" : "morgen";
  const titleEl = document.getElementById("main-title");
  if (titleEl)
    titleEl.textContent = `Wetter ${dayLabel} (${displayDate}) nach Bundesland`;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  // Trigger reflow so the transition starts
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("toast-visible"));
  });
  setTimeout(() => {
    toast.classList.remove("toast-visible");
    toast.addEventListener("transitionend", () => toast.remove(), {
      once: true,
    });
  }, 1500);
}

function updateLastFetched() {
  const el = document.getElementById("last-fetched");
  if (!el) return;
  const time = new Date().toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Berlin",
  });
  el.textContent = `Zuletzt aktualisiert: ${time} Uhr`;
}

async function refreshAll() {
  const btn = document.getElementById("refresh-btn");
  if (btn) btn.disabled = true;

  // Clear cache and re-fetch only currently open panels
  const openPanels = document.querySelectorAll(".panel.open");
  cache.clear();

  const accordion = document.getElementById("accordion");
  accordion.innerHTML = "";
  renderPanels();

  // Re-open previously open panels
  const panels = accordion.querySelectorAll(".panel");
  const openIndices = [...openPanels].map((p) => {
    const name = p
      .querySelector(".panel-header")
      .textContent.trim()
      .slice(2)
      .trim();
    return bundeslaender.findIndex((l) => l.name === name);
  });
  for (const idx of openIndices) {
    if (idx >= 0) panels[idx]?.querySelector(".panel-header").click();
  }

  updateTitle();
  updateLastFetched();
  showToast("✓ Erfolgreich aktualisiert");
  if (btn) btn.disabled = false;
}

document.getElementById("refresh-btn")?.addEventListener("click", refreshAll);

let allExpanded = false;

const collapseBtn = document.getElementById("collapse-btn");
if (collapseBtn) {
  collapseBtn.addEventListener("click", () => {
    if (!allExpanded) {
      // Alle ausklappen
      document.querySelectorAll(".panel").forEach((panel) => {
        if (!panel.classList.contains("open")) {
          panel.querySelector(".panel-header").click();
        }
      });
      collapseBtn.innerHTML = "&#x25B2; Alle einklappen";
      allExpanded = true;
    } else {
      // Alle einklappen
      document.querySelectorAll(".panel.open").forEach((panel) => {
        panel.classList.remove("open");
        panel.querySelector(".indicator").textContent = "▶";
      });
      collapseBtn.innerHTML = "&#x25BC; Alle ausklappen";
      allExpanded = false;
    }
  });
}

renderPanels();
updateTitle();
updateLastFetched();

// Tab switching
document.querySelectorAll(".day-tab").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (btn.dataset.day === activeDay) return;
    activeDay = btn.dataset.day;
    document
      .querySelectorAll(".day-tab")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.day === activeDay),
      );
    updateTitle();
    for (const panel of document.querySelectorAll(".panel.open")) {
      const landName = panel.querySelector(".land-name").textContent;
      const land = bundeslaender.find((l) => l.name === landName);
      if (land)
        await loadPanelContent(land, panel.querySelector(".panel-body"));
    }
  });
});

// Sticky-Versatz des Tabellenkopfs an die echte Panel-Header-Höhe koppeln,
// damit zwischen beiden Sticky-Elementen kein 1px-Spalt flackert.
function setHeaderOffset() {
  const header = document.querySelector(".panel-header");
  if (header) {
    document.documentElement.style.setProperty(
      "--ph-h",
      `${header.offsetHeight}px`,
    );
  }
}
setHeaderOffset();
window.addEventListener("resize", setHeaderOffset);

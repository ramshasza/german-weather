// Einmaliges Hilfsskript: lädt die Bundesland-Wappen (gemeinfrei) von
// Wikimedia Commons in den Ordner ./wappen/ herunter.
// Überspringt bereits vorhandene Dateien und bricht bei 429 SOFORT ab.
import { writeFile, mkdir, access } from "node:fs/promises";

const UA = "german-weather-app/1.0 (local educational project)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class RateLimit extends Error {}

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 429) throw new RateLimit("API 429");
  return res.json();
}

async function getText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 429) throw new RateLimit("download 429");
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.text();
}

const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );

const states = {
  "baden-wuerttemberg": ["Coat of arms of Baden-Württemberg (lesser).svg"],
  bayern: ["Coat of arms of Bavaria.svg"],
  berlin: ["Coat of arms of Berlin.svg"],
  brandenburg: ["Coat of arms of Brandenburg.svg", "DEU Brandenburg COA.svg"],
  bremen: [
    "Coat of arms of Bremen.svg",
    "Bremen Wappen(Mittel).svg",
    "DEU Bremen COA.svg",
  ],
  hamburg: ["DEU Hamburg COA.svg", "Coat of arms of Hamburg.svg"],
  hessen: ["Coat of arms of Hesse.svg", "DEU Hessen COA.svg"],
  "mecklenburg-vorpommern": [
    "Coat of arms of Mecklenburg-Western Pomerania (great).svg",
  ],
  niedersachsen: [
    "Coat of arms of Lower Saxony.svg",
    "DEU Niedersachsen COA.svg",
  ],
  "nordrhein-westfalen": [
    "Coat of arms of North Rhine-Westphalia.svg",
    "DEU Nordrhein-Westfalen COA.svg",
  ],
  "rheinland-pfalz": [
    "Coat of arms of Rhineland-Palatinate.svg",
    "DEU Rheinland-Pfalz COA.svg",
  ],
  saarland: [
    "Wappen des Saarlands.svg",
    "Coa de-saarland.svg",
    "Coat of arms of Saarland.svg",
    "DEU Saarland COA.svg",
  ],
  sachsen: ["Coat of arms of Saxony.svg", "DEU Sachsen COA.svg"],
  "sachsen-anhalt": [
    "Wappen Sachsen-Anhalt.svg",
    "Coat of arms of Saxony-Anhalt.svg",
    "DEU Sachsen-Anhalt COA.svg",
  ],
  "schleswig-holstein": [
    "Coat of arms of Schleswig-Holstein.svg",
    "DEU Schleswig-Holstein COA.svg",
  ],
  thueringen: ["Coat of arms of Thuringia.svg", "DEU Thüringen COA.svg"],
};

async function resolveUrl(titles) {
  const param = titles.map((t) => "File:" + t).join("|");
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url&titles=" +
    encodeURIComponent(param);
  const data = await getJson(api);
  const pages = Object.values(data.query.pages);
  for (const t of titles) {
    const p = pages.find(
      (x) => x.title === "File:" + t && x.imageinfo && x.imageinfo[0],
    );
    if (p) return { title: t, url: p.imageinfo[0].url };
  }
  return null;
}

await mkdir("wappen", { recursive: true });

let ok = 0;
let skipped = 0;
try {
  for (const [slug, titles] of Object.entries(states)) {
    const dest = `wappen/${slug}.svg`;
    if (await exists(dest)) {
      skipped++;
      continue;
    }
    const hit = await resolveUrl(titles);
    if (!hit) {
      console.log("FEHLT", slug, titles);
      continue;
    }
    const svg = await getText(hit.url);
    await writeFile(dest, svg, "utf8");
    ok++;
    console.log("OK", slug, "<-", hit.title);
    await sleep(6000); // höflich bleiben
  }
  console.log(`\nFertig: ${ok} neu, ${skipped} übersprungen.`);
} catch (e) {
  if (e instanceof RateLimit) {
    console.log(`\nSTOPP wegen 429 (${e.message}). ${ok} neu geladen.`);
    console.log("Bitte später erneut ausfuehren – Skript setzt fort.");
    process.exit(2);
  }
  throw e;
}

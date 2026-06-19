// test-urls.mjs — Checks all DWD URLs for HTTP 200
// Run: node test-urls.mjs

import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, "bundeslaender.js"), "utf-8");
const bundeslaender = new Function(src + "\nreturn bundeslaender;")();

const urls = bundeslaender.map((b) => ({ name: b.name, url: b.dwdUrl }));

async function checkUrl({ name, url }) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    return { name, url, status: res.status, ok: res.ok };
  } catch (err) {
    return { name, url, status: "ERROR", ok: false, error: err.message };
  }
}

async function main() {
  console.log("Checking DWD URLs...\n");
  const uniqueUrls = [...new Map(urls.map((u) => [u.url, u])).values()];
  const results = await Promise.all(uniqueUrls.map(checkUrl));

  let failed = 0;
  for (const r of results) {
    const icon = r.ok ? "✓" : "✗";
    console.log(`${icon} [${r.status}] ${r.name} → ${r.url}`);
    if (!r.ok) failed++;
  }

  console.log(`\n${results.length - failed}/${results.length} OK`);
  if (failed > 0) {
    console.log(`${failed} FAILED`);
    process.exit(1);
  }
}

main();

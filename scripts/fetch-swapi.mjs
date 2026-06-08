// Fetches the full SWAPI dataset from swapi.info (a static, CORS-enabled mirror that
// returns every record for a resource in a single call) and writes a committed snapshot
// to public/data/swapi.json. Run with: npm run fetch-data
//
// The snapshot lets the game work fully offline / even if SWAPI is down. The app loads
// this snapshot first, then optionally refreshes from live swapi.info in the background.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://swapi.info/api";
const RESOURCES = ["people", "planets", "films", "species", "starships", "vehicles"];

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "public", "data", "swapi.json");

async function fetchResource(name) {
  const res = await fetch(`${BASE}/${name}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`${name}: expected array, got ${typeof data}`);
  return data;
}

async function main() {
  const snapshot = { fetchedAt: new Date().toISOString(), source: BASE };
  for (const name of RESOURCES) {
    process.stdout.write(`fetching ${name}... `);
    snapshot[name] = await fetchResource(name);
    console.log(`${snapshot[name].length} records`);
  }
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(snapshot));
  console.log(`\nwrote ${OUT}`);
}

main().catch((err) => {
  console.error("\nfetch-swapi failed:", err.message);
  process.exit(1);
});

// Loads the bundled SWAPI snapshot, builds url->entity lookup maps so cross-references
// resolve to readable names, and (best-effort) refreshes from live swapi.info in the
// background so the dataset stays current without ever blocking gameplay.

const LIVE_BASE = "https://swapi.info/api";
const RESOURCES = ["people", "planets", "films", "species", "starships", "vehicles"];

/** @typedef {{ people:any[], planets:any[], films:any[], species:any[], starships:any[], vehicles:any[], byUrl:Map<string,any> }} GameData */

function indexByUrl(snapshot) {
  const byUrl = new Map();
  for (const name of RESOURCES) {
    for (const entity of snapshot[name] || []) {
      if (entity?.url) byUrl.set(normalizeUrl(entity.url), entity);
    }
  }
  return byUrl;
}

// swapi.info and swapi.dev differ only by host/trailing slash; normalize so lookups
// work regardless of which mirror produced a given url reference.
function normalizeUrl(url) {
  return String(url)
    .replace(/^https?:\/\/[^/]+/, "")
    .replace(/\/+$/, "");
}

function shape(snapshot) {
  const data = { byUrl: indexByUrl(snapshot) };
  for (const name of RESOURCES) data[name] = snapshot[name] || [];
  return data;
}

/** Resolve a SWAPI url reference to its entity (or null). */
export function resolveUrl(data, url) {
  if (!url) return null;
  return data.byUrl.get(normalizeUrl(url)) || null;
}

/** Resolve a url reference to a display name (planets/people/etc. use `name`, films use `title`). */
export function resolveName(data, url) {
  const e = resolveUrl(data, url);
  if (!e) return null;
  return e.name || e.title || null;
}

/** Load the bundled snapshot. Throws if missing/corrupt. */
export async function loadBundled() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/swapi.json`);
  if (!res.ok) throw new Error(`snapshot HTTP ${res.status}`);
  return shape(await res.json());
}

/** Best-effort live refresh; resolves to shaped data or null on any failure. */
export async function refreshLive() {
  try {
    const snapshot = {};
    await Promise.all(
      RESOURCES.map(async (name) => {
        const res = await fetch(`${LIVE_BASE}/${name}`, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`${name} HTTP ${res.status}`);
        const json = await res.json();
        if (!Array.isArray(json)) throw new Error(`${name} not an array`);
        snapshot[name] = json;
      })
    );
    return shape(snapshot);
  } catch {
    return null;
  }
}

import fs from "node:fs";
import path from "node:path";
import curated from "@/data/icons.json";

/**
 * Image resolution for PoE2 art.
 *
 * Three sources, in priority order:
 *  1. Passive nodes carry an `icon` dds path in the tree data -> direct CDN url.
 *  2. A small curated map (data/icons.json) of verified gem/item art paths.
 *  3. A live resolver that scrapes poe2db's og:image for a given name, cached
 *     to disk so each name is only looked up once.
 *
 * Everything is served to the browser through /api/icon, which streams the
 * bytes from the poe2db CDN (avoids hotlink/CORS issues and adds caching).
 */

const CDN = "https://cdn.poe2db.tw/image/";
const POE2DB = "https://poe2db.tw/us/";
const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "icon-resolve.json");

type CuratedMap = Record<string, string>;
const curatedIcons = curated as unknown as { gems: CuratedMap; items: CuratedMap };

/** Convert a tree `icon` dds path into a CDN webp URL. */
export function artPathToUrl(art: string): string {
  const clean = art.replace(/\.dds$/i, "").replace(/^\/+/, "");
  return CDN + clean + ".webp";
}

/** Build a same-origin proxy url the browser can put in <img src>. */
export function iconProxy(params: Record<string, string>): string {
  const q = new URLSearchParams(params).toString();
  return `/api/icon?${q}`;
}

// ---- disk-backed resolve cache ------------------------------------------

let memCache: Record<string, string | null> | null = null;
function loadCache(): Record<string, string | null> {
  if (memCache) return memCache;
  try {
    memCache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch {
    memCache = {};
  }
  return memCache!;
}
function saveCache() {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(memCache ?? {}));
  } catch {
    /* best effort */
  }
}

function slugVariants(name: string, isSupport: boolean): string[] {
  const base = name.trim();
  const variants = new Set<string>();
  const add = (s: string) => variants.add(s.replace(/'/g, "").replace(/\s+/g, "_"));
  add(base);
  // item-tier prefixes used by bases ("Expert Dualstring Bow" -> "Dualstring Bow")
  add(base.replace(/^(Expert|Advanced)\s+/i, ""));
  if (isSupport) {
    add(base.replace(/\s+Support$/i, ""));
    add(base + " Support");
  }
  return [...variants];
}

/** Resolve a gem/item name to a CDN webp url via poe2db (cached). */
export async function resolveByName(
  name: string,
  isSupport = false
): Promise<string | null> {
  const cache = loadCache();
  const key = (isSupport ? "s:" : "n:") + name.toLowerCase();
  if (key in cache) return cache[key];

  // curated first
  const curatedHit =
    curatedIcons.gems[name] || curatedIcons.items[name] || null;
  if (curatedHit) {
    const url = curatedHit.startsWith("http") ? curatedHit : artPathToUrl(curatedHit);
    cache[key] = url;
    saveCache();
    return url;
  }

  for (const slug of slugVariants(name, isSupport)) {
    try {
      const res = await fetch(POE2DB + encodeURIComponent(slug), {
        headers: { "user-agent": "Mozilla/5.0 (poe2-build-leveler)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const m = html.match(/property="og:image"\s+content="([^"]+)"/i);
      if (m && /cdn\.poe2db\.tw\/image\/Art\/2DItems\/(Gems|Weapons|Armours|Quivers|Rings|Amulets|Belts|Flasks)/i.test(m[1])) {
        cache[key] = m[1];
        saveCache();
        return m[1];
      }
    } catch {
      /* try next slug */
    }
  }
  cache[key] = null;
  saveCache();
  return null;
}

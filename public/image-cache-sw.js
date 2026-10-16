/*
 * Service worker keeping the facsimile images from Gallica.
 *
 * Gallica's images sit behind Cloudflare, which answers a burst of requests
 * with a challenge page instead of the image; the browser refuses that page
 * (ERR_BLOCKED_BY_RESPONSE.NotSameOrigin) and the image stays blank. So this
 * worker, for every IIIF image and info.json requested from Gallica:
 *
 * - serves it from its cache when it has already been downloaded once;
 * - otherwise lets only a few requests run at a time, spaced out;
 * - when a request is blocked, pauses all of them for a while and retries.
 *
 * Changing CACHE (gallica-images-v2, ...) drops the images kept so far.
 */

const CACHE = "gallica-images-v1";
const HOSTS = ["gallica.bnf.fr"];
/** Requests to Gallica running at the same time. */
const MAX_ACTIVE = 4;
/** Milliseconds between the starts of two requests. */
const MIN_GAP = 100;
/** Pauses before each retry of a blocked request, in milliseconds. */
const RETRY_DELAYS = [1000, 3000, 8000];
/** Images kept at most; the oldest are dropped beyond. */
const MAX_ENTRIES = 5000;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("gallica-images-") && name !== CACHE) {
          await caches.delete(name);
        }
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!HOSTS.includes(url.hostname) || !url.pathname.startsWith("/iiif/")) {
    return;
  }
  const isInfo = url.pathname.endsWith("/info.json");
  if (!isInfo && !/\.(jpe?g|png|webp|gif)$/i.test(url.pathname)) return;
  event.respondWith(cachedOrFetched(request, isInfo));
});

async function cachedOrFetched(request, isInfo) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request.url);
  if (cached) return cached;
  for (let attempt = 0; ; attempt++) {
    const response = await throttled(() => fetchOnce(request, isInfo));
    if (response && !isBlocked(response)) {
      if (response.ok || response.type === "opaque") {
        keep(cache, request.url, response.clone());
      }
      return response;
    }
    if (attempt >= RETRY_DELAYS.length) return response ?? Response.error();
    pauseAll(RETRY_DELAYS[attempt]);
  }
}

/**
 * Whether Gallica lets its images be read across origins: null until an
 * image has come back one way or the other.
 */
let corsWorks = null;

/**
 * One request to Gallica; null when it was blocked (the browser refuses
 * Cloudflare's challenge page, so the fetch fails).
 */
async function fetchOnce(request, isInfo) {
  if (isInfo) {
    try {
      return await fetch(request);
    } catch {
      return null;
    }
  }
  // An image is asked for with CORS, so that its status is known and an
  // error is not kept; a server without CORS gets the page's own request.
  if (corsWorks !== false) {
    try {
      const response = await fetch(request.url, {
        mode: "cors",
        credentials: "omit",
      });
      corsWorks = true;
      return response;
    } catch {
      if (corsWorks) return null;
    }
  }
  try {
    const response = await fetch(request);
    corsWorks = false;
    return response;
  } catch {
    return null;
  }
}

/** A challenge or a refusal for too many requests, read with CORS. */
function isBlocked(response) {
  return [403, 429, 503].includes(response.status);
}

let active = 0;
const waiting = [];
let nextStart = 0;

async function throttled(task) {
  if (active < MAX_ACTIVE) active++;
  else await new Promise((resolve) => waiting.push(resolve));
  try {
    for (let wait; (wait = nextStart - Date.now()) > 0;) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    nextStart = Date.now() + MIN_GAP;
    return await task();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}

/** No request to Gallica starts before `delay` milliseconds from now. */
function pauseAll(delay) {
  nextStart = Math.max(nextStart, Date.now() + delay);
}

let puts = 0;

async function keep(cache, url, response) {
  try {
    await cache.put(url, response);
    if (++puts % 100 === 0) {
      const keys = await cache.keys();
      for (const key of keys.slice(0, keys.length - MAX_ENTRIES)) {
        await cache.delete(key);
      }
    }
  } catch {
    // Storage full or unavailable: the image is simply not kept.
  }
}

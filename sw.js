/* IMPERIUM VOLEY - Service Worker
   - La página siempre se pide primero a internet, así llegan las versiones nuevas.
   - Si no hay internet (o responde muy lento) se usa la copia guardada.
   - Nunca toca Firebase ni peticiones que no sean GET (login, base de datos, etc.). */
const VERSION = 'imperium-v4';
const ESPERA_RED_MS = 4000;
const ARCHIVOS = [
  './index.html', './manifest.json', './logo.png', './breb.png',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png'
];

/* Librerías y fuentes con versión fija: se pueden guardar sin riesgo */
const esCDN = u =>
  u.hostname === 'fonts.googleapis.com' ||
  u.hostname === 'fonts.gstatic.com' ||
  u.hostname === 'cdnjs.cloudflare.com' ||
  (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/'));

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    /* Si falta algún archivo (por ejemplo un ícono) no se cae la instalación */
    await Promise.allSettled(ARCHIVOS.map(u => cache.add(new Request(u, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter(n => n.startsWith('imperium-') && n !== VERSION).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                 /* no tocar POST, PUT, etc. */
  const url = new URL(req.url);
  const propio = url.origin === self.location.origin;
  if (propio && req.mode === 'navigate') { e.respondWith(paginaPrimeroRed(e)); return; }
  if (propio || esCDN(url)) { e.respondWith(guardadoYActualiza(e)); return; }
  /* Todo lo demás (Firebase, WebSocket, Google Auth...) pasa directo, sin tocarlo */
});

/* Una respuesta con redirección no se puede devolver a una navegación: se limpia */
async function sinRedireccion(resp) {
  if (!resp.redirected) return resp;
  const cuerpo = await resp.blob();
  return new Response(cuerpo, { status: resp.status, statusText: resp.statusText, headers: resp.headers });
}

function sinConexion() {
  return new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<body style="background:#0A0A0A;color:#fff;font-family:sans-serif;text-align:center;padding:40px">' +
    '<h2>Sin conexión</h2><p>Conéctate a internet y vuelve a abrir la app.</p></body>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

/* Página: internet primero (revalidando), copia guardada si no hay red o tarda mucho */
async function paginaPrimeroRed(e) {
  const cache = await caches.open(VERSION);
  const copia = await cache.match('./index.html');
  const red = fetch(new Request(e.request.url, { cache: 'no-cache' })).then(async resp => {
    if (!resp.ok) return resp;
    const limpia = await sinRedireccion(resp);
    cache.put('./index.html', limpia.clone());
    return limpia;
  });
  e.waitUntil(red.catch(() => {}));
  if (!copia) { try { return await red; } catch (_) { return sinConexion(); } }
  const lenta = new Promise(r => setTimeout(() => r(null), ESPERA_RED_MS));
  const r = await Promise.race([red.catch(() => null), lenta]);
  return (r && r.ok) ? r : copia;
}

/* Archivos fijos (logo, QR, librerías, fuentes): rápido desde la copia y se actualiza en segundo plano */
async function guardadoYActualiza(e) {
  const req = e.request;
  const cache = await caches.open(VERSION);
  const guardado = await cache.match(req);
  const actualiza = fetch(req).then(resp => {
    if (resp && resp.status === 200 && (resp.type === 'basic' || resp.type === 'cors')) cache.put(req, resp.clone());
    return resp;
  }).catch(() => null);
  e.waitUntil(actualiza);
  return guardado || (await actualiza) || new Response('', { status: 504, statusText: 'Sin conexión' });
}

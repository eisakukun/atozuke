/* オフラインでも開けるようにする Service Worker。
   本体は通信優先（直したら次に開いたとき反映される）、圏外ならキャッシュから起動する。
   中身（書いた札）は localStorage / IndexedDB にあり、ここでは一切さわらない。 */
const CACHE = "atozuke-v1.20.0";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./version.txt",
               "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  /* 画面そのものはブラウザのキャッシュも確かめ直してから出す（古い画面が出続けないように） */
  const net = req.mode === "navigate"
    ? fetch(new Request(req.url, { cache: "no-cache", credentials: "same-origin" }))
    : fetch(req);
  e.respondWith(
    net.then(res => {
      if (res && res.ok && !url.search) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })
      .then(hit => hit || caches.match("./index.html")))
  );
});

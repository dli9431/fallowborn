# play.fallowborn.com cache setup (Coolify **Static** build pack)

play.fallowborn.com is a Coolify app — Build Pack **Static**, Static Image `nginx:alpine`,
auto-deploying on every push to `main`, behind Cloudflare. Separate from itch: itch uses
`deploy.cmd`/`stamp.ps1`; nothing here touches that path, and nothing there touches this one.

**Constraint (confirmed in the Coolify UI):** the Static build pack has **no Build Command** —
it just copies the repo into `nginx:alpine` and serves it. So there is no deploy-time step to
stamp `?v=<commit>` onto the asset URLs in `index.html`. That forces a choice between two caching
models. Option A is the current recommendation for a site this small.

## Option A — stay on Static: `no-cache` + ETag (recommended)

No build step, no new files, nothing committed. nginx sends `ETag`/`Last-Modified` for every
static file, so browsers/Cloudflare revalidate with a cheap `304 Not Modified` (no body) when a
file is unchanged and get fresh bytes the moment a deploy changes it. Correct and never stale;
the only cost vs. immutable is one conditional request per asset on a return visit — tiny, and
parallel over HTTP/2. For ~30 small files, negligible.

Set it in **General → Custom Nginx Configuration**:

1. Click **Generate Default Nginx Configuration** (fills the box with Coolify's working default —
   correct `root`/`listen` for your version).
2. Add `add_header Cache-Control "no-cache" always;` inside the `location / { … }` block.
3. Add a dotfile guard above it: `location ~ /\. { deny all; }`
4. Save → Redeploy.

The `location /` region should end up as:

```nginx
location ~ /\. { deny all; }

location / {
    add_header Cache-Control "no-cache" always;
    try_files $uri $uri/ /index.html;
}
```

That's the whole change — it pins `no-cache` at the origin so Cloudflare has explicit headers to
respect (see the Cloudflare section).

## Option B — switch to a Dockerfile pack: immutable + commit-SHA bust

Worth it only to eliminate the per-visit revalidation round-trips entirely (a small win, but the
project does target slow mobile). Needs a build step, which the Static pack can't do — so change
**Build Pack** from Static to **Dockerfile** and commit two files at the repo root.

`Dockerfile`:

```dockerfile
FROM nginx:alpine
ARG SOURCE_COMMIT=
COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN set -eu; \
    V="${SOURCE_COMMIT:-}"; \
    [ -n "$V" ] || V="$(sed -nE "s/.*FB\.VERSION[[:space:]]*=[[:space:]]*'([^']+)'.*/\1/p" /usr/share/nginx/html/js/main.js | head -n1)"; \
    sed -i -E "s@(src|href)=\"((css|js|data|mods)/[^\"?#]+)\"@\1=\"\2?v=$V\"@g" /usr/share/nginx/html/index.html; \
    rm -rf /usr/share/nginx/html/.git /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/nginx.conf; \
    echo "stamped ?v=$V"
```

`nginx.conf`:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location ~ /\. { deny all; }

    location ~* \.(?:js|css)$ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri =404;
    }

    location / {
        add_header Cache-Control "no-cache" always;
        try_files $uri $uri/ /index.html;
    }
}
```

Notes:
- Both files are infra only — keep them out of the itch allowlist (they already aren't in it), and
  the game never loads them, so the `file://`/no-build rules for the *game* still hold. The `RUN`
  deletes them from the web root so they aren't served.
- SHA source: if Coolify doesn't pass the commit automatically, add a **build arg** named
  `SOURCE_COMMIT` in the app's environment; otherwise it falls back to `FB.VERSION`. Check the
  build log for `stamped ?v=…` — a SHA means every push auto-busts with no version discipline; a
  version string means the fallback ran (still correct, keep bumping `FB.VERSION`).
- In Dockerfile mode the Static-pack fields (Static Image, Custom Nginx Configuration) no longer
  apply — the config ships inside the image.

## Cloudflare (either option)

- **Remove the "Bypass Cache" rule** — that's what currently prevents all caching.
- **Browser Cache TTL → "Respect Existing Headers"** (Caching → Configuration). Otherwise CF
  overrides the origin and can cache `index.html`, breaking freshness. The one that bites.
- **Keep caching level "Standard"** (respects the query string) — matters for Option B's `?v=`;
  make sure nothing does "Ignore Query String."
- **Don't "Cache Everything"** — leave HTML uncached at the edge.

Neither option needs a purge on deploy: Option A stays fresh via revalidation; Option B mints new
asset URLs (new SHA) each push.

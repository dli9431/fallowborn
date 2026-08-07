FROM python:3.13-alpine AS music-catalog

WORKDIR /catalog
COPY music/ music/
COPY tools/music_catalog.py tools/music_catalog.py
RUN mkdir -p data && python tools/music_catalog.py build --root /catalog

FROM nginx:alpine

# Serve the static game via nginx (play.fallowborn.com), with cache-busting
# applied at build time. Coolify provides the deployed commit as SOURCE_COMMIT
# when available; otherwise we fall back to FB.VERSION read from js/main.js.
# This file and nginx.conf are infra only: not loaded by the game (so running
# from file:// is unaffected). The explicit COPY list is the deployment
# boundary. Development and repository files never enter the document root.
ARG SOURCE_COMMIT=

COPY index.html LICENSE manifest.webmanifest sw.js /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY data/ /usr/share/nginx/html/data/
COPY docs/ /usr/share/nginx/html/docs/
COPY js/ /usr/share/nginx/html/js/
COPY music/ /usr/share/nginx/html/music/
COPY mods/ /usr/share/nginx/html/mods/
COPY static/ /usr/share/nginx/html/static/
COPY --from=music-catalog /catalog/data/music_catalog.js /usr/share/nginx/html/data/music_catalog.js
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Derive the offline asset list before stamping index.html (the match excludes
# query strings), then stamp the worker and document with one deployment
# fingerprint. Uses only BusyBox-compatible shell tools from nginx:alpine.
RUN set -eu; \
    root=/usr/share/nginx/html; \
    V="${SOURCE_COMMIT:-}"; \
    [ -n "$V" ] || V="$(sed -n -r "s/.*FB\.VERSION[[:space:]]*=[[:space:]]*'([^']+)'.*/\1/p" "$root/js/main.js" | head -n1)"; \
    [ -n "$V" ]; \
    grep -q "'__FB_ASSET_LIST__'" "$root/sw.js"; \
    grep -q "__FB_CACHE_KEY__" "$root/sw.js"; \
    { grep -o -E '(src|href)="(css|js|data|mods)/[^"?#]+"' "$root/index.html" \
        | sed -r 's/^(src|href)="//; s/"$//'; \
      ls "$root"/data/lang_*.js | sed "s|^$root/||"; \
      grep -o -E '"src": "music/intro/[^"]+\.opus"' "$root/data/music_catalog.js" \
        | sed -r 's/^"src": "//; s/"$//'; \
    } | awk '!seen[$0]++' | sed "s|.*|  '/&',|" > /tmp/fb-assets.txt; \
    ASSET_COUNT="$(wc -l < /tmp/fb-assets.txt | tr -d ' ')"; \
    sed -i -e "/'__FB_ASSET_LIST__'/r /tmp/fb-assets.txt" \
           -e "/'__FB_ASSET_LIST__'/d" "$root/sw.js"; \
    sed -i "s/__FB_CACHE_KEY__/$V/g" "$root/sw.js"; \
    sed -i -r "s@(src|href)=\"((css|js|data|mods)/[^\"?#]+)\"@\1=\"\2?v=$V\"@g" "$root/index.html"; \
    rm -f /tmp/fb-assets.txt; \
    echo "stamped ?v=$V, precaching $ASSET_COUNT versioned assets"

# Report container health so Coolify can wait for a healthy container before
# swapping in a new deploy (graceful, near-zero-downtime rollout) and can restart
# it if nginx dies. BusyBox wget ships in nginx:alpine; a 200 from the local
# index means nginx is up and serving.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

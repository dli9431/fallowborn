FROM nginx:alpine

# Serve the static game via nginx (play.fallowborn.com), with cache-busting
# applied at build time. Coolify provides the deployed commit as SOURCE_COMMIT
# when available; otherwise we fall back to FB.VERSION read from js/main.js.
# This file and nginx.conf are infra only: not loaded by the game (so running
# from file:// is unaffected) and removed from the served root below.
ARG SOURCE_COMMIT=

COPY . /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Append ?v=<fingerprint> to css/js/data/mods asset URLs in index.html so every
# deploy mints fresh URLs and auto-busts edge + browser caches. Uses -r (ERE)
# for BusyBox sed compatibility. Then drop VCS metadata and build files from the
# served root. The log line lets you confirm a real SHA won (vs the fallback).
RUN set -eu; \
    V="${SOURCE_COMMIT:-}"; \
    [ -n "$V" ] || V="$(sed -n -r "s/.*FB\.VERSION[[:space:]]*=[[:space:]]*'([^']+)'.*/\1/p" /usr/share/nginx/html/js/main.js | head -n1)"; \
    sed -i -r "s@(src|href)=\"((css|js|data|mods)/[^\"?#]+)\"@\1=\"\2?v=$V\"@g" /usr/share/nginx/html/index.html; \
    rm -rf /usr/share/nginx/html/.git /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/nginx.conf; \
    echo "stamped ?v=$V"

# Report container health so Coolify can wait for a healthy container before
# swapping in a new deploy (graceful, near-zero-downtime rollout) and can restart
# it if nginx dies. BusyBox wget ships in nginx:alpine; a 200 from the local
# index means nginx is up and serving.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

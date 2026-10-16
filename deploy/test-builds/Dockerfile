# test.fallowborn.com: every pushed branch except main in one static site,
# with dev at / and each other branch under /<branch>/ (deploy/test-builds/build.sh).
# This file is used only by the test Coolify app. play.fallowborn.com builds
# the repository-root Dockerfile from main and never reads deploy/.
FROM alpine:3.20 AS builds
RUN apk add --no-cache git python3
ARG REPOSITORY=https://github.com/dli9431/fallowborn.git
ARG BRANCH_REFS=https://api.github.com/repos/dli9431/fallowborn/git/matching-refs/heads
ARG ROOT_BRANCH=dev
ARG SKIP_BRANCHES=main
# The branch listing changes whenever any branch moves, so the clone below
# never reuses a cached layer from an older set of branches.
ADD ${BRANCH_REFS} /tmp/branch-refs.json
COPY deploy/test-builds/build.sh /usr/local/bin/build-test-site
RUN ROOT_BRANCH="$ROOT_BRANCH" SKIP_BRANCHES="$SKIP_BRANCHES" \
    sh /usr/local/bin/build-test-site "$REPOSITORY" /site

FROM nginx:alpine
COPY --from=builds /site/ /usr/share/nginx/html/
COPY deploy/test-builds/nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

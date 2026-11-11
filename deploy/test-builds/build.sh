#!/bin/sh
# Build every pushed game branch into one static test site.
#
#   build.sh <repository> <output-directory>
#
# ROOT_BRANCH (default dev) is served at the site root with the released
# storage keys, so its existing saves stay where they are. Every other branch
# except SKIP_BRANCHES (default main) is served under /<name>/, where <name> is
# the branch name lowercased with every other character turned into a dash.
# Each branch build sets window.FB_STORAGE_SCOPE to <name>, keeping its saves,
# settings and mods apart from every other build on the shared origin. A
# branch whose music matches the root branch shares the root soundtrack
# (nginx falls back to /music/), so the site holds one copy of unchanged audio.
# A branch whose js/util.js predates the storage scope would share the root
# build's saves, so it is not published; /branches/ names it with the reason.
# /branches/ lists every build. TEST_UMAMI_WEBSITE_ID, when set, enables test
# telemetry to that separate Umami website (see telemetry below). Used only by
# deploy/test-builds/Dockerfile.
set -eu

repo="$1"
out="$2"
root_branch="${ROOT_BRANCH:-dev}"
skip=" ${SKIP_BRANCHES:-main} "
work="$(mktemp -d)"
git="$work/repo.git"
shipped="index.html LICENSE css js data mods docs static"
reserved=" css js data mods docs static music branches tools "

git clone --quiet --bare --depth 1 --no-single-branch "$repo" "$git"
git --git-dir="$git" rev-parse --verify --quiet "refs/heads/$root_branch" >/dev/null || {
  echo "Root branch $root_branch is missing from $repo" >&2
  exit 1
}

sanitize() {
  printf '%s' "$1" | tr 'A-Z' 'a-z' |
    sed -e 's/[^a-z0-9-]/-/g' -e 's/--*/-/g' -e 's/^-//' -e 's/-$//' | cut -c1-40
}

# extract <ref> <dir> <yes|no: include music>
extract() {
  mkdir -p "$2"
  paths="$shipped tools/music_catalog.py"
  if [ "$3" = yes ]; then paths="$paths music"; fi
  git --git-dir="$git" archive "refs/heads/$1" $paths | tar -x -C "$2"
}

# stamp <dir> <cache key> <storage scope or empty> <label>
# The cache key mirrors the play build's ?v= stamping. The flags precede every
# game script, so storage keys are scoped before anything reads them.
stamp() {
  sed -i -r "s@(src|href)=\"((css|js|data|mods)/[^\"?#]+)\"@\1=\"\2?v=$2\"@g" "$1/index.html"
  sed -i -r "s@url\(\"(\.\./static/sprites/[^\"?#]+\.png)\"\)@url(\"\1?v=$2\")@g" "$1/css/style.css"
  flags="window.FB_BUILD_LABEL=\"$4\";"
  if [ -n "$3" ]; then flags="window.FB_STORAGE_SCOPE=\"$3\";$flags"; fi
  sed -i "s@<head>@<head><script>$flags</script>@" "$1/index.html"
  grep -q "FB_BUILD_LABEL" "$1/index.html"
}

# Test telemetry. When TEST_UMAMI_WEBSITE_ID names a separate Umami website,
# every build reports to it instead of the play website. The committed head
# script stays silent off play.fallowborn.com; this injected script runs after
# it and before the deferred game scripts, so it replaces FB.telemetry for the
# exact test origin only. Pageviews and events carry the build path name as the
# Umami tag, and events add the build's short commit as test_commit. Unset
# means no test telemetry; a malformed id fails the build.
test_site="${TEST_UMAMI_WEBSITE_ID:-}"
telemetry_template=""
if [ -n "$test_site" ]; then
  printf '%s' "$test_site" |
    grep -Eq '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' || {
    echo "TEST_UMAMI_WEBSITE_ID is not a lowercase Umami website id" >&2
    exit 1
  }
  telemetry_template="$work/telemetry.html"
  cat > "$telemetry_template" <<'JS'
    <script>
      (function () {
        "use strict";
        var site = "__FB_TEST_SITE__";
        var tag = "__FB_TEST_TAG__";
        var commit = "__FB_TEST_COMMIT__";

        function isTestSite(location) {
          return !!location &&
            location.protocol === "https:" &&
            location.hostname === "test.fallowborn.com";
        }

        if (!isTestSite(window.location)) return;
        var pending = [];

        function withBuild(data) {
          var copy = {};
          for (var key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) copy[key] = data[key];
          }
          copy.test_commit = commit;
          return copy;
        }

        window.FB = window.FB || {};
        window.FB.telemetry = {
          enabled: function () {
            return isTestSite(window.location);
          },
          isOfficialPlay: function () {
            return false;
          },
          track: function (name, data) {
            if (!isTestSite(window.location) || !name) return false;
            var payload = withBuild(data || {});
            if (window.umami && typeof window.umami.track === "function") {
              try {
                window.umami.track(name, payload);
                return true;
              } catch (error) {
                return false;
              }
            }
            if (pending.length < 32) pending.push([name, payload]);
            return false;
          }
        };

        var tracker = document.createElement("script");
        tracker.async = true;
        tracker.src = "https://stats.fallowborn.com/fb-client.js";
        tracker.setAttribute("data-website-id", site);
        tracker.setAttribute("data-domains", "test.fallowborn.com");
        tracker.setAttribute("data-do-not-track", "true");
        tracker.setAttribute("data-auto-track", "true");
        tracker.setAttribute("data-tag", tag);
        tracker.addEventListener("load", function () {
          while (pending.length && window.umami &&
              typeof window.umami.track === "function") {
            var event = pending.shift();
            try {
              window.umami.track(event[0], event[1]);
            } catch (error) {
              pending.unshift(event);
              break;
            }
          }
        });
        document.head.appendChild(tracker);
      })();
    </script>
JS
fi

# telemetry <dir> <tag> <short commit>: insert the test telemetry script
# immediately before </head>. Tags are sanitized path names and commits are
# hexadecimal, so neither needs escaping.
telemetry() {
  if [ -z "$telemetry_template" ]; then return 0; fi
  sed -e "s@__FB_TEST_SITE__@$test_site@" -e "s@__FB_TEST_TAG__@$2@" \
    -e "s@__FB_TEST_COMMIT__@$3@" "$telemetry_template" > "$work/telemetry-build.html"
  awk -v snippet="$work/telemetry-build.html" '
    !done && /<\/head>/ {
      while ((getline line < snippet) > 0) print line
      close(snippet)
      done = 1
    }
    { print }
  ' "$1/index.html" > "$work/index-telemetry.html"
  mv "$work/index-telemetry.html" "$1/index.html"
  grep -q '"data-tag", tag' "$1/index.html"
  if grep -q "__FB_TEST_" "$1/index.html"; then
    echo "Test telemetry placeholders remain in $1/index.html" >&2
    exit 1
  fi
}

json_entry() {
  printf '{"branch":"%s","path":"%s","commit":"%s","date":"%s","music":"%s"}' "$1" "$2" "$3" "$4" "$5"
}

commit_of() { git --git-dir="$git" rev-parse "refs/heads/$1"; }
date_of() { git --git-dir="$git" log -1 --format=%cI "refs/heads/$1"; }

# Root build.
root_sha="$(commit_of "$root_branch")"
root_short="$(printf '%s' "$root_sha" | cut -c1-7)"
extract "$root_branch" "$out" yes
python3 "$out/tools/music_catalog.py" build --root "$out"
rm -rf "$out/tools"
stamp "$out" "$root_sha" "" "$root_branch $root_short"
telemetry "$out" "$(sanitize "$root_branch")" "$root_short"
entries="$(json_entry "$root_branch" "/" "$root_sha" "$(date_of "$root_branch")" own)"
seen=" "
skipped=""

for branch in $(git --git-dir="$git" for-each-ref --format='%(refname:short)' refs/heads | sort); do
  case "$skip" in *" $branch "*) continue ;; esac
  if [ "$branch" = "$root_branch" ]; then continue; fi
  name="$(sanitize "$branch")"
  if [ -z "$name" ]; then echo "Skipping $branch: no usable path name." >&2; continue; fi
  case "$reserved" in *" $name "*) echo "Skipping $branch: /$name/ is reserved." >&2; continue ;; esac
  case "$seen" in *" $name "*) echo "Skipping $branch: /$name/ is already used." >&2; continue ;; esac
  seen="$seen$name "
  if ! git --git-dir="$git" grep -q "FB_STORAGE_SCOPE" "refs/heads/$branch" -- js/util.js; then
    echo "Skipping $branch: no storage scope support; merge dev into it." >&2
    skipped="$skipped$(printf '%s' "$branch" | sed 's/[\\"]//g') "
    continue
  fi
  sha="$(commit_of "$branch")"
  short="$(printf '%s' "$sha" | cut -c1-7)"
  dir="$out/$name"
  if git --git-dir="$git" diff --quiet "refs/heads/$root_branch" "refs/heads/$branch" -- music; then
    music=shared
    extract "$branch" "$dir" no
    # Shared audio follows the root soundtrack, so the catalog and cache key do too.
    cp "$out/data/music_catalog.js" "$dir/data/music_catalog.js"
    key="$sha-$root_short"
  else
    music=own
    extract "$branch" "$dir" yes
    python3 "$dir/tools/music_catalog.py" build --root "$dir"
    key="$sha"
  fi
  rm -rf "$dir/tools"
  stamp "$dir" "$key" "$name" "$name $short"
  telemetry "$dir" "$name" "$short"
  entries="$entries,$(json_entry "$branch" "/$name/" "$sha" "$(date_of "$branch")" "$music")"
done

mkdir -p "$out/branches"
printf '[%s]\n' "$entries" > "$out/branches/builds.json"
printf '%s\n' "$skipped" > "$work/skipped.txt"
python3 - "$out/branches/builds.json" "$out/branches/index.html" "$work/skipped.txt" <<'PY'
import html, json, sys
builds = json.load(open(sys.argv[1], encoding='utf-8'))
skipped = open(sys.argv[3], encoding='utf-8').read().split()
rows = ''.join(
    '<li><a href="%s">%s</a><span>%s · %s</span></li>' % (
        html.escape(b['path']), html.escape(b['branch']),
        html.escape(b['commit'][:7]), html.escape(b['date'][:10]))
    for b in builds)
page = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        '<meta name="robots" content="noindex,nofollow"><title>Fallowborn test builds</title>'
        '<style>body{margin:0;padding:24px 16px;background:#171310;color:#e8dcc0;'
        'font:16px/1.5 Georgia,serif}main{max-width:640px;margin:0 auto}h1{color:#d8b45a;'
        'font-size:26px}ul{list-style:none;padding:0}li{display:flex;justify-content:space-between;'
        'gap:12px;padding:12px 0;border-bottom:1px solid #4a3c28}a{color:#d8b45a;font-size:19px}'
        'span{color:#b5a68a}p{color:#b5a68a}</style></head><body><main>'
        '<h1>Fallowborn test builds</h1><p>Each build keeps its own saves and settings. '
        'Download a save file to move a life between builds.</p><ul>' + rows +
        '</ul>' + (('<p>Not published until dev is merged into them (their saves would '
        'mix with the root build): ' + html.escape(', '.join(skipped)) + '.</p>') if skipped else '') +
        '</main></body></html>\n')
open(sys.argv[2], 'w', encoding='utf-8').write(page)
PY
rm -rf "$work"
echo "Built $(printf '%s' "$entries" | tr ',' '\n' | grep -c '"branch"') test builds."

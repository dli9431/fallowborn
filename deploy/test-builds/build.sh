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
# /branches/ lists every build. Used only by deploy/test-builds/Dockerfile.
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
entries="$(json_entry "$root_branch" "/" "$root_sha" "$(date_of "$root_branch")" own)"
seen=" "

for branch in $(git --git-dir="$git" for-each-ref --format='%(refname:short)' refs/heads | sort); do
  case "$skip" in *" $branch "*) continue ;; esac
  if [ "$branch" = "$root_branch" ]; then continue; fi
  name="$(sanitize "$branch")"
  if [ -z "$name" ]; then echo "Skipping $branch: no usable path name." >&2; continue; fi
  case "$reserved" in *" $name "*) echo "Skipping $branch: /$name/ is reserved." >&2; continue ;; esac
  case "$seen" in *" $name "*) echo "Skipping $branch: /$name/ is already used." >&2; continue ;; esac
  seen="$seen$name "
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
  entries="$entries,$(json_entry "$branch" "/$name/" "$sha" "$(date_of "$branch")" "$music")"
done

mkdir -p "$out/branches"
printf '[%s]\n' "$entries" > "$out/branches/builds.json"
python3 - "$out/branches/builds.json" "$out/branches/index.html" <<'PY'
import html, json, sys
builds = json.load(open(sys.argv[1], encoding='utf-8'))
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
        '</ul></main></body></html>\n')
open(sys.argv[2], 'w', encoding='utf-8').write(page)
PY
rm -rf "$work"
echo "Built $(printf '%s' "$entries" | tr ',' '\n' | grep -c '"branch"') test builds."

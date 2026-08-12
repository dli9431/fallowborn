#!/usr/bin/env python3
"""Extract real-world settlement sites from GeoNames (with an optional
OpenStreetMap top-up) and emit data/settlements_real.js.

One-time build-time tool (never shipped logic): for every gameplay county in
data/counties.js it takes the populated places of the GeoNames country dumps,
assigns each place to the county the game's own raster gives it (the exact
nearest-seed pipeline of js/world.js, including the shore rule that keeps
counties from spanning a carved sea), and writes the winners
as `fill: true` presentations that replace the generated settlement
names/locations without forcing early visibility. An optional `--topup` pass
queries the Overpass API around short counties' seeds.

Curated layouts in data/settlements.js always win: imported entries are only
appended after them, and counties with a curated county head keep it.

Safety rules that keep the emitted data inside the engine's snap gate
(js/world.js SETTLEMENT_SNAP_MAX = 45 world px):
  - a candidate on land belongs to the county its raster cell belongs to —
    the Raster class below replicates the engine's scanline fill, seed
    snapping, landmass-restricted nearest-seed assignment, and
    orphan-fragment reassignment exactly — so it is accepted at any distance;
  - a candidate in water (off the simplified coastline) is accepted only
    within SNAP_SAFE_PX of its winning seed, because the seed's own pixel
    always belongs to the county and is therefore inside the snap ring.

Data: GeoNames geographical database (CC BY 4.0, geonames.org) and, with
--topup, (c) OpenStreetMap contributors (ODbL). This attribution must stay in
the generated file header and docs/MODDING.md.

Usage:
  python tools/settlement_import.py                # full GeoNames run
  python tools/settlement_import.py --topup        # + Overpass around short counties
  python tools/settlement_import.py --limit 10     # first 10 counties
  python tools/settlement_import.py --county blois # one county
  python tools/settlement_import.py --offline      # cache only, no network

GeoNames zips cache in tools/geonames_cache/ and Overpass responses in
tools/osm_overpass_cache.json (both gitignored), so an interrupted run
resumes where it stopped.
"""

import argparse
import bisect
import hashlib
import io
import json
import math
import os
import re
import sys
import time
import unicodedata
import zipfile

try:
    import urllib.request
except ImportError:  # pragma: no cover
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COUNTIES_JS = os.path.join(ROOT, 'data', 'counties.js')
SETTLEMENTS_JS = os.path.join(ROOT, 'data', 'settlements.js')
MAP_DATA_JS = os.path.join(ROOT, 'data', 'map_data.js')
OUT_JS = os.path.join(ROOT, 'data', 'settlements_real.js')
CACHE_JSON = os.path.join(ROOT, 'tools', 'osm_overpass_cache.json')
GEONAMES_DIR = os.path.join(ROOT, 'tools', 'geonames_cache')
GEONAMES_URL = 'https://download.geonames.org/export/dump/%s.zip'

# ISO codes of every country the playable map touches; rows are also filtered
# to the FBDATA.bounds window, so generous inclusion is harmless.
GEONAMES_ISO = (
    'AD AL AM AT AZ BA BE BG BH BY CH CY CZ DE DJ DK DZ EE EG EH ER ES ET FI FO '
    'FR GB GE GR HR HU IE IL IM IQ IR IS IT JO KG KW KZ LB LI LT LV LY MA MC MD '
    'ME MK ML MR MT NE NL NO OM PK PL PS PT QA RO RS RU SA SD SE SI SK SM SY '
    'TJ TM TN TR UA UZ VA YE'
).split()

OVERPASS_MIRRORS = [
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
]

GRID_W = 1100
SNAP_SAFE_PX = 44          # engine snap ceiling is 45; keep one pixel of margin
RADII_M = (8000, 16000, 32000)
PLACE_BASE = '^(city|town|village)$'
PLACE_FALLBACK = '^(city|town|village|hamlet)$'
PLACE_RANK = {'city': 3, 'town': 2, 'village': 1, 'hamlet': 0}

# legacyBase + villageBonus(9) in js/world.js: generated counties reveal at
# most 2 + (hash % 2) + 4 = 6-7 settlements; fill only what can ever show.
VILLAGE_BONUS_MAX = 4


# --------------------------------------------------------------------------
# source parsing
# --------------------------------------------------------------------------

def js_unescape(s):
    return s.replace("\\'", "'").replace('\\\\', '\\')


def js_escape(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def parse_counties(path):
    """Return ordered [{id, name, lon, lat, wasteland}] — order is the
    province index, which breaks nearest-seed ties in the engine."""
    src = open(path, encoding='utf-8').read()
    row = re.compile(
        r"^\['((?:[^'\\]|\\.)*)','((?:[^'\\]|\\.)*)',"
        r"(-?[0-9.]+),(-?[0-9.]+),(null|'(?:[^'\\]|\\.)*')", re.M)
    out = []
    for m in row.finditer(src):
        out.append({
            'id': js_unescape(m.group(1)),
            'name': js_unescape(m.group(2)),
            'lon': float(m.group(3)),
            'lat': float(m.group(4)),
            'wasteland': m.group(5) == 'null',
        })
    if not out:
        raise SystemExit('no county rows parsed from ' + path)
    return out


def parse_settlements(path):
    """Return (sites, curated) where sites maps slug -> (lon, lat) and
    curated maps bookmark -> pid -> [{site, name, kind}]."""
    src = open(path, encoding='utf-8').read()
    sites = {}
    sblock = src[src.index('var SITES = {'):src.index('/* ---- bookmark layouts')]
    for m in re.finditer(r"^\s*([a-z0-9_]+): \{ x: (-?[0-9.]+), y: (-?[0-9.]+) \},?\s*$",
                         sblock, re.M):
        sites[m.group(1)] = (float(m.group(2)), float(m.group(3)))
    curated = {'867': {}, '1066': {}}
    call = re.compile(
        r"(?:layout\('(867|1066)', '([a-z0-9_]+)'|both\('([a-z0-9_]+)')\s*,\s*\[(.*?)\]\s*\)",
        re.S)
    entry = re.compile(
        r"\[\s*'([a-z0-9_]+)',\s*'((?:[^'\\]|\\.)*)',\s*'(village|town|city)'\s*\]")
    for m in call.finditer(src):
        entries = [{'site': e.group(1), 'name': js_unescape(e.group(2)),
                    'kind': e.group(3)} for e in entry.finditer(m.group(4))]
        if m.group(3):
            pids_bookmarks = [('867', m.group(3)), ('1066', m.group(3))]
        else:
            pids_bookmarks = [(m.group(1), m.group(2))]
        for bookmark, pid in pids_bookmarks:
            curated[bookmark][pid] = [dict(e) for e in entries]
    return sites, curated


def parse_bounds_and_land(path):
    src = open(path, encoding='utf-8').read()
    bm = re.search(
        r'FBDATA\.bounds = \{ lonMin: (-?[0-9.]+), lonMax: (-?[0-9.]+), '
        r'latMin: (-?[0-9.]+), latMax: (-?[0-9.]+) \};', src)
    if not bm:
        raise SystemExit('FBDATA.bounds not found in ' + path)
    bounds = tuple(float(bm.group(i)) for i in range(1, 5))

    def block(anchor):
        start = src.index(anchor)
        i = src.index('[', start)
        depth, end = 0, i
        while True:
            c = src[end]
            if c == '[':
                depth += 1
            elif c == ']':
                depth -= 1
                if depth == 0:
                    return src[i:end + 1]
            end += 1

    def polys(anchor):
        text = re.sub(r'/\*.*?\*/', '', block(anchor), flags=re.S)
        return [[float(n) for n in re.findall(r'-?[0-9]+\.?[0-9]*', g)]
                for g in re.findall(r'\[([^\[\]]+)\]', text, re.S)]

    return bounds, polys('FBDATA.land ='), polys('FBDATA.seas =')


# --------------------------------------------------------------------------
# projection & geometry (mirrors js/util.js and js/world.js)
# --------------------------------------------------------------------------

DEG = math.pi / 180


def merc_y(lat):
    return math.log(math.tan(math.pi / 4 + lat * DEG / 2)) / DEG


class Projection(object):
    def __init__(self, bounds):
        lon_min, lon_max, lat_min, lat_max = bounds
        self.scale = GRID_W / (lon_max - lon_min)
        self.lon_min = lon_min
        self.merc_top = merc_y(lat_max)

    def x(self, lon):
        return (lon - self.lon_min) * self.scale

    def y(self, lat):
        return (self.merc_top - merc_y(lat)) * self.scale


def str_hash(s):
    """djb2, identical to strHash in js/world.js."""
    h = 5381
    for ch in s:
        h = ((h << 5) + h + ord(ch)) & 0xFFFFFFFF
    return h


def point_in_poly(poly, lon, lat):
    """Even-odd test; poly is a flat [lon, lat, ...] list."""
    inside = False
    n = len(poly)
    j = n - 2
    for i in range(0, n, 2):
        xi, yi = poly[i], poly[i + 1]
        xj, yj = poly[j], poly[j + 1]
        if (yi > lat) != (yj > lat):
            x_cross = (xj - xi) * (lat - yi) / (yj - yi) + xi
            if lon < x_cross:
                inside = not inside
        j = i
    return inside


class Landmass(object):
    """Which FBDATA.land polygon (1-based) covers a lon/lat point, after the
    sea polygons carve theirs out — the raster's landmass id. Later land
    polygons overwrite earlier ones; any sea polygon clears to water.
    Results are memoized on a ~500 m grid; every query hits the same few
    polygons, so the cache turns per-pixel point-in-polygon into a rare
    cost."""

    def __init__(self, land, seas):
        self.land_polys = []   # tested in reverse: last covering poly wins
        for idx, poly in enumerate(land):
            xs = poly[0::2]
            ys = poly[1::2]
            self.land_polys.append(
                {'id': idx + 1, 'poly': poly,
                 'bbox': (min(xs), min(ys), max(xs), max(ys))})
        self.sea_polys = []
        for poly in seas:
            xs = poly[0::2]
            ys = poly[1::2]
            self.sea_polys.append(
                {'poly': poly, 'bbox': (min(xs), min(ys), max(xs), max(ys))})
        self.memo = {}

    def at(self, lon, lat):
        key = (round(lon * 200), round(lat * 200))
        hit = self.memo.get(key)
        if hit is not None:
            return hit
        mass = 0
        for p in self.sea_polys:
            bx0, by0, bx1, by1 = p['bbox']
            if bx0 <= lon <= bx1 and by0 <= lat <= by1 and \
                    point_in_poly(p['poly'], lon, lat):
                self.memo[key] = 0
                return 0
        for p in reversed(self.land_polys):
            bx0, by0, bx1, by1 = p['bbox']
            if bx0 <= lon <= bx1 and by0 <= lat <= by1 and \
                    point_in_poly(p['poly'], lon, lat):
                mass = p['id']
                break
        self.memo[key] = mass
        return mass


def js_round(v):
    """JavaScript Math.round: half toward positive infinity (Python's round
    is banker's rounding)."""
    return math.floor(v + 0.5)


class Raster(object):
    """The engine's county raster, replicated exactly (js/world.js): land
    polygons scanline-filled in order, sea polygons carved out, seeds
    snapped to land, landmass-restricted nearest-seed assignment, then the
    shore rule — a fragment cut off from its seed on the same landmass
    passes to the neighboring county it actually borders, so no county
    spans a carved sea (Tangier no longer holds the Gibraltar shore).
    at(x, y) returns the province index + 1 at a projected point, 0 at sea.
    """

    def __init__(self, bounds, land, seas, seeds):
        proj = Projection(bounds)
        self.W = GRID_W
        self.H = int(round((proj.merc_top - merc_y(bounds[2])) * proj.scale))
        W, H = self.W, self.H

        def fill(mask, pts, value):
            """Even-odd scanline fill, identical to fillPolyScanline in
            js/world.js; works on any indexable mutable sequence."""
            ys = [p[1] for p in pts]
            y0 = max(0, int(math.floor(min(ys))))
            y1 = min(H - 1, int(math.ceil(max(ys))))
            n = len(pts)
            for y in range(y0, y1 + 1):
                yc = y + 0.5
                xs = []
                for i in range(n):
                    a, b = pts[i], pts[(i + 1) % n]
                    if (a[1] <= yc < b[1]) or (b[1] <= yc < a[1]):
                        xs.append(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]))
                xs.sort()
                for k in range(0, len(xs) - 1, 2):
                    xa = max(0, js_round(xs[k]))
                    xb = min(W - 1, js_round(xs[k + 1]) - 1)
                    for x in range(xa, xb + 1):
                        mask[y * W + x] = value

        land_mask = bytearray(W * H)
        landmass = [0] * (W * H)

        def project(poly):
            return [(proj.x(poly[i]), proj.y(poly[i + 1]))
                    for i in range(0, len(poly), 2)]

        for li, poly in enumerate(land):
            pts = project(poly)
            fill(land_mask, pts, 1)
            fill(landmass, pts, li + 1)
        for poly in seas:
            pts = project(poly)
            fill(land_mask, pts, 0)
            fill(landmass, pts, 0)

        # snap seeds that fell in water to the nearest land pixel (engine order)
        for s in seeds:
            sx = min(max(js_round(s['x']), 0), W - 1)
            sy = min(max(js_round(s['y']), 0), H - 1)
            if not land_mask[sy * W + sx]:
                found = False
                for r in range(1, 50):
                    for dy in range(-r, r + 1):
                        if found:
                            break
                        for dx in range(-r, r + 1):
                            if max(abs(dx), abs(dy)) != r:
                                continue
                            nx, ny = sx + dx, sy + dy
                            if 0 <= nx < W and 0 <= ny < H and land_mask[ny * W + nx]:
                                sx, sy = nx, ny
                                found = True
                                break
                    if found:
                        break
            s['sx'], s['sy'] = sx, sy
            s['rlm'] = landmass[sy * W + sx]

        landmass_seeds = {}
        for s in seeds:
            if s['rlm']:
                landmass_seeds[s['rlm']] = landmass_seeds.get(s['rlm'], 0) + 1
        ordered = sorted(seeds, key=lambda s: s['sx'])
        sx_arr = [s['sx'] for s in ordered]
        n_seeds = len(ordered)
        grid = [0] * (W * H)
        for y in range(H):
            row = y * W
            for x in range(W):
                if not land_mask[row + x]:
                    continue
                restrict = landmass_seeds.get(landmass[row + x]) and landmass[row + x] or 0
                lo = bisect.bisect_left(sx_arr, x)
                best, bd, bidx = -1, float('inf'), float('inf')
                i = lo
                while i < n_seeds:  # walk right
                    dx = sx_arr[i] - x
                    if dx * dx > bd:
                        break
                    s = ordered[i]
                    if not restrict or s['rlm'] == restrict:
                        dy = s['sy'] - y
                        d = dx * dx + dy * dy
                        if d < bd or (d == bd and s['idx'] < bidx):
                            bd, best, bidx = d, i, s['idx']
                    i += 1
                i = lo - 1
                while i >= 0:  # walk left
                    dx = x - sx_arr[i]
                    if dx * dx > bd:
                        break
                    s = ordered[i]
                    if not restrict or s['rlm'] == restrict:
                        dy = s['sy'] - y
                        d = dx * dx + dy * dy
                        if d < bd or (d == bd and s['idx'] < bidx):
                            bd, best, bidx = d, i, s['idx']
                    i -= 1
                grid[row + x] = ordered[best]['idx'] + 1

        # shore rule: same-landmass fragments cut off from their seed pass to
        # the keeper county they border; cross-polygon island gains stay
        seed_at = {s['idx']: s['sy'] * W + s['sx'] for s in seeds}
        seen = bytearray(W * H)
        orphan = bytearray(W * H)
        for i in range(W * H):
            v = grid[i]
            if not v or seen[i]:
                continue
            pidx = v - 1
            has_seed = False
            comp = []
            stack = [i]
            seen[i] = 1
            while stack:
                c = stack.pop()
                comp.append(c)
                if c == seed_at[pidx]:
                    has_seed = True
                cx, cy = c % W, c // W
                for q in (c - 1 if cx > 0 else -1,
                          c + 1 if cx < W - 1 else -1,
                          c - W if cy > 0 else -1,
                          c + W if cy < H - 1 else -1):
                    if q >= 0 and grid[q] == v and not seen[q]:
                        seen[q] = 1
                        stack.append(q)
            if has_seed:
                continue
            seed_lm = seeds[pidx]['rlm']
            for c in comp:
                if landmass[c] == seed_lm:
                    orphan[c] = 1
        queue = []
        for i in range(W * H):
            if not orphan[i]:
                continue
            cx, cy = i % W, i // W
            for q in (i - 1 if cx > 0 else -1,
                      i + 1 if cx < W - 1 else -1,
                      i - W if cy > 0 else -1,
                      i + W if cy < H - 1 else -1):
                if q >= 0 and grid[q] and not orphan[q] and grid[q] != grid[i]:
                    orphan[i] = 0
                    grid[i] = grid[q]
                    queue.append(i)
                    break
        qh = 0
        while qh < len(queue):
            c = queue[qh]
            qh += 1
            owner = grid[c]
            cx, cy = c % W, c // W
            for q in (c - 1 if cx > 0 else -1,
                      c + 1 if cx < W - 1 else -1,
                      c - W if cy > 0 else -1,
                      c + W if cy < H - 1 else -1):
                if q >= 0 and orphan[q]:
                    orphan[q] = 0
                    grid[q] = owner
                    queue.append(q)
        self.grid = grid

    def at(self, x, y):
        gx, gy = int(x), int(y)
        if gx < 0 or gy < 0 or gx >= self.W or gy >= self.H:
            return 0
        return self.grid[gy * self.W + gx]


# --------------------------------------------------------------------------
# overpass
# --------------------------------------------------------------------------

class Overpass(object):
    def __init__(self, cache_path, offline, sleep_s):
        self.offline = offline
        self.sleep_s = sleep_s
        self.cache = {}
        self.dirty = False
        if os.path.exists(cache_path):
            self.cache = json.load(open(cache_path, encoding='utf-8'))
        self.cache_path = cache_path

    def fetch(self, data):
        """Run one Overpass QL query with mirror failover; cache by query.
        Returns the element list, or None when every mirror failed."""
        key = hashlib.sha1(data.encode('utf-8')).hexdigest()
        if key in self.cache:
            return self.cache[key]
        if self.offline:
            return None
        body = ('data=' + urllib.request.quote(data)).encode('utf-8')
        payload = None
        for mi in range(len(OVERPASS_MIRRORS) * 2):
            url = OVERPASS_MIRRORS[mi % len(OVERPASS_MIRRORS)]
            try:
                req = urllib.request.Request(url, body, headers={
                    'User-Agent': 'fallowborn-settlement-import/1.0 '
                                  '(https://fallowborn.com; one-time data extraction)',
                    'Content-Type': 'application/x-www-form-urlencoded'})
                with urllib.request.urlopen(req, timeout=180) as resp:
                    payload = json.loads(resp.read().decode('utf-8'))
                break
            except Exception as exc:  # 429, 504, 5xx, timeouts — next mirror
                sys.stderr.write('overpass %s failed (%s)\n'
                                 % (url.split('/')[2], str(exc)[:100]))
                time.sleep(8)
        if payload is None:
            return None
        elements = [
            {'src': 'osm', 'id': e['id'], 'lat': e['lat'], 'lon': e['lon'],
             'place': e.get('tags', {}).get('place', ''),
             'name': e.get('tags', {}).get('name:en') or e.get('tags', {}).get('name'),
             'population': e.get('tags', {}).get('population', '')}
            for e in payload.get('elements', [])
            if e.get('type') == 'node'
        ]
        self.cache[key] = elements
        self.dirty = True
        time.sleep(self.sleep_s)
        return elements

    def query_around(self, lat, lon, radius_m, place_re):
        return self.fetch('[out:json][timeout:60];'
                          'node(around:%d,%f,%f)[place~"%s"];'
                          'out body;' % (radius_m, lat, lon, place_re))

    def query_bbox(self, lat0, lon0, lat1, lon1, place_re):
        return self.fetch('[out:json][timeout:120];'
                          'node[place~"%s"](%f,%f,%f,%f);'
                          'out body;' % (place_re, lat0, lon0, lat1, lon1))

    def save(self):
        if self.dirty:
            json.dump(self.cache, open(self.cache_path, 'w', encoding='utf-8'))
            self.dirty = False


# --------------------------------------------------------------------------
# geonames
# --------------------------------------------------------------------------

def geo_place(code, pop):
    """Ranking-only place tier; the emitted kind is always 'village'."""
    if code == 'PPLC' or pop >= 50000:
        return 'city'
    if code in ('PPLA', 'PPLA2', 'PPLA3') or pop >= 5000:
        return 'town'
    return 'village'


def download(url, dest):
    body_req = urllib.request.Request(url, headers={
        'User-Agent': 'fallowborn-settlement-import/1.0 '
                      '(https://fallowborn.com; one-time data extraction)'})
    with urllib.request.urlopen(body_req, timeout=120) as resp:
        data = resp.read()
    with open(dest, 'wb') as fh:
        fh.write(data)


# Countries whose GeoNames main name is the native name in a Latin alphabet
# (accents worth keeping). Everywhere else the main name is a romanization
# and the plain ASCII column reads better.
LATIN_NATIVE_ISO = set(
    'AD AL AT AZ BA BE CH CY CZ DE DK EE ES FI FO FR GB HR HU IE IM IS IT '
    'LI LT LV MD ME MK MT NL NO PL PT RO RS SE SI SK SM TR VA'.split())


def geo_display_name(iso, name, ascii_name):
    """GeoNames `name` is the native name in Latin-script countries but a
    romanization full of cataloguing diacritics (ḩ, ā, ţ, ‘) elsewhere. Keep
    native names with accents at or below U+017F; otherwise prefer the plain
    ASCII name."""
    if name:
        if all(ord(c) < 128 for c in name):
            return name
        if iso in LATIN_NATIVE_ISO and all(ord(c) <= 0x017F for c in name):
            return name
    if ascii_name and all(ord(c) < 128 for c in ascii_name):
        return ascii_name
    return name


def load_geonames(bounds, offline):
    """Yield {src, id, lat, lon, place, name, population} for every populated
    place (feature class P) inside the playable window from the per-country
    GeoNames dumps; zips cache under tools/geonames_cache/. Missing country
    files are collected and reported loudly at the end — a silent gap leaves
    a whole country on generated names."""
    os.makedirs(GEONAMES_DIR, exist_ok=True)
    lon_min, lon_max, lat_min, lat_max = bounds
    missing = []
    for iso in GEONAMES_ISO:
        zip_path = os.path.join(GEONAMES_DIR, iso + '.zip')
        if not os.path.exists(zip_path):
            if offline:
                missing.append(iso)
                continue
            ok = False
            for attempt in range(3):
                try:
                    download(GEONAMES_URL % iso, zip_path)
                    time.sleep(0.4)
                    ok = True
                    break
                except Exception as exc:
                    sys.stderr.write('geonames %s download failed (%s)\n'
                                     % (iso, str(exc)[:100]))
                    time.sleep(3)
            if not ok:
                missing.append(iso)
                continue
        try:
            with zipfile.ZipFile(zip_path) as zf:
                raw = zf.read(iso + '.txt').decode('utf-8')
        except Exception as exc:
            sys.stderr.write('geonames %s unreadable (%s)\n'
                             % (iso, str(exc)[:100]))
            missing.append(iso)
            continue
        for line in raw.split('\n'):
            f = line.split('\t')
            if len(f) < 19 or f[6] != 'P' or f[7] == 'PPLX':
                continue
            lat, lon = float(f[4]), float(f[5])
            if not (lat_min - 1 <= lat <= lat_max + 1 and
                    lon_min - 1 <= lon <= lon_max + 1):
                continue
            name = geo_display_name(iso, f[1], f[2])
            if not name:
                continue
            pop = int(f[14] or 0)
            yield {'src': 'geo', 'id': int(f[0]), 'lat': lat, 'lon': lon,
                   'place': geo_place(f[7], pop), 'name': name,
                   'population': f[14]}
    if missing:
        print('WARNING: no GeoNames data for: %s — affected regions keep '
              'generated names; rerun to retry the downloads'
              % ' '.join(missing), flush=True)


# --------------------------------------------------------------------------
# naming
# --------------------------------------------------------------------------

def norm_name(name):
    base = unicodedata.normalize('NFKD', name)
    return ''.join(c for c in base if not unicodedata.combining(c)).lower().strip()


NUMBERED_ADMIN = re.compile(r'^(.*?)\s+\d{1,2}(?:er|eme|ème|e)?\s+(\S.*)$')


def clean_numbered_name(name):
    """GeoNames catalogs city sections under modern administrative labels
    like 'Paris 16 Passy' or 'Paris 15 Vaugirard'; the medieval world wants
    the historical place name the label embeds ('Passy', 'Vaugirard').
    A bare numbered label ('Lyon 01') or an '… Arrondissement' suffix has
    no historical reading, and any name still carrying digits after the
    strip is a modern artifact — drop the candidate."""
    m = NUMBERED_ADMIN.match(name)
    if m and not m.group(2).lower().startswith('arrondissement'):
        name = m.group(2)
    if any(c.isdigit() for c in name):
        return ''
    return name.strip()


def slugify(name, node):
    base = unicodedata.normalize('NFKD', name)
    ascii_name = ''.join(c for c in base if not unicodedata.combining(c))
    slug = re.sub(r'[^a-z0-9]+', '_', ascii_name.lower()).strip('_')
    if not slug:
        slug = 'place'
    return '%s_%s_%d' % (node['src'], slug, node['id'])


# GeoNames (and OSM) are modern databases. Use a well-attested medieval name
# for a later foundation or renaming where the same place has one. If no
# defensible medieval predecessor is known, POST_MEDIEVAL_NAMES rejects that
# candidate so the next ranked real place can fill the slot instead.
# NON_SETTLEMENT_NAMES does the same for modern districts and geographic
# labels. County-head entries are exempt: they must keep the county's own name
# (the head contract asserted by the e2e suite).
HISTORICAL_NAMES = {
    'Acqui Terme': 'Acqui',
    'Adıyaman': 'Hisn Mansur',
    'Afyonkarahisar': 'Akroinon',
    'Akşehir': 'Philomelion',
    'Alanya': 'Kalonoros',
    'Albert': 'Ancre',
    'Albertville': 'Conflans',
    'Ankara': 'Ancyra',
    'Antalya': 'Attaleia',
    'Anapa': 'Mapa',
    'Armadale': 'Barbauchlaw',
    'Asenovgrad': 'Stenimachos',
    'Ashbourne': 'Killegland',
    'Azov': 'Tana',
    'Ashgabat': 'Konjikala',
    'Aydın': 'Tralles',
    'Babol': 'Mamtir',
    'Bad Mergentheim': 'Mergentheim',
    'Bad Neuenahr-Ahrweiler': 'Ahrweiler',
    'Bad Oldesloe': 'Oldesloe',
    'Bad Reichenhall': 'Reichenhall',
    'Bad Schwartau': 'Schwartau',
    'Baltiysk': 'Pillau',
    'Bassano del Grappa': 'Bassano',
    'Batman': 'Iluh',
    'Benghazi': 'Berenice',
    'Bingöl': 'Çapakçur',
    'Bletchley': 'Bicchelai',
    'Bognor Regis': 'Bognor',
    'Bolu': 'Claudiopolis',
    'Bolvadin': 'Polybotos',
    'Brive-la-Gaillarde': 'Brive',
    'Budapest': 'Óbuda',
    'Bursa': 'Prusa',
    'Casablanca': 'Anfa',
    'Bremerhaven': 'Geestendorf',
    'Castellammare di Stabia': 'Castellammare',
    'Castle Douglas': 'Carlingwark',
    'Cava Dè Tirreni': 'Cava',
    'Charleville-Mézières': 'Mézières',
    'Chernyakhovsk': 'Insterburg',
    'Clermont-Ferrand': 'Clermont',
    'Constanţa': 'Constantia',
    'Craigavon': 'Seagoe',
    'Crotone': 'Cotrone',
    'Daugavpils': 'Dünaburg',
    'Diyarbakır': 'Amida',
    'Drobeta-Turnu Severin': 'Drobeta',
    'Edirne': 'Adrianople',
    'Elazığ': 'Harput',
    'Ereğli': 'Heraclea',
    'Erzurum': 'Theodosiopolis',
    'Eskişehir': 'Dorylaeum',
    'Fort William': 'Inverlochy',
    'Friedrichshafen': 'Buchhorn',
    'Gatchina': 'Khotchino',
    'Gaziantep': 'Aintab',
    'Giresun': 'Kerasous',
    'Glenrothes': 'Markinch',
    'Gothenburg': 'Nya Lödöse',
    'Guidonia Montecelio': 'Montecelio',
    'Gyumri': 'Kumayri',
    'Halle (Saale)': 'Halle',
    'Hamilton': 'Cadzow',
    'Hérouville-Saint-Clair': 'Hérouville',
    'Iranshahr': 'Fahraj',
    'Jerez de la Frontera': 'Jerez',
    'Kadirli': 'Flaviopolis',
    'Kahramanmaraş': 'Marash',
    'Kaliningrad': 'Königsberg',
    'Karaman': 'Laranda',
    'Kędzierzyn-Koźle': 'Koźle',
    'Karlstad': 'Tingvalla',
    'Kavala': 'Christoupolis',
    'Kayseri': 'Caesarea',
    'Khorramabad': 'Shapurkhast',
    'Khuzdar': 'Qusdar',
    "King's Lynn": "Bishop's Lynn",
    'Kingisepp': 'Yamburg',
    'Kingston upon Hull': 'Wyke',
    'Klagenfurt am Wörthersee': 'Klagenfurt',
    'Klaipėda': 'Memel',
    'Konya': 'Iconium',
    'Kozan': 'Sis',
    'Küçükçekmece': 'Rhegion',
    'Kütahya': 'Cotyaeum',
    'Kızıltepe': 'Dunaysir',
    'Latakia': 'Laodicea',
    'Le Puy-en-Velay': 'Le Puy',
    'Lisburn': 'Lisnagarvey',
    'Londonderry County Borough': 'Derry',
    'Lüleburgaz': 'Arcadiopolis',
    'Makhachkala': 'Tarki',
    'Manisa': 'Magnesia',
    'Martigny-Ville': 'Martigny',
    'Mashhad': 'Sanabad',
    'Mikkeli': 'Savilahti',
    'Mohammedia': 'Fedala',
    'Montana': 'Kutlovitsa',
    'Nikšić': 'Onogošt',
    'Novorossiysk': 'Bata',
    'Nova Gorica': 'Solkan',
    'Orumiyeh': 'Urmia',
    'Pescara': 'Piscaria',
    'Priego de Córdoba': 'Bago',
    'Qarshi': 'Nasaf',
    "Reggio nell'Emilia": 'Reggio',
    'Riva del Garda': 'Riva',
    'Riyadh': 'Hajr',
    'Romorantin-Lanthenay': 'Romorantin',
    'Rosignano Solvay-Castiglioncello': 'Castiglioncello',
    'Royal Leamington Spa': 'Leamington Priors',
    "Ryazan'": 'Pereyaslavl-Ryazansky',
    'Rybinsk': 'Ust-Sheksna',
    'Sablé-sur-Sarthe': 'Sablé',
    'Sagunto': 'Murviedro',
    'Samsun': 'Amisos',
    'San Donà di Piave': 'San Donà',
    'Sarlat-la-Canéda': 'Sarlat',
    'Saratov': 'Uvek',
    'Savonlinna': 'Olavinlinna',
    'Schwandorf in Bayern': 'Schwandorf',
    'Sevastopol': 'Chersonesus',
    'Shahr-e Kord': 'Deh Kord',
    'Shahreza': 'Qomsheh',
    'Shahrisabz': 'Kesh',
    'Silifke': 'Seleucia',
    'Simferopol': 'Scythian Neapolis',
    'Sivas': 'Sebasteia',
    'Sovetsk': 'Tilsit',
    'Stara Zagora': 'Beroe',
    'Stoke-on-Trent': 'Stoke-upon-Trent',
    'Suez': 'al-Qulzum',
    'Tampere': 'Koski',
    'Tarquinia': 'Corneto',
    'Tekirdağ': 'Rodosto',
    'Tel Aviv': 'Jaffa',
    'Telford': 'Dawley',
    'Thonon-les-Bains': 'Thonon',
    'Torbat-e Heydariyeh': 'Zaveh',
    'Torbat-e Jam': 'Jam',
    'Trabzon': 'Trebizond',
    'Tuzla': 'Soli',
    'Vaasa': 'Korsholm',
    'Valencia de Don Juan': 'Valencia de Campos',
    'Vantaa': 'Helsinge',
    'Veliko Turnovo': 'Tarnovo',
    'Viranşehir': 'Constantina',
    'Wilhelmshaven': 'Heppens',
    'Wolfsburg': 'Hesslingen',
    'Yevpatoriya': 'Gözleve',
    'Yalvaç': 'Pisidian Antioch',
    'İskenderun': 'Alexandretta',
    'İzmir': 'Smyrna',
    'İzmit': 'Nicomedia',
    'Şanlıurfa': 'Edessa',
}

POST_MEDIEVAL_NAMES = {
    'Alchevsk',
    'Kramatorsk',
    'Novoshakhtinsk',
    'Siverskodonetsk',
    'Slovyansk',
    'Argun',
    'Balakovo',
    'Bataysk',
    'Belgorod',
    'Berdyansk',
    'Borisoglebsk',
    'Buynaksk',
    'Engels',
    'Esenler',
    'Gudermes',
    'Iisalmi',
    'Imatra',
    'Ismailia',
    'Izberbash',
    'Joensuu',
    'Kamyshin',
    'Kaspiysk',
    'Kizlyar',
    'Kronstadt',
    'Lipetsk',
    'Lomonosov',
    'Maltepe',
    'Melitopol',
    'Novocherkassk',
    'Nõmme',
    'Oryol',
    'Östersund',
    'Penza',
    'Sancaktepe',
    'Sestroretsk',
    'Shakhty',
    'Shubra al Khaymah',
    'Siilinjärvi',
    'Slavyansk-na-Kubani',
    'Sochi',
    'Sultangazi',
    'Tambov',
    'Tikhoretsk',
    'Volgodonsk',
    'Zelenogorsk',
    'Dagestanskiye Ogni',
    'Agadir',
    'Al Ahmadi',
    'Al Madinah',
    'Baharestan',
    'Bekobod',
    'Bournemouth',
    'Caol',
    'Castlebridge',
    'Cherkessk',
    'Clydebank',
    'Coalville',
    'Courtown',
    'Dnipro',
    'Donetsk',
    'Eastleigh',
    'El Jadida',
    'Elista',
    'Esenyurt',
    'Färjestaden',
    'Grozny',
    'Havířov',
    'Holon',
    'Horlivka',
    'Kajaani',
    'Khasavyurt',
    'Khartoum',
    'Khouribga',
    'Kizilyurt',
    'Kostomuksha',
    'Kotka',
    'Krasnodar',
    'Kropotkin',
    'Luhansk',
    'Lusail',
    'Makiyivka',
    'Mariupol',
    'Marsa Alam',
    'Maykop',
    'Milton Keynes',
    'Mohammadia',
    'Nalchik',
    'Orenburg',
    'Örnsköldsvik',
    'Petrodvorets',
    'Petrozavodsk',
    'Saint Petersburg',
    'Rostov-on-Don',
    'Saransk',
    'Sosnovyy Bor',
    'St Helens',
    'Stavropol',
    'Taganrog',
    'Ufa',
    'Umraniye',
    'Vladikavkaz',
    'Volgograd',
    'Volzhsky',
    'Waterlooville',
    'Yeysk',
    'Zagazig',
    'Zaporizhzhya',
    'Zarhalol',
    'Zonguldak',
    'Aprilia',
    'Ar Rayyan',
    'Arak',
    'Bandar Abbas',
    'Carbonia',
    'Dammam',
    'Doha',
    'Dushanbe',
    'Esbjerg',
    'Fredrikstad',
    'Halle-Neustadt',
    'Helsinki',
    'Jyväskylä',
    'Karabük',
    'Karlskrona',
    'Kenitra',
    'Khorramshahr',
    'Kırıkkale',
    'Kristiansand',
    'Kuopio',
    'Latina',
    'Lorient',
    'Ludwigshafen am Rhein',
    'Madinat an Nasr',
    'Netanya',
    'Newtownabbey',
    'Osmaniye',
    'Petah Tiqva',
    'Port Said',
    'Ramadi',
    'Rishon LeTsiyyon',
    'Shahin Shahr',
    'Shannon',
    'Sidi Bel Abbes',
    'Sundsvall',
    'Tolyatti',
    'Zahedan',
}

NON_SETTLEMENT_NAMES = {
    'Ataşehir',
    'Beylikdüzü',
    'Sultanbeyli',
    'Şişli',
    'Bağcılar',
    'Kristiine',
    'Livoberezhnyi',
    'Obolonskyi',
    'Shevchenkivskyi',
    'Verhunskyi',
    'Zelenograd',
    'Bahçelievler',
    'Carabanchel',
    'Ciudad Lineal',
    'Darnytsya',
    'Desna',
    'Dniprovskyi',
    'East Helsinki',
    'Haabersti',
    'Isle Of Mull',
    'Isle of North Uist',
    'Kesklinn',
    'Kurortnyy',
    'Lasnamäe',
    'Mustamäe',
    'Nou Barris',
    'Põhja-Tallinn',
    'Pravyi Bereh',
    'Puente de Vallecas',
    'Tsentralnyi',
    'Vyhurivshchyna-Troyeshchyna',
}


# --------------------------------------------------------------------------
# main import
# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--county', default='')
    ap.add_argument('--offline', action='store_true')
    ap.add_argument('--topup', action='store_true',
                    help='also query the Overpass API around short counties')
    ap.add_argument('--sleep', type=float, default=2.0)
    ap.add_argument('--out', default=OUT_JS)
    args = ap.parse_args()

    counties = parse_counties(COUNTIES_JS)
    sites_cur, curated = parse_settlements(SETTLEMENTS_JS)
    bounds, land, seas = parse_bounds_and_land(MAP_DATA_JS)
    proj = Projection(bounds)
    landmass = Landmass(land, seas)

    # Project every seed once. Seeds in water are snapped to land by the
    # engine; approximate the same for landmass purposes only.
    seeds = []
    for idx, c in enumerate(counties):
        sx, sy = proj.x(c['lon']), proj.y(c['lat'])
        mass = landmass.at(c['lon'], c['lat'])
        if not mass:
            # coarse ring scan for the nearest land pixel's landmass
            for r in range(1, 50):
                found = False
                for dy in range(-r, r + 1):
                    for dx in range(-r, r + 1):
                        if max(abs(dx), abs(dy)) != r:
                            continue
                        m2 = landmass.at(c['lon'] + dx / proj.scale,
                                         c['lat'] - dy / proj.scale)
                        if m2:
                            mass = m2
                            found = True
                            break
                    if found:
                        break
                if found:
                    break
        seeds.append({'idx': idx, 'id': c['id'], 'name': c['name'],
                      'lon': c['lon'], 'lat': c['lat'], 'x': sx, 'y': sy,
                      'wasteland': c['wasteland'], 'landmass': mass})
    gameplay = [s for s in seeds if not s['wasteland']]
    print('counties: %d gameplay, %d wasteland' %
          (len(gameplay), len(seeds) - len(gameplay)))

    def needed(pid):
        cur = max(len(curated['867'].get(pid, [])),
                  len(curated['1066'].get(pid, [])))
        legacy_base = 2 + str_hash(pid) % 2
        return max(0, legacy_base + VILLAGE_BONUS_MAX - cur)

    targets = [s for s in gameplay if needed(s['id']) > 0]
    if args.county:
        targets = [s for s in targets if s['id'] == args.county]
    if args.limit:
        targets = targets[:args.limit]
    print('counties needing real fill: %d' % len(targets))

    overpass = Overpass(CACHE_JSON, args.offline, args.sleep)

    raster = Raster(bounds, land, seas, seeds)
    print('county raster built: %dx%d' % (raster.W, raster.H), flush=True)

    def winner(node):
        """County under the engine's own raster, shore rule included: a land
        point belongs to the county its raster cell belongs to. Water points
        (coastal places past the simplified coastline) fall back to the
        nearest seed — the engine snaps them into that seed's county within
        SETTLEMENT_SNAP_MAX."""
        nmass = landmass.at(node['lon'], node['lat'])
        node['landmass'] = nmass
        nx, ny = proj.x(node['lon']), proj.y(node['lat'])
        node['wx'], node['wy'] = nx, ny
        owner = raster.at(nx, ny)
        node['in_raster'] = bool(owner)
        if owner:
            best = seeds[owner - 1]
            dx, dy = best['x'] - nx, best['y'] - ny
            bd = dx * dx + dy * dy
        else:
            best, bd = None, float('inf')
            for s in seeds:
                dx = s['x'] - nx
                if dx * dx >= bd:
                    continue
                if nmass and s['landmass'] != nmass:
                    continue
                dy = s['y'] - ny
                d = dx * dx + dy * dy
                if d < bd:
                    best, bd = s, d
        node['win_dist'] = math.sqrt(bd) if best else float('inf')
        node['winner'] = best['id'] if best else None

    # -- phase 1: load GeoNames populated places ----------------------------
    pool = {}  # (src, id) -> node record
    scope = None
    if args.county or args.limit:
        # small runs only need places near the target counties
        lons = [s['lon'] for s in targets]
        lats = [s['lat'] for s in targets]
        scope = (min(lons) - 1.5, max(lons) + 1.5,
                 min(lats) - 1.5, max(lats) + 1.5)
    win = scope or bounds
    count = 0
    for node in load_geonames(win, args.offline):
        key = (node['src'], node['id'])
        if key not in pool:
            pool[key] = node
            winner(node)
            count += 1
        if count and count % 50000 == 0:
            print('  geonames pool %d nodes' % count, flush=True)
    print('geonames pool: %d nodes' % len(pool), flush=True)

    # winners are known at insert time; index them once
    by_winner = {}
    for node in pool.values():
        by_winner.setdefault(node.get('winner'), []).append(node)

    # -- phase 2: around-seed Overpass top-ups for short counties -----------
    def short_counties():
        return [s for s in targets
                if len(by_winner.get(s['id'], [])) < needed(s['id'])]

    short = short_counties()
    if short and args.topup and not args.offline:
        print('%d counties short after geonames; around-seed Overpass top-up'
              % len(short), flush=True)
        for seed in short:
            for radius in RADII_M:
                elements = overpass.query_around(seed['lat'], seed['lon'],
                                                 radius, PLACE_BASE)
                if elements is None:
                    break
                for e in elements:
                    if e['name'] and (e['src'], e['id']) not in pool:
                        pool[(e['src'], e['id'])] = e
                        winner(e)
                        by_winner.setdefault(e['winner'], []).append(e)
                if len(by_winner.get(seed['id'], [])) >= needed(seed['id']):
                    break
        overpass.save()

    # -- phase 3: hamlet fallback for counties still short -----------------
    short = short_counties()
    if short and args.topup and not args.offline:
        print('hamlet fallback for %d short counties' % len(short), flush=True)
        for seed in short:
            elements = overpass.query_around(seed['lat'], seed['lon'],
                                             RADII_M[-1], PLACE_FALLBACK)
            if elements is None:
                continue
            for e in elements:
                if e['name'] and (e['src'], e['id']) not in pool:
                    pool[(e['src'], e['id'])] = e
                    winner(e)
                    by_winner.setdefault(e['winner'], []).append(e)
        overpass.save()
    short = short_counties()
    if short:
        print('no real data for %d counties; generated names remain there'
              % len(short), flush=True)

    # -- phase 4: select per county ----------------------------------------
    selected = {}  # pid -> [node, ...]
    dropped_water = 0
    dropped_numbered = 0
    dropped_ineligible = 0
    for seed in targets:
        pid = seed['id']
        cand = by_winner.get(pid, [])
        safe = []
        for n in cand:
            if n.get('in_raster') or n['landmass']:
                safe.append(n)  # the raster itself puts this point in-county
            elif n['win_dist'] <= SNAP_SAFE_PX:
                safe.append(n)  # coastal: seed pixel is inside the snap ring
            else:
                dropped_water += 1
        seen = set()
        uniq = []
        head_name = norm_name(seed['name'])
        for n in sorted(safe, key=lambda n2: (
                -PLACE_RANK.get(n2['place'], 0),
                -int(re.sub(r'\D', '', n2['population']) or 0),
                n2['win_dist'], n2['id'])):
            cleaned = clean_numbered_name(n['name'])
            if not cleaned:
                dropped_numbered += 1
                continue
            if cleaned in POST_MEDIEVAL_NAMES or cleaned in NON_SETTLEMENT_NAMES:
                dropped_ineligible += 1
                continue
            cleaned = HISTORICAL_NAMES.get(cleaned, cleaned)
            n['name'] = cleaned
            nn = norm_name(cleaned)
            if nn in seen or nn == head_name:
                continue
            seen.add(nn)
            uniq.append(n)
        # Keep the whole ranked list: county_entries drops candidates that
        # duplicate curated sites, and a pre-capped list would waste slots on
        # entries that never survive that filter.
        selected[pid] = uniq

    total = sum(len(v) for v in selected.values())
    print('selected %d real settlements (%d dropped offshore, %d numbered '
          'labels cleaned or dropped, %d ineligible candidates dropped)'
          % (total, dropped_water, dropped_numbered, dropped_ineligible))

    # -- phase 5: emit data/settlements_real.js ----------------------------
    def county_entries(seed):
        pid = seed['id']
        limit = needed(pid)  # total fill entries (head + OSM picks)
        out = {}
        for bookmark in ('867', '1066'):
            cur = curated[bookmark].get(pid, [])
            entries = []
            cur_names = {norm_name(e['name']) for e in cur}
            cur_sites = [(sites_cur[e['site']][0], sites_cur[e['site']][1])
                         for e in cur if e['site'] in sites_cur]
            if not cur:
                entries.append({'site': pid + '_head', 'name': seed['name'],
                                'kind': 'village', 'lon': seed['lon'],
                                'lat': seed['lat']})
                cur_names.add(norm_name(seed['name']))
            for n in selected.get(pid, []):
                if len(entries) >= limit:
                    break
                if norm_name(n['name']) in cur_names:
                    continue
                if any(abs(n['lon'] - cl) < 0.05 and abs(n['lat'] - ct) < 0.05
                       for cl, ct in cur_sites):
                    continue  # same physical place as a curated site
                entries.append({'site': slugify(n['name'], n),
                                'name': n['name'], 'kind': 'village',
                                'lon': n['lon'], 'lat': n['lat']})
                cur_names.add(norm_name(n['name']))
            out[bookmark] = entries
        return out

    lines = []
    lines.append('/* =========================================================================')
    lines.append('   Fallowborn — REAL-WORLD SETTLEMENT SITES (generated)')
    lines.append('   =========================================================================')
    lines.append('   GENERATED FILE — do not hand-edit. Produced by')
    lines.append('   tools/settlement_import.py from the GeoNames geographical')
    lines.append('   database (CC BY 4.0, geonames.org — see docs/MODDING.md).')
    lines.append('')
    lines.append('   These presentations are appended AFTER the curated layouts of')
    lines.append('   data/settlements.js with fill: true: they replace the generated')
    lines.append('   name/location of a settlement slot with a real place, but unlike')
    lines.append('   a curated entry they do not force early visibility — development')
    lines.append('   reveals them on the normal thresholds. Slot indexes are never')
    lines.append('   renumbered; a slot a save references keeps its meaning. */')
    lines.append('window.FBDATA = window.FBDATA || {};')
    lines.append('')
    lines.append("(function () {")
    lines.append("  'use strict';")
    lines.append('')
    lines.append('  var SITES = {')
    emitted_sites = {}
    all_entries = {}
    for seed in sorted(targets, key=lambda s: s['id']):
        all_entries[seed['id']] = county_entries(seed)
        for bookmark in ('867', '1066'):
            for e in all_entries[seed['id']][bookmark]:
                emitted_sites[e['site']] = (e['lon'], e['lat'])
    for slug in sorted(emitted_sites):
        lon, lat = emitted_sites[slug]
        lines.append('    %s: { x: %s, y: %s },' % (
            slug, ('%.5f' % lon).rstrip('0').rstrip('.'),
            ('%.5f' % lat).rstrip('0').rstrip('.')))
    lines.append('  };')
    lines.append('')
    lines.append("  var LAYOUTS = { '867': {}, '1066': {} };")
    lines.append('  function layout(bookmarkId, pid, list) {')
    lines.append('    LAYOUTS[bookmarkId][pid] = list.map(function (e) {')
    lines.append("      return { site: e[0], name: e[1], kind: e[2], fill: true };")
    lines.append('    });')
    lines.append('  }')
    lines.append('  function both(pid, list) {')
    lines.append("    layout('867', pid, list);")
    lines.append("    layout('1066', pid, list);")
    lines.append('  }')
    lines.append('')
    for pid in sorted(all_entries):
        pair = all_entries[pid]
        if not pair['867'] and not pair['1066']:
            continue
        def fmt(entries):
            return ['      [%s, %s, %s]' % (js_escape(e['site']), js_escape(e['name']),
                                           js_escape(e['kind']))
                    for e in entries]
        if pair['867'] == pair['1066']:
            lines.append("  both(%s, [" % js_escape(pid))
            lines.extend(',\n'.join(fmt(pair['867'])).split('\n'))
            lines.append('    ]);')
        else:
            for bookmark in ('867', '1066'):
                if not pair[bookmark]:
                    continue
                lines.append("  layout('%s', %s, [" % (bookmark, js_escape(pid)))
                lines.extend(',\n'.join(fmt(pair[bookmark])).split('\n'))
                lines.append('    ]);')
    lines.append('')
    lines.append('  /* Append after the curated layouts; never replace them. */')
    lines.append('  FBDATA.settlementSites = FBDATA.settlementSites || {};')
    lines.append('  for (var siteId in SITES) {')
    lines.append('    if (!Object.prototype.hasOwnProperty.call(SITES, siteId)) continue;')
    lines.append('    FBDATA.settlementSites[siteId] = SITES[siteId];')
    lines.append('  }')
    lines.append('  for (var bookmarkId in LAYOUTS) {')
    lines.append('    if (!Object.prototype.hasOwnProperty.call(LAYOUTS, bookmarkId)) continue;')
    lines.append('    var bookmark = FBDATA.bookmarks && FBDATA.bookmarks[bookmarkId];')
    lines.append('    if (!bookmark) throw new Error(\'data/settlements_real.js: missing bookmark \' + bookmarkId);')
    lines.append('    var byId = {};')
    lines.append('    for (var i = 0; i < bookmark.provinces.length; i++) {')
    lines.append('      byId[bookmark.provinces[i].id] = bookmark.provinces[i];')
    lines.append('    }')
    lines.append('    var layoutMap = LAYOUTS[bookmarkId];')
    lines.append('    for (var pid in layoutMap) {')
    lines.append('      if (!Object.prototype.hasOwnProperty.call(layoutMap, pid)) continue;')
    lines.append('      var province = byId[pid];')
    lines.append('      if (!province) {')
    lines.append("        throw new Error('data/settlements_real.js: layout names missing province ' +")
    lines.append("          pid + ' in bookmark ' + bookmarkId);")
    lines.append('      }')
    lines.append('      province.settlements = (province.settlements || []).concat(')
    lines.append('        layoutMap[pid].map(function (e) {')
    lines.append('          return { site: e.site, name: e.name, kind: e.kind, fill: e.fill };')
    lines.append('        }));')
    lines.append('    }')
    lines.append('  }')
    lines.append('})();')
    lines.append('')

    with open(args.out, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('\n'.join(lines))
    overpass.save()

    full = sum(1 for s in targets if len(selected.get(s['id'], [])) >= needed(s['id']))
    rows = sum(len(pair['867']) + len(pair['1066'])
               for pair in all_entries.values())
    print('wrote %s: %d sites, %d layout entries; %d/%d counties fully covered'
          % (args.out, len(emitted_sites), rows, full, len(targets)))


if __name__ == '__main__':
    main()

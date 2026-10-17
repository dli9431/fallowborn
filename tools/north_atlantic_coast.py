"""Derive the North Atlantic rings from the pinned Natural Earth archive.

Offline authoring tool, using only Python's standard library. Supply the
5.1.1 ne_10m_land.zip archive as the sole argument. JSON goes to stdout;
the game ships the resulting coordinate literals, never the source archive.
"""

import hashlib
import json
import math
import struct
import sys
import zipfile


SHA256 = 'e547d749445eaa0964aba76738090ec88f5e63c4585122170f98c67a7ea922dc'
# Shapefile record number (one-based), part number (zero-based), pixel tolerance.
SELECTION = [
    ('Iceland', 1, 26, 3),
    ('Streymoy', 6, 92, .25), ('Eysturoy', 6, 93, .25),
    ('Vagar', 3, 326, .25), ('Suduroy', 3, 324, .25),
    ('Sandoy', 3, 325, .25), ('Bordoy', 5, 140, .25),
    ('Vidoy', 4, 1317, .25), ('Kunoy', 4, 1315, .25),
    ('Kalsoy', 4, 1316, .25), ('Svinoy', 4, 1312, .25),
    ('Orkney Mainland', 3, 312, .25), ('Hoy', 3, 311, .25),
    ('South Ronaldsay', 5, 130, .25), ('Westray', 3, 314, .25),
    ('Rousay', 2, 193, .25), ('Eday', 3, 313, .25),
    ('Sanday', 5, 131, .25), ('Stronsay', 4, 492, .25),
    ('Shetland Mainland', 6, 91, .25), ('Yell', 3, 322, .25),
    ('Unst', 3, 323, .25), ('Fetlar', 4, 510, .25),
    ('Bressay', 4, 1307, .25), ('Whalsay', 4, 1308, .25),
    ('Lewis and Harris', 6, 89, .25),
]
# Protect coast segments nearest the physical seeds and candidate localities.
# These points confer no dated settlement status or political identity.
LOCALITIES = [
    (-21.50, 64.18), (-22, 65.15), (-22.75, 65.80), (-18.08, 65.60),
    (-14.65, 65.12), (-20.15, 63.85), (-20.35, 64.70), (-18.30, 64.90),
    (-16.65, 64.35), (-21.94, 64.15), (-21.12, 64.26), (-14.90, 64.40),
]


def projection(point):
    x, y = point
    scale = 1290 / 95
    return ((x + 25) * scale,
            (math.log(math.tan(math.pi / 4 + math.radians(67.5) / 2)) -
             math.log(math.tan(math.pi / 4 + math.radians(y) / 2))) * scale * 180 / math.pi)


def rings(archive):
    data = archive.read('ne_10m_land.shp')
    offset = 100
    while offset < len(data):
        record, words = struct.unpack_from('>ii', data, offset)
        body = data[offset + 8:offset + 8 + words * 2]
        offset += 8 + words * 2
        if struct.unpack_from('<i', body)[0] != 5:
            continue
        parts, count = struct.unpack_from('<ii', body, 36)
        starts = list(struct.unpack_from('<' + 'i' * parts, body, 44)) + [count]
        points = list(struct.iter_unpack('<dd', body[44 + 4 * parts:44 + 4 * parts + 16 * count]))
        for part, (start, end) in enumerate(zip(starts, starts[1:])):
            yield (record, part), points[start:end - 1]


def distance_squared(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = dx * dx + dy * dy
    t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length)) if length else 0
    return (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2


def simplify_arc(indices, points, tolerance):
    if len(indices) < 3:
        return indices[:-1]
    distance, split = max((distance_squared(points[indices[i]], points[indices[0]], points[indices[-1]]), i)
                          for i in range(1, len(indices) - 1))
    if distance <= tolerance ** 2:
        return indices[:1]
    return (simplify_arc(indices[:split + 1], points, tolerance) +
            simplify_arc(indices[split:], points, tolerance))


def simplify(points, tolerance, protect_localities):
    projected = [projection(point) for point in points]
    count = len(points)
    anchors = set()
    for axis in (0, 1):
        anchors.add(min(range(count), key=lambda i: projected[i][axis]))
        anchors.add(max(range(count), key=lambda i: projected[i][axis]))
    if protect_localities:
        for point in LOCALITIES:
            p = projection(point)
            nearest = min(range(count), key=lambda i: math.dist(projected[i], p))
            anchors.update(((nearest - 1) % count, nearest, (nearest + 1) % count))
    anchors = sorted(anchors)
    indices = []
    for start, end in zip(anchors, anchors[1:] + [anchors[0] + count]):
        indices += simplify_arc([i % count for i in range(start, end + 1)], projected, tolerance)
    return [[round(value, 5) for value in points[i]] for i in indices]


def intersects(a, b, same_ring=False):
    def side(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    for i, p in enumerate(a):
        q = a[(i + 1) % len(a)]
        for j, r in enumerate(b):
            if same_ring and j <= i:
                continue
            s = b[(j + 1) % len(b)]
            if side(p, q, r) * side(p, q, s) < 0 and side(r, s, p) * side(r, s, q) < 0:
                return True
    return False


def main():
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python tools/north_atlantic_coast.py path/to/ne_10m_land.zip')
    with open(sys.argv[1], 'rb') as source:
        digest = hashlib.sha256(source.read()).hexdigest()
    if digest != SHA256:
        raise ValueError('Unexpected Natural Earth archive SHA-256: ' + digest)
    with zipfile.ZipFile(sys.argv[1]) as archive:
        source = dict(rings(archive))
    tolerances = [r[3] for r in SELECTION]
    # Reduce only affected tolerances if chords cross another shore or themselves.
    # This is source geometry processing; no game script or raster is executed.
    for attempt in range(12):
        shapes = [simplify(source[(record, part)], tolerances[i], name == 'Iceland')
                  for i, (name, record, part, _) in enumerate(SELECTION)]
        refine = set()
        for i, shape in enumerate(shapes):
            if intersects(shape, shape, same_ring=True):
                refine.add(i)
            for j in range(i):
                if intersects(shape, shapes[j]):
                    refine.update((i, j))
        if not refine:
            break
        for i in refine:
            tolerances[i] /= 2
    else:
        raise ValueError('Source simplification needs an explicit shoreline review')
    output = []
    for i, (name, record, part, _) in enumerate(SELECTION):
        points = source[(record, part)]
        simplified = shapes[i]
        tolerance = tolerances[i]
        output.append(dict(name=name, record=record, part=part, tolerance=tolerance,
                           sourceVertices=len(points), vertices=len(simplified),
                           bounds=[min(p[0] for p in points), min(p[1] for p in points),
                                   max(p[0] for p in points), max(p[1] for p in points)],
                           land=[v for p in simplified for v in p]))
    print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Build and validate Fallowborn's deterministic Opus music catalog."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import struct
import sys
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BUDGET = 200_000_000
FILENAME_RE = re.compile(r"^(?P<order>[0-9]{3})-(?P<slug>[a-z0-9]+(?:-[a-z0-9]+)*)\.opus$")
SELECTOR_RE = re.compile(r"^(?:all|[a-z][a-z0-9_]*)$")
ROLES = {"folk", "war", "court"}


class CatalogError(Exception):
    pass


def opus_metadata(path: Path) -> dict:
    data = path.read_bytes()
    if len(data) < 64 or data[:4] != b"OggS":
        raise CatalogError(f"{path}: expected an Ogg container")
    head = data.find(b"OpusHead")
    if head < 0 or head + 19 > len(data):
        raise CatalogError(f"{path}: missing OpusHead")
    channels = data[head + 9]
    pre_skip = struct.unpack_from("<H", data, head + 10)[0]
    input_rate = struct.unpack_from("<I", data, head + 12)[0]
    if channels < 1 or channels > 2:
        raise CatalogError(f"{path}: only mono or stereo Opus is supported")

    offset = 0
    last_granule = None
    while offset + 27 <= len(data):
        marker = data.find(b"OggS", offset)
        if marker < 0 or marker + 27 > len(data):
            break
        segment_count = data[marker + 26]
        header_end = marker + 27 + segment_count
        if header_end > len(data):
            raise CatalogError(f"{path}: truncated Ogg page header")
        body_size = sum(data[marker + 27:header_end])
        page_end = header_end + body_size
        if page_end > len(data):
            raise CatalogError(f"{path}: truncated Ogg page body")
        granule = struct.unpack_from("<Q", data, marker + 6)[0]
        if granule != 0xFFFFFFFFFFFFFFFF:
            last_granule = granule
        offset = page_end

    if last_granule is None or last_granule <= pre_skip:
        raise CatalogError(f"{path}: no usable Opus duration")
    duration = (last_granule - pre_skip) / 48000.0
    size = len(data)
    return {
        "bytes": size,
        "duration": round(duration, 3),
        "channels": channels,
        "inputRate": input_rate,
        "bitrate": round((size * 8.0) / duration),
        "rev": hashlib.sha256(data).hexdigest()[:16],
    }


def display_title(slug: str) -> str:
    return " ".join(word.capitalize() for word in slug.split("-"))


def track_record(path: Path, music_root: Path, intro: bool = False) -> dict:
    match = FILENAME_RE.fullmatch(path.name)
    if not match:
        raise CatalogError(
            f"{path}: expected NNN-lowercase-song-slug.opus"
        )
    relative = path.relative_to(music_root).as_posix()
    order = int(match.group("order"))
    slug = match.group("slug")
    record = {
        "id": "intro-" + slug if intro else "",
        "title": display_title(slug),
        "src": "music/" + relative,
        "order": order,
    }
    record.update(opus_metadata(path))
    if intro:
        record["kind"] = "intro"
        return record

    parts = path.relative_to(music_root).parts
    if len(parts) != 4:
        raise CatalogError(
            f"{path}: expected music/<faith>/<culture>/<role>/<file>"
        )
    faith, culture, role, _ = parts
    if not SELECTOR_RE.fullmatch(faith):
        raise CatalogError(f"{path}: invalid faith selector {faith!r}")
    if not SELECTOR_RE.fullmatch(culture):
        raise CatalogError(f"{path}: invalid culture selector {culture!r}")
    if role not in ROLES:
        raise CatalogError(f"{path}: role must be folk, war, or court")
    record.update({
        "id": "-".join((faith, culture, role, slug)),
        "faith": faith,
        "culture": culture,
        "role": role,
        "bankId": "/".join((faith, culture, role)),
    })
    return record


def scan(root: Path, selected_sources: set[str] | None = None) -> tuple[dict | None, list[dict]]:
    music_root = root / "music"
    if not music_root.exists():
        return None, []
    intro_paths = sorted((music_root / "intro").glob("*.opus")) if (music_root / "intro").exists() else []
    if len(intro_paths) > 1:
        raise CatalogError("music/intro must contain at most one Opus file")
    intro = track_record(intro_paths[0], music_root, True) if intro_paths else None

    tracks = []
    for path in sorted(music_root.rglob("*.opus")):
        if path.parent == music_root / "intro":
            continue
        source = "music/" + path.relative_to(music_root).as_posix()
        if selected_sources is not None and source not in selected_sources:
            continue
        tracks.append(track_record(path, music_root))
    if tracks and not intro:
        raise CatalogError("a gameplay soundtrack requires one music/intro/*.opus file")

    seen_ids = set()
    seen_orders = set()
    for track in tracks:
        if track["id"] in seen_ids:
            raise CatalogError(f"duplicate track id {track['id']}")
        seen_ids.add(track["id"])
        order_key = (track["bankId"], track["order"])
        if order_key in seen_orders:
            raise CatalogError(
                f"duplicate order {track['order']:03d} in {track['bankId']}"
            )
        seen_orders.add(order_key)
    tracks.sort(key=lambda item: (item["bankId"], item["order"], item["id"]))
    return intro, tracks


def make_catalog(intro: dict | None, tracks: list[dict]) -> dict:
    grouped = defaultdict(list)
    for track in tracks:
        grouped[track["bankId"]].append(track)
    banks = []
    for bank_id in sorted(grouped):
        bank_tracks = grouped[bank_id]
        faith, culture, role = bank_id.split("/")
        banks.append({
            "id": bank_id,
            "faith": faith,
            "culture": culture,
            "role": role,
            "trackIds": [track["id"] for track in bank_tracks],
            "bytes": sum(track["bytes"] for track in bank_tracks),
            "duration": round(sum(track["duration"] for track in bank_tracks), 3),
        })
    all_records = ([intro] if intro else []) + tracks
    return {
        "schema": 1,
        "intro": intro,
        "tracks": tracks,
        "banks": banks,
        "totalBytes": sum(record["bytes"] for record in all_records),
        "totalDuration": round(sum(record["duration"] for record in all_records), 3),
    }


def render(catalog: dict) -> str:
    body = json.dumps(catalog, ensure_ascii=False, indent=2, separators=(",", ": "))
    return (
        "/* Generated by tools/music_catalog.py. Do not edit by hand. */\n"
        "window.FBDATA = window.FBDATA || {};\n"
        f"FBDATA.musicCatalog = {body};\n"
    )


def write_catalog(path: Path, catalog: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(render(catalog), encoding="utf-8", newline="\n")


def copy_stage(root: Path, stage: Path, intro: dict | None, tracks: list[dict]) -> None:
    if not (stage / "index.html").is_file() or not (stage / "data").is_dir():
        raise CatalogError(f"{stage}: expected an existing Fallowborn staging root")
    target_music = stage / "music"
    if target_music.exists():
        shutil.rmtree(target_music)
    target_music.mkdir(parents=True)
    records = ([intro] if intro else []) + tracks
    for record in records:
        source = root / record["src"]
        target = stage / record["src"]
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    write_catalog(stage / "data" / "music_catalog.js", make_catalog(intro, tracks))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("build", "check", "stage-itch"))
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--stage", type=Path)
    parser.add_argument("--budget", type=int, default=DEFAULT_BUDGET)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = args.root.resolve()
    output = args.output.resolve() if args.output else root / "data" / "music_catalog.js"
    try:
        intro, tracks = scan(root)
        if args.command == "build":
            write_catalog(output, make_catalog(intro, tracks))
            print(f"Wrote {output} ({len(tracks)} gameplay tracks).")
        elif args.command == "check":
            expected = render(make_catalog(intro, tracks))
            actual = output.read_text(encoding="utf-8") if output.exists() else ""
            if actual != expected:
                raise CatalogError(
                    f"{output} is stale; run python tools/music_catalog.py build"
                )
            print(f"Verified {output} ({len(tracks)} gameplay tracks).")
        else:
            if not args.stage:
                raise CatalogError("stage-itch requires --stage <directory>")
            gameplay_bytes = sum(track["bytes"] for track in tracks)
            if gameplay_bytes > args.budget:
                raise CatalogError(
                    "complete gameplay soundtrack is "
                    f"{gameplay_bytes} bytes, exceeding the itch budget of "
                    f"{args.budget} bytes"
                )
            copy_stage(root, args.stage.resolve(), intro, tracks)
            print(
                f"Staged the complete soundtrack: {len(tracks)} gameplay tracks "
                f"({gameplay_bytes}/{args.budget} bytes)."
            )
    except (CatalogError, OSError, ValueError) as error:
        print(f"Music catalog error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

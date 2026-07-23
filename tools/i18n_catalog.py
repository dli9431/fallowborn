#!/usr/bin/env python3
"""Extract, generate, translate, and validate Fallowborn locale catalogs.

This is development tooling only. It statically reads source text; it never
executes game code. The shipped browser game has no Python dependency.
"""

from __future__ import annotations

import argparse
import dataclasses
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
JS = ROOT / "js"
HASH_SCHEMA = 1
CATALOG_SCHEMA = 1
EVENT_FILES = sorted(DATA.glob("events_*.js"))
SOURCE_FILES = [
    ROOT / "index.html",
    *[
        path
        for path in sorted(JS.glob("*.js"))
        if path.name not in {"i18n.js", "messages.js", "portrait.js", "mapview.js"}
    ],
]
STRUCTURED_DATA = {
    "traits": "trait",
    "ailments": "ailment",
    "cultures": "culture",
    "religions": "religion",
    "buildings": "building",
    "holdings": "holding",
    "items": "item",
    "plots": "plot",
    "tech": "tech",
}
DATA_FIELDS = ("name", "desc")
EVENT_FIELDS = ("title", "text")
TOKEN_RE = re.compile(r"\{([A-Za-z_][A-Za-z0-9_]*)\}")
EMOJI_BASE = "[\u2600-\u27bf\U0001f000-\U0001faff]"
EMOJI_RE = re.compile(
    f"(?:{EMOJI_BASE})(?:[\ufe0e\ufe0f\U0001f3fb-\U0001f3ff]|"
    f"\u200d(?:{EMOJI_BASE}))*"
)
HTML_TAG_RE = re.compile(r"<[^>]*>")
WORD_RE = re.compile(r"[A-Za-z]")


@dataclasses.dataclass
class Token:
    kind: str
    value: str
    line: int
    pos: int


@dataclasses.dataclass
class Node:
    kind: str
    value: Any
    line: int


def lex_js(text: str) -> list[Token]:
    tokens: list[Token] = []
    i = 0
    line = 1
    n = len(text)
    punct = set("{}[]():,.;=?!+-*/<>")
    while i < n:
        c = text[i]
        if c in " \t\r":
            i += 1
            continue
        if c == "\n":
            line += 1
            i += 1
            continue
        if c == "/" and i + 1 < n and text[i + 1] == "/":
            i += 2
            while i < n and text[i] != "\n":
                i += 1
            continue
        if c == "/" and i + 1 < n and text[i + 1] == "*":
            i += 2
            while i + 1 < n and text[i : i + 2] != "*/":
                if text[i] == "\n":
                    line += 1
                i += 1
            i = min(n, i + 2)
            continue
        if c in ("'", '"'):
            quote = c
            start_line = line
            start = i
            i += 1
            out: list[str] = []
            while i < n:
                c = text[i]
                if c == quote:
                    i += 1
                    break
                if c == "\\" and i + 1 < n:
                    nxt = text[i + 1]
                    escapes = {
                        "n": "\n",
                        "r": "\r",
                        "t": "\t",
                        "b": "\b",
                        "f": "\f",
                        "v": "\v",
                        "0": "\0",
                        "\\": "\\",
                        "'": "'",
                        '"': '"',
                    }
                    if nxt == "u" and i + 5 < n:
                        try:
                            out.append(chr(int(text[i + 2 : i + 6], 16)))
                            i += 6
                            continue
                        except ValueError:
                            pass
                    if nxt == "x" and i + 3 < n:
                        try:
                            out.append(chr(int(text[i + 2 : i + 4], 16)))
                            i += 4
                            continue
                        except ValueError:
                            pass
                    if nxt == "\n":
                        line += 1
                        i += 2
                        continue
                    out.append(escapes.get(nxt, nxt))
                    i += 2
                    continue
                if c == "\n":
                    line += 1
                out.append(c)
                i += 1
            tokens.append(Token("string", "".join(out), start_line, start))
            continue
        if c.isalpha() or c in "_$":
            start = i
            while i < n and (text[i].isalnum() or text[i] in "_$"):
                i += 1
            tokens.append(Token("ident", text[start:i], line, start))
            continue
        if c.isdigit():
            start = i
            while i < n and (text[i].isdigit() or text[i] in ".xabcdefABCDEF"):
                i += 1
            tokens.append(Token("number", text[start:i], line, start))
            continue
        if c in punct:
            tokens.append(Token("punct", c, line, i))
        i += 1
    return tokens


class Parser:
    def __init__(self, tokens: list[Token]):
        self.tokens = tokens
        self.i = 0

    def peek(self, value: str | None = None) -> Token | None:
        if self.i >= len(self.tokens):
            return None
        token = self.tokens[self.i]
        return token if value is None or token.value == value else None

    def take(self) -> Token:
        token = self.tokens[self.i]
        self.i += 1
        return token

    def parse_value(self) -> Node:
        token = self.peek()
        if token is None:
            return Node("unknown", None, 0)
        if token.kind == "string":
            self.take()
            return Node("string", token.value, token.line)
        if token.kind == "number" or (token.value == "-" and self.i + 1 < len(self.tokens)):
            line = token.line
            bits = []
            if token.value == "-":
                bits.append(self.take().value)
                token = self.peek()
            if token and token.kind == "number":
                bits.append(self.take().value)
            raw = "".join(bits)
            try:
                value: Any = float(raw) if "." in raw else int(raw, 0)
            except ValueError:
                value = raw
            return Node("number", value, line)
        if token.value == "{":
            return self.parse_object()
        if token.value == "[":
            return self.parse_array()
        if token.kind == "ident" and token.value in ("true", "false", "null"):
            self.take()
            return Node("literal", {"true": True, "false": False, "null": None}[token.value], token.line)
        return self.skip_expression()

    def parse_object(self) -> Node:
        start = self.take()
        out: dict[str, Node] = {}
        while self.peek() and not self.peek("}"):
            key_token = self.take()
            if key_token.kind not in ("ident", "string", "number"):
                self.skip_to_delimiter("}")
                continue
            key = key_token.value
            if not self.peek(":"):
                self.skip_to_delimiter("}")
                continue
            self.take()
            out[key] = self.parse_value()
            if self.peek(","):
                self.take()
            elif not self.peek("}"):
                self.skip_to_delimiter("}")
        if self.peek("}"):
            self.take()
        return Node("object", out, start.line)

    def parse_array(self) -> Node:
        start = self.take()
        out: list[Node] = []
        while self.peek() and not self.peek("]"):
            out.append(self.parse_value())
            if self.peek(","):
                self.take()
            elif not self.peek("]"):
                self.skip_to_delimiter("]")
        if self.peek("]"):
            self.take()
        return Node("array", out, start.line)

    def skip_expression(self) -> Node:
        start = self.peek()
        if start is None:
            return Node("unknown", None, 0)
        depth = {"(": 0, "[": 0, "{": 0}
        closing = {")": "(", "]": "[", "}": "{"}
        strings: list[Node] = []
        while self.peek():
            token = self.peek()
            if token.kind == "string":
                strings.append(Node("string", token.value, token.line))
            if token.value in depth:
                depth[token.value] += 1
            elif token.value in closing:
                opener = closing[token.value]
                if depth[opener] == 0:
                    break
                depth[opener] -= 1
            if token.value == "," and all(value == 0 for value in depth.values()):
                break
            self.take()
        return Node("expression", strings, start.line)

    def skip_to_delimiter(self, closing: str) -> None:
        depth = 0
        while self.peek():
            token = self.peek()
            if token.value in ("{", "[", "("):
                depth += 1
            elif token.value in ("}", "]", ")"):
                if depth == 0 and token.value == closing:
                    return
                depth = max(0, depth - 1)
            elif token.value == "," and depth == 0:
                self.take()
                return
            self.take()


def node_string(node: Node | None) -> str | None:
    return node.value if node and node.kind == "string" else None


def node_object(node: Node | None) -> dict[str, Node] | None:
    return node.value if node and node.kind == "object" else None


def node_array(node: Node | None) -> list[Node] | None:
    return node.value if node and node.kind == "array" else None


def find_assignment(path: Path, owner: str, prop: str) -> Node | None:
    tokens = lex_js(path.read_text(encoding="utf-8"))
    for i in range(len(tokens) - 3):
        if (
            tokens[i].value == owner
            and tokens[i + 1].value == "."
            and tokens[i + 2].value == prop
            and tokens[i + 3].value == "="
        ):
            parser = Parser(tokens)
            parser.i = i + 4
            return parser.parse_value()
    return None


def parse_events(path: Path) -> list[Node]:
    tokens = lex_js(path.read_text(encoding="utf-8"))
    for i in range(len(tokens) - 2):
        if tokens[i].value == "push" and tokens[i + 1].value == "(":
            parser = Parser(tokens)
            parser.i = i + 2
            events: list[Node] = []
            while parser.peek() and not parser.peek(")"):
                events.append(parser.parse_value())
                if parser.peek(","):
                    parser.take()
            return events
    return []


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def fnv1a_utf16(text: str) -> str:
    h = 2166136261
    raw = text.encode("utf-16-le", "surrogatepass")
    for i in range(0, len(raw), 2):
        unit = raw[i] | (raw[i + 1] << 8)
        h ^= unit
        h = (h * 16777619) & 0xFFFFFFFF
    return f"{h:08x}"


def tokens_of(record: dict[str, Any]) -> list[str]:
    found: set[str] = set()

    def walk(value: Any) -> None:
        if isinstance(value, str):
            found.update(TOKEN_RE.findall(value))
        elif isinstance(value, dict):
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(record)
    return sorted(found)


def token_instances(record: dict[str, Any]) -> list[str]:
    found: list[str] = []

    def walk(value: Any) -> None:
        if isinstance(value, str):
            found.extend(TOKEN_RE.findall(value))
        elif isinstance(value, dict):
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(record)
    return sorted(found)


def source_hash(record: dict[str, Any]) -> str:
    canonical = {
        "record": record,
        "schema": HASH_SCHEMA,
        "tokens": tokens_of(record),
    }
    return f"h{HASH_SCHEMA}-{fnv1a_utf16(stable_json(canonical))}"


def source_key(text: str) -> str:
    return f"src.{fnv1a_utf16(text)}"


def ui_context_key(context: str, text: str) -> str:
    encoded = urllib.parse.quote(context, safe="-_.!~*'()")
    return f"ui@{encoded}:{text}"


def branch_records(node: Node | None) -> list[tuple[str, dict[str, Any], int]]:
    if node is None:
        return []
    if node.kind == "string":
        return [("default", {"text": node.value}, node.line)]
    obj = node_object(node)
    if obj is None:
        return []
    result: list[tuple[str, dict[str, Any], int]] = []
    for branch, child in obj.items():
        if child.kind == "string":
            result.append((branch, {"text": child.value}, child.line))
    return result


def looks_translatable(text: str) -> bool:
    text = html.unescape(text).strip()
    if not text or not WORD_RE.search(text):
        return False
    # Incomplete HTML builders and CSS selectors are code, not display text.
    # Complete tags have already been stripped by html_segments(); a surviving
    # angle bracket means the literal was only one concatenated markup piece.
    if "<" in text or ">" in text:
        return False
    if re.search(
        r"""(?:^|[\s"'])(?:id|class|style|value|step|min|max|type|name|title|"""
        r"""placeholder|src|href|accept|role|data-[\w-]+|aria-[\w-]+)\s*=""",
        text,
        flags=re.I,
    ):
        return False
    if text.startswith(("#", ".")):
        return False
    if re.match(r"^[a-z][a-z0-9_-]*\[", text):
        return False
    if re.search(r"\.(?:css|html|js|json|md|cmd|ps1)\b", text, flags=re.I):
        return False
    if re.fullmatch(r"[a-z0-9_.:/-]+", text):
        return False
    if re.fullmatch(r"[A-Za-z]{1,3}", text) and text not in {"AD"}:
        return False
    if text.startswith(("#", ".", "[", "{")) and " " not in text:
        return False
    if any(fragment in text for fragment in ("querySelector", "localStorage", "data-", "aria-")):
        return False
    if re.fullmatch(r"(?:rgb|hsl)a?\([^)]*\)", text):
        return False
    if text in {
        "string", "object", "function", "number", "boolean", "undefined",
        "file:", "http:", "https:", "click", "input", "change", "keydown",
        "afterbegin", "hidden", "active", "selected", "checked",
        "use strict", "DOMContentLoaded", "BUTTON", "INPUT", "SCRIPT", "STYLE",
        "TEXTAREA",
    }:
        return False
    return bool(
        re.search(r"\s", text)
        or re.search(r"[.!?…—:;()]", text)
        or text[:1].isupper()
        or EMOJI_RE.search(text)
    )


def html_segments(value: str) -> Iterable[str]:
    if "<" not in value:
        yield value
        return
    cleaned = re.sub(r"<script\b[^>]*>.*?</script>", "", value, flags=re.I | re.S)
    for chunk in HTML_TAG_RE.split(cleaned):
        chunk = html.unescape(chunk).strip()
        chunk = re.sub(r"\s+", " ", chunk)
        if chunk:
            yield chunk


class Inventory:
    def __init__(self) -> None:
        self.entries: dict[str, dict[str, Any]] = {}
        self.meta: dict[str, dict[str, Any]] = {}
        self.alias_locations: dict[str, list[str]] = {}

    def add(
        self,
        key: str,
        record: dict[str, Any],
        location: str,
        context: str,
        glossary: Iterable[str] = (),
    ) -> None:
        old = self.entries.get(key)
        if old is not None and old != record:
            raise ValueError(f"colliding source key {key}: {old!r} != {record!r}")
        self.entries[key] = record
        self.meta[key] = {
            "source": record,
            "location": location,
            "context": context,
            "glossary": sorted(set(glossary)),
        }
        text = record.get("text")
        if isinstance(text, str):
            alias = source_key(text)
            alias_record = self.entries.get(alias)
            if alias_record is not None and alias_record != record:
                raise ValueError(
                    f"colliding source alias {alias}: {alias_record!r} != {record!r}"
                )
            self.entries[alias] = record
            locations = self.alias_locations.setdefault(alias, [])
            if location not in locations:
                locations.append(location)

    def finish_alias_meta(self) -> None:
        for key, locations in self.alias_locations.items():
            self.meta[key] = {
                "source": self.entries[key],
                "location": locations[:12],
                "context": "Generated exact-English source alias used by display chokepoints.",
                "glossary": [],
            }


def extract_structured(inv: Inventory) -> None:
    for path in EVENT_FILES:
        rel = path.relative_to(ROOT).as_posix()
        for event_node in parse_events(path):
            event = node_object(event_node)
            if not event:
                continue
            event_id = node_string(event.get("id"))
            if not event_id:
                continue
            for field in EVENT_FIELDS:
                for branch, record, line in branch_records(event.get(field)):
                    inv.add(
                        f"event.{event_id}.{field}.{branch}",
                        record,
                        f"{rel}:{line}",
                        f"Event {event_id}, {field}, faith branch {branch}.",
                        TOKEN_RE.findall(record["text"]),
                    )
            options = node_array(event.get("options")) or []
            for index, option_node in enumerate(options):
                option = node_object(option_node) or {}
                base = f"event.{event_id}.options.{index}"
                for field in ("label", "desc"):
                    for branch, record, line in branch_records(option.get(field)):
                        inv.add(
                            f"{base}.{field}.{branch}",
                            record,
                            f"{rel}:{line}",
                            f"Event {event_id}, authored option {index}, {field}, branch {branch}.",
                            TOKEN_RE.findall(record["text"]),
                        )
                for outcome_name in ("success", "failure"):
                    outcome = node_object(option.get(outcome_name)) or {}
                    for branch, record, line in branch_records(outcome.get("text")):
                        inv.add(
                            f"{base}.{outcome_name}.text.{branch}",
                            record,
                            f"{rel}:{line}",
                            f"Event {event_id}, authored option {index}, {outcome_name} text, branch {branch}.",
                            TOKEN_RE.findall(record["text"]),
                        )
                for effect_path, effect_node in (
                    ("effects", option.get("effects")),
                    ("success.effects", (node_object(option.get("success")) or {}).get("effects")),
                    ("failure.effects", (node_object(option.get("failure")) or {}).get("effects")),
                ):
                    effects = node_object(effect_node) or {}
                    for branch, record, line in branch_records(effects.get("log")):
                        inv.add(
                            f"{base}.{effect_path}.log.{branch}",
                            record,
                            f"{rel}:{line}",
                            f"Durable event log for {event_id}, authored option {index}, {effect_path}.",
                            TOKEN_RE.findall(record["text"]),
                        )

    for data_name, namespace in STRUCTURED_DATA.items():
        path = DATA / ("traits.js" if data_name in ("traits", "ailments") else
                       "cultures.js" if data_name in ("cultures", "religions") else
                       "map_data.js")
        root = node_object(find_assignment(path, "FBDATA", data_name)) or {}
        rel = path.relative_to(ROOT).as_posix()
        for item_id, item_node in root.items():
            item = node_object(item_node) or {}
            for field in DATA_FIELDS:
                for branch, record, line in branch_records(item.get(field)):
                    inv.add(
                        f"{namespace}.{item_id}.{field}.{branch}",
                        record,
                        f"{rel}:{line}",
                        f"{namespace} {item_id}, {field}, faith branch {branch}.",
                        TOKEN_RE.findall(record["text"]),
                    )

    titles = node_object(find_assignment(DATA / "map_data.js", "FBDATA", "titles")) or {}
    for group, values_node in titles.items():
        for index, value in enumerate(node_array(values_node) or []):
            if value.kind == "string":
                inv.add(
                    f"title.{group}.{index}.default",
                    {"text": value.value},
                    f"data/map_data.js:{value.line}",
                    f"Standalone rank title, title set {group}, tier {index}.",
                    ("rank_title",),
                )

    scripted = node_array(find_assignment(DATA / "map_data.js", "FBDATA", "scripted")) or []
    for index, item_node in enumerate(scripted):
        item = node_object(item_node) or {}
        year_node = item.get("year")
        year = year_node.value if year_node and year_node.kind == "number" else index
        new_realm = node_object(item.get("newRealm")) or {}
        subject = node_string(new_realm.get("id")) or node_string(item.get("realm")) or "world"
        stable_subject = re.sub(r"[^A-Za-z0-9_-]", "_", str(subject))
        stable_year = re.sub(r"[^A-Za-z0-9_-]", "_", str(year))
        for branch, record, line in branch_records(item.get("news")):
            record = {"text": "📜 " + record["text"]}
            inv.add(
                f"news.world.scripted.{stable_year}.{stable_subject}",
                record,
                f"data/map_data.js:{line}",
                f"Scripted world-history chronicle item {year}/{subject}.",
                (),
            )

    scenarios = node_array(find_assignment(JS / "main.js", "G", "SCENARIOS")) or []
    for index, item_node in enumerate(scenarios):
        item = node_object(item_node) or {}
        item_id = node_string(item.get("id")) or str(index)
        for field in ("name", "diff", "desc", "intro", "intro_muslim"):
            for branch, record, line in branch_records(item.get(field)):
                inv.add(
                    f"scenario.{item_id}.{field}.{branch}",
                    record,
                    f"js/main.js:{line}",
                    f"New-game scenario {item_id}, {field}.",
                    TOKEN_RE.findall(record["text"]),
                )

    for prop, namespace in (("focuses", "focus"), ("instants", "action")):
        values = node_array(find_assignment(JS / "actions.js", "FB", prop)) or []
        for index, item_node in enumerate(values):
            item = node_object(item_node) or {}
            item_id = node_string(item.get("id")) or str(index)
            for branch, record, line in branch_records(item.get("label")):
                inv.add(
                    f"{namespace}.{item_id}.label.{branch}",
                    record,
                    f"js/actions.js:{line}",
                    f"{namespace} {item_id}, visible label.",
                    TOKEN_RE.findall(record["text"]),
                )

    for path in sorted(JS.glob("*.js")):
        tokens = lex_js(path.read_text(encoding="utf-8"))
        rel = path.relative_to(ROOT).as_posix()
        for index in range(len(tokens) - 4):
            if not (
                tokens[index].value == "FB"
                and tokens[index + 1].value == "."
                and tokens[index + 2].value in ("T", "L", "TC")
                and tokens[index + 3].value == "("
            ):
                continue
            source_token: Token | None = None
            key: str | None = None
            method = tokens[index + 2].value
            if method in ("T", "L") and tokens[index + 4].kind == "string":
                source_token = tokens[index + 4]
                key = (
                    "ui:" + source_token.value
                    if method == "T"
                    else source_key(source_token.value)
                )
            elif (
                method == "TC"
                and index + 6 < len(tokens)
                and tokens[index + 4].kind == "string"
                and tokens[index + 5].value == ","
                and tokens[index + 6].kind == "string"
            ):
                source_token = tokens[index + 6]
                key = ui_context_key(tokens[index + 4].value, source_token.value)
            if source_token is not None and key is not None:
                inv.add(
                    key,
                    {"text": source_token.value},
                    f"{rel}:{source_token.line}",
                    "Explicit UI localization call.",
                    TOKEN_RE.findall(source_token.value),
                )
        for index in range(len(tokens) - 4):
            if not (
                tokens[index].value == "FB"
                and tokens[index + 1].value == "."
                and tokens[index + 2].value == "msg"
                and tokens[index + 3].value == "("
                and tokens[index + 4].kind == "string"
            ):
                continue
            key_token = tokens[index + 4]
            parser = Parser(tokens)
            parser.i = index + 5
            if parser.peek(","):
                parser.take()
            source_node = parser.parse_value()
            if source_node.kind == "string":
                record = {"text": source_node.value}
            elif source_node.kind == "object":
                def unwrap(node: Node) -> Any:
                    if node.kind in ("string", "number", "literal"):
                        return node.value
                    if node.kind == "object":
                        return {key: unwrap(value) for key, value in node.value.items()}
                    if node.kind == "array":
                        return [unwrap(value) for value in node.value]
                    return None

                record = unwrap(source_node)
            else:
                continue
            if not isinstance(record, dict) or not (
                isinstance(record.get("text"), str) or isinstance(record.get("forms"), dict)
            ):
                continue
            inv.add(
                key_token.value,
                record,
                f"{rel}:{key_token.line}",
                "Durable message descriptor; English source remains at its callsite.",
                tokens_of(record),
            )


def extract_literal_aliases(inv: Inventory) -> None:
    for path in SOURCE_FILES:
        rel = path.relative_to(ROOT).as_posix()
        if path.suffix == ".html":
            text = path.read_text(encoding="utf-8")
            for match in re.finditer(
                r">\s*([^<>\r\n][^<>]*?)\s*<|(?:title|placeholder|aria-label)=\"([^\"]+)\"",
                text,
            ):
                value = next(group for group in match.groups() if group is not None)
                value = html.unescape(re.sub(r"\s+", " ", value).strip())
                if looks_translatable(value):
                    line = text.count("\n", 0, match.start()) + 1
                    inv.add(
                        source_key(value),
                        {"text": value},
                        f"{rel}:{line}",
                        "Static HTML text or accessibility attribute.",
                    )
            continue
        source_text = path.read_text(encoding="utf-8")
        # The release changelog is intentionally English-only. Find the first
        # gameplay-data assignment instead of relying on a brittle line number:
        # every new changelog entry moves the start of G.SCENARIOS.
        gameplay_start = (
            source_text.find("G.SCENARIOS")
            if path.name == "main.js"
            else -1
        )
        for token in lex_js(source_text):
            if token.kind != "string":
                continue
            if gameplay_start >= 0 and token.pos < gameplay_start:
                continue
            for segment in html_segments(token.value):
                segment = re.sub(r"\s+", " ", segment).strip()
                if looks_translatable(segment):
                    inv.add(
                        source_key(segment),
                        {"text": segment},
                        f"{rel}:{token.line}",
                        "Exact English display-source candidate.",
                    )


def add_core_records(inv: Inventory) -> None:
    records: dict[str, dict[str, Any]] = {
        "fx.warstate.host": {"text": "Your host: ~{men} men at {condition}% condition"},
        "fx.warstate.mercenaries": {
            "forms": {
                "select": "plural",
                "param": "count",
                "cases": {
                    "one": "{count} mercenary company",
                    "other": "{count} mercenary companies",
                },
            }
        },
        "fx.warstate.in_field": {"text": "In the field at {place}"},
        "fx.warstate.not_mustered": {"text": "Not yet mustered"},
        "fx.warstate.enemy_host": {"text": "Their host: ~{men} men at {place}"},
        "fx.warstate.siege": {"text": "Siege of {place}: {progress}/3"},
        "fx.warstate.advance": {"text": "Enemy advance: {progress}/3"},
        "fx.param.this_land": {"text": "this land"},
        "fx.param.the_realm": {"text": "the realm"},
        "fx.param.the_town": {"text": "the town"},
        "fx.param.a_curiosity": {"text": "a curiosity"},
        "fx.param.the_enemy": {"text": "the enemy"},
        "fx.param.their_lands": {"text": "their lands"},
        "fx.param.your_liege": {"text": "your liege"},
        "fx.param.the_lord": {"text": "the lord"},
        "fx.param.the_county": {"text": "the county"},
        "fx.param.your_spouse": {"text": "your spouse"},
        "fx.param.a_stranger": {"text": "a stranger"},
        "fx.param.your_child": {"text": "your child"},
        "fx.param.your_late_spouse": {"text": "your late spouse"},
        "fx.param.someone": {"text": "someone"},
        "fx.param.holy.imam": {"text": "imam"},
        "fx.param.holy.godi": {"text": "godi"},
        "fx.param.holy.rabbi": {"text": "rabbi"},
        "fx.param.holy.priest": {"text": "priest"},
        "fx.param.god.allah": {"text": "Allah"},
        "fx.param.god.gods": {"text": "the gods"},
        "fx.param.god.lord": {"text": "the Lord"},
        "fx.param.god.god": {"text": "God"},
        "fx.param.temple.mosque": {"text": "mosque"},
        "fx.param.temple.grove": {"text": "shrine"},
        "fx.param.temple.synagogue": {"text": "synagogue"},
        "fx.param.temple.church": {"text": "church"},
    }
    for terrain in (
        "farmland", "forest", "hills", "mountains",
        "desert", "steppe", "marsh", "tundra",
    ):
        records[f"terrain.{terrain}.default"] = {"text": terrain}
    for settlement in ("village", "town", "city"):
        records[f"settlement.{settlement}.default"] = {"text": settlement}
    for rarity in ("common", "fine", "famed"):
        records[f"rarity.{rarity}.default"] = {"text": rarity}
    for key, record in records.items():
        inv.add(key, record, "js/events.js", "Structured war-status display message.", tokens_of(record))
    for word in (
        "friend", "lord",
        "hardier", "frailer", "higher", "lower",
        "more fertile", "less fertile",
        "slowest", "slow", "the default", "fast", "fastest",
    ):
        inv.add(
            f"word.ui.{re.sub(r'[^a-z0-9]+', '_', word).strip('_')}.default",
            {"text": word},
            "js/ui.js",
            "UI vocabulary selected dynamically at runtime.",
        )


def build_inventory() -> Inventory:
    inv = Inventory()
    extract_structured(inv)
    extract_literal_aliases(inv)
    add_core_records(inv)
    inv.finish_alias_meta()
    return inv


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False).replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def catalog_record_identity(
    source: dict[str, Any], target: dict[str, Any]
) -> str:
    """Deduplicate equal output without coupling keys that later diverge."""
    return fnv1a_utf16(stable_json({"source": source, "target": target}))


def render_catalog(
    code: str,
    name: str,
    entries: dict[str, dict[str, Any]],
    translations: dict[str, dict[str, Any]] | None = None,
) -> str:
    translated = translations or entries
    records: dict[str, dict[str, Any]] = {}
    record_inputs: dict[str, str] = {}
    key_to_record: dict[str, str] = {}
    for key, source in entries.items():
        target = dict(translated[key])
        record_id = catalog_record_identity(source, target)
        identity_input = stable_json({"source": source, "target": target})
        if record_id in record_inputs and record_inputs[record_id] != identity_input:
            raise ValueError(f"colliding generated record id {record_id}")
        record_inputs[record_id] = identity_input
        key_to_record[key] = record_id
        target["hash"] = source_hash(source)
        records[record_id] = target
    lines = [
        "/* Generated by tools/i18n_catalog.py; do not hand-edit. */",
        "window.FBDATA = window.FBDATA || {};",
        "FBDATA.lang = FBDATA.lang || {};",
        "(function () {",
        "  'use strict';",
        "  var R = {",
    ]
    record_items = sorted(records.items())
    for index, (record_id, record) in enumerate(record_items):
        comma = "," if index + 1 < len(record_items) else ""
        lines.append(f"    {js_string(record_id)}: {json.dumps(record, ensure_ascii=False, separators=(',', ':'))}{comma}")
    lines.extend(
        [
            "  };",
            f"  FBDATA.lang.{code} = {{",
            f"    schema: {CATALOG_SCHEMA},",
            f"    code: {js_string(code)},",
            f"    name: {js_string(name)},",
            "    dir: 'ltr',",
            "    entries: {",
        ]
    )
    key_items = sorted(key_to_record.items())
    for index, (key, record_id) in enumerate(key_items):
        comma = "," if index + 1 < len(key_items) else ""
        lines.append(f"      {js_string(key)}: R[{js_string(record_id)}]{comma}")
    lines.append("    },")
    words = locale_words(code)
    lines.append(f"    words: {json.dumps(words, ensure_ascii=False, separators=(',', ':'))},")
    lines.extend(
        [
            f"    pluralCategory: {plural_function(code)}",
        ]
    )
    lines.extend(["  };", "})();", ""])
    return "\n".join(lines)


def write_catalog(
    code: str,
    name: str,
    entries: dict[str, dict[str, Any]],
    meta: dict[str, dict[str, Any]] | None,
    translations: dict[str, dict[str, Any]] | None = None,
) -> Path:
    path = DATA / f"lang_{code}.js"
    path.write_text(
        render_catalog(code, name, entries, translations),
        encoding="utf-8",
        newline="\n",
    )
    return path


def locale_words(code: str) -> dict[str, dict[str, str]]:
    tables = {
        "en": {
            "child": {"m": "son", "f": "daughter", "x": "child"},
            "parent": {"m": "father", "f": "mother", "x": "parent"},
            "sibling": {"m": "brother", "f": "sister", "x": "sibling"},
            "spouse": {"m": "husband", "f": "wife", "x": "spouse"},
            "monarch": {"m": "king", "f": "queen", "x": "monarch"},
            "noble": {"m": "lord", "f": "lady", "x": "noble"},
            "pronoun": {"m": "he", "f": "she", "x": "they"},
            "possess": {"m": "his", "f": "her", "x": "their"},
        },
        "fr": {
            "child": {"m": "fils", "f": "fille", "x": "enfant"},
            "parent": {"m": "père", "f": "mère", "x": "parent"},
            "sibling": {"m": "frère", "f": "sœur", "x": "membre de la fratrie"},
            "spouse": {"m": "époux", "f": "épouse", "x": "conjoint"},
            "monarch": {"m": "roi", "f": "reine", "x": "monarque"},
            "noble": {"m": "seigneur", "f": "dame", "x": "noble"},
            "pronoun": {"m": "il", "f": "elle", "x": "iel"},
            "possess": {"m": "son", "f": "sa", "x": "leur"},
        },
        "de": {
            "child": {"m": "Sohn", "f": "Tochter", "x": "Kind"},
            "parent": {"m": "Vater", "f": "Mutter", "x": "Elternteil"},
            "sibling": {"m": "Bruder", "f": "Schwester", "x": "Geschwister"},
            "spouse": {"m": "Ehemann", "f": "Ehefrau", "x": "Ehepartner"},
            "monarch": {"m": "König", "f": "Königin", "x": "Monarch"},
            "noble": {"m": "Herr", "f": "Dame", "x": "Adeliger"},
            "pronoun": {"m": "er", "f": "sie", "x": "sie"},
            "possess": {"m": "sein", "f": "ihr", "x": "deren"},
        },
        "it": {
            "child": {"m": "figlio", "f": "figlia", "x": "figlio"},
            "parent": {"m": "padre", "f": "madre", "x": "genitore"},
            "sibling": {"m": "fratello", "f": "sorella", "x": "fratello"},
            "spouse": {"m": "marito", "f": "moglie", "x": "coniuge"},
            "monarch": {"m": "re", "f": "regina", "x": "monarca"},
            "noble": {"m": "signore", "f": "dama", "x": "nobile"},
            "pronoun": {"m": "lui", "f": "lei", "x": "loro"},
            "possess": {"m": "suo", "f": "sua", "x": "loro"},
        },
        "es": {
            "child": {"m": "hijo", "f": "hija", "x": "descendiente"},
            "parent": {"m": "padre", "f": "madre", "x": "progenitor"},
            "sibling": {"m": "hermano", "f": "hermana", "x": "hermano"},
            "spouse": {"m": "esposo", "f": "esposa", "x": "cónyuge"},
            "monarch": {"m": "rey", "f": "reina", "x": "monarca"},
            "noble": {"m": "señor", "f": "dama", "x": "noble"},
            "pronoun": {"m": "él", "f": "ella", "x": "elle"},
            "possess": {"m": "su", "f": "su", "x": "su"},
        },
    }
    return tables.get(code, tables["en"])


def plural_function(code: str) -> str:
    if code == "fr":
        return "function (n) { return n >= 0 && n < 2 ? 'one' : 'other'; }"
    return "function (n) { return n === 1 ? 'one' : 'other'; }"


def protect(text: str) -> tuple[str, dict[str, str]]:
    saved: dict[str, str] = {}

    def replace(match: re.Match[str]) -> str:
        marker = f"ZXQTK{len(saved):03d}QXZ"
        saved[marker] = match.group(0)
        return marker

    protected = TOKEN_RE.sub(replace, text)
    protected = EMOJI_RE.sub(replace, protected)
    return protected, saved


def restore(text: str, saved: dict[str, str]) -> str:
    for marker, original in saved.items():
        text = text.replace(marker, original)
    return text


PROTECTED_RE = re.compile(
    rf"(?:\{{[A-Za-z_][A-Za-z0-9_]*\}}|{EMOJI_RE.pattern})"
)


def leaf_integrity(source: str, translated: str) -> bool:
    return (
        sorted(TOKEN_RE.findall(source)) == sorted(TOKEN_RE.findall(translated))
        and sorted(EMOJI_RE.findall(source)) == sorted(EMOJI_RE.findall(translated))
    )


def translate_by_segments(text: str, target: str) -> str:
    """Fallback when MT drops a protected token despite marker protection.

    Translate only the prose spans and splice the original placeholders/emoji
    back between them. This is less free to reorder than the normal batch path,
    but it is deterministic and cannot corrupt a runtime message contract.
    """
    matches = list(PROTECTED_RE.finditer(text))
    if not matches:
        return google_translate_batch([text], target)[0]
    spans: list[str] = []
    cursor = 0
    for match in matches:
        spans.append(text[cursor : match.start()])
        cursor = match.end()
    spans.append(text[cursor:])
    nonempty = [span for span in spans if span]
    translated_spans = google_translate_batch(nonempty, target) if nonempty else []
    translated_iter = iter(translated_spans)
    rebuilt: list[str] = []
    for index, span in enumerate(spans):
        rebuilt.append(next(translated_iter) if span else "")
        if index < len(matches):
            rebuilt.append(matches[index].group(0))
    return "".join(rebuilt)


def google_translate_batch(texts: list[str], target: str) -> list[str]:
    protected: list[str] = []
    saves: list[dict[str, str]] = []
    for value in texts:
        safe, kept = protect(value)
        protected.append(safe)
        saves.append(kept)
    markers = [f"ZXQSEP{i:05d}QXZ" for i in range(len(texts) + 1)]
    payload_parts: list[str] = []
    for index, value in enumerate(protected):
        payload_parts.extend((markers[index], value))
    payload_parts.append(markers[-1])
    payload = "\n".join(payload_parts)
    query = urllib.parse.urlencode(
        {"client": "gtx", "sl": "en", "tl": target, "dt": "t", "q": payload}
    )
    url = "https://translate.googleapis.com/translate_a/single?" + query
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 Fallowborn-i18n"})
    with urllib.request.urlopen(request, timeout=45) as response:
        body = json.loads(response.read().decode("utf-8"))
    translated = "".join(part[0] for part in body[0] if part and part[0])
    result: list[str] = []
    for index in range(len(texts)):
        start = translated.find(markers[index])
        end = translated.find(markers[index + 1])
        if start < 0 or end < 0 or end < start:
            raise RuntimeError(f"translation delimiter lost for item {index}")
        value = translated[start + len(markers[index]) : end].strip("\r\n ")
        result.append(restore(value, saves[index]))
    return result


def translate_inventory(inv: Inventory, code: str, cache_path: Path) -> dict[str, dict[str, Any]]:
    if cache_path.exists():
        cache: dict[str, str] = json.loads(cache_path.read_text(encoding="utf-8"))
    else:
        cache = {}

    def persist_cache() -> None:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(
            json.dumps(cache, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )

    leaves: dict[str, str] = {}

    def collect(value: Any) -> None:
        if isinstance(value, str):
            key = fnv1a_utf16(value)
            old = leaves.get(key)
            if old is not None and old != value:
                raise ValueError(f"colliding translation cache key {key}")
            leaves[key] = value
        elif isinstance(value, dict):
            for key, child in value.items():
                if key not in ("select", "param"):
                    collect(child)

    unique_records: dict[str, dict[str, Any]] = {}
    for source in inv.entries.values():
        unique_records.setdefault(stable_json(source), source)
    for source in unique_records.values():
        collect(source)

    repaired = 0
    for key, source in leaves.items():
        if key not in cache or leaf_integrity(source, cache[key]):
            continue
        translated = translate_by_segments(source, code)
        if not leaf_integrity(source, translated):
            raise RuntimeError(f"{code}: AI repair could not preserve tokens/emoji for {key}")
        cache[key] = translated
        repaired += 1
    if repaired:
        persist_cache()
        print(f"{code}: repaired {repaired} cached strings", flush=True)

    pending = [(key, text) for key, text in leaves.items() if key not in cache]
    cursor = 0
    while cursor < len(pending):
        batch: list[tuple[str, str]] = []
        chars = 0
        while cursor < len(pending):
            item = pending[cursor]
            estimate = len(item[1]) + 24
            if batch and chars + estimate > 3500:
                break
            batch.append(item)
            chars += estimate
            cursor += 1
        values = google_translate_batch([item[1] for item in batch], code)
        for (key, source), translated in zip(batch, values):
            if not leaf_integrity(source, translated):
                translated = translate_by_segments(source, code)
            if not leaf_integrity(source, translated):
                raise RuntimeError(f"{code}: AI translation corrupted tokens/emoji for {key}")
            cache[key] = translated
        persist_cache()
        print(f"{code}: translated {cursor}/{len(pending)} new strings", flush=True)
        time.sleep(0.15)

    def translated_record(source: dict[str, Any]) -> dict[str, Any]:
        def walk(value: Any, key: str | None = None) -> Any:
            if isinstance(value, str):
                if key in ("select", "param"):
                    return value
                return cache[fnv1a_utf16(value)]
            if isinstance(value, dict):
                return {child_key: walk(child, child_key) for child_key, child in value.items()}
            return value

        return walk(source)

    by_identity = {
        record_json: translated_record(source)
        for record_json, source in unique_records.items()
    }
    return {key: by_identity[stable_json(source)] for key, source in inv.entries.items()}


def validate_translation(
    source: dict[str, Any], translated: dict[str, Any], key: str
) -> list[str]:
    errors: list[str] = []
    if not aligned_records(source, translated, lambda _source, _target: True):
        errors.append(f"{key}: selector shape mismatch")
        return errors
    if not aligned_records(
        source,
        translated,
        lambda source_leaf, target_leaf:
            token_instances(source_leaf) == token_instances(target_leaf),
    ):
        errors.append(f"{key}: placeholder mismatch")
    if not aligned_records(
        source,
        translated,
        lambda source_leaf, target_leaf:
            sorted(EMOJI_RE.findall(source_leaf)) ==
            sorted(EMOJI_RE.findall(target_leaf)),
    ):
        errors.append(f"{key}: emoji mismatch")
    return errors


PLURAL_CASES = {"zero", "one", "two", "few", "many", "other"}


def aligned_records(
    source: dict[str, Any],
    translated: dict[str, Any],
    leaf_check: Any,
) -> bool:
    if isinstance(source.get("text"), str):
        return (
            isinstance(translated.get("text"), str)
            and leaf_check(source["text"], translated["text"])
        )
    source_forms = source.get("forms")
    target_forms = translated.get("forms")
    if not isinstance(source_forms, dict) or not isinstance(target_forms, dict):
        return False

    def aligned_leaf(source_leaf: Any, target_leaf: Any, depth: int) -> bool:
        if isinstance(source_leaf, str):
            return isinstance(target_leaf, str) and leaf_check(source_leaf, target_leaf)
        if (
            not isinstance(source_leaf, dict)
            or not isinstance(target_leaf, dict)
            or depth > 1
            or source_leaf.get("select") != target_leaf.get("select")
            or source_leaf.get("param") != target_leaf.get("param")
            or not isinstance(source_leaf.get("cases"), dict)
            or not isinstance(target_leaf.get("cases"), dict)
        ):
            return False
        source_cases = source_leaf["cases"]
        target_cases = target_leaf["cases"]
        for case, child in source_cases.items():
            if case not in target_cases or not aligned_leaf(
                child, target_cases[case], depth + 1
            ):
                return False
        for case, child in target_cases.items():
            if case in source_cases:
                continue
            # A locale may add CLDR plural categories absent from English.
            # The English `other` leaf is their source/token contract.
            if (
                source_leaf.get("select") != "plural"
                or case not in PLURAL_CASES
                or not aligned_leaf(source_cases["other"], child, depth + 1)
            ):
                return False
        return True

    return aligned_leaf(source_forms, target_forms, 0)


def record_shape(value: Any, depth: int = 0) -> Any:
    if isinstance(value, str):
        return "text"
    if not isinstance(value, dict):
        return ("invalid", type(value).__name__)
    if "text" in value:
        return ("record-text",)
    if "forms" in value:
        return ("record-forms", record_shape(value["forms"], depth))
    selector = value.get("select")
    param = value.get("param")
    cases = value.get("cases")
    if (
        depth > 1
        or selector not in ("plural", "value")
        or not isinstance(param, str)
        or not param
        or not isinstance(cases, dict)
        or "other" not in cases
    ):
        return ("invalid-selector",)
    return (
        selector,
        param,
        tuple(
            (case, record_shape(child, depth + 1))
            for case, child in sorted(cases.items())
        ),
    )


def command_extract(args: argparse.Namespace) -> int:
    inv = build_inventory()
    malformed = [
        key for key, record in inv.entries.items()
        if "invalid" in stable_json(record_shape(record))
    ]
    if malformed:
        raise SystemExit(
            "invalid English catalog record shape: " + ", ".join(malformed[:20])
        )
    path = write_catalog("en", "English", inv.entries, inv.meta)
    manifest_path = ROOT / "tools" / "i18n_manifest.json"
    manifest_path.write_text(
        json.dumps(
            {
                "schema": CATALOG_SCHEMA,
                "hashSchema": HASH_SCHEMA,
                "entries": inv.meta,
            },
            ensure_ascii=False,
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )
    report = {
        "schema": CATALOG_SCHEMA,
        "hashSchema": HASH_SCHEMA,
        "entries": len(inv.entries),
        "uniqueRecords": len({stable_json(record) for record in inv.entries.values()}),
        "words": sum(
            len(re.findall(r"\b[\w’'-]+\b", stable_json(record), flags=re.UNICODE))
            for record in {stable_json(v): v for v in inv.entries.values()}.values()
        ),
    }
    report_path = ROOT / "notes" / "i18n-coverage.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    human_path = ROOT / "notes" / "i18n-coverage.md"
    human_path.write_text(
        "# i18n extraction coverage\n\n"
        f"- Catalog schema: {CATALOG_SCHEMA}\n"
        f"- Hash schema: {HASH_SCHEMA}\n"
        f"- Keys: {report['entries']}\n"
        f"- Unique English records: {report['uniqueRecords']}\n"
        f"- Approximate source words: {report['words']}\n"
        "- Routed inventory: structured event/data fields, durable messages, "
        "explicit localization calls, static HTML, and UI literal aliases.\n"
        "- Intentional exceptions: generated personal/place/realm names, "
        "mod-authored text without a matching catalog, legacy rendered save text, "
        "and the changelog.\n",
        encoding="utf-8",
    )
    print(
        f"wrote {path.relative_to(ROOT)} and "
        f"{manifest_path.relative_to(ROOT)}: {report}"
    )
    return 0


def command_translate(args: argparse.Namespace) -> int:
    inv = build_inventory()
    names = {"fr": "Français", "de": "Deutsch", "it": "Italiano", "es": "Español"}
    for code in args.locales:
        if code not in names:
            raise SystemExit(f"unsupported target locale: {code}")
        cache = ROOT / "notes" / "i18n-cache" / f"{code}.json"
        translated = translate_inventory(inv, code, cache)
        errors: list[str] = []
        for key, source in inv.entries.items():
            errors.extend(validate_translation(source, translated[key], key))
        if errors:
            print("\n".join(errors[:100]), file=sys.stderr)
            raise SystemExit(f"{code}: {len(errors)} validation errors")
        path = write_catalog(code, names[code], inv.entries, None, translated)
        print(f"wrote {path.relative_to(ROOT)} ({len(inv.entries)} entries)")
    return 0


def read_generated_catalog(path: Path) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    records: dict[str, dict[str, Any]] = {}
    key_to_record: dict[str, str] = {}
    record_rx = re.compile(
        r'^\s{4}("(?:\\.|[^"\\])*"):\s+(\{.*\}),?$'
    )
    key_rx = re.compile(
        r'^\s{6}("(?:\\.|[^"\\])*"):\s+R\[("(?:\\.|[^"\\])*")\],?$'
    )
    for line in path.read_text(encoding="utf-8").splitlines():
        record_match = record_rx.match(line)
        if record_match:
            records[json.loads(record_match.group(1))] = json.loads(record_match.group(2))
            continue
        key_match = key_rx.match(line)
        if key_match:
            key_to_record[json.loads(key_match.group(1))] = json.loads(key_match.group(2))
    return records, key_to_record


def command_validate(args: argparse.Namespace) -> int:
    inv = build_inventory()
    expected = DATA / "lang_en.js"
    original = expected.read_text(encoding="utf-8") if expected.exists() else None
    generated = render_catalog("en", "English", inv.entries)
    if original is None:
        print("data/lang_en.js is missing; run: python tools/i18n_catalog.py extract", file=sys.stderr)
        return 1
    if original != generated:
        print("data/lang_en.js is stale; run: python tools/i18n_catalog.py extract", file=sys.stderr)
        return 1
    print(f"English catalog current: {len(inv.entries)} keys")
    for code in args.locales:
        path = DATA / f"lang_{code}.js"
        if not path.exists():
            print(f"missing {path.relative_to(ROOT)}", file=sys.stderr)
            return 1
        text = path.read_text(encoding="utf-8")
        if (
            f"schema: {CATALOG_SCHEMA}," not in text
            or f"code: {js_string(code)}," not in text
            or "dir: 'ltr'," not in text
        ):
            print(f"{code}: catalog metadata mismatch", file=sys.stderr)
            return 1
        try:
            records, key_to_record = read_generated_catalog(path)
        except (json.JSONDecodeError, ValueError) as error:
            print(f"{code}: generated catalog cannot be parsed: {error}", file=sys.stderr)
            return 1
        locale_keys = set(key_to_record)
        expected_keys = set(inv.entries)
        missing_keys = expected_keys - locale_keys
        orphan_keys = locale_keys - expected_keys
        if missing_keys or orphan_keys:
            print(
                f"{code}: {len(missing_keys)} missing keys, "
                f"{len(orphan_keys)} orphan keys",
                file=sys.stderr,
            )
            return 1
        errors: list[str] = []
        for key, source in inv.entries.items():
            record_id = key_to_record[key]
            target = records.get(record_id)
            if target is None:
                errors.append(f"{key}: mapped record is absent")
                continue
            target_without_hash = {
                child_key: child
                for child_key, child in target.items()
                if child_key != "hash"
            }
            if record_id != catalog_record_identity(source, target_without_hash):
                errors.append(f"{key}: record identity does not match its source and target")
                continue
            if target.get("hash") != source_hash(source):
                errors.append(f"{key}: source hash is stale")
                continue
            errors.extend(validate_translation(source, target, key))
        unused_records = set(records) - set(key_to_record.values())
        if unused_records:
            errors.append(f"{len(unused_records)} unreferenced generated records")
        if errors:
            print("\n".join(f"{code}: {error}" for error in errors[:100]), file=sys.stderr)
            print(f"{code}: {len(errors)} catalog validation errors", file=sys.stderr)
            return 1
        print(
            f"{code}: catalog contains all {len(inv.entries)} keys with current "
            "hashes, selectors, tokens, and emoji"
        )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    extract = sub.add_parser("extract")
    extract.set_defaults(func=command_extract)
    translate = sub.add_parser("translate")
    translate.add_argument("locales", nargs="+", choices=("fr", "de", "it", "es"))
    translate.set_defaults(func=command_translate)
    validate = sub.add_parser("validate")
    validate.add_argument("locales", nargs="*", default=("fr", "de", "it", "es"))
    validate.set_defaults(func=command_validate)
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())

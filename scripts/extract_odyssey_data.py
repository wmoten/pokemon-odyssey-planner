#!/usr/bin/env python3
"""Build the client-side Pokemon Odyssey data bundle from the v4.1.1 docs."""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import openpyxl
from pypdf import PdfReader

try:
    import pdfplumber
except Exception:  # pragma: no cover - the text extraction fallback still works.
    pdfplumber = None


ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = Path.home() / "Downloads"

STATS_XLSX = Path(os.environ.get(
    "ODYSSEY_STATS_XLSX",
    DOWNLOADS / "Pokémon Stats, Learnset etc (v4.1.1).xlsx",
))
WILD_XLSX = Path(os.environ.get(
    "ODYSSEY_WILD_XLSX",
    DOWNLOADS / "Wild encounters, Items and TMs (v4.1.1).xlsx",
))
LEVELS_XLSX = Path(os.environ.get(
    "ODYSSEY_LEVELS_XLSX",
    DOWNLOADS / "Level Cap, Boss, Miniboss, Sea Map, Sidequests (v4.1.1).xlsx",
))
TEAMBUILDING_PDF = Path(os.environ.get(
    "ODYSSEY_TEAMBUILDING_PDF",
    DOWNLOADS / "Teambuilding options - v4.1.1.pdf",
))

OUT_JSON = ROOT / "src" / "data" / "pokemon-odyssey-data.json"
STANDARD_ABILITY_CACHE = ROOT / "scripts" / "pokeapi-ability-definitions-cache.json"
POKEAPI_ABILITY_INDEX = "https://pokeapi.co/api/v2/ability?limit=10000"
HTTP_HEADERS = {"User-Agent": "pokemon-odyssey-team-planner/1.0"}
STANDARD_ABILITY_ALIASES = {
    "keeneyes": "keeneye",
}

STATS_SHEETS = ["#1-151", "#152-251", "#252-386", "4th Gen", "Paradox"]
POKEMON_START_COLS = [1, 4, 7]
ENCOUNTER_START_COLS = [1, 5, 9, 13]
STAT_NAMES = ["hp", "atk", "def", "spa", "spd", "spe"]
STONE_EVOLUTION_TERMS = [
    "Dawn Stone",
    "Dusk Stone",
    "Fire Stone",
    "Ice Stone",
    "Leaf Stone",
    "Link Stone",
    "Moon Stone",
    "Shiny Stone",
    "Sun Stone",
    "Thunderstone",
    "Water Stone",
]

METHOD_TOKENS = {
    "TALL GRASS",
    "HEADBUTT",
    "FISHING",
    "OLD ROD",
    "GOOD ROD",
    "SUPER ROD",
    "EVENT",
    "SPECIAL",
    "FLOOR",
    "CAVE",
    "ROCK SMASH",
    "WATER",
    "SURF",
    "F.O.E.",
    "FOE",
}

HEADER_TOKENS = {
    "POKÉMON",
    "POKEMON",
    "LEVEL",
    "ENCOUNTER %",
    "NORMAL",
    "SHINY",
    "REFERENCE",
    "TYPE:",
    "ABILITY:",
    "EVOLUTION:",
    "MOVES",
}

EARLY_LOCATIONS = [
    "FIBERNIA",
    "ABANDONED LAB",
    "COASTAL ROAD",
    "SEASIDE GROTTO",
    "TALREGA",
    "VARLEY",
    "WATERFALL WOOD",
    "FIRST STRATUM",
    "SECOND STRATUM",
    "JAGGED MOUNTAIN",
    "MAPLE ISLAND",
    "DESERT OF GOLGONDA",
    "CAVE OF ATHARI",
    "NORTHERN ATOLL",
    "WONDER TRADE",
    "NORMAL ENCOUNTERS",
]

MID_LOCATIONS = [
    "THIRD STRATUM",
    "FOURTH STRATUM",
    "ARUNDEL",
    "CHARON",
    "GORENIL",
    "RADE OF CARCINO",
    "BRIGIT",
    "LOST WOODS",
    "AUBURN THICKET",
    "AZURE",
    "ETRIA GRAVEYARD",
    "PIRATE ISLAND",
    "AQUA RESORT",
    "AFTER THE FIRST STRATUM",
    "AFTER THE SECOND STRATUM",
    "AFTER THE THIRD STRATUM",
    "AFTER THE FOURTH STRATUM",
]

LATE_LOCATIONS = [
    "FIFTH STRATUM",
    "SIXTH STRATUM",
    "SEVENTH STRATUM",
    "EIGHTH STRATUM",
    "CAVE OF AGES",
    "FARAWAY",
    "POSTGAME",
    "ABYSSAL",
    "ACUITY",
    "AFTER THE FIFTH STRATUM",
    "AFTER THE SIXTH STRATUM",
    "AFTER THE SEVENTH STRATUM",
]

TIMING_ORDER = {"Starter": 0, "Early": 1, "Mid": 2, "Late": 3, "Postgame": 4, "Unknown": 9}

NAME_ALIASES = {
    "ScreamTail": "Scream Tail",
    "SandyShock": "Sandy Shock",
    "Flut. Mane": "Flutter Mane",
    "RagingBolt": "Raging Bolt",
    "GouginFire": "Gouging Fire",
    "Roar. Moon": "Roaring Moon",
    "WalkinWake": "Walking Wake",
}


def as_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def clean_space(value: str) -> str:
    value = unicodedata.normalize("NFKC", value or "")
    value = value.replace("\u2019", "'").replace("\u2018", "'")
    value = value.replace("\u201c", '"').replace("\u201d", '"')
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def strip_stars(value: str) -> str:
    value = value.replace("⭐", "")
    value = value.replace("( )", "")
    value = re.sub(r"\(\s*\)", "", value)
    return clean_space(value)


def clean_species_name(raw: str) -> str:
    value = clean_space(as_text(raw))
    value = value.replace("(⭐)", "")
    value = value.replace("⭐", "")
    value = re.sub(r"^\s*-\s*", "", value)
    value = value.replace("Mr.Mime", "Mr. Mime")
    value = value.replace("Porygon 2", "Porygon2")
    value = value.replace("Sirfetch'd", "Sirfetch'd")
    value = value.replace("Sirfetch’d", "Sirfetch'd")
    value = re.sub(r"\s+", " ", value)
    value = NAME_ALIASES.get(value, value)
    return value.strip()


def name_key(raw: str) -> str:
    value = clean_species_name(raw).lower()
    value = re.sub(r"^b\.?b\.?\s+", "bb ", value)
    value = value.replace("♀", " f").replace("♂", " m")
    value = value.replace("(f)", " f").replace("(m)", " m")
    value = value.replace("nidoran (f)", "nidoran f")
    value = value.replace("nidoran (m)", "nidoran m")
    value = value.replace("mr. mime", "mr mime")
    value = value.replace("mime jr.", "mime jr")
    value = value.replace("porygon-z", "porygon z")
    value = value.replace("porygon z", "porygon-z")
    value = value.replace("sirfetch’d", "sirfetchd")
    value = value.replace("sirfetch'd", "sirfetchd")
    value = value.replace("farfetch’d", "farfetchd")
    value = value.replace("farfetch'd", "farfetchd")
    value = value.replace("battle bond", "bb")
    value = value.replace("b.b.", "bb").replace("b.b", "bb")
    if value.startswith("bb "):
        value = f"{value[3:]} bb"
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value


def display_name(raw: str, is_variant: bool = False) -> str:
    name = clean_species_name(raw)
    if is_variant and "⭐" not in name:
        return f"{name} ⭐"
    return name


def split_types(value: str) -> list[str]:
    return [part.strip().title() for part in clean_space(as_text(value)).split("/") if part.strip()]


def split_abilities(value: str) -> list[str]:
    return [part.strip() for part in clean_space(as_text(value)).split("/") if part.strip()]


def ability_key(value: str) -> str:
    value = clean_space(value).lower()
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", "", value)


def is_variant(raw: str) -> bool:
    text = clean_space(as_text(raw))
    return "⭐" in text and "(⭐)" not in text


def evolves_to_variant(raw: str) -> bool:
    return "(⭐)" in clean_space(as_text(raw))


def level_to_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return f"{value.day}-{value.month}"
    if isinstance(value, float):
        return str(int(value)) if value.is_integer() else str(value)
    return clean_space(str(value))


def encounter_rate_to_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float):
        if 0 <= value <= 1:
            pct = value * 100
            return f"{pct:.1f}%".replace(".0%", "%")
        return str(int(value)) if value.is_integer() else str(value)
    return clean_space(str(value))


def min_level(level: str) -> int | None:
    nums = [int(x) for x in re.findall(r"\d+", level or "")]
    return min(nums) if nums else None


def timing_for_location(location: str, method: str = "") -> str:
    text = f"{location} {method}".upper()
    if "POSTGAME" in text:
        return "Postgame"
    for needle in LATE_LOCATIONS:
        if needle in text:
            return "Late"
    for needle in MID_LOCATIONS:
        if needle in text:
            return "Mid"
    for needle in EARLY_LOCATIONS:
        if needle in text:
            return "Early"
    return "Unknown"


def timing_rank(timing: str) -> int:
    return TIMING_ORDER.get(timing, TIMING_ORDER["Unknown"])


def is_area_heading(value: str, row_values: list[str]) -> bool:
    text = clean_space(value)
    if not text:
        return False
    upper = text.upper()
    if upper in METHOD_TOKENS or upper in HEADER_TOKENS:
        return False
    if "POKÉMON" in upper or "POKEMON" in upper or "LEVEL" in upper or "ENCOUNTER" in upper:
        return False
    nonempty = [clean_space(v) for v in row_values if clean_space(v)]
    if len(nonempty) > 2:
        return False
    return upper == text and len(text) > 2


def is_method_heading(value: str) -> bool:
    text = clean_space(value).upper()
    return text in METHOD_TOKENS or text.startswith("F.O.E")


def is_encounter_name(value: str) -> bool:
    text = clean_space(value)
    if not text:
        return False
    upper = text.upper()
    if upper in METHOD_TOKENS or upper in HEADER_TOKENS:
        return False
    if "POKÉMON" in upper or "POKEMON" in upper:
        return False
    return True


def split_species_list(raw: str) -> list[str]:
    value = clean_space(as_text(raw))
    if not value:
        return []
    value = value.replace(" or ", "/").replace(" and ", "/").replace(",", "/")
    value = re.sub(r"\s*/\s*", "/", value)
    names = [clean_species_name(part) for part in value.split("/") if clean_species_name(part)]
    return names


def normalize_evolution_part(part: str) -> str:
    part = clean_space(part)
    level_match = re.search(r"LV\.?\s*(\d+)", part, flags=re.I)
    if level_match:
        return f"Lv. {level_match.group(1)}"
    return part


def parse_evolution_method(raw: str) -> dict:
    raw = clean_space(as_text(raw))
    if not raw or raw in {"/", "➜"}:
        return {
            "raw": raw,
            "kind": "none",
            "label": "Final stage",
            "items": [],
            "levels": [],
            "isItemBased": False,
            "isStoneBased": False,
        }

    parts = [normalize_evolution_part(part) for part in re.split(r"\s*/\s*", raw) if clean_space(part)]
    levels = [part for part in parts if re.match(r"Lv\.\s*\d+$", part, flags=re.I)]
    happiness = [part for part in parts if "happiness" in part.lower() or "friendship" in part.lower()]
    items = [part for part in parts if part not in levels and part not in happiness]
    is_stone = any(any(term.lower() == item.lower() for term in STONE_EVOLUTION_TERMS) or "stone" in item.lower() for item in items)

    if items and (levels or happiness):
        kind = "mixed"
    elif items:
        kind = "item"
    elif levels:
        kind = "level"
    elif happiness:
        kind = "friendship"
    else:
        kind = "special"

    if kind == "level":
        label = f"Evolves at {levels[0]}" if len(levels) == 1 else f"Evolves at {' / '.join(levels)}"
    elif kind == "friendship":
        label = "Evolves with high friendship"
    elif kind == "mixed":
        label = f"Evolves by {' / '.join([*levels, *happiness, *items])}"
    elif items:
        label = f"Evolves with {' / '.join(items)}"
    else:
        label = f"Evolves by {raw}"

    return {
        "raw": raw,
        "kind": kind,
        "label": label,
        "items": items,
        "levels": levels,
        "isItemBased": bool(items),
        "isStoneBased": is_stone,
    }


def ensure_pokemon(pokemon: dict, raw_name: str, source: str = "") -> dict:
    key = name_key(raw_name)
    if not key:
        return {}
    if key not in pokemon:
        pokemon[key] = {
            "id": key,
            "name": clean_species_name(raw_name),
            "displayName": clean_species_name(raw_name),
            "isVariant": is_variant(raw_name),
            "evolvesToVariant": evolves_to_variant(raw_name),
            "types": [],
            "abilities": [],
            "evolution": "",
            "evolutionMethod": None,
            "incomingEvolution": None,
            "learnset": [],
            "stats": None,
            "vanillaStats": None,
            "statDelta": None,
            "baseTotal": None,
            "vanillaTotal": None,
            "gameDexId": None,
            "family": [],
            "directEncounters": [],
            "familyEncounters": [],
            "guideEntryIds": [],
            "roles": [],
            "recommendedSets": [],
            "availability": {
                "phase": "Unknown",
                "sort": timing_rank("Unknown"),
                "source": "No encounter source parsed yet",
                "details": "",
                "via": "",
            },
            "sourceSheets": [],
        }
    mon = pokemon[key]
    if is_variant(raw_name):
        mon["isVariant"] = True
        mon["displayName"] = display_name(mon["name"], True)
    if evolves_to_variant(raw_name):
        mon["evolvesToVariant"] = True
    if source and source not in mon["sourceSheets"]:
        mon["sourceSheets"].append(source)
    return mon


def parse_pokedex(wb, pokemon: dict) -> None:
    ws = wb["Pokédex"]
    for row in range(3, ws.max_row + 1):
        dex_id = as_text(ws.cell(row, 2).value)
        name = as_text(ws.cell(row, 3).value)
        if not dex_id or not name:
            continue
        mon = ensure_pokemon(pokemon, name, "Pokédex")
        mon["gameDexId"] = dex_id
        if ws.cell(row, 1).value:
            mon["availability"]["source"] = clean_space(as_text(ws.cell(row, 1).value)).title()


def parse_stats_and_learnsets(wb, pokemon: dict) -> list[list[str]]:
    family_groups: list[list[str]] = []
    for sheet_name in STATS_SHEETS:
        ws = wb[sheet_name]
        headers_by_col: dict[int, list[int]] = defaultdict(list)
        for col in POKEMON_START_COLS:
            for row in range(1, ws.max_row):
                if ws.cell(row, col).value and clean_space(as_text(ws.cell(row + 1, col).value)).lower() == "type:":
                    headers_by_col[col].append(row)

        row_to_family: dict[int, list[str]] = defaultdict(list)
        for col, rows in headers_by_col.items():
            for idx, row in enumerate(rows):
                raw_name = as_text(ws.cell(row, col).value)
                mon = ensure_pokemon(pokemon, raw_name, sheet_name)
                if not mon:
                    continue
                mon["types"] = split_types(ws.cell(row + 1, col + 1).value)
                mon["abilities"] = split_abilities(ws.cell(row + 2, col + 1).value)
                mon["evolution"] = clean_space(as_text(ws.cell(row + 3, col + 1).value))
                mon["evolutionMethod"] = parse_evolution_method(mon["evolution"])

                next_row = rows[idx + 1] if idx + 1 < len(rows) else ws.max_row + 1
                moves = []
                seen_moves = set()
                for move_row in range(row + 5, next_row):
                    level = clean_space(as_text(ws.cell(move_row, col).value))
                    move = clean_space(as_text(ws.cell(move_row, col + 1).value))
                    if not level or not move or move == "/":
                        continue
                    if not re.search(r"\d|LV|Evo|Tutor|TM", level, flags=re.I):
                        continue
                    sig = (level, move)
                    if sig in seen_moves:
                        continue
                    seen_moves.add(sig)
                    moves.append({"level": level.replace("LV.", "Lv.").replace("LV", "Lv."), "move": move})
                mon["learnset"] = moves
                row_to_family[row].append(mon["id"])

        if sheet_name.startswith("#"):
            for members in row_to_family.values():
                unique_members = []
                for key in members:
                    if key not in unique_members:
                        unique_members.append(key)
                if len(unique_members) > 1:
                    family_groups.append(unique_members)

        for row in range(1, ws.max_row - 3):
            raw_name = as_text(ws.cell(row, 10).value)
            if not raw_name:
                continue
            if clean_space(as_text(ws.cell(row + 1, 10).value)).upper() != "HP":
                continue
            if clean_space(as_text(ws.cell(row + 2, 17).value)).lower() != "odyssey":
                continue
            mon = ensure_pokemon(pokemon, raw_name, sheet_name)
            stats = {}
            vanilla = {}
            for index, stat in enumerate(STAT_NAMES, start=10):
                if isinstance(ws.cell(row + 2, index).value, (int, float)):
                    stats[stat] = int(ws.cell(row + 2, index).value)
                if isinstance(ws.cell(row + 3, index).value, (int, float)):
                    vanilla[stat] = int(ws.cell(row + 3, index).value)
            total = ws.cell(row + 2, 16).value
            vanilla_total = ws.cell(row + 3, 16).value
            mon["stats"] = stats or None
            mon["vanillaStats"] = vanilla or None
            mon["baseTotal"] = int(total) if isinstance(total, (int, float)) else None
            mon["vanillaTotal"] = int(vanilla_total) if isinstance(vanilla_total, (int, float)) else None
            if stats and vanilla:
                mon["statDelta"] = {stat: stats.get(stat, 0) - vanilla.get(stat, 0) for stat in STAT_NAMES}
                if mon["baseTotal"] is not None and mon["vanillaTotal"] is not None:
                    mon["statDelta"]["total"] = mon["baseTotal"] - mon["vanillaTotal"]
    return family_groups


def parse_ability_definitions(wb) -> list[dict]:
    ws = wb["New Moves & Abilities"]
    ability_columns = [2, 5, 8, 11, 14, 17]
    definitions = {}
    current_section = ""

    for row in range(1, ws.max_row):
        first = clean_space(as_text(ws.cell(row, 1).value)).upper()
        if first in {"NEW ABILITIES", "BUFFED ABILITIES"}:
            current_section = first.title()
            continue
        if first == "BUFFED/REWORKED MOVES":
            current_section = ""
            continue
        if not current_section:
            continue

        for col in ability_columns:
            raw_name = clean_space(as_text(ws.cell(row, col).value))
            effect = clean_space(as_text(ws.cell(row + 1, col).value))
            if not raw_name or not effect:
                continue
            if raw_name.upper() in {"TYPE", "CATEGORY", "POWER", "ACCURACY", "PP", "EFFECT"}:
                continue
            if len(raw_name) < 3:
                continue
            key = ability_key(raw_name)
            definitions[key] = {
                "id": key,
                "name": raw_name.title(),
                "effect": effect,
                "section": current_section,
                "source": "New Moves & Abilities",
            }

    return sorted(definitions.values(), key=lambda item: item["name"])


def ability_names_from_pokemon(pokemon: dict) -> set[str]:
    names = set()
    for mon in pokemon.values():
        for ability in mon.get("abilities", []):
            if ability:
                names.add(ability)
    return names


def http_json(url: str) -> dict:
    request = urllib.request.Request(url, headers=HTTP_HEADERS)
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def load_standard_ability_cache() -> dict[str, dict]:
    if not STANDARD_ABILITY_CACHE.exists():
        return {}
    try:
        raw = json.loads(STANDARD_ABILITY_CACHE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return {ability_key(entry.get("name", entry.get("id", ""))): entry for entry in raw if entry.get("effect")}


def save_standard_ability_cache(cache: dict[str, dict]) -> None:
    STANDARD_ABILITY_CACHE.parent.mkdir(parents=True, exist_ok=True)
    entries = sorted(cache.values(), key=lambda item: item["name"])
    STANDARD_ABILITY_CACHE.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")


def english_short_effect(data: dict) -> str:
    for entry in data.get("effect_entries", []):
        if entry.get("language", {}).get("name") == "en" and entry.get("short_effect"):
            effect = clean_space(entry["short_effect"])
            chance = data.get("effect_chance")
            if chance is not None:
                effect = effect.replace("$effect_chance%", f"{chance}%")
                effect = effect.replace("$effect_chance", str(chance))
            return effect
    for entry in data.get("flavor_text_entries", []):
        if entry.get("language", {}).get("name") == "en" and entry.get("flavor_text"):
            return clean_space(entry["flavor_text"])
    return ""


def fetch_standard_ability_definitions(ability_names: set[str], odyssey_keys: set[str]) -> list[dict]:
    needed = {ability_key(name): name for name in ability_names if ability_key(name) not in odyssey_keys}
    cache = load_standard_ability_cache()
    missing = sorted(key for key in needed if key not in cache)

    if missing:
        try:
            index = http_json(POKEAPI_ABILITY_INDEX)
            urls = {ability_key(item["name"]): item["url"] for item in index.get("results", [])}
            targets = []
            for key in missing:
                lookup_key = STANDARD_ABILITY_ALIASES.get(key, key)
                if lookup_key in urls:
                    targets.append((key, needed[key], urls[lookup_key]))
            if targets:
                with ThreadPoolExecutor(max_workers=8) as executor:
                    futures = {
                        executor.submit(http_json, url): (key, name)
                        for key, name, url in targets
                    }
                    for future in as_completed(futures):
                        key, name = futures[future]
                        try:
                            data = future.result()
                        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
                            continue
                        effect = english_short_effect(data)
                        if not effect:
                            continue
                        cache[key] = {
                            "id": key,
                            "name": name,
                            "effect": effect,
                            "section": "Standard Ability",
                            "source": "PokeAPI",
                        }
                save_standard_ability_cache(cache)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            print(f"Warning: could not refresh standard ability definitions: {exc}")

    return sorted(
        [entry for key, entry in cache.items() if key in needed],
        key=lambda item: item["name"],
    )


def merge_ability_definitions(odyssey_definitions: list[dict], standard_definitions: list[dict]) -> list[dict]:
    merged = {entry["id"]: entry for entry in standard_definitions}
    for entry in odyssey_definitions:
        merged[entry["id"]] = entry
    return sorted(merged.values(), key=lambda item: item["name"])


def parse_level_caps(wb) -> list[dict]:
    ws = wb["Level Caps"]
    caps = []
    for row in range(1, ws.max_row + 1):
        stratum = clean_space(as_text(ws.cell(row, 1).value))
        cap = clean_space(as_text(ws.cell(row, 3).value))
        if not stratum or not cap or not cap.upper().startswith("LV"):
            continue
        caps.append({
            "stratum": stratum,
            "cap": cap.replace("LV.", "Lv.").replace("LV", "Lv."),
            "phase": timing_for_location(stratum),
        })
    return caps


def make_encounter_record(source: str, area: str, method: str, raw_name: str, level, rate) -> list[dict]:
    records = []
    level_text = level_to_text(level)
    rate_text = encounter_rate_to_text(rate)
    for name in split_species_list(raw_name):
        if not name:
            continue
        records.append({
            "pokemon": name,
            "pokemonKey": name_key(name),
            "isVariant": is_variant(raw_name),
            "evolvesToVariant": evolves_to_variant(raw_name),
            "level": level_text,
            "minLevel": min_level(level_text),
            "rate": rate_text,
            "area": clean_space(area),
            "method": clean_space(method) or "Encounter",
            "phase": timing_for_location(area, method),
            "source": source,
        })
    return records


def parse_wild_encounters(wb) -> list[dict]:
    ws = wb["Pokémon"]
    encounters = []
    current_area = ""
    current_methods: dict[int, str] = defaultdict(str)
    for row in range(1, ws.max_row + 1):
        row_values = [as_text(ws.cell(row, col).value) for col in range(1, ws.max_column + 1)]
        first = clean_space(row_values[0] if row_values else "")
        if is_area_heading(first, row_values):
            current_area = first
            current_methods = defaultdict(str)
            continue

        for col in ENCOUNTER_START_COLS:
            if col > ws.max_column:
                continue
            value = clean_space(as_text(ws.cell(row, col).value))
            if is_method_heading(value):
                current_methods[col] = value.title() if value.isupper() else value

        for col in ENCOUNTER_START_COLS:
            if col + 2 > ws.max_column:
                continue
            raw_name = as_text(ws.cell(row, col).value)
            if not is_encounter_name(raw_name):
                continue
            level = ws.cell(row, col + 1).value
            rate = ws.cell(row, col + 2).value
            if level is None and rate is None:
                continue
            method = current_methods[col] or "Encounter"
            encounters.extend(make_encounter_record("Wild encounters", current_area, method, raw_name, level, rate))

    post = wb["Pokémon (Postgame)"]
    for row in range(1, post.max_row + 1):
        for col in [2, 6, 10]:
            if col + 2 > post.max_column:
                continue
            raw_name = as_text(post.cell(row, col).value)
            if not is_encounter_name(raw_name):
                continue
            level = post.cell(row, col + 1).value
            rate = post.cell(row, col + 2).value
            if level is None and rate is None:
                continue
            area = ""
            for scan in range(row, 0, -1):
                possible = as_text(post.cell(scan, col).value)
                if possible and possible != raw_name and not is_method_heading(possible) and "POKÉMON" not in possible.upper():
                    area = possible
                    break
            records = make_encounter_record("Postgame encounters", area or "Postgame", "Event (Postgame)", raw_name, level, rate)
            for record in records:
                record["phase"] = "Postgame"
            encounters.extend(records)
    return encounters


def parse_wonder_trade(wb) -> list[dict]:
    ws = wb["Wonder Trade"]
    encounters = []
    groups = [(2, "Kanto Wonder Trade"), (5, "Johto Wonder Trade"), (8, "Hoenn Wonder Trade")]
    for row in range(5, ws.max_row + 1):
        for col, area in groups:
            raw_name = as_text(ws.cell(row, col).value)
            if not raw_name:
                continue
            records = make_encounter_record("Wonder Trade", area, "Wonder Trade", raw_name, ws.cell(row, col + 1).value, "Trade")
            for record in records:
                record["phase"] = "Early"
            encounters.extend(records)
    return encounters


def parse_naval_explorations(wb) -> list[dict]:
    ws = wb["Naval Explorations"]
    encounters = []
    current_phase = "Naval Exploration"
    current_methods: dict[int, str] = defaultdict(str)
    for row in range(1, ws.max_row + 1):
        first = clean_space(as_text(ws.cell(row, 1).value))
        if first and ("Encounter" not in first) and (first == "Normal Encounters" or first.startswith("After ")):
            current_phase = first
            current_methods = defaultdict(str)
            continue
        for col in [1, 4, 7, 11]:
            if col > ws.max_column:
                continue
            value = clean_space(as_text(ws.cell(row, col).value))
            if value.startswith("ENCOUNTER") or value.startswith("F.O.E"):
                current_methods[col] = value
        for col in [1, 4, 7, 11]:
            if col + 1 > ws.max_column:
                continue
            raw_name = as_text(ws.cell(row, col).value)
            if not is_encounter_name(raw_name):
                continue
            level = ws.cell(row, col + 1).value
            if level is None:
                continue
            rate = ws.cell(row, col + 2).value if col + 2 <= ws.max_column else ""
            records = make_encounter_record("Naval Explorations", current_phase, current_methods[col] or "Naval Encounter", raw_name, level, rate)
            for record in records:
                if current_phase == "Normal Encounters":
                    record["phase"] = "Early"
                else:
                    record["phase"] = timing_for_location(current_phase)
            encounters.extend(records)
    return encounters


def parse_tms_and_tutors(wb) -> tuple[list[dict], list[dict]]:
    tms = []
    ws = wb["TM Location"]
    for row in range(4, ws.max_row + 1):
        number = clean_space(as_text(ws.cell(row, 2).value))
        move = clean_space(as_text(ws.cell(row, 3).value))
        location = clean_space(as_text(ws.cell(row, 4).value))
        if number and move:
            tms.append({"number": number, "move": move, "location": location, "phase": timing_for_location(location)})

    tutors = []
    ws = wb["Move Tutors"]
    for row in range(4, ws.max_row + 1):
        move = clean_space(as_text(ws.cell(row, 2).value))
        location = clean_space(as_text(ws.cell(row, 3).value))
        if move:
            tutors.append({"move": move, "location": location, "phase": timing_for_location(location)})
    return tms, tutors


def parse_sidequests(wb) -> list[dict]:
    ws = wb["Sidequests"]
    quests = []
    for row in range(2, ws.max_row + 1):
        number = clean_space(as_text(ws.cell(row, 1).value))
        name = clean_space(as_text(ws.cell(row, 2).value))
        location = clean_space(as_text(ws.cell(row, 4).value))
        description = clean_space(as_text(ws.cell(row, 6).value))
        reward = clean_space(as_text(ws.cell(row, 8).value))
        if not number or not name:
            continue
        quests.append({
            "number": number,
            "name": name,
            "location": location,
            "description": description,
            "reward": reward,
            "phase": timing_for_location(location),
        })
    return quests


def normalize_role(raw_role: str) -> str:
    role = clean_space(raw_role)
    role = re.sub(r"^\d+(?:\.\d)?\s*-\s*", "", role)
    role = role.title()
    role = role.replace("Aether Types", "Aether")
    role = role.replace("Weather-Related", "Weather-related")
    role = role.replace("Follow Me/Rage Powder Users", "Redirection User")
    role = role.replace("Fake Out Users", "Fake Out User")
    role = role.replace("Intimidate Users", "Intimidate User")
    role = role.replace("Levitate Users", "Levitate User")
    role = role.replace("Sun Setters", "Sun Setter")
    role = role.replace("Rain Setters", "Rain Setter")
    role = role.replace("Sandstorm Setters", "Sandstorm Setter")
    role = role.replace("Hail Setters", "Hail Setter")
    return role


def clean_pdf_text(text: str) -> str:
    text = text.replace("\n", " ")
    text = text.replace("|", " ")
    text = clean_space(text)
    text = text.replace("Talrega ’s", "Talrega's")
    text = text.replace("Saya’s", "Saya's")
    return text


def best_heading(raw: str) -> str:
    raw = clean_space(raw)
    matches = re.findall(r"(?:\d+\.\d|\d+\.0)\s*-\s*([^●]+?)(?=(?:\d+\.\d|\d+\.0)\s*-|$)", raw)
    return clean_space(matches[-1] if matches else raw)


def parse_bullet_guide(pdf_path: Path) -> list[dict]:
    reader = PdfReader(str(pdf_path))
    entries = []
    entry_id = 1
    for page_index in range(5, 13):
        if page_index >= len(reader.pages):
            continue
        text = clean_pdf_text(reader.pages[page_index].extract_text() or "")
        heading_matches = list(re.finditer(r"((?:\d+\.\d|\d+\.0)\s*-\s*.*?)(?=●)", text))
        if not heading_matches:
            continue
        for idx, match in enumerate(heading_matches):
            role = normalize_role(best_heading(match.group(1)))
            segment_start = match.end()
            segment_end = heading_matches[idx + 1].start() if idx + 1 < len(heading_matches) else len(text)
            segment = text[segment_start:segment_end]
            for bullet in re.finditer(r"●\s*(.*?)(?=●|$)", segment):
                body = clean_space(bullet.group(1))
                parsed = re.match(
                    r"(.+?)\s+\((Early|Mid|Late)\s+Game\)\s*(?:-\s*([^○]+?))?\s*○\s*How\s+to\s+obtain\s*:\s*(.*)",
                    body,
                    flags=re.I,
                )
                if not parsed:
                    continue
                names_text, timing, move_note, obtain = parsed.groups()
                obtain = re.sub(r"\s+\d+$", "", clean_space(obtain))
                names = split_species_list(names_text)
                entries.append({
                    "id": f"guide-{entry_id}",
                    "role": role,
                    "roleGroup": role,
                    "pokemonNames": names,
                    "pokemonKeys": [name_key(name) for name in names],
                    "availability": timing.title(),
                    "howToObtain": obtain,
                    "moveNote": clean_space(move_note or ""),
                    "item": "",
                    "ability": "",
                    "moves": [],
                    "statNote": "",
                    "source": "Teambuilding guide",
                    "page": page_index + 1,
                })
                entry_id += 1
    return entries


def parse_table_cell_name(cell: str) -> tuple[str, str]:
    lines = [clean_space(line) for line in (cell or "").split("\n") if clean_space(line)]
    if not lines:
        return "", ""
    if re.match(r"^(HP|Atk|Def|Sp\. Atk|Sp\. Def|Speed)\s*:", lines[0], flags=re.I):
        return "", " ".join(lines)
    return clean_species_name(lines[0]), " ".join(lines[1:])


def parse_table_guide(pdf_path: Path) -> list[dict]:
    if pdfplumber is None:
        return []
    role_pages = {
        14: "Great Damage Dealer",
        15: "Great Damage Dealer",
        16: "Best Support",
        17: "Best Support",
        18: "Best Tank",
        19: "Best Tank",
    }
    entries = []
    entry_id = 1000
    last_entry = None
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_number, role in role_pages.items():
            tables = pdf.pages[page_number - 1].extract_tables()
            if not tables:
                continue
            for row in tables[0]:
                if not row or row[0] == "Pokémon":
                    continue
                name, stat_note = parse_table_cell_name(row[0])
                if not name and last_entry is not None:
                    if stat_note:
                        last_entry["statNote"] = clean_space(f"{last_entry['statNote']} {stat_note}")
                    if row[1]:
                        last_entry["item"] = clean_space(f"{last_entry['item']} {row[1]}")
                    if row[2]:
                        last_entry["ability"] = clean_space(f"{last_entry['ability']} {row[2]}")
                    if row[3]:
                        last_entry["moves"].extend([clean_space(x) for x in row[3].replace("\n", " ").split(",") if clean_space(x)])
                    continue
                if not name:
                    continue
                names = [name]
                entry = {
                    "id": f"guide-{entry_id}",
                    "role": role,
                    "roleGroup": role,
                    "pokemonNames": names,
                    "pokemonKeys": [name_key(name) for name in names],
                    "availability": "",
                    "howToObtain": "",
                    "moveNote": "",
                    "item": clean_space((row[1] or "").replace("\n", " ")),
                    "ability": clean_space((row[2] or "").replace("\n", " ")),
                    "moves": [clean_space(x) for x in (row[3] or "").replace("\n", " ").split(",") if clean_space(x)],
                    "statNote": stat_note,
                    "source": "Teambuilding guide table",
                    "page": page_number,
                }
                entries.append(entry)
                last_entry = entry
                entry_id += 1
    return entries


def parse_teambuilding_guide(pdf_path: Path) -> list[dict]:
    entries = parse_bullet_guide(pdf_path)
    entries.extend(parse_table_guide(pdf_path))
    return entries


class DisjointSet:
    def __init__(self):
        self.parent = {}

    def find(self, item):
        self.parent.setdefault(item, item)
        if self.parent[item] != item:
            self.parent[item] = self.find(self.parent[item])
        return self.parent[item]

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[rb] = ra


def apply_manual_evolution_groups(pokemon: dict, groups: list[list[str]]) -> None:
    manual_groups = [
        ["oddish", "gloom", "vileplume", "bellossom"],
        ["poliwag", "poliwhirl", "poliwrath", "politoed"],
        ["slowpoke", "slowbro", "slowking"],
        ["onix", "steelix"],
        ["scyther", "scizor"],
        ["seadra", "kingdra"],
        ["porygon", "porygon2", "porygon-z"],
        ["tyrogue", "hitmonlee", "hitmonchan", "hitmontop"],
        ["eevee", "vaporeon", "jolteon", "flareon", "espeon", "umbreon", "leafeon", "glaceon", "yggdreon", "goreon"],
        ["roselia", "roserade"],
        ["aipom", "ambipom"],
        ["misdreavus", "mismagius"],
        ["murkrow", "honchkrow"],
        ["sneasel", "weavile"],
        ["magnemite", "magneton", "magnezone"],
        ["lickitung", "lickilicky"],
        ["rhyhorn", "rhydon", "rhyperior"],
        ["tangela", "tangrowth"],
        ["elekid", "electabuzz", "electivire"],
        ["magby", "magmar", "magmortar"],
        ["togepi", "togetic", "togekiss"],
        ["yanma", "yanmega"],
        ["snorunt", "glalie", "froslass"],
        ["gligar", "gliscor"],
        ["ralts", "kirlia", "gardevoir", "gallade"],
        ["nosepass", "probopass"],
        ["duskull", "dusclops", "dusknoir"],
        ["swinub", "piloswine", "mamoswine"],
        ["girafarig", "farigiraf"],
        ["corsola", "reefsola"],
        ["pikachu", "raichu", "gorochu"],
        ["rattata", "ratreecate"],
        ["plusle", "plusle-bb"],
        ["minun", "minun-bb"],
    ]
    existing = set(pokemon.keys())
    for group in manual_groups:
        keys = [key for key in group if key in existing]
        if len(keys) > 1:
            groups.append(keys)


def assign_families(pokemon: dict, groups: list[list[str]]) -> None:
    apply_manual_evolution_groups(pokemon, groups)
    dsu = DisjointSet()
    for key in pokemon:
        dsu.find(key)
    for group in groups:
        if not group:
            continue
        first = group[0]
        for key in group[1:]:
            if key in pokemon:
                dsu.union(first, key)
    families = defaultdict(list)
    for key in pokemon:
        families[dsu.find(key)].append(key)
    for members in families.values():
        sorted_members = sorted(members, key=lambda key: int(pokemon[key]["gameDexId"] or 9999))
        names = [pokemon[key]["displayName"] for key in sorted_members]
        for key in members:
            pokemon[key]["family"] = sorted_members
            pokemon[key]["familyNames"] = names


def assign_evolution_metadata(pokemon: dict) -> None:
    seen_families = set()
    for mon in pokemon.values():
        if not mon.get("evolutionMethod"):
            mon["evolutionMethod"] = parse_evolution_method(mon.get("evolution", ""))

    for mon in pokemon.values():
        family = tuple(mon.get("family") or [mon["id"]])
        if family in seen_families:
            continue
        seen_families.add(family)
        for index, key in enumerate(family):
            if index == 0:
                continue
            source_key = None
            for candidate_key in reversed(family[:index]):
                method = pokemon[candidate_key].get("evolutionMethod") or parse_evolution_method(pokemon[candidate_key].get("evolution", ""))
                if method.get("kind") != "none":
                    source_key = candidate_key
                    break
            if not source_key:
                continue
            source = pokemon[source_key]
            source_method = source.get("evolutionMethod") or parse_evolution_method(source.get("evolution", ""))
            pokemon[key]["incomingEvolution"] = {
                **source_method,
                "fromId": source_key,
                "fromName": source["displayName"],
                "label": f"From {source['displayName']}: {' / '.join([*source_method.get('levels', []), *source_method.get('items', [])]) or source_method.get('raw') or source_method.get('label')}",
            }


def sort_encounter(record: dict) -> tuple:
    return (
        timing_rank(record.get("phase", "Unknown")),
        record.get("minLevel") if record.get("minLevel") is not None else 999,
        record.get("area", ""),
        record.get("method", ""),
    )


def attach_encounters(pokemon: dict, encounters: list[dict]) -> None:
    direct = defaultdict(list)
    for record in encounters:
        record_key = resolve_pokemon_key(record["pokemonKey"], pokemon)
        if record_key:
            direct[record_key].append({**record, "pokemonKey": record_key})

    for key, records in direct.items():
        pokemon[key]["directEncounters"] = sorted(records, key=sort_encounter)

    for key, mon in pokemon.items():
        family_records = []
        for family_key in mon.get("family", [key]):
            for record in direct.get(family_key, []):
                via = pokemon.get(family_key, {}).get("displayName", record["pokemon"])
                family_records.append({**record, "via": via})
        family_records = sorted(family_records, key=sort_encounter)
        mon["familyEncounters"] = family_records[:16]
        if family_records:
            first = family_records[0]
            mon["availability"] = {
                "phase": first["phase"],
                "sort": timing_rank(first["phase"]),
                "source": first["source"],
                "details": f"{first['area']} - {first['method']}",
                "via": first.get("via", first["pokemon"]),
                "level": first.get("level", ""),
                "rate": first.get("rate", ""),
            }

    for starter in ["plusle", "minun"]:
        if starter in pokemon:
            pokemon[starter]["availability"] = {
                "phase": "Starter",
                "sort": 0,
                "source": "Story starter",
                "details": "Nyx starts the journey with Plusle and Minun.",
                "via": pokemon[starter]["displayName"],
                "level": "",
                "rate": "",
            }


def attach_guide_entries(pokemon: dict, guide_entries: list[dict]) -> None:
    alias = {}
    for key, mon in pokemon.items():
        alias[key] = key
        alias[name_key(mon["name"])] = key
        alias[name_key(mon["displayName"])] = key
        if key.endswith("-bb"):
            alias[key.replace("-bb", "")] = key

    for entry in guide_entries:
        matched = []
        for raw_key in entry.get("pokemonKeys", []):
            key = alias.get(raw_key)
            if key and key not in matched:
                matched.append(key)
        entry["pokemonKeys"] = matched or entry.get("pokemonKeys", [])
        for key in matched:
            mon = pokemon[key]
            if entry["id"] not in mon["guideEntryIds"]:
                mon["guideEntryIds"].append(entry["id"])
            if entry["role"] not in mon["roles"]:
                mon["roles"].append(entry["role"])
            if entry["source"].endswith("table"):
                mon["recommendedSets"].append({
                    "role": entry["role"],
                    "item": entry["item"],
                    "ability": entry["ability"],
                    "moves": entry["moves"],
                    "statNote": entry["statNote"],
                    "page": entry["page"],
                })

            guide_phase = entry.get("availability")
            if guide_phase and timing_rank(guide_phase) < mon["availability"]["sort"]:
                mon["availability"] = {
                    "phase": guide_phase,
                    "sort": timing_rank(guide_phase),
                    "source": "Teambuilding guide",
                    "details": entry.get("howToObtain", ""),
                    "via": ", ".join(entry.get("pokemonNames", [])),
                    "level": "",
                    "rate": "",
                }


def resolve_pokemon_key(key: str, pokemon: dict) -> str:
    if key in pokemon:
        return key
    for suffix in ["-hisui", "-alola", "-galar"]:
        if key.endswith(suffix) and key[: -len(suffix)] in pokemon:
            return key[: -len(suffix)]
    compact_aliases = {
        "screamtail": "scream-tail",
        "sandyshock": "sandy-shock",
        "flut-mane": "flutter-mane",
        "ragingbolt": "raging-bolt",
        "gouginfire": "gouging-fire",
        "roar-moon": "roaring-moon",
        "walkinwake": "walking-wake",
    }
    return compact_aliases.get(key, "") if compact_aliases.get(key, "") in pokemon else ""


def pokemon_archetype(mon: dict) -> str:
    stats = mon.get("stats") or {}
    if not stats:
        return "Unknown"
    atk = stats.get("atk", 0)
    spa = stats.get("spa", 0)
    spe = stats.get("spe", 0)
    bulk = stats.get("hp", 0) + stats.get("def", 0) + stats.get("spd", 0)
    if bulk >= 310 and max(atk, spa) < 110:
        return "Tank"
    if spe >= 100 and max(atk, spa) >= 105:
        return "Fast Attacker"
    if atk >= 110 and spa >= 110:
        return "Mixed Attacker"
    if atk >= spa + 15:
        return "Physical Attacker"
    if spa >= atk + 15:
        return "Special Attacker"
    if bulk >= 280:
        return "Bulky Utility"
    return "Balanced"


def finalize_pokemon(pokemon: dict) -> list[dict]:
    rows = []
    for mon in pokemon.values():
        mon["roles"] = sorted(mon["roles"])
        mon["archetype"] = pokemon_archetype(mon)
        if mon["isVariant"] and "⭐" not in mon["displayName"]:
            mon["displayName"] = f"{mon['name']} ⭐"
        rows.append(mon)
    rows.sort(key=lambda mon: int(mon["gameDexId"] or 9999))
    return rows


def main() -> None:
    for path in [STATS_XLSX, WILD_XLSX, LEVELS_XLSX, TEAMBUILDING_PDF]:
        if not path.exists():
            raise FileNotFoundError(path)

    pokemon: dict[str, dict] = {}
    stats_wb = openpyxl.load_workbook(STATS_XLSX, data_only=True, read_only=False)
    parse_pokedex(stats_wb, pokemon)
    family_groups = parse_stats_and_learnsets(stats_wb, pokemon)
    odyssey_ability_definitions = parse_ability_definitions(stats_wb)
    standard_ability_definitions = fetch_standard_ability_definitions(
        ability_names_from_pokemon(pokemon),
        {entry["id"] for entry in odyssey_ability_definitions},
    )
    ability_definitions = merge_ability_definitions(odyssey_ability_definitions, standard_ability_definitions)

    wild_wb = openpyxl.load_workbook(WILD_XLSX, data_only=True, read_only=False)
    encounters = []
    encounters.extend(parse_wild_encounters(wild_wb))
    encounters.extend(parse_wonder_trade(wild_wb))
    encounters.extend(parse_naval_explorations(wild_wb))
    tms, tutors = parse_tms_and_tutors(wild_wb)

    levels_wb = openpyxl.load_workbook(LEVELS_XLSX, data_only=True, read_only=False)
    level_caps = parse_level_caps(levels_wb)
    sidequests = parse_sidequests(levels_wb)

    guide_entries = parse_teambuilding_guide(TEAMBUILDING_PDF)
    assign_families(pokemon, family_groups)
    assign_evolution_metadata(pokemon)
    attach_encounters(pokemon, encounters)
    attach_guide_entries(pokemon, guide_entries)

    roles = sorted({role for mon in pokemon.values() for role in mon.get("roles", [])})
    types = sorted({type_name for mon in pokemon.values() for type_name in mon.get("types", [])})

    payload = {
        "meta": {
            "title": "Pokemon Odyssey Team Planner",
            "version": "4.1.1",
            "generatedFrom": [
                STATS_XLSX.name,
                WILD_XLSX.name,
                LEVELS_XLSX.name,
                TEAMBUILDING_PDF.name,
            ],
            "sourceNotes": [
                "Availability uses the earliest parsed direct encounter for the Pokemon or its evolution family.",
                "Guide availability tags come from the teambuilding PDF and may override encounter timing when earlier.",
                "Exact story/boss details are kept in source records but summarized in the UI by default.",
                "Ability tooltips use Odyssey's new/buffed ability sheet first, with standard ability text cached from PokeAPI.",
            ],
        },
        "pokemon": finalize_pokemon(pokemon),
        "encounters": sorted(encounters, key=sort_encounter),
        "guideEntries": guide_entries,
        "abilityDefinitions": ability_definitions,
        "levelCaps": level_caps,
        "sidequests": sidequests,
        "tms": tms,
        "moveTutors": tutors,
        "facets": {
            "types": types,
            "roles": roles,
            "phases": ["Starter", "Early", "Mid", "Late", "Postgame", "Unknown"],
            "archetypes": sorted({pokemon_archetype(mon) for mon in pokemon.values()}),
        },
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_JSON}")
    print(f"Pokemon: {len(payload['pokemon'])}")
    print(f"Encounters: {len(encounters)}")
    print(f"Guide entries: {len(guide_entries)}")
    print(f"Ability definitions: {len(ability_definitions)}")


if __name__ == "__main__":
    main()

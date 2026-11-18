#!/usr/bin/env python3
"""Convert Foundry VTT dnd5e SRD content packs into standalone JS data.

This is a development-time importer. The generated modules are committed so the
game itself has no runtime dependency on Foundry or on a YAML parser.

Usage:
  python3 scripts/import-foundry-srd.py --source /path/to/foundryvtt-dnd5e
  # optional: --out game/src/rules/content --version 6.1.x

Requires PyYAML (python3 -m pip install pyyaml).
"""
from __future__ import annotations

import argparse
import glob
import html
import json
import math
import os
import re
import subprocess
import sys
import unicodedata
from collections import Counter

try:
    import yaml
except ImportError:
    sys.exit("PyYAML is required: python3 -m pip install pyyaml")

SCHOOLS = {
    "abj": "防护", "con": "咒法", "div": "预言", "enc": "附魔",
    "evo": "塑能", "ill": "幻术", "nec": "死灵", "trs": "变化",
}
SIZES = {"tiny": "微型", "sm": "小型", "med": "中型", "lg": "大型", "huge": "巨型", "grg": "超巨型"}
CR_PB = [(0, 2), (5, 3), (9, 4), (13, 5), (17, 6), (21, 7), (25, 8), (29, 9)]
SKILL_ABILITIES = {
    "acr": "dex", "ani": "wis", "arc": "int", "ath": "str", "dec": "cha", "his": "int",
    "ins": "wis", "itm": "cha", "inv": "int", "med": "wis", "nat": "int", "prc": "wis",
    "prf": "cha", "per": "cha", "rel": "int", "slt": "dex", "ste": "dex", "sur": "wis",
}
WEAPON_TYPES = {
    "simpleM": ("simple", "melee"), "simpleR": ("simple", "ranged"),
    "martialM": ("martial", "melee"), "martialR": ("martial", "ranged"),
}
PROPERTY_NAMES = {
    "ver": "versatile", "two": "two-handed", "fin": "finesse", "lgt": "light",
    "hvy": "heavy", "rch": "reach", "thr": "thrown", "amm": "ammunition",
    "lod": "loading", "spe": "special", "stealthDisadvantage": "stealth-disadvantage",
}
COIN_GP = {"pp": 10, "gp": 1, "ep": 0.5, "sp": 0.1, "cp": 0.01}


def load(path):
    with open(path, encoding="utf-8-sig") as handle:
        return yaml.load(handle, Loader=yaml.CSafeLoader)


def strip_html(value):
    if not value:
        return ""
    text = str(value)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p\s*>", "\n", text, flags=re.I)
    text = re.sub(r"</li\s*>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"@UUID\[[^\]]*\{([^}]*)\}\]", r"\1", text)
    text = re.sub(r"@(?:UUID|Check|Damage|Save|Skill|Lookup|Item|Actor)\[[^\]]*\]", "", text)
    text = re.sub(r"\[\[/[^\]]*\]\]", "", text)
    text = re.sub(r"&Reference\[[^\]]*\]", "", text)
    text = html.unescape(text)
    text = re.sub(r"&(?:amp;)?Reference\[([^\]]*)\]", r"\1", text)
    text = re.sub(r"\[\[/save[^\]]*\]\]", "a saving throw", text)
    text = re.sub(r"\[\[/damage[^\]]*\]\]", "damage", text)
    text = re.sub(r"\[\[/[^\]]*\]\]", "", text)
    text = re.sub(r"^[\s.·]+", "", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def slug(value):
    text = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-") or "item"


def damage_formula(part):
    if not isinstance(part, dict):
        return None
    custom = part.get("custom") or {}
    if custom.get("enabled") and custom.get("formula"):
        return str(custom["formula"])
    number = part.get("number")
    denomination = part.get("denomination")
    bonus = part.get("bonus")
    if not number or not denomination:
        return None
    formula = f"{int(number)}d{int(denomination)}"
    if bonus:
        formula += f"+{bonus}" if not str(bonus).startswith("-") else str(bonus)
    return formula


def damage_types(part):
    types = (part or {}).get("types") or []
    return [types[0]] if types else []


def price_gp(price):
    value = (price or {}).get("value") or 0
    denomination = (price or {}).get("denomination") or "gp"
    try:
        return round(float(value) * COIN_GP.get(denomination, 1), 2)
    except (TypeError, ValueError):
        return 0


def cr_number(cr):
    if cr is None:
        return 0
    if isinstance(cr, (int, float)):
        return float(cr)
    text = str(cr).strip()
    if "/" in text:
        numerator, denominator = text.split("/", 1)
        return float(numerator) / float(denominator)
    try:
        return float(text)
    except ValueError:
        return 0


def cr_pb(cr):
    value = cr_number(cr)
    result = 2
    for threshold, bonus in CR_PB:
        if value >= threshold:
            result = bonus
    return result


def numeric(value, default=0):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return default


def assign_ids(entries):
    """Give each entry a readable, stable id; disambiguate duplicates with _id."""
    bases = [entry["base_id"] for entry in entries]
    counts = Counter(bases)
    used = set()
    for entry in entries:
        base = entry["base_id"]
        foundry_id = entry["foundry_id"] or ""
        candidate = base if counts[base] == 1 else f"{base}-{foundry_id[:6].lower()}"
        while candidate in used:
            candidate = f"{candidate}-x"
        used.add(candidate)
        entry["entry"]["id"] = candidate


def source_of(data):
    source = (data.get("system") or {}).get("source") or {}
    return {
        "book": source.get("book") or "",
        "page": source.get("page") or "",
        "license": source.get("license") or "",
        "rules": source.get("rules") or "",
    }


def parse_spell(data):
    system = data.get("system") or {}
    properties = [str(prop) for prop in system.get("properties") or []]
    activities = system.get("activities") or {}
    damages = []
    for activity in activities.values():
        if not isinstance(activity, dict):
            continue
        for part in (activity.get("damage") or {}).get("parts") or []:
            formula = damage_formula(part)
            if formula:
                for damage_type in damage_types(part) or [None]:
                    damages.append({"formula": formula, "type": damage_type})
    if not damages:
        for part in (system.get("damage") or {}).get("parts") or []:
            formula = damage_formula(part)
            if formula:
                damages.append({"formula": formula, "type": (damage_types(part) or [None])[0]})
    return {
        "foundryId": data.get("_id"),
        "name": data.get("name") or "Unnamed Spell",
        "level": int(system.get("level") or 0),
        "school": system.get("school") or "",
        "schoolName": SCHOOLS.get(system.get("school"), system.get("school") or ""),
        "activation": system.get("activation") or {},
        "duration": system.get("duration") or {},
        "range": system.get("range") or {},
        "target": (system.get("target") or {}).get("affects") or {},
        "components": {
            "vocal": "vocal" in properties,
            "somatic": "somatic" in properties,
            "material": "material" in properties,
            "materials": (system.get("materials") or {}).get("value") or "",
        },
        "properties": sorted(set(properties)),
        "concentration": "concentration" in properties,
        "ritual": "ritual" in properties,
        "damage": damages,
        "description": strip_html((system.get("description") or {}).get("value")),
        "source": source_of(data),
    }


def parse_weapon(data):
    system = data.get("system") or {}
    type_value = (system.get("type") or {}).get("value") or "simpleM"
    category, mode = WEAPON_TYPES.get(type_value, ("simple", "melee"))
    base = (system.get("damage") or {}).get("base") or {}
    versatile = (system.get("damage") or {}).get("versatile") or {}
    properties = [str(prop) for prop in system.get("properties") or []]
    activities = system.get("activities") or {}
    attack_ability = "dex" if mode == "ranged" else "str"
    activity = next((a for a in activities.values() if isinstance(a, dict) and a.get("type") == "attack"), None)
    if activity:
        ability = ((activity.get("attack") or {}).get("ability") or "").strip()
        if ability in ("str", "dex", "con", "int", "wis", "cha"):
            attack_ability = ability
    return {
        "category": category,
        "mode": mode,
        "damage": {"formula": damage_formula(base), "types": damage_types(base)},
        "versatile": {"formula": damage_formula(versatile), "types": damage_types(versatile)},
        "properties": sorted(set(properties)),
        "propertyNames": sorted({PROPERTY_NAMES.get(prop, prop) for prop in properties}),
        "range": system.get("range") or {},
        "attackAbility": attack_ability,
    }


def parse_armor(data):
    system = data.get("system") or {}
    armor = system.get("armor") or {}
    properties = [str(prop) for prop in system.get("properties") or []]
    category = (system.get("type") or {}).get("value") or "light"
    return {
        "category": category,
        "baseAc": armor.get("value"),
        "dexCap": armor.get("dex"),
        "magicalBonus": armor.get("magicalBonus"),
        "strength": system.get("strength"),
        "stealthDisadvantage": "stealthDisadvantage" in properties,
    }


def monster_ac(system, items):
    attributes = system.get("attributes") or {}
    ac = attributes.get("ac") or {}
    flat = ac.get("flat")
    if isinstance(flat, (int, float)):
        return int(flat)
    formula = str(ac.get("formula") or "")
    if ac.get("calc") == "flat" and formula.isdigit():
        return int(formula)
    dex_mod = (int(((system.get("abilities") or {}).get("dex") or {}).get("value") or 10) - 10) // 2
    best = None
    shields = 0
    for item in items:
        if item.get("type") != "equipment":
            continue
        item_system = item.get("system") or {}
        if not item_system.get("equipped"):
            continue
        category = (item_system.get("type") or {}).get("value")
        value = (item_system.get("armor") or {}).get("value") or 0
        if category == "shield":
            shields += int(value)
        elif category in ("light", "medium", "heavy"):
            dex_cap = (item_system.get("armor") or {}).get("dex")
            dex_part = dex_mod if dex_cap is None else min(dex_mod, int(dex_cap))
            candidate = int(value) + dex_part + int((item_system.get("armor") or {}).get("magicalBonus") or 0)
            best = candidate if best is None else max(best, candidate)
    return (10 + dex_mod if best is None else best) + shields


def monster_attack(item, monster_system, item_system, pb):
    activities = item_system.get("activities") or {}
    attack_activity = next(
        (activity for activity in activities.values() if isinstance(activity, dict) and activity.get("type") == "attack"),
        None,
    )
    weapon_type = (item_system.get("type") or {}).get("value") or ""
    properties = item_system.get("properties") or []
    if weapon_type.endswith("R") or "fin" in properties:
        default_ability = "dex"
    else:
        default_ability = "str"
    ability = default_ability
    bonus = 0
    range_value = (item_system.get("range") or {}).get("value")
    if attack_activity:
        configured = ((attack_activity.get("attack") or {}).get("ability") or "").strip()
        if configured in ("str", "dex", "con", "int", "wis", "cha"):
            ability = configured
        bonus = numeric((attack_activity.get("attack") or {}).get("bonus"), 0)
        activity_range = (attack_activity.get("range") or {}).get("value")
        if activity_range not in (None, ""):
            range_value = activity_range
    ability_score = int(((monster_system.get("abilities") or {}).get(ability) or {}).get("value") or 10)
    ability_mod = (ability_score - 10) // 2
    base = (item_system.get("damage") or {}).get("base") or {}
    base_formula = damage_formula(base)
    if base_formula and "+" not in base_formula and "-" not in base_formula:
        base_formula = f"{base_formula}{ability_mod:+d}" if ability_mod else base_formula
    parts = []
    if attack_activity:
        for part in (attack_activity.get("damage") or {}).get("parts") or []:
            part_formula = damage_formula(part)
            if part_formula:
                parts.append({"formula": part_formula, "type": (damage_types(part) or [None])[0]})
    if base_formula:
        parts.insert(0, {"formula": base_formula, "type": (damage_types(base) or [None])[0]})
    return {
        "ability": ability,
        "toHit": ability_mod + pb + bonus,
        "range": range_value,
        "damage": parts,
    }


def parse_item(data):
    system = data.get("system") or {}
    item_type = data.get("type") or "item"
    type_value = (system.get("type") or {}).get("value") or ""
    kind = item_type
    result = {
        "foundryId": data.get("_id"),
        "name": data.get("name") or "Unnamed Item",
        "kind": kind,
        "description": strip_html((system.get("description") or {}).get("value")),
        "weight": (system.get("weight") or {}).get("value") or 0,
        "price": {
            "value": (system.get("price") or {}).get("value") or 0,
            "denomination": (system.get("price") or {}).get("denomination") or "gp",
        },
        "priceGp": price_gp(system.get("price")),
        "rarity": system.get("rarity") or "",
        "attunement": system.get("attunement") or "",
        "source": source_of(data),
    }
    if item_type == "weapon":
        kind = "weapon"
        result["kind"] = "weapon"
        result["weapon"] = parse_weapon(data)
    elif item_type == "equipment" and type_value in ("light", "medium", "heavy", "shield"):
        kind = "armor"
        result["kind"] = "armor"
        result["armor"] = parse_armor(data)
    return result


def parse_monster(data):
    system = data.get("system") or {}
    items = data.get("items") or []
    abilities = {}
    for key, value in (system.get("abilities") or {}).items():
        score = int((value or {}).get("value") or 10)
        abilities[key] = {"score": score, "mod": (score - 10) // 2}
    details = system.get("details") or {}
    traits = system.get("traits") or {}
    pb = cr_pb(details.get("cr"))
    saves = {}
    for key, value in (system.get("abilities") or {}).items():
        ability = abilities.get(key, {"mod": 0})
        proficient = int((value or {}).get("proficient") or 0)
        bonus = numeric(((value or {}).get("bonuses") or {}).get("save"), 0)
        if proficient or bonus:
            saves[key] = ability["mod"] + proficient * pb + bonus
    skills = {}
    for key, value in (system.get("skills") or {}).items():
        level = int((value or {}).get("value") or 0)
        bonus = numeric(((value or {}).get("bonuses") or {}).get("check"), 0)
        if level or bonus:
            ability = abilities.get(SKILL_ABILITIES.get(key, "dex"), {"mod": 0})
            skills[key] = ability["mod"] + level * pb + bonus
    monster_traits = []
    actions = []
    for item in items:
        item_system = item.get("system") or {}
        description = strip_html((item_system.get("description") or {}).get("value"))
        if item.get("type") == "feat":
            monster_traits.append({"name": item.get("name"), "description": description})
        elif item.get("type") == "weapon":
            attack = monster_attack(item, system, item_system, pb)
            if not re.search(r"[A-Za-z\u4e00-\u9fff]", description):
                damage_text = " + ".join(
                    f"{part['formula']} {part['type'] or ''}".strip() for part in attack["damage"]
                ) or "—"
                description = (
                    f"+{attack['toHit']} to hit, {damage_text}, "
                    f"{attack['range'] or '—'} ft."
                )
            actions.append({
                "name": item.get("name"),
                "description": description,
                "attack": attack,
            })
    movement = (system.get("attributes") or {}).get("movement") or {}
    senses = (system.get("attributes") or {}).get("senses") or {}
    return {
        "foundryId": data.get("_id"),
        "name": data.get("name") or "Unnamed Monster",
        "creatureType": (details.get("type") or {}).get("value") or "",
        "subtype": (details.get("type") or {}).get("subtype") or "",
        "size": SIZES.get(traits.get("size"), traits.get("size") or ""),
        "alignment": details.get("alignment") or "",
        "cr": cr_number(details.get("cr")),
        "crLabel": str(details.get("cr") or "0"),
        "ac": monster_ac(system, items),
        "hp": {
            "max": int(((system.get("attributes") or {}).get("hp") or {}).get("max") or 0),
            "formula": ((system.get("attributes") or {}).get("hp") or {}).get("formula") or "",
        },
        "speed": {key: movement.get(key) or 0 for key in ("walk", "fly", "swim", "climb", "burrow")},
        "abilities": abilities,
        "savingThrows": saves,
        "skills": skills,
        "senses": {key: senses.get(key) or 0 for key in ("darkvision", "blindsight", "tremorsense", "truesight")},
        "languages": (traits.get("languages") or {}).get("value") or [],
        "resistances": (traits.get("dr") or {}).get("value") or [],
        "immunities": (traits.get("di") or {}).get("value") or [],
        "vulnerabilities": (traits.get("dv") or {}).get("value") or [],
        "conditionImmunities": (traits.get("ci") or {}).get("value") or [],
        "traits": monster_traits,
        "actions": actions,
        "source": source_of(data),
    }


def collect(source, scope, types):
    entries = []
    for path in sorted(glob.glob(os.path.join(source, "packs/_source", scope, "**/*.yml"), recursive=True)):
        try:
            data = load(path)
        except Exception as error:  # noqa: BLE001 - importer should report and continue
            print(f"skip {path}: {error}", file=sys.stderr)
            continue
        if not isinstance(data, dict) or data.get("type") not in types:
            continue
        system = data.get("system") or {}
        base_id = system.get("identifier") or slug(data.get("name") or "item")
        entries.append({
            "base_id": str(base_id),
            "foundry_id": str(data.get("_id") or ""),
            "data": data,
            "entry": None,
        })
    return entries


def build(source, scope, types, parser):
    entries = collect(source, scope, types)
    for entry in entries:
        entry["entry"] = parser(entry["data"])
        entry["entry"]["foundryId"] = entry["foundry_id"]
        entry["entry"]["_base"] = entry["base_id"]
    assign_ids(entries)
    results = []
    for entry in entries:
        item = entry["entry"]
        item.pop("_base", None)
        results.append(item)
    results.sort(key=lambda item: (item.get("name") or "").lower())
    return results


def write_module(path, const_name, payload, header):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(f"// {header}\n")
        handle.write(f"export const {const_name} = {json.dumps(payload, ensure_ascii=False, separators=(',', ':'))};\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, help="Path to a foundryvtt/dnd5e checkout")
    parser.add_argument("--out", default="game/src/rules/content")
    parser.add_argument("--version", default="6.1.x")
    args = parser.parse_args()

    source = os.path.abspath(args.source)
    commit = ""
    try:
        commit = subprocess.check_output(["git", "-C", source, "rev-parse", "HEAD"], text=True).strip()
    except Exception:  # noqa: BLE001
        pass

    spells = build(source, "spells", {"spell"}, parse_spell)
    items = build(source, "items", {"weapon", "equipment", "consumable", "tool", "loot", "container"}, parse_item)
    monsters = build(source, "monsters", {"npc"}, parse_monster)

    counts = {
        "spells": len(spells),
        "items": len(items),
        "monsters": len(monsters),
        "weapons": sum(1 for item in items if item.get("kind") == "weapon"),
        "armor": sum(1 for item in items if item.get("kind") == "armor"),
    }
    manifest = {
        "source": "foundryvtt/dnd5e",
        "sourceUrl": "https://github.com/foundryvtt/dnd5e",
        "version": args.version,
        "commit": commit,
        "importedAt": "2026-11-18",
        "license": {
            "systemCode": "MIT",
            "srdContent": "CC-BY-4.0",
            "note": "SRD 5.1 by Wizards of the Coast; converted to standalone data. See NOTICE.md.",
        },
        "counts": counts,
    }

    header = "Generated by scripts/import-foundry-srd.py. Do not edit by hand."
    write_module(os.path.join(args.out, "spells.js"), "FOUNDRY_SPELLS", spells, header)
    write_module(os.path.join(args.out, "items.js"), "FOUNDRY_ITEMS", items, header)
    write_module(os.path.join(args.out, "monsters.js"), "FOUNDRY_MONSTERS", monsters, header)
    write_module(os.path.join(args.out, "manifest.js"), "FOUNDRY_CONTENT_MANIFEST", manifest, header)

    print(json.dumps(counts, ensure_ascii=False))


if __name__ == "__main__":
    main()

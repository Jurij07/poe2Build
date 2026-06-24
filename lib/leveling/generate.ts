import type { DecodedBuild, ParsedItem } from "@/lib/pob/types";
import { TREE, orderAllocation } from "@/lib/tree/tree";

/** A concrete example item to chase at a given point in the leveling journey. */
export interface ItemRec {
  slot: string;
  name: string;
  base?: string;
  rarity: "Unique" | "Rare" | "Magic" | "Normal";
  detail: string;
  /** Character level at which it can first be equipped. */
  levelReq?: number;
  /** query for the /api/icon proxy (unique name / item base). */
  icon?: Record<string, string>;
  /** true when it was already recommended earlier and you simply keep wearing it. */
  carryOver?: boolean;
}

export interface Ascension {
  label: string;
  detail: string;
  points: number; // points gained this stage
  totalPoints: number; // cumulative (out of 8)
}

export interface LevelStage {
  key: string;
  act: string;
  zone?: string;
  boss?: string;
  title: string;
  levelRange: [number, number];
  objectives: string[];
  ascension?: Ascension;
  /** Node ids to allocate during this stage, in travel order. */
  passivesAdded: string[];
  notableNames: string[];
  gems: { actives: string[]; supports: string[]; note: string };
  items: ItemRec[];
  itemNote: string;
  rationale: string;
}

// ---------------------------------------------------------------------------
// Campaign structure — Path of Exile 2 patch 0.5.x ("Return of the Ancients" /
// The Runes of Aldur). The 0.5 campaign is Acts 1–4, then the three Interludes
// (5.1 Ogham, 5.2 Khari Bazaar, 5.3 Mount Kriar), then the Atlas/endgame — the
// old "Cruel" difficulty is gone. `questPoints` is the cumulative count of
// passive points handed out by quests/interludes by the end of the stage
// (4 per act ×4 = 16, +8 across the interludes, +2 in Kingsmarch = 26).
// ---------------------------------------------------------------------------
interface Milestone {
  key: string;
  act: string;
  zone: string;
  boss: string;
  title: string;
  endLevel: number;
  questPoints: number;
  ascension?: Ascension;
  objectives: string[];
}

const MILESTONES: Milestone[] = [
  {
    key: "a1",
    act: "Act 1",
    zone: "Clearfell",
    boss: "Count Geonor",
    title: "Getting started",
    endLevel: 14,
    questPoints: 4,
    objectives: [
      "Work through Clearfell and the Ogham region, then put down Count Geonor.",
      "Quest rewards: +4 passive points, +30 Spirit, +20 Life, +10% Cold Resistance and the Salvage Bench.",
      "Grab every Uncut Skill & Support Gem — in PoE2 your whole skill setup is cut from gems, it doesn't drop.",
    ],
  },
  {
    key: "a2",
    act: "Act 2",
    zone: "Vastiri Desert",
    boss: "Jamanra, the Risen King",
    title: "First ascendancy",
    endLevel: 29,
    questPoints: 8,
    ascension: {
      label: "1st Ascendancy — Trial of the Sekhemas",
      detail:
        "Kill Balbala in Traitor's Passage for Balbala's Barya, then clear the Trial of the Sekhemas (watch the Honour bar — it doesn't regenerate) to ascend for your first 2 points.",
      points: 2,
      totalPoints: 2,
    },
    objectives: [
      "Cross the Vastiri Desert, raise the three obelisks and defeat Jamanra on the airship.",
      "Quest rewards: +4 passive points, +10% Lightning Resistance and a +1 Charm slot.",
      "Take the Trial of the Sekhemas the moment you have Balbala's Barya — the ascendancy is a massive power spike.",
    ],
  },
  {
    key: "a3",
    act: "Act 3",
    zone: "Sandswept Marsh & Jungle",
    boss: "Doryani, Royal Thaumaturge",
    title: "Second ascendancy",
    endLevel: 42,
    questPoints: 12,
    ascension: {
      label: "2nd Ascendancy — Trial of Chaos",
      detail:
        "Beat Xyclucian the Chimera in the Chimeral Wetlands for the Inscribed Ultimatum, then clear the Trial of Chaos (read the tribulation modifiers) for ascendancy points 3–4.",
      points: 2,
      totalPoints: 4,
    },
    objectives: [
      "Fight through the jungle and the Sceptre of God, then defeat Doryani.",
      "Quest rewards: +4 passive points and +10% Fire Resistance.",
      "Run the Trial of Chaos for points 3–4 — you are now half-ascended (4 of 8).",
    ],
  },
  {
    key: "a4",
    act: "Act 4",
    zone: "Karui Archipelago",
    boss: "Tavakai, the Chieftain",
    title: "Campaign finale",
    endLevel: 52,
    questPoints: 16,
    objectives: [
      "Sail the Karui Archipelago — new in 0.5 — and beat Tavakai to finish the campaign.",
      "Quest rewards: +4 passive points, +5% maximum Mana, a Tattoo and your Hideout.",
      "Every Elemental Resistance should be at or near the 75% cap before you leave — the Interludes and maps hit far harder.",
    ],
  },
  {
    key: "interlude",
    act: "Interlude",
    zone: "Ogham · Khari Bazaar · Mount Kriar",
    boss: "Acts 5.1 – 5.3",
    title: "Permanent power boosts",
    endLevel: 58,
    questPoints: 24,
    objectives: [
      "Play all three Interludes (5.1 Ogham, 5.2 Khari Bazaar, 5.3 Mount Kriar) in any order — every reward is permanent and missable.",
      "Cumulative rewards: +8 passive points, +5% maximum Life, +40 Spirit, a free unique and seven permanent boons.",
      "Talk to the Hooded One in Kingsmarch for your final campaign points, then head to Oriath to open the Atlas.",
    ],
  },
  {
    key: "endgame",
    act: "Endgame",
    zone: "The Atlas / Maps",
    boss: "Pinnacle bosses",
    title: "Into the Atlas",
    endLevel: 999,
    questPoints: 26,
    ascension: {
      label: "3rd & 4th Ascendancy — Endgame Trials",
      detail:
        "Run a level-60 Djinn Barya (Trial of the Sekhemas) for points 5–6, then a level-75 four-room Barya around level 85 for points 7–8 — that completes all 8 ascendancy points.",
      points: 4,
      totalPoints: 8,
    },
    objectives: [
      "From the Ziggurat: rush the first map boss, raise the Fortress with a Precursor Tower and start filling the Atlas passive tree.",
      "Cap Chaos Resistance, then push your pinnacle targets (Arbiter of Divinity, Xesht, Atziri, the Bodach…) and the Runes of Aldur league.",
      "Finish ascending at the endgame Trials, then chase the build's real gear (shown below) and Verisium runeforged upgrades.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Damage / archetype detection
// ---------------------------------------------------------------------------
const ELEMENTS: { re: RegExp; name: string }[] = [
  { re: /lightning|shock|spark|storm|thunder|arc\b/i, name: "Lightning" },
  { re: /\b(cold|ice|frost|glacial)\b/i, name: "Cold" },
  { re: /\b(fire|flame|ignite|burning|incinerate)\b/i, name: "Fire" },
  { re: /\b(chaos|poison|wither|contagion|essence drain)\b/i, name: "Chaos" },
  { re: /\b(physical|bleed|impale|bow|slam|strike)\b/i, name: "Physical" },
];

function detectDamageType(build: DecodedBuild): string {
  const haystack = build.skillGroups
    .flatMap((g) => g.gems.map((x) => x.name))
    .join(" ");
  for (const e of ELEMENTS) if (e.re.test(haystack)) return e.name;
  return "your main";
}

type Arch = "bow" | "melee" | "attack" | "caster" | "minion";

function detectArchetypes(build: DecodedBuild): Set<Arch> {
  const skills = build.skillGroups
    .flatMap((g) => g.gems.filter((x) => !x.isSupport).map((x) => x.name))
    .join(" ")
    .toLowerCase();
  const weapons = build.items
    .filter((i) => /^Weapon/.test(i.slot ?? ""))
    .map((i) => i.baseType.toLowerCase())
    .join(" ");
  const text = skills + " " + weapons;
  const set = new Set<Arch>();

  if (/\b(bow|arrow|shot|barrage|snipe|rain of arrows|quiver)\b/.test(text))
    set.add("bow");
  if (/\b(minion|skeleton|zombie|raise|summon|hound|reaper|spectre|infernal legion)\b/.test(text))
    set.add("minion");
  if (/\b(mace|axe|sword|quarterstaff|spear|claw|flail|hammer|slam|strike|stampede|sunder|boneshatter|leap)\b/.test(text))
    set.add("melee");
  if (/\b(spark|fireball|frost|ice|cold|incinerate|bolt|comet|firewall|contagion|essence drain|hex|curse|wand|sceptre|staff|spell|bone|hexblast|flameblast|arc)\b/.test(text))
    set.add("caster");

  if (set.has("bow") || set.has("melee")) set.add("attack");
  // sensible fallback when nothing matched
  if (set.size === 0) {
    const hasWeaponSpell = /wand|sceptre|staff/.test(weapons);
    set.add(hasWeaponSpell ? "caster" : "attack");
  }
  return set;
}

// ---------------------------------------------------------------------------
// Curated PoE2 0.5 leveling uniques (verified slots / bases / level reqs).
// Each is a *concrete* item you can target the moment its level req is met.
// ---------------------------------------------------------------------------
interface LevelingUnique {
  name: string;
  slot: string;
  base: string;
  levelReq: number;
  archetypes: (Arch | "any")[];
  detail: string;
}

const LEVELING_UNIQUES: LevelingUnique[] = [
  {
    name: "Crown of the Victor",
    slot: "Helmet",
    base: "Iron Crown",
    levelReq: 5,
    archetypes: ["any"],
    detail: "+1 to all Skills — flat power that helps literally every build.",
  },
  {
    name: "Goldrim",
    slot: "Helmet",
    base: "Felt Cap",
    levelReq: 10,
    archetypes: ["any"],
    detail:
      "+(25–35)% to all Elemental Resistances — single-handedly solves resistances for the whole campaign.",
  },
  {
    name: "Wanderlust",
    slot: "Boots",
    base: "Wrapped Sandals",
    levelReq: 11,
    archetypes: ["any"],
    detail: "+20% Movement Speed and your speed is unaffected by slows, from level 11.",
  },
  {
    name: "Midnight Braid",
    slot: "Belt",
    base: "Rawhide Belt",
    levelReq: 1,
    archetypes: ["any"],
    detail: "Mana (and life) sustain via damage recoup — fixes early mana/sustain problems.",
  },
  {
    name: "Lifesprig",
    slot: "Weapon 1",
    base: "Wand",
    levelReq: 10,
    archetypes: ["caster"],
    detail:
      "+to spell levels, cast speed and mana — the classic caster leveling wand. Buy one whose required level ≤ your level + 5 (its req scales with item level).",
  },
  {
    name: "Threaded Light",
    slot: "Amulet",
    base: "Amulet",
    levelReq: 1,
    archetypes: ["caster", "minion"],
    detail: "+12% Spell Damage per 10 Spirit — superb for spell and hybrid setups.",
  },
  {
    name: "Enfolding Dawn",
    slot: "Amulet",
    base: "Amulet",
    levelReq: 1,
    archetypes: ["minion"],
    detail: "Large Spirit plus resistances — fuels an early minion army.",
  },
  {
    name: "Earthbound",
    slot: "Weapon 1",
    base: "Staff",
    levelReq: 10,
    archetypes: ["caster"],
    detail: "Grants and scales Lightning skills — a free attack for early spellcasters.",
  },
  {
    name: "Widowhail",
    slot: "Weapon 1",
    base: "Crude Bow",
    levelReq: 1,
    archetypes: ["bow"],
    detail: "Multiplies your quiver's modifiers — pair it with a strong leveling quiver for huge early damage.",
  },
  {
    name: "Blackgleam",
    slot: "Weapon 2",
    base: "Fire Quiver",
    levelReq: 1,
    archetypes: ["bow"],
    detail: "Adds Fire Damage and an extra projectile with pierce — the staple bow leveling quiver.",
  },
  {
    name: "Asphyxia's Wrath",
    slot: "Weapon 2",
    base: "Broadhead Quiver",
    levelReq: 1,
    archetypes: ["bow"],
    detail: "Adds Cold Damage with chill/freeze scaling — alternative bow quiver for control.",
  },
  {
    name: "Horns of Bynden",
    slot: "Helmet",
    base: "Rusted Greathelm",
    levelReq: 1,
    archetypes: ["melee"],
    detail: "Generates Rage on melee hits to fuel warrior/melee damage from level 1.",
  },
];

function uniqueMatches(u: LevelingUnique, arch: Set<Arch>): boolean {
  return u.archetypes.some((a) => a === "any" || arch.has(a as Arch));
}

function uniqueRec(u: LevelingUnique, carryOver = false): ItemRec {
  return {
    slot: u.slot,
    name: u.name,
    base: u.base,
    rarity: "Unique",
    detail: u.detail,
    levelReq: u.levelReq,
    icon: { unique: u.name },
    carryOver,
  };
}

// ---------------------------------------------------------------------------
// Concrete rare/magic targets, tuned to the build's weapon class & damage type
// ---------------------------------------------------------------------------
function weaponClass(build: DecodedBuild): string {
  const base =
    build.items.find((i) => i.slot === "Weapon 1")?.baseType?.toLowerCase() ?? "";
  for (const w of [
    "crossbow",
    "bow",
    "wand",
    "sceptre",
    "staff",
    "quarterstaff",
    "spear",
    "mace",
    "axe",
    "sword",
    "flail",
    "dagger",
    "claw",
  ])
    if (base.includes(w)) return w[0].toUpperCase() + w.slice(1);
  return "";
}

function weaponTarget(arch: Set<Arch>, dmg: string, build: DecodedBuild): ItemRec {
  const cls = weaponClass(build);
  const el = dmg === "Physical" || dmg === "your main" ? "Physical" : dmg;
  // No icon: these target a *weapon class* ("the best Bow you can equip"), not a
  // specific resolvable base, so the card shows a clean slot placeholder instead.
  if (arch.has("caster")) {
    const base = cls || "Wand / Sceptre / Staff";
    return {
      slot: "Weapon 1",
      name: `${base} — best you can equip`,
      base,
      rarity: "Rare",
      detail: `Look for "increased Spell Damage", "+1 to Level of all ${el} Skills" and Cast Speed. A blue ${base} with one of these already beats a white weapon.`,
    };
  }
  if (arch.has("bow")) {
    return {
      slot: "Weapon 1",
      name: `${cls || "Bow"} — highest base damage you can equip`,
      base: cls || "Bow",
      rarity: "Rare",
      detail: `Prioritise "Adds # to # ${el} Damage" (or Physical), increased Attack Speed and +Accuracy. Upgrade the base type every few levels.`,
    };
  }
  const base = cls || "Mace / Axe / Sword / Quarterstaff";
  return {
    slot: "Weapon 1",
    name: `${base} — highest base damage you can equip`,
    base,
    rarity: "Rare",
    detail: `Chase flat "Adds # to # Physical Damage"${
      el !== "Physical" ? ` / "Adds # to # ${el} Damage"` : ""
    }, increased Attack Speed and Accuracy. Re-roll/upgrade the base often.`,
  };
}

const RES_GEM: Record<string, string> = {
  Fire: "Ruby Ring",
  Cold: "Sapphire Ring",
  Lightning: "Topaz Ring",
};

/** Rare/magic example items appropriate to a campaign stage's level window. */
function campaignRares(
  i: number,
  dmg: string,
  arch: Set<Arch>,
  build: DecodedBuild
): ItemRec[] {
  const out: ItemRec[] = [];
  const resRing = RES_GEM[dmg] ?? "Sapphire Ring";

  if (i === 0) {
    // Act 1 — anything with life + a little damage.
    out.push(weaponTarget(arch, dmg, build));
    out.push({
      slot: "Rings / Amulet",
      name: "Iron Ring + flat-damage jewellery",
      rarity: "Magic",
      detail: `An Iron Ring adds flat ${
        dmg === "Physical" || dmg === "your main" ? "Physical" : dmg
      } damage to attacks/spells — the single biggest early damage boost. Take any Life or Resistance you find on rings/amulet.`,
    });
    out.push({
      slot: "Armour (any)",
      name: "Rares with +maximum Life",
      rarity: "Rare",
      detail:
        "On every armour slot, maximum Life is the #1 stat. Don't be picky about anything else yet — just survive Clearfell.",
    });
  } else if (i === 1) {
    out.push({
      slot: "Ring 1 / Ring 2",
      name: resRing,
      base: resRing,
      rarity: "Magic",
      detail: `Its implicit gives a chunk of ${dmg === "Physical" || dmg === "your main" ? "elemental" : dmg} Resistance; add Life and flat damage. Buy/craft two and start closing your resistance gaps.`,
      icon: { item: resRing },
    });
    out.push({
      slot: "Boots",
      name: "Rare boots with Movement Speed + Life",
      rarity: "Rare",
      detail: "If you're not on Wanderlust, 25–30% Movement Speed + Life keeps the desert from dragging.",
    });
    out.push(weaponTarget(arch, dmg, build));
  } else if (i === 2) {
    out.push({
      slot: "Body Armour",
      name: "Rare chest: high Life + your defence layer",
      rarity: "Rare",
      detail:
        "Biggest Life roll you can wear, plus the defence your build scales (Evasion / Energy Shield / Armour) and a resistance.",
    });
    out.push({
      slot: "All slots",
      name: "Resistances toward 75%",
      rarity: "Rare",
      detail:
        "Use the Trial/quest resists plus rare jewellery to push Fire/Cold/Lightning toward the cap — Act 3 is where unbalanced res starts to kill you.",
    });
    out.push({
      slot: "Amulet",
      name: "Rare amulet: Life + flat damage + a +skill",
      rarity: "Rare",
      detail: `An amulet with maximum Life, "Adds # to # ${
        dmg === "Physical" || dmg === "your main" ? "Physical" : dmg
      } Damage" and ideally +1 to your skill type pulls a lot of weight here.`,
    });
  } else {
    // Act 4 — finish the campaign comfortably.
    out.push({
      slot: "All slots",
      name: "All Elemental Resistances at 75%",
      rarity: "Rare",
      detail:
        "Before the Interludes, every elemental resistance should be capped. Re-craft weak slots — survival > damage here.",
    });
    out.push(weaponTarget(arch, dmg, build));
    out.push({
      slot: "Gloves / Belt",
      name: arch.has("caster") ? "Cast Speed + Life pieces" : "Attack Speed + Life pieces",
      rarity: "Rare",
      detail: arch.has("caster")
        ? "Add Cast Speed and Spirit (for heralds/auras) on top of Life and resistances."
        : "Add Attack Speed and Accuracy on top of Life and resistances so clear speed keeps up.",
    });
  }
  return out;
}

function topMods(item: ParsedItem, n = 3): string {
  const mods = [...item.implicits, ...item.explicits].map((m) => m.text);
  return mods.slice(0, n).join(" · ");
}

/** Endgame: the build's *actual* finished items — the best example for each slot. */
function endgameItems(build: DecodedBuild): { items: ItemRec[]; itemNote: string } {
  const order = [
    "Weapon 1",
    "Weapon 2",
    "Helmet",
    "Body Armour",
    "Gloves",
    "Boots",
    "Amulet",
    "Ring 1",
    "Ring 2",
    "Belt",
  ];
  // Main gear first (weapons, armour, jewellery); flasks/charms/other slots last.
  const rank = (slot?: string) => {
    const i = order.indexOf(slot ?? "");
    return i === -1 ? order.length : i;
  };
  const items = build.items
    .filter((it) => it.slot)
    .sort((a, b) => rank(a.slot) - rank(b.slot))
    .map<ItemRec>((it) => ({
      slot: it.slot!,
      name: it.name,
      base: it.baseType !== it.name ? it.baseType : undefined,
      rarity:
        it.rarity === "Unique" || it.rarity === "Relic"
          ? "Unique"
          : it.rarity === "Magic"
            ? "Magic"
            : it.rarity === "Normal"
              ? "Normal"
              : "Rare",
      detail: topMods(it) || "Copy this exact piece from the Gear tab and craft toward it.",
      icon:
        it.rarity === "Unique" || it.rarity === "Relic"
          ? ({ unique: it.name } as Record<string, string>)
          : ({ item: it.baseType } as Record<string, string>),
    }));
  return {
    items,
    itemNote:
      "These are the build's finished items — the concrete target for every slot. Buy the uniques when affordable, and copy the rare bases/mods to craft (or Verisium runeforge) your own.",
  };
}

// ---------------------------------------------------------------------------
// Gems
// ---------------------------------------------------------------------------
function mainGroup(build: DecodedBuild) {
  const idx = (build.mainSocketGroup ?? 1) - 1;
  return (
    build.skillGroups.find((g) => g.isMain && g.gems.some((x) => !x.isSupport)) ??
    build.skillGroups[idx] ??
    build.skillGroups.find((g) => g.gems.some((x) => !x.isSupport)) ??
    build.skillGroups[0]
  );
}

function gemPlan(
  i: number,
  total: number,
  main: string | undefined,
  supports: string[],
  secondary: string[]
): LevelStage["gems"] {
  const m = main ?? "your main skill";
  if (i === 0) {
    return {
      actives: main ? [main] : [],
      supports: supports.slice(0, 1),
      note: `Cut ${m} from your first Uncut Skill Gem in Act 1, then add ${
        supports[0] ?? "a damage support"
      } as soon as a socket and Uncut Support Gem are free. Slot a movement skill too.`,
    };
  }
  if (i === 1) {
    return {
      actives: [main, secondary[0]].filter(Boolean) as string[],
      supports: supports.slice(0, 2),
      note: `Bring ${m} up to 2 supports (${supports
        .slice(0, 2)
        .join(", ")}). Add ${
        secondary[0] ?? "a utility/secondary skill"
      } and spend Spirit on your first herald/aura.`,
    };
  }
  if (i === 2) {
    return {
      actives: [main, ...secondary.slice(0, 1)].filter(Boolean) as string[],
      supports: supports.slice(0, 3),
      note: `Push ${m} to 3 supports as Uncut Support Gems drop. Keep a curse/mark and a herald running off Spirit.`,
    };
  }
  if (i >= total - 1) {
    return {
      actives: [main, ...secondary].filter(Boolean) as string[],
      supports,
      note: `Run the full final link: ${m}${
        supports.length ? " + " + supports.join(", ") : ""
      }. Every herald, aura and auxiliary skill from the build is online.`,
    };
  }
  return {
    actives: [main, ...secondary.slice(0, 2)].filter(Boolean) as string[],
    supports: supports.slice(0, Math.min(supports.length, 4)),
    note: `Expand ${m} toward its final ${supports.length}-link and add the remaining auxiliary skills as sockets/Spirit allow.`,
  };
}

// ---------------------------------------------------------------------------
function rationale(i: number, total: number, notables: string[], dmg: string): string {
  const low = dmg.toLowerCase();
  if (i === 0)
    return `Early on, survivability beats damage. Travel out from your class start grabbing Life and the closest ${low} damage nodes so Act 1 stays smooth.`;
  if (i === total - 1)
    return `Endgame: finish the tree, completing the keystones/notables (${
      notables.slice(0, 3).join(", ") || "build-defining nodes"
    }) and chasing the build's real gear and ascendancy points.`;
  return `This stage picks up ${
    notables.slice(0, 3).join(", ") || "core notables"
  } — the power spikes that keep your clear and survival ahead of the content.`;
}

// ---------------------------------------------------------------------------
export function generateLeveling(build: DecodedBuild): {
  damageType: string;
  mainSkill?: string;
  archetypes: string[];
  stages: LevelStage[];
} {
  const finalLevel = Math.max(build.level, 30);
  const ordered = orderAllocation(build.tree.nodes, build.className);
  const dmg = detectDamageType(build);
  const arch = detectArchetypes(build);
  const mg = mainGroup(build);
  const mainSkill = mg?.mainActive ?? mg?.gems.find((g) => !g.isSupport)?.name;
  const supports = [
    ...new Set(mg?.gems.filter((g) => g.isSupport).map((g) => g.name) ?? []),
  ];
  // Other groups' active skills (auras/heralds/movement/utility), de-duplicated
  // and excluding the main skill so the plan doesn't repeat it.
  const secondaryActives = [
    ...new Set(
      build.skillGroups
        .filter((g) => g !== mg)
        .flatMap((g) => g.gems.filter((x) => !x.isSupport).map((x) => x.name))
    ),
  ].filter((n) => n && n !== mainSkill);

  // Active milestones up to the build's final level.
  const stagesM = MILESTONES.filter(
    (m, i) => i === 0 || MILESTONES[i - 1].endLevel < finalLevel
  ).map((m) => ({ ...m, endLevel: Math.min(m.endLevel, finalLevel) }));
  stagesM[stagesM.length - 1].endLevel = finalLevel;

  const pointsAt = (lvl: number, quest: number) => lvl - 1 + quest;
  let cursor = 0;
  let prevLevel = 1;

  // Track leveling uniques already handed out so later stages show carry-over,
  // not repeats ("what you can already possess").
  const usedUniques = new Set<string>();

  const stages: LevelStage[] = stagesM.map((m, i) => {
    const budget = Math.min(pointsAt(m.endLevel, m.questPoints), ordered.length);
    const slice = ordered.slice(cursor, budget);
    cursor = budget;
    const lo = i === 0 ? 1 : prevLevel;
    const hi = m.endLevel;
    prevLevel = m.endLevel + 1;

    const notableNames = slice
      .map((id) => TREE.nodes[id])
      .filter((n) => n && (n.kind === "notable" || n.kind === "keystone"))
      .map((n) => n!.name);

    // ---- items ----
    let items: ItemRec[];
    let itemNote: string;
    if (m.key === "endgame") {
      ({ items, itemNote } = endgameItems(build));
    } else {
      // Newly-equippable leveling uniques (level req now met, not shown before).
      const newUniques = LEVELING_UNIQUES.filter(
        (u) => uniqueMatches(u, arch) && u.levelReq <= hi && !usedUniques.has(u.name)
      );
      newUniques.forEach((u) => usedUniques.add(u.name));
      const carried = [...usedUniques].filter(
        (n) => !newUniques.some((u) => u.name === n)
      );
      // Early on the leveling uniques are the best slots; from mid-campaign,
      // well-rolled rares overtake them — so lead with whichever is actually best.
      const rares = campaignRares(i, dmg, arch, build);
      items = i <= 1
        ? [...newUniques.map((u) => uniqueRec(u)), ...rares]
        : [...rares, ...newUniques.map((u) => uniqueRec(u))];
      const dlow = dmg === "your main" ? "" : dmg.toLowerCase() + " ";
      const transition =
        i <= 1
          ? "Leveling uniques are your strongest slots right now — equip each as soon as you meet its level requirement."
          : `By now a well-rolled rare (high Life + two resistances + flat ${dlow}damage) beats the leveling uniques — replace each unique the moment a better rare drops, and craft rares as your real best-in-slot.`;
      itemNote =
        (newUniques.length
          ? `New this stage: ${newUniques.map((u) => u.name).join(", ")}. `
          : "") +
        (carried.length ? `Carrying over: ${carried.join(", ")}. ` : "") +
        transition;
    }

    return {
      key: m.key,
      act: m.act,
      zone: m.zone,
      boss: m.boss,
      title: m.title,
      levelRange: [lo, m.endLevel] as [number, number],
      objectives: m.objectives,
      ascension: m.ascension,
      passivesAdded: slice,
      notableNames,
      gems: gemPlan(i, stagesM.length, mainSkill, supports, secondaryActives),
      items,
      itemNote,
      rationale: rationale(i, stagesM.length, notableNames, dmg),
    };
  });

  return { damageType: dmg, mainSkill, archetypes: [...arch], stages };
}

import type { DecodedBuild } from "@/lib/pob/types";
import { TREE, orderAllocation } from "@/lib/tree/tree";

export interface LevelStage {
  key: string;
  act: string;
  title: string;
  levelRange: [number, number];
  ascension?: string;
  /** Node ids to allocate during this stage, in travel order. */
  passivesAdded: string[];
  notableNames: string[];
  gems: { actives: string[]; supports: string[]; note: string };
  gear: string[];
  rationale: string;
}

interface Milestone {
  key: string;
  act: string;
  endLevel: number;
  questPoints: number; // cumulative bonus passive points by end of stage
  ascension?: string;
}

// Approximate PoE2 (0.3) campaign structure. Cumulative quest passive points
// are an approximation of the points handed out across the campaign.
const MILESTONES: Milestone[] = [
  { key: "a1", act: "Act 1", endLevel: 12, questPoints: 4 },
  { key: "a2", act: "Act 2", endLevel: 20, questPoints: 8, ascension: "1st Ascendancy — Trial of the Sekhemas (2 points)" },
  { key: "a3", act: "Act 3", endLevel: 30, questPoints: 12, ascension: "2nd Ascendancy — Trial of Chaos (2 points)" },
  { key: "c1", act: "Cruel Act 1", endLevel: 35, questPoints: 16 },
  { key: "c2", act: "Cruel Act 2", endLevel: 40, questPoints: 20, ascension: "3rd Ascendancy (2 points)" },
  { key: "c3", act: "Cruel Act 3", endLevel: 45, questPoints: 24, ascension: "4th Ascendancy (2 points) — fully ascended" },
  { key: "maps", act: "Maps / Endgame", endLevel: 999, questPoints: 26 },
];

const ELEMENTS: { re: RegExp; name: string }[] = [
  { re: /lightning|shock|spark|storm|thunder/i, name: "Lightning" },
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

function mainGroup(build: DecodedBuild) {
  const idx = (build.mainSocketGroup ?? 1) - 1;
  return (
    build.skillGroups[idx] ??
    build.skillGroups.find((g) => g.gems.some((x) => !x.isSupport)) ??
    build.skillGroups[0]
  );
}

/** Tally which affix categories the finished gear leans on, for gear advice. */
function gearProfile(build: DecodedBuild) {
  const text = build.items
    .flatMap((i) => i.explicits.map((m) => m.text))
    .join("\n");
  const count = (re: RegExp) => (text.match(re) || []).length;
  return {
    life: count(/maximum Life/gi),
    resist: count(/Resistance/gi),
    attributes: count(/Strength|Dexterity|Intelligence|all Attributes/gi),
    crit: count(/Critical/gi),
    speed: count(/Attack Speed|Cast Speed/gi),
    accuracy: count(/Accuracy/gi),
    es: count(/Energy Shield/gi),
  };
}

export function generateLeveling(build: DecodedBuild): {
  damageType: string;
  mainSkill?: string;
  stages: LevelStage[];
} {
  const finalLevel = Math.max(build.level, 30);
  const ordered = orderAllocation(build.tree.nodes, build.className);
  const dmg = detectDamageType(build);
  const mg = mainGroup(build);
  const mainSkill = mg?.mainActive ?? mg?.gems.find((g) => !g.isSupport)?.name;
  const supports = mg?.gems.filter((g) => g.isSupport).map((g) => g.name) ?? [];
  const secondaryActives = build.skillGroups
    .filter((g) => g !== mg)
    .flatMap((g) => g.gems.filter((x) => !x.isSupport).map((x) => x.name));
  const profile = gearProfile(build);

  // Active milestones up to the build's final level.
  const stagesM = MILESTONES.filter(
    (m, i) => i === 0 || MILESTONES[i - 1].endLevel < finalLevel
  ).map((m) => ({ ...m, endLevel: Math.min(m.endLevel, finalLevel) }));
  // Ensure the last stage reaches the final level.
  stagesM[stagesM.length - 1].endLevel = finalLevel;

  const pointsAt = (lvl: number, quest: number) => lvl - 1 + quest;
  let cursor = 0;
  let prevLevel = 1;

  const stages: LevelStage[] = stagesM.map((m, i) => {
    const budget = Math.min(pointsAt(m.endLevel, m.questPoints), ordered.length);
    const slice = ordered.slice(cursor, budget);
    cursor = budget;
    const lo = i === 0 ? 1 : prevLevel;
    prevLevel = m.endLevel + 1;

    const notableNames = slice
      .map((id) => TREE.nodes[id])
      .filter((n) => n && (n.kind === "notable" || n.kind === "keystone"))
      .map((n) => n!.name);

    return {
      key: m.key,
      act: m.act,
      title: actTitle(m.key),
      levelRange: [lo, m.endLevel],
      ascension: m.ascension,
      passivesAdded: slice,
      notableNames,
      gems: gemPlan(i, stagesM.length, mainSkill, supports, secondaryActives),
      gear: gearPlan(i, stagesM.length, dmg, profile, build),
      rationale: rationale(i, stagesM.length, notableNames, dmg),
    };
  });

  return { damageType: dmg, mainSkill, stages };
}

function actTitle(key: string): string {
  return (
    {
      a1: "Getting started",
      a2: "First power spike",
      a3: "Coming online",
      c1: "Tightening up",
      c2: "Cap your resistances",
      c3: "Campaign done",
      maps: "Into the endgame",
    }[key] || "Progress"
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
      note: `Slot ${m} as soon as you get an Uncut Skill Gem (Act 1). Add your first support — ${supports[0] ?? "a damage support"} — once you have a free socket.`,
    };
  }
  if (i === 1) {
    return {
      actives: [main, secondary[0]].filter(Boolean) as string[],
      supports: supports.slice(0, 2),
      note: `Bring ${m} up to ${Math.min(2, supports.length)} support gems. Introduce ${secondary[0] ?? "a utility skill"} for clear/utility.`,
    };
  }
  if (i >= total - 1) {
    return {
      actives: [main, ...secondary].filter(Boolean) as string[],
      supports,
      note: `Run the full final link: ${m}${supports.length ? " + " + supports.join(", ") : ""}. All auxiliary skills online.`,
    };
  }
  return {
    actives: [main, ...secondary.slice(0, 2)].filter(Boolean) as string[],
    supports: supports.slice(0, Math.min(supports.length, 2 + i)),
    note: `Expand ${m} toward its final ${supports.length}-link as sockets and Uncut Support Gems allow. Add auxiliary skills from the build.`,
  };
}

function gearPlan(
  i: number,
  total: number,
  dmg: string,
  profile: ReturnType<typeof gearProfile>,
  build: DecodedBuild
): string[] {
  if (i <= 1) {
    return [
      "Life on as many slots as possible (the #1 survival stat while leveling).",
      "Grab any Elemental Resistances you find — don't be picky yet.",
      "Boots with Movement Speed.",
      `A weapon with the highest flat ${dmg} / physical damage you can equip.`,
      "Fill missing Attributes so you can equip your gems and gear.",
    ];
  }
  if (i < total - 1) {
    return [
      "Push all Elemental Resistances toward the 75% cap before maps.",
      "Keep increasing maximum Life on every slot.",
      profile.crit > 1 ? "Start picking up Critical Chance / Critical Damage." : "Add attack/cast speed where the build wants it.",
      profile.accuracy > 0 ? "Watch your Accuracy / hit chance." : "Round out Attributes for upcoming gear.",
    ];
  }
  // Endgame: derive from the finished build's actual gear leanings.
  const wants: string[] = [];
  if (profile.life) wants.push("maximum Life");
  if (profile.es) wants.push("Energy Shield");
  if (profile.resist) wants.push("capped Resistances");
  if (profile.crit) wants.push("Critical Chance/Damage");
  if (profile.speed) wants.push("Attack/Cast Speed");
  if (profile.accuracy) wants.push("Accuracy");
  return [
    `Target the affixes the finished build relies on: ${wants.join(", ") || "life, resistances, damage"}.`,
    `Scale ${dmg} damage on weapon/jewellery.`,
    `Copy the rare bases from the Gear tab and craft toward those mods.`,
    "Slot the build's unique items once you can afford them.",
  ];
}

function rationale(
  i: number,
  total: number,
  notables: string[],
  dmg: string
): string {
  if (i === 0)
    return `Early on, survivability beats damage. Travel outward from your class start, grabbing life and the closest ${dmg.toLowerCase()} damage nodes so the campaign stays smooth.`;
  if (i >= total - 1)
    return `Final stretch: complete the tree, finishing the key notables (${notables.slice(0, 3).join(", ") || "build defining nodes"}) that define the endgame build.`;
  return `This stage picks up ${notables.slice(0, 3).join(", ") || "core notables"} — the power spikes that keep your clear speed and survival ahead of the content.`;
}

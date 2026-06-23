import type { ParsedItem, ParsedMod, Rarity } from "./types";

const META_PREFIXES = [
  "Item Level:",
  "ItemLvl:",
  "LevelReq:",
  "Quality:",
  "Sockets:",
  "Requires",
  "Requirements:",
  "Limited to:",
  "Radius:",
  "Item Class",
  "Unique ID:",
  "Rarity:",
  "Implicits:",
  "Prefix:",
  "Suffix:",
  "Crafted:",
  "Selected",
  "Has Alt",
  "League:",
  "Source:",
  "--------",
];

function isMeta(line: string): boolean {
  return META_PREFIXES.some((p) => line.startsWith(p));
}

/** Strip PoB display tags like {crafted}, {range:0.5}, {tags:...}. */
function cleanModText(line: string): string {
  return line
    .replace(/\{crafted\}/gi, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\s+\(augmented\)/gi, "")
    .trim();
}

const SUFFIX_HINTS = [
  /resistance/i,
  /to maximum (life|mana|energy shield) is/i,
  /\bStrength\b/, /\bDexterity\b/, /\bIntelligence\b/, /all Attributes/i,
  /increased Attack Speed/i,
  /increased Cast Speed/i,
  /Critical/i,
  /Accuracy/i,
  /Regeneration/i,
  /Stun Threshold/i,
  /Light Radius/i,
  /reduced Attribute Requirements/i,
  /increased Rarity/i,
];
const PREFIX_HINTS = [
  /maximum Life/i,
  /maximum Mana/i,
  /maximum Energy Shield/i,
  /increased .*Physical Damage/i,
  /Adds \d+ to \d+/i,
  /increased .*Damage/i,
  /increased Armour/i,
  /increased Evasion/i,
  /increased Energy Shield/i,
  /Flat .*Damage/i,
  /increased Spell Damage/i,
];

/** Approximate affix bucket — used only for display grouping. */
function guessAffix(text: string): ParsedMod["affix"] {
  if (PREFIX_HINTS.some((r) => r.test(text))) return "prefix";
  if (SUFFIX_HINTS.some((r) => r.test(text))) return "suffix";
  return "other";
}

/**
 * Parse the in-game / PoB "copy item" text block into a structured item.
 * The raw text doesn't label prefix vs suffix, so affixes are estimated and
 * mods are reliably split into implicit vs explicit.
 */
export function parseItemText(raw: string): ParsedItem | null {
  const text = (raw || "").replace(/\r/g, "").trim();
  if (!text) return null;
  const lines = text.split("\n").map((l) => l.trimEnd());

  // Rarity line
  const rarityLine = lines.find((l) => /^Rarity:/i.test(l));
  let rarity: Rarity = "Normal";
  if (rarityLine) {
    const r = rarityLine.split(":")[1]?.trim().toLowerCase();
    if (r?.startsWith("magic")) rarity = "Magic";
    else if (r?.startsWith("rare")) rarity = "Rare";
    else if (r?.startsWith("unique")) rarity = "Unique";
    else if (r?.startsWith("relic")) rarity = "Relic";
    else if (r?.startsWith("gem")) rarity = "Gem";
  }

  const startIdx = rarityLine ? lines.indexOf(rarityLine) + 1 : 0;
  // Name / base type lines come right after the rarity line.
  let name = "";
  let baseType = "";
  const l1 = lines[startIdx] ?? "";
  const l2 = lines[startIdx + 1] ?? "";
  if (rarity === "Rare" || rarity === "Unique" || rarity === "Relic") {
    name = l1;
    baseType = l2 && !l2.startsWith("--------") ? l2 : l1;
  } else if (rarity === "Magic") {
    name = l1;
    baseType = l1; // base is embedded in the magic name; best-effort
  } else {
    name = l1;
    baseType = l1;
  }

  // Item level / quality / implicit count.
  let itemLevel: number | undefined;
  let quality: number | undefined;
  let implicitCount = 0;
  for (const l of lines) {
    const il = l.match(/^(?:Item Level|ItemLvl):\s*(\d+)/i);
    if (il) itemLevel = parseInt(il[1], 10);
    const q = l.match(/^Quality:\s*\+?(\d+)/i);
    if (q) quality = parseInt(q[1], 10);
    const im = l.match(/^Implicits:\s*(\d+)/i);
    if (im) implicitCount = parseInt(im[1], 10);
  }

  // Collect mod lines (everything past the name block that isn't metadata).
  const modLines: { text: string; explicitImplicit?: boolean; crafted?: boolean }[] = [];
  const skipUntil = startIdx + (rarity === "Magic" || rarity === "Normal" ? 1 : 2);
  for (let i = skipUntil; i < lines.length; i++) {
    const lineRaw = lines[i];
    if (!lineRaw || isMeta(lineRaw)) continue;
    const crafted = /\{crafted\}/i.test(lineRaw) || /\(crafted\)/i.test(lineRaw);
    const explImpl = /\(implicit\)/i.test(lineRaw);
    const cleaned = cleanModText(lineRaw.replace(/\s*\((implicit|crafted)\)\s*/gi, ""));
    if (!cleaned) continue;
    if (/^(Corrupted|Mirrored|Split|Synthesised)$/i.test(cleaned)) continue;
    modLines.push({ text: cleaned, explicitImplicit: explImpl, crafted });
  }

  const implicits: ParsedMod[] = [];
  const explicits: ParsedMod[] = [];
  modLines.forEach((m, idx) => {
    const isImplicit = m.explicitImplicit || (implicitCount > 0 && idx < implicitCount);
    if (isImplicit) {
      implicits.push({ text: m.text, kind: "implicit" });
    } else {
      explicits.push({
        text: m.text,
        kind: m.crafted ? "crafted" : "explicit",
        affix: guessAffix(m.text),
      });
    }
  });

  return {
    rarity,
    name: name || baseType || "Unknown Item",
    baseType: baseType || name,
    itemLevel,
    quality,
    implicits,
    explicits,
    raw: text,
  };
}

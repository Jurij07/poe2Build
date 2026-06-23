// Structured representation of a decoded Path of Building (PoE2) build.

export type Rarity = "Normal" | "Magic" | "Rare" | "Unique" | "Gem" | "Relic";

export interface ParsedMod {
  text: string;
  kind: "implicit" | "explicit" | "crafted" | "rune" | "enchant";
  /** Best-effort affix bucket for display grouping (approximate). */
  affix?: "prefix" | "suffix" | "other";
}

export interface ParsedItem {
  id?: string;
  rarity: Rarity;
  name: string; // unique/rare name, or base for normal
  baseType: string;
  itemLevel?: number;
  quality?: number;
  slot?: string; // assigned from the item set, e.g. "Weapon 1"
  implicits: ParsedMod[];
  explicits: ParsedMod[];
  /** poe2db CDN icon URL (resolved lazily through the image proxy). */
  icon?: string;
  raw: string;
}

export interface Gem {
  name: string;
  skillId?: string;
  level: number;
  quality: number;
  enabled: boolean;
  isSupport: boolean;
  icon?: string;
}

export interface SkillGroup {
  slot?: string; // "Weapon 1", "Body Armour", ...
  label?: string;
  enabled: boolean;
  isMain: boolean; // the build's main socket group
  mainActive?: string; // name of the active skill driving this group
  gems: Gem[];
}

export interface TreeSpec {
  treeVersion?: string;
  classId?: number;
  ascendClassId?: number;
  /** Allocated passive node ids. */
  nodes: number[];
}

export interface BuildStat {
  stat: string;
  value: number;
}

export interface DecodedBuild {
  level: number;
  className: string;
  ascendClassName?: string;
  mainSocketGroup?: number;
  stats: BuildStat[];
  notes?: string;
  tree: TreeSpec;
  skillGroups: SkillGroup[];
  items: ParsedItem[];
  /** Slot name -> item id, from the active item set. */
  itemSlots: Record<string, string>;
}

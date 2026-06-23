import zlib from "node:zlib";
import alloc from "@/data/example_alloc.json";

/**
 * A self-contained demo build: a Ranger / Deadeye Lightning Arrow bowzer.
 * Everything here is real PoE2 0.3 data — the 95 allocated passive nodes come
 * straight from the tree (data/example_alloc.json), the gems and item bases all
 * resolve to real poe2db art — so the example renders with genuine images and
 * exercises the exact same decode pipeline as a pasted code.
 */

const allocated = (alloc as string[]).join(",");

function item(id: number, raw: string) {
  return `<Item id="${id}">${raw.trim()}</Item>`;
}

const ITEMS = [
  item(
    1,
    `Rarity: Rare
Storm Fang
Dualstring Bow
--------
Quality: +20%
--------
Item Level: 82
--------
Bow Attacks fire an additional Arrow (implicit)
--------
Adds 15 to 28 Physical Damage
Adds 6 to 112 Lightning Damage
38% increased Attack Speed
+264 to Accuracy Rating
+41% to Critical Damage Bonus`
  ),
  item(
    2,
    `Rarity: Unique
Blackgleam
Visceral Quiver
--------
Item Level: 75
--------
Adds 1 to 9 Fire damage to Attacks
24% increased Projectile Speed
Attacks fire an additional Projectile
Ignites you inflict spread to other Enemies`
  ),
  item(
    3,
    `Rarity: Unique
Goldrim
Visored Cap
--------
Item Level: 12
--------
+40 to Evasion Rating
+10% to all Elemental Resistances
20% increased Rarity of Items found`
  ),
  item(
    4,
    `Rarity: Rare
Storm Shroud
Quilted Vest
--------
Item Level: 80
--------
+96 to maximum Life
+68 to maximum Evasion Rating
+38% to Cold Resistance
+22% to Chaos Resistance
12% increased Stun Threshold`
  ),
  item(
    5,
    `Rarity: Rare
Vapour Hold
Furtive Wraps
--------
Item Level: 78
--------
+72 to maximum Life
Adds 4 to 71 Lightning Damage to Attacks
+35% to Lightning Resistance
18% increased Attack Speed`
  ),
  item(
    6,
    `Rarity: Unique
Wanderlust
Wrapped Sandals
--------
Item Level: 9
--------
+20 to maximum Mana
15% increased Movement Speed
Cannot be Frozen
+12 to Dexterity`
  ),
  item(
    7,
    `Rarity: Rare
Hate Bead
Gold Amulet
--------
Item Level: 81
--------
12% increased Rarity of Items found (implicit)
--------
+58 to maximum Life
+22 to Dexterity
+31% to Fire Resistance
+18% to Critical Damage Bonus
22% increased Lightning Damage`
  ),
  item(
    8,
    `Rarity: Rare
Storm Knuckle
Sapphire Ring
--------
Item Level: 79
--------
+25% to Cold Resistance (implicit)
--------
+44 to maximum Life
Adds 3 to 58 Lightning Damage to Attacks
+29% to Lightning Resistance
+15 to Dexterity`
  ),
  item(
    9,
    `Rarity: Rare
Eagle Loop
Sapphire Ring
--------
Item Level: 79
--------
+25% to Cold Resistance (implicit)
--------
+51 to maximum Life
Adds 2 to 49 Lightning Damage to Attacks
+24% to Fire Resistance
9% increased Attack Speed`
  ),
  item(
    10,
    `Rarity: Rare
Brood Cord
Heavy Belt
--------
Item Level: 80
--------
+25 to Strength (implicit)
--------
+82 to maximum Life
+39% to Lightning Resistance
+28% to Cold Resistance
16% increased Flask Charges gained`
  ),
];

const SLOTS: [string, number][] = [
  ["Weapon 1", 1],
  ["Weapon 2", 2],
  ["Helmet", 3],
  ["Body Armour", 4],
  ["Gloves", 5],
  ["Boots", 6],
  ["Amulet", 7],
  ["Ring 1", 8],
  ["Ring 2", 9],
  ["Belt", 10],
];

function exampleXml(): string {
  const slots = SLOTS.map(
    ([name, id]) => `      <Slot name="${name}" itemId="${id}"/>`
  ).join("\n");
  const items = ITEMS.map((i) => "    " + i).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="92" className="Ranger" ascendClassName="Deadeye" mainSocketGroup="1">
    <PlayerStat stat="Life" value="3284"/>
    <PlayerStat stat="Mana" value="412"/>
    <PlayerStat stat="EnergyShield" value="0"/>
    <PlayerStat stat="Str" value="98"/>
    <PlayerStat stat="Dex" value="372"/>
    <PlayerStat stat="Int" value="104"/>
    <PlayerStat stat="LightningResist" value="76"/>
    <PlayerStat stat="ColdResist" value="75"/>
    <PlayerStat stat="FireResist" value="75"/>
    <PlayerStat stat="ChaosResist" value="12"/>
    <PlayerStat stat="CritChance" value="78.2"/>
    <PlayerStat stat="TotalDPS" value="1184220"/>
  </Build>
  <Skills activeSkillSet="1">
    <SkillSet id="1">
      <Skill slot="Weapon 1" mainActiveSkill="1" enabled="true">
        <Gem nameSpec="Lightning Arrow" level="20" quality="20" enabled="true"/>
        <Gem nameSpec="Lightning Penetration" level="20" quality="20" enabled="true" support="true"/>
        <Gem nameSpec="Fork" level="20" quality="20" enabled="true" support="true"/>
        <Gem nameSpec="Innervate" level="20" quality="0" enabled="true" support="true"/>
        <Gem nameSpec="Premeditation" level="20" quality="0" enabled="true" support="true"/>
      </Skill>
      <Skill slot="Helmet" mainActiveSkill="1" enabled="true">
        <Gem nameSpec="Sniper's Mark" level="20" quality="0" enabled="true"/>
        <Gem nameSpec="Heightened Curse" level="20" quality="0" enabled="true" support="true"/>
      </Skill>
      <Skill slot="Gloves" mainActiveSkill="1" enabled="true">
        <Gem nameSpec="Herald of Thunder" level="20" quality="0" enabled="true"/>
      </Skill>
      <Skill slot="Boots" mainActiveSkill="1" enabled="true">
        <Gem nameSpec="Blink" level="20" quality="0" enabled="true"/>
        <Gem nameSpec="Mobility" level="20" quality="0" enabled="true" support="true"/>
      </Skill>
      <Skill slot="Body Armour" mainActiveSkill="1" enabled="true">
        <Gem nameSpec="Wind Dancer" level="20" quality="0" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>
  <Tree activeSpec="1">
    <Spec treeVersion="0_3" classId="0" ascendClassId="1" nodes="${allocated}"/>
  </Tree>
  <Items activeItemSet="1">
${items}
    <ItemSet id="1">
${slots}
    </ItemSet>
  </Items>
  <Notes>Demo build: Lightning Arrow Deadeye. Generated from real PoE2 0.3 tree, gem and item data.</Notes>
</PathOfBuilding>`;
}

/** Encode the demo XML into a genuine Path of Building import code. */
export function buildExampleCode(): string {
  const xml = exampleXml();
  const compressed = zlib.deflateSync(Buffer.from(xml, "utf8"));
  return compressed
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

"use client";
import type { ParsedItem, ParsedMod, Rarity } from "@/lib/pob/types";
import Icon from "./Icon";

const RARITY_COLOR: Record<Rarity, string> = {
  Normal: "text-rarity-normal",
  Magic: "text-rarity-magic",
  Rare: "text-rarity-rare",
  Unique: "text-rarity-unique",
  Relic: "text-rarity-unique",
  Gem: "text-rarity-gem",
};

const SLOT_ORDER = [
  "Weapon 1", "Weapon 2", "Helmet", "Body Armour", "Gloves", "Boots",
  "Amulet", "Ring 1", "Ring 2", "Belt",
];

function iconQuery(item: ParsedItem): Record<string, string> {
  if (item.rarity === "Unique" || item.rarity === "Relic") return { unique: item.name };
  return { item: item.baseType };
}

function Mod({ mod }: { mod: ParsedMod }) {
  const color =
    mod.kind === "implicit"
      ? "text-sky-300/90"
      : mod.kind === "crafted"
        ? "text-blue-300"
        : "text-zinc-200";
  return (
    <li className={`flex items-start gap-2 text-sm ${color}`}>
      {mod.affix && mod.kind === "explicit" && (
        <span
          className="mt-0.5 shrink-0 rounded px-1 text-[9px] uppercase text-zinc-500"
          title="estimated affix type"
        >
          {mod.affix === "prefix" ? "P" : mod.affix === "suffix" ? "S" : "·"}
        </span>
      )}
      <span>{mod.text}</span>
    </li>
  );
}

export default function ItemsPanel({ items }: { items: ParsedItem[] }) {
  const sorted = [...items].sort((a, b) => {
    const ai = a.slot ? SLOT_ORDER.indexOf(a.slot) : 99;
    const bi = b.slot ? SLOT_ORDER.indexOf(b.slot) : 99;
    return ai - bi;
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sorted.map((item, i) => (
        <div key={i} className="card p-4">
          <div className="flex gap-3">
            <div className="shrink-0 rounded-md bg-ink-900 p-1.5">
              <Icon q={iconQuery(item)} alt={item.name} size={48} />
            </div>
            <div className="min-w-0">
              {item.slot && (
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                  {item.slot}
                </div>
              )}
              <div className={`truncate font-semibold ${RARITY_COLOR[item.rarity]}`}>
                {item.name}
              </div>
              {item.baseType !== item.name && (
                <div className="truncate text-xs text-zinc-400">{item.baseType}</div>
              )}
              <div className="mt-0.5 text-[11px] text-zinc-500">
                {item.itemLevel ? `iLvl ${item.itemLevel}` : ""}
                {item.quality ? ` · Q${item.quality}%` : ""}
              </div>
            </div>
          </div>

          {(item.implicits.length > 0 || item.explicits.length > 0) && (
            <div className="mt-3 space-y-2 border-t border-ink-700 pt-3">
              {item.implicits.length > 0 && (
                <ul className="space-y-1">
                  {item.implicits.map((m, j) => (
                    <Mod key={`i${j}`} mod={m} />
                  ))}
                </ul>
              )}
              {item.explicits.length > 0 && (
                <ul className="space-y-1">
                  {item.explicits.map((m, j) => (
                    <Mod key={`e${j}`} mod={m} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

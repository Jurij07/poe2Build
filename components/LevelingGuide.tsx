"use client";
import { useEffect, useState } from "react";
import type { LevelStage, ItemRec } from "@/lib/leveling/generate";
import { getTree, type TreeData } from "@/lib/treeClient";
import Icon from "./Icon";

const RARITY_COLOR: Record<ItemRec["rarity"], string> = {
  Unique: "text-rarity-unique",
  Rare: "text-rarity-rare",
  Magic: "text-rarity-magic",
  Normal: "text-zinc-200",
};

function NotableChip({ node }: { node: { name: string; icon?: string; kind: string } }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-ink-700 bg-ink-900/70 py-0.5 pl-0.5 pr-2 text-xs">
      {node.icon ? (
        <Icon q={{ art: node.icon }} alt={node.name} size={20} rounded />
      ) : (
        <span className="h-5 w-5 rounded-full bg-ink-700" />
      )}
      <span className={node.kind === "keystone" ? "text-gold-300" : "text-zinc-200"}>
        {node.name}
      </span>
    </span>
  );
}

function ItemCard({ item }: { item: ItemRec }) {
  return (
    <div
      className={`flex gap-2.5 rounded-lg border bg-ink-900/60 p-2.5 ${
        item.carryOver ? "border-ink-800 opacity-80" : "border-ink-700"
      }`}
    >
      <div className="shrink-0 rounded-md bg-ink-950 p-1">
        {item.icon ? (
          <Icon q={item.icon} alt={item.name} size={34} />
        ) : (
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded bg-ink-800 text-[9px] uppercase text-zinc-500">
            {item.slot.split(/[\s/]/)[0].slice(0, 4)}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">{item.slot}</span>
          {item.levelReq ? (
            <span className="rounded bg-ink-800 px-1 text-[9px] text-zinc-400">Lv {item.levelReq}+</span>
          ) : null}
          {item.carryOver && (
            <span className="rounded bg-ink-800 px-1 text-[9px] text-zinc-400">keep</span>
          )}
        </div>
        <div className={`text-sm font-semibold leading-tight ${RARITY_COLOR[item.rarity]}`}>
          {item.name}
        </div>
        {item.base && item.base !== item.name && (
          <div className="text-[11px] text-zinc-500">{item.base}</div>
        )}
        <div className="mt-0.5 text-xs text-zinc-400">{item.detail}</div>
      </div>
    </div>
  );
}

export default function LevelingGuide({
  stages,
  mainSkill,
  damageType,
  finalLevel,
}: {
  stages: LevelStage[];
  mainSkill?: string;
  damageType: string;
  finalLevel: number;
}) {
  const [tree, setTree] = useState<TreeData | null>(null);
  useEffect(() => {
    getTree().then(setTree).catch(() => {});
  }, []);

  const notablesFor = (s: LevelStage) =>
    tree
      ? s.passivesAdded
          .map((id) => tree.nodes[id])
          .filter((n) => n && (n.kind === "notable" || n.kind === "keystone"))
      : [];

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h3 className="text-lg font-bold text-zinc-100">
          Level 1 → {finalLevel} leveling guide
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Step-by-step progression for{" "}
          <span className="text-rarity-gem">{mainSkill ?? "your main skill"}</span> (
          <span className="text-poe-notable">{damageType} damage</span>) on the{" "}
          <span className="text-gold-300">patch 0.5 — Runes of Aldur</span> campaign:
          Acts 1–4, the three Interludes, then the Atlas. Each stage lists what to do,
          which passives and gems to add, and the best concrete example items to chase
          at that level.
        </p>
      </div>

      <ol className="relative space-y-5 border-l border-ink-700 pl-6">
        {stages.map((s) => {
          const notables = notablesFor(s);
          return (
            <li key={s.key} className="relative">
              <span className="absolute -left-[31px] top-1 flex h-5 w-5 items-center justify-center rounded-full border border-gold/60 bg-ink-900 text-[10px] text-gold-300">
                ●
              </span>
              <div className="card p-5">
                {/* header */}
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="rounded-md bg-gold/15 px-2 py-0.5 text-sm font-bold text-gold-300">
                      Lv {s.levelRange[0]}–{s.levelRange[1]}
                    </span>
                    <span className="text-sm font-semibold text-zinc-100">{s.act}</span>
                    {s.zone && <span className="text-sm text-zinc-400">· {s.zone}</span>}
                    <span className="text-sm text-zinc-500">— {s.title}</span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    +{s.passivesAdded.length} passive points
                  </span>
                </div>
                {s.boss && (
                  <div className="mt-1 text-xs text-zinc-500">
                    Boss / goal: <span className="text-zinc-300">{s.boss}</span>
                  </div>
                )}

                {/* objectives */}
                {s.objectives.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {s.objectives.map((o, i) => (
                      <li key={i} className="flex gap-2 text-sm text-zinc-300">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold/70" />
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* ascendancy */}
                {s.ascension && (
                  <div className="mt-3 rounded-md border border-poe-dex/30 bg-poe-dex/10 px-3 py-2 text-xs text-green-300">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">★ {s.ascension.label}</span>
                      <span className="rounded bg-poe-dex/20 px-1.5 py-0.5 text-[10px]">
                        +{s.ascension.points} pts · {s.ascension.totalPoints}/8 total
                      </span>
                    </div>
                    <p className="mt-1 text-green-300/80">{s.ascension.detail}</p>
                  </div>
                )}

                <p className="mt-3 text-sm italic text-zinc-500">{s.rationale}</p>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {/* Passives */}
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Passive tree {notables.length > 0 && `· ${notables.length} notables`}
                    </div>
                    {notables.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {notables.map((n, i) => (
                          <NotableChip key={i} node={n!} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        Travel + Life / attribute nodes toward your next cluster.
                      </p>
                    )}
                  </div>

                  {/* Gems */}
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Skills &amp; gems
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {s.gems.actives.map((g, i) => (
                        <span
                          key={`a${i}`}
                          className="inline-flex items-center gap-1 rounded-md border border-rarity-gem/40 bg-ink-900/70 py-0.5 pl-0.5 pr-2 text-xs"
                        >
                          <Icon q={{ gem: g }} alt={g} size={20} />
                          <span className="text-rarity-gem">{g}</span>
                        </span>
                      ))}
                      {s.gems.supports.map((g, i) => (
                        <span
                          key={`s${i}`}
                          className="inline-flex items-center gap-1 rounded-md border border-ink-700 bg-ink-900/70 py-0.5 pl-0.5 pr-2 text-xs"
                        >
                          <Icon q={{ gem: g, support: "1" }} alt={g} size={20} rounded />
                          <span className="text-zinc-300">{g}</span>
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">{s.gems.note}</p>
                  </div>
                </div>

                {/* Items — the main, concrete recommendation */}
                <div className="mt-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    Best example items at this point
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {s.items.map((it, i) => (
                      <ItemCard key={i} item={it} />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">{s.itemNote}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-center text-xs text-zinc-600">
        Campaign structure follows PoE2 patch 0.5 (Runes of Aldur). Passive pathing is
        derived from your finished tree; gem timing depends on Uncut Gem drops — treat
        the per-stage plan as guidance.
      </p>
    </div>
  );
}

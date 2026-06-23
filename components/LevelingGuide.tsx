"use client";
import { useEffect, useState } from "react";
import type { LevelStage } from "@/lib/leveling/generate";
import { getTree, type TreeData } from "@/lib/treeClient";
import Icon from "./Icon";

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
          Auto-generated progression for{" "}
          <span className="text-rarity-gem">{mainSkill ?? "your main skill"}</span> (
          <span className="text-poe-notable">{damageType} damage</span>). Stage
          boundaries follow PoE2 campaign acts, ascendancy trials and passive-point
          breakpoints. Each stage lists the passives to allocate, the gem setup to run,
          and what to look for on gear.
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
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="rounded-md bg-gold/15 px-2 py-0.5 text-sm font-bold text-gold-300">
                      Lv {s.levelRange[0]}–{s.levelRange[1]}
                    </span>
                    <span className="ml-2 text-sm font-semibold text-zinc-200">{s.act}</span>
                    <span className="ml-2 text-sm text-zinc-500">{s.title}</span>
                  </div>
                  <span className="text-xs text-zinc-500">+{s.passivesAdded.length} passive points</span>
                </div>

                {s.ascension && (
                  <div className="mt-3 rounded-md border border-poe-dex/30 bg-poe-dex/10 px-3 py-1.5 text-xs text-green-300">
                    ★ {s.ascension}
                  </div>
                )}

                <p className="mt-3 text-sm text-zinc-400">{s.rationale}</p>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {/* Passives */}
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Passive tree
                    </div>
                    {notables.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {notables.map((n, i) => (
                          <NotableChip key={i} node={n!} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        Travel + life / attribute nodes toward your next cluster.
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
                        <span key={`a${i}`} className="inline-flex items-center gap-1 rounded-md border border-rarity-gem/40 bg-ink-900/70 py-0.5 pl-0.5 pr-2 text-xs">
                          <Icon q={{ gem: g }} alt={g} size={20} />
                          <span className="text-rarity-gem">{g}</span>
                        </span>
                      ))}
                      {s.gems.supports.map((g, i) => (
                        <span key={`s${i}`} className="inline-flex items-center gap-1 rounded-md border border-ink-700 bg-ink-900/70 py-0.5 pl-0.5 pr-2 text-xs">
                          <Icon q={{ gem: g, support: "1" }} alt={g} size={20} rounded />
                          <span className="text-zinc-300">{g}</span>
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">{s.gems.note}</p>
                  </div>

                  {/* Gear */}
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Gear priorities
                    </div>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-zinc-400">
                      {s.gear.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-center text-xs text-zinc-600">
        Leveling logic is heuristic (campaign milestones + tree pathing). Gem
        acquisition timing in PoE2 depends on Uncut Gem drops/quests — treat the gem
        stages as guidance.
      </p>
    </div>
  );
}

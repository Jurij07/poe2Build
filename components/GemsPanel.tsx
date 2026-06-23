"use client";
import type { SkillGroup, Gem } from "@/lib/pob/types";
import Icon from "./Icon";

function GemRow({ gem, main }: { gem: Gem; main?: boolean }) {
  const size = main ? 52 : 38;
  return (
    <div className="flex items-center gap-2">
      <Icon
        q={{ gem: gem.name, ...(gem.isSupport ? { support: "1" } : {}) }}
        alt={gem.name}
        size={size}
        rounded={gem.isSupport}
        className={
          gem.isSupport
            ? "ring-1 ring-ink-600"
            : "ring-2 ring-rarity-gem/70 shadow shadow-rarity-gem/20"
        }
      />
      <div className="min-w-0">
        <div
          className={`truncate text-sm ${
            gem.isSupport ? "text-zinc-300" : "font-semibold text-rarity-gem"
          }`}
        >
          {gem.name}
        </div>
        <div className="text-[11px] text-zinc-500">
          Lvl {gem.level}
          {gem.quality ? ` · Q${gem.quality}%` : ""}
          {gem.isSupport ? " · support" : ""}
        </div>
      </div>
    </div>
  );
}

export default function GemsPanel({ groups }: { groups: SkillGroup[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((g, i) => {
        const actives = g.gems.filter((x) => !x.isSupport);
        const supports = g.gems.filter((x) => x.isSupport);
        return (
          <div key={i} className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-zinc-300">
                {g.slot || g.label || `Group ${i + 1}`}
              </div>
              {g.isMain && (
                <span className="rounded bg-gold/20 px-2 py-0.5 text-[11px] font-semibold text-gold-300">
                  MAIN LINK
                </span>
              )}
            </div>
            <div className="space-y-3">
              {actives.map((gem, j) => (
                <GemRow key={`a${j}`} gem={gem} main />
              ))}
            </div>
            {supports.length > 0 && (
              <div className="mt-3 grid grid-cols-1 gap-2 border-t border-ink-700 pt-3 sm:grid-cols-2">
                {supports.map((gem, j) => (
                  <GemRow key={`s${j}`} gem={gem} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";
import type { DecodedBuild } from "@/lib/pob/types";
import Icon from "./Icon";

interface Leveling {
  damageType: string;
  mainSkill?: string;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900/60 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`text-lg font-semibold ${accent ?? "text-zinc-100"}`}>{value}</div>
    </div>
  );
}

export default function BuildOverview({
  build,
  leveling,
}: {
  build: DecodedBuild;
  leveling: Leveling;
}) {
  const s = (name: string) => build.stats.find((x) => x.stat === name)?.value;
  const fmt = (n?: number) =>
    n == null ? "—" : n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : `${n}`;

  const gemCount = build.skillGroups.reduce((a, g) => a + g.gems.length, 0);
  const main = build.skillGroups[(build.mainSocketGroup ?? 1) - 1] ?? build.skillGroups[0];

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm text-zinc-400">
              Level <span className="text-gold-300 font-semibold">{build.level}</span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">
              {build.ascendClassName || build.className}
            </h2>
            <div className="text-sm text-zinc-400">
              {build.className}
              {build.ascendClassName ? ` · ${build.ascendClassName}` : ""} ·{" "}
              <span className="text-poe-notable">{leveling.damageType} damage</span>
            </div>
          </div>
          {main && (
            <div className="flex items-center gap-3 rounded-lg border border-ink-700 bg-ink-900/60 px-4 py-3">
              {leveling.mainSkill && (
                <Icon q={{ gem: leveling.mainSkill }} alt={leveling.mainSkill} size={44} />
              )}
              <div>
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">Main skill</div>
                <div className="font-semibold text-zinc-100">
                  {leveling.mainSkill ?? main.mainActive ?? "—"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Life" value={fmt(s("Life"))} accent="text-poe-life" />
        <Stat label="Energy Shield" value={fmt(s("EnergyShield"))} accent="text-rarity-magic" />
        <Stat label="Mana" value={fmt(s("Mana"))} accent="text-poe-mana" />
        <Stat label="Total DPS" value={fmt(s("TotalDPS") ?? s("CombinedDPS"))} accent="text-gold-300" />
        <Stat label="Crit Chance" value={s("CritChance") != null ? `${s("CritChance")}%` : "—"} />
        <Stat label="Passives" value={`${build.tree.nodes.length}`} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Fire Res" value={s("FireResist") != null ? `${s("FireResist")}%` : "—"} accent="text-orange-400" />
        <Stat label="Cold Res" value={s("ColdResist") != null ? `${s("ColdResist")}%` : "—"} accent="text-sky-300" />
        <Stat label="Lightning Res" value={s("LightningResist") != null ? `${s("LightningResist")}%` : "—"} accent="text-yellow-300" />
        <Stat label="Chaos Res" value={s("ChaosResist") != null ? `${s("ChaosResist")}%` : "—"} accent="text-fuchsia-400" />
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
        <span className="chip">{build.skillGroups.length} skill groups</span>
        <span className="chip">{gemCount} gems</span>
        <span className="chip">{build.items.length} items</span>
        <span className="chip">Str {fmt(s("Str"))} · Dex {fmt(s("Dex"))} · Int {fmt(s("Int"))}</span>
      </div>
    </div>
  );
}

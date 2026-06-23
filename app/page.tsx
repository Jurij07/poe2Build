"use client";
import { useState } from "react";
import PasteImport from "@/components/PasteImport";
import Tabs from "@/components/Tabs";
import BuildOverview from "@/components/BuildOverview";
import GemsPanel from "@/components/GemsPanel";
import ItemsPanel from "@/components/ItemsPanel";
import SkillTree from "@/components/SkillTree";
import LevelingGuide from "@/components/LevelingGuide";
import type { DecodedBuild } from "@/lib/pob/types";
import type { LevelStage } from "@/lib/leveling/generate";

interface Analysis {
  build: DecodedBuild;
  leveling: { damageType: string; mainSkill?: string; stages: LevelStage[] };
}

export default function Page() {
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [tab, setTab] = useState("overview");

  async function analyze(code: string) {
    setLoading(true);
    setError(undefined);
    try {
      const r = await fetch("/api/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to analyze build.");
      setData(j);
      setTab("overview");
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadExample() {
    setLoading(true);
    setError(undefined);
    try {
      const r = await fetch("/api/example");
      const j = await r.json();
      await analyze(j.code);
    } catch (e: any) {
      setError(String(e));
      setLoading(false);
    }
  }

  const tabs = data
    ? [
        { id: "overview", label: "Overview" },
        { id: "tree", label: "Skill Tree", badge: data.build.tree.nodes.length },
        { id: "gems", label: "Gems & Links", badge: data.build.skillGroups.length },
        { id: "items", label: "Gear", badge: data.build.items.length },
        { id: "leveling", label: "Leveling Guide", badge: data.leveling.stages.length },
      ]
    : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-gold">PoE2</span> Build Leveler
          </h1>
          <p className="text-sm text-zinc-400">
            Endgame Path of Building code → full breakdown + step-by-step leveling guide.
          </p>
        </div>
        {data && (
          <button
            onClick={() => { setData(null); setError(undefined); }}
            className="rounded-lg border border-ink-600 px-4 py-2 text-sm text-zinc-300 hover:border-gold/50 hover:text-gold-300"
          >
            ← New build
          </button>
        )}
      </header>

      {!data ? (
        <>
          <PasteImport
            onAnalyze={analyze}
            onLoadExample={loadExample}
            loading={loading}
            error={error}
          />
          <section className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
            {[
              ["Decode any build", "Reads class, level, the full passive tree, every gem and item straight from the PoB code."],
              ["Real art, like Mobalytics", "Items, skill & support gems and passive nodes render with their actual in-game icons."],
              ["Smart leveling guide", "Auto-staged level 1 → endgame plan: what to allocate, which gems to run, what gear to chase."],
            ].map(([t, d]) => (
              <div key={t} className="card p-4">
                <div className="mb-1 font-semibold text-gold-300">{t}</div>
                <div className="text-xs text-zinc-400">{d}</div>
              </div>
            ))}
          </section>
        </>
      ) : (
        <>
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
          <div className="mt-6">
            {tab === "overview" && <BuildOverview build={data.build} leveling={data.leveling} />}
            {tab === "tree" && <SkillTree allocated={data.build.tree.nodes} />}
            {tab === "gems" && <GemsPanel groups={data.build.skillGroups} />}
            {tab === "items" && <ItemsPanel items={data.build.items} />}
            {tab === "leveling" && (
              <LevelingGuide
                stages={data.leveling.stages}
                mainSkill={data.leveling.mainSkill}
                damageType={data.leveling.damageType}
                finalLevel={Math.max(data.build.level, 30)}
              />
            )}
          </div>
        </>
      )}

      <footer className="mt-16 border-t border-ink-800 pt-6 text-center text-xs text-zinc-600">
        Passive tree data from Path of Building (PoE2). Item / gem art from poe2db.
        Not affiliated with Grinding Gear Games.
      </footer>
    </main>
  );
}

"use client";
import { useState } from "react";

export default function PasteImport({
  onAnalyze,
  onLoadExample,
  loading,
  error,
}: {
  onAnalyze: (code: string) => void;
  onLoadExample: () => void;
  loading: boolean;
  error?: string;
}) {
  const [value, setValue] = useState("");
  const [resolving, setResolving] = useState(false);

  async function submit() {
    const v = value.trim();
    if (!v) return;
    // Allow pasting a pobb.in / pastebin URL instead of a raw code.
    if (/^https?:\/\//i.test(v)) {
      setResolving(true);
      try {
        const r = await fetch(`/api/pob?url=${encodeURIComponent(v)}`);
        const j = await r.json();
        if (j.code) onAnalyze(j.code);
        else onAnalyze(v); // let the decoder surface the error
      } finally {
        setResolving(false);
      }
      return;
    }
    onAnalyze(v);
  }

  const busy = loading || resolving;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="card p-6">
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Path of Building (PoE2) import code
        </label>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste your PoB export code here — or a pobb.in / pastebin link…"
          spellCheck={false}
          className="h-40 w-full resize-y rounded-lg border border-ink-700 bg-ink-900 p-3 font-mono text-xs text-zinc-200 outline-none focus:border-gold/60"
        />
        {error && (
          <p className="mt-2 rounded-md border border-poe-life/40 bg-poe-life/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={submit}
            disabled={busy || !value.trim()}
            className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-ink-950 transition hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Analyzing…" : "Analyze build"}
          </button>
          <button
            onClick={onLoadExample}
            disabled={busy}
            className="rounded-lg border border-ink-600 px-4 py-2 text-sm text-zinc-300 transition hover:border-gold/50 hover:text-gold-300 disabled:opacity-40"
          >
            Load example build
          </button>
          <span className="text-xs text-zinc-500">
            Tip: export from Path of Building (PoE2 fork) → “Copy” → paste here.
          </span>
        </div>
      </div>
    </div>
  );
}

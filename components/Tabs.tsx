"use client";

export interface TabDef {
  id: string;
  label: string;
  badge?: string | number;
}

export default function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-ink-700">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`relative px-4 py-2 text-sm font-medium transition-colors ${
            active === t.id
              ? "text-gold-300"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {t.label}
          {t.badge != null && (
            <span className="ml-2 rounded bg-ink-700 px-1.5 py-0.5 text-xs text-zinc-300">
              {t.badge}
            </span>
          )}
          {active === t.id && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-gold" />
          )}
        </button>
      ))}
    </div>
  );
}

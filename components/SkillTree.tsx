"use client";
import { useEffect, useRef, useState } from "react";
import { getTree, type TreeData } from "@/lib/treeClient";

interface Hover {
  x: number;
  y: number;
  name: string;
  stats: string[];
  kind: string;
}

export default function SkillTree({ allocated }: { allocated: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tree, setTree] = useState<TreeData | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [error, setError] = useState<string>();

  // view state kept in refs so the animation loop reads fresh values
  const view = useRef({ x: 0, y: 0, zoom: 0.06 });
  const drag = useRef<{ on: boolean; px: number; py: number; moved: boolean }>({
    on: false, px: 0, py: 0, moved: false,
  });
  const imgs = useRef<Map<string, HTMLImageElement>>(new Map());
  const dirty = useRef(true);

  const alloc = useRef<Set<string>>(new Set(allocated.map(String)));
  useEffect(() => {
    alloc.current = new Set(allocated.map(String));
    dirty.current = true;
  }, [allocated]);

  useEffect(() => {
    getTree().then(setTree).catch((e) => setError(String(e)));
  }, []);

  // Fit the camera to the allocated nodes once the tree is ready.
  useEffect(() => {
    if (!tree) return;
    fitToAllocated();
    preloadAllocatedIcons();
    dirty.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree]);

  function fitToAllocated() {
    if (!tree) return;
    const ids = [...alloc.current].filter((id) => tree.nodes[id]?.x != null);
    const pts = ids.length
      ? ids.map((id) => tree.nodes[id])
      : Object.values(tree.nodes).filter((n) => n.x != null && !n.asc);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of pts) {
      minX = Math.min(minX, n.x!); maxX = Math.max(maxX, n.x!);
      minY = Math.min(minY, n.y!); maxY = Math.max(maxY, n.y!);
    }
    const cw = canvasRef.current?.clientWidth || 800;
    const ch = canvasRef.current?.clientHeight || 600;
    const pad = 1.25;
    const zoom = Math.min(cw / ((maxX - minX) * pad), ch / ((maxY - minY) * pad));
    view.current = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      zoom: Math.max(0.01, Math.min(zoom, 0.5)),
    };
  }

  function preloadAllocatedIcons() {
    if (!tree) return;
    for (const id of alloc.current) {
      const n = tree.nodes[id];
      if (!n?.icon || imgs.current.has(id)) continue;
      const im = new Image();
      im.onload = () => (dirty.current = true);
      im.src = `/api/icon?art=${encodeURIComponent(n.icon)}`;
      imgs.current.set(id, im);
    }
  }

  // main render loop
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (dirty.current) {
        draw();
        dirty.current = false;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree]);

  function resize() {
    const c = canvasRef.current, wrap = wrapRef.current;
    if (!c || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = wrap.clientWidth * dpr;
    c.height = wrap.clientHeight * dpr;
    c.style.width = wrap.clientWidth + "px";
    c.style.height = wrap.clientHeight + "px";
    const ctx = c.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty.current = true;
  }
  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toScreen(wx: number, wy: number, cw: number, ch: number) {
    const { x, y, zoom } = view.current;
    return [(wx - x) * zoom + cw / 2, (wy - y) * zoom + ch / 2] as const;
  }

  function draw() {
    const c = canvasRef.current;
    if (!c || !tree) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const cw = c.clientWidth, ch = c.clientHeight;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, cw, ch);

    const nodes = tree.nodes;
    const { zoom } = view.current;

    // --- connections ---
    ctx.lineWidth = 1;
    const drawn = new Set<string>();
    for (const [id, n] of Object.entries(nodes)) {
      if (n.x == null || n.asc) continue;
      for (const cId of n.c) {
        const m = nodes[cId];
        if (!m || m.x == null || m.asc) continue;
        const key = id < cId ? id + cId : cId + id;
        if (drawn.has(key)) continue;
        drawn.add(key);
        const both = alloc.current.has(id) && alloc.current.has(cId);
        const [ax, ay] = toScreen(n.x, n.y!, cw, ch);
        const [bx, by] = toScreen(m.x, m.y!, cw, ch);
        ctx.strokeStyle = both ? "rgba(201,162,39,0.85)" : "rgba(70,70,90,0.25)";
        ctx.lineWidth = both ? 2.2 : 1;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }

    // --- nodes ---
    for (const [id, n] of Object.entries(nodes)) {
      if (n.x == null || n.asc) continue;
      const [sx, sy] = toScreen(n.x, n.y!, cw, ch);
      if (sx < -40 || sy < -40 || sx > cw + 40 || sy > ch + 40) continue;
      const allocated = alloc.current.has(id);
      const big = n.kind === "notable" || n.kind === "keystone";
      const r = (n.kind === "keystone" ? 11 : n.kind === "notable" ? 8 : 4) * Math.max(0.6, Math.min(zoom * 14, 1.6));

      if (allocated && big) {
        const im = imgs.current.get(id);
        if (im && im.complete && im.naturalWidth) {
          const s = r * 2.6;
          ctx.save();
          ctx.beginPath();
          ctx.arc(sx, sy, s / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(im, sx - s / 2, sy - s / 2, s, s);
          ctx.restore();
          ctx.lineWidth = 2;
          ctx.strokeStyle = n.kind === "keystone" ? "#e2c044" : "#c9a227";
          ctx.beginPath();
          ctx.arc(sx, sy, s / 2 + 1, 0, Math.PI * 2);
          ctx.stroke();
          continue;
        }
      }
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      if (allocated) {
        ctx.fillStyle = n.kind === "keystone" ? "#e2c044" : n.kind === "notable" ? "#c9a227" : "#d8c98a";
        ctx.shadowColor = "rgba(201,162,39,0.6)";
        ctx.shadowBlur = big ? 10 : 4;
      } else {
        ctx.fillStyle = big ? "#3a3a4a" : "#26262f";
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      if (n.start) {
        ctx.strokeStyle = "#5fb04b";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  // ---- interaction ----
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const cw = c.clientWidth, ch = c.clientHeight;
    const { x, y, zoom } = view.current;
    const wx = (mx - cw / 2) / zoom + x;
    const wy = (my - ch / 2) / zoom + y;
    const nz = Math.max(0.01, Math.min(0.6, zoom * (e.deltaY < 0 ? 1.15 : 0.87)));
    view.current = { zoom: nz, x: wx - (mx - cw / 2) / nz, y: wy - (my - ch / 2) / nz };
    dirty.current = true;
  }
  function onDown(e: React.PointerEvent) {
    drag.current = { on: true, px: e.clientX, py: e.clientY, moved: false };
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    const c = canvasRef.current!;
    if (drag.current.on) {
      const dx = e.clientX - drag.current.px, dy = e.clientY - drag.current.py;
      if (Math.abs(dx) + Math.abs(dy) > 2) drag.current.moved = true;
      view.current.x -= dx / view.current.zoom;
      view.current.y -= dy / view.current.zoom;
      drag.current.px = e.clientX;
      drag.current.py = e.clientY;
      dirty.current = true;
      return;
    }
    if (!tree) return;
    // hover hit-test (allocated + notables only, for speed)
    const rect = c.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const cw = c.clientWidth, ch = c.clientHeight;
    let best: Hover | null = null;
    let bestD = 16 * 16;
    for (const [id, n] of Object.entries(tree.nodes)) {
      if (n.x == null || n.asc) continue;
      if (n.kind === "normal" && !alloc.current.has(id)) continue;
      const [sx, sy] = toScreen(n.x, n.y!, cw, ch);
      const d = (sx - mx) ** 2 + (sy - my) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { x: mx, y: my, name: n.name, stats: n.stats, kind: n.kind };
      }
    }
    setHover(best);
  }
  function onUp(e: React.PointerEvent) {
    drag.current.on = false;
    try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-gold" /> allocated
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-ink-600" /> unallocated
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full ring-2 ring-poe-dex" /> class start
          </span>
          <span className="text-zinc-500">· {allocated.length} points · drag to pan · scroll to zoom</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => { view.current.zoom = Math.min(0.6, view.current.zoom * 1.2); dirty.current = true; }}
            className="rounded border border-ink-600 px-2 py-1 text-xs text-zinc-300 hover:border-gold/50">＋</button>
          <button onClick={() => { view.current.zoom = Math.max(0.01, view.current.zoom * 0.8); dirty.current = true; }}
            className="rounded border border-ink-600 px-2 py-1 text-xs text-zinc-300 hover:border-gold/50">－</button>
          <button onClick={() => { fitToAllocated(); dirty.current = true; }}
            className="rounded border border-ink-600 px-2 py-1 text-xs text-zinc-300 hover:border-gold/50">Fit</button>
        </div>
      </div>

      <div ref={wrapRef} className="relative h-[60vh] min-h-[440px] w-full overflow-hidden rounded-xl border border-ink-700 bg-ink-950">
        {error && <div className="p-4 text-sm text-red-300">{error}</div>}
        {!tree && !error && (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading passive tree…</div>
        )}
        <canvas
          ref={canvasRef}
          onWheel={onWheel}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={() => { drag.current.on = false; setHover(null); }}
          className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        />
        {hover && (
          <div
            style={{ left: Math.min(hover.x + 14, (wrapRef.current?.clientWidth ?? 400) - 240), top: hover.y + 14 }}
            className="pointer-events-none absolute z-10 w-56 rounded-lg border border-ink-600 bg-ink-900/95 p-3 shadow-xl"
          >
            <div className={`text-sm font-semibold ${hover.kind === "keystone" ? "text-gold-300" : "text-zinc-100"}`}>
              {hover.name}
            </div>
            {hover.kind !== "normal" && (
              <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">{hover.kind}</div>
            )}
            <ul className="space-y-0.5">
              {hover.stats.slice(0, 6).map((s, i) => (
                <li key={i} className="text-xs text-zinc-300">{s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

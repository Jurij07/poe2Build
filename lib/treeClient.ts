"use client";
import type { TreeData } from "@/lib/tree/tree";

// Fetch the (static) passive tree once and share it across components.
let cache: Promise<TreeData> | null = null;

export function getTree(): Promise<TreeData> {
  if (!cache) {
    cache = fetch("/api/tree").then((r) => {
      if (!r.ok) throw new Error("Failed to load passive tree");
      return r.json();
    });
  }
  return cache;
}

export type { TreeData };

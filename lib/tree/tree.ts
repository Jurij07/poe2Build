import treeJson from "@/data/poe2tree.json";

export interface TreeNode {
  name: string;
  icon?: string;
  stats: string[];
  c: string[]; // connections (one-directional in source)
  kind: "normal" | "notable" | "keystone" | "jewel" | "attribute";
  x?: number;
  y?: number;
  asc?: string;
  ascStart?: boolean;
  start?: boolean;
}

export interface TreeData {
  tree: string;
  source: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  classStartNodes: Record<string, string>;
  classes: { name: string; ascendancies: string[] }[];
  nodes: Record<string, TreeNode>;
}

export const TREE = treeJson as unknown as TreeData;

let adjacency: Map<string, string[]> | null = null;

/** Undirected adjacency over the whole tree (connections are stored one-way). */
export function getAdjacency(): Map<string, string[]> {
  if (adjacency) return adjacency;
  const adj = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  for (const [id, node] of Object.entries(TREE.nodes)) {
    for (const c of node.c) {
      if (TREE.nodes[c]) {
        link(id, c);
        link(c, id);
      }
    }
  }
  adjacency = new Map([...adj].map(([k, v]) => [k, [...v]]));
  return adjacency;
}

export function startNodeForClass(className: string): string | undefined {
  return TREE.classStartNodes[className];
}

/**
 * Order an allocated set the way you'd travel it while leveling: a breadth-first
 * walk outward from the class start, staying within the allocated subgraph.
 * Notables are pulled slightly earlier when several nodes sit at equal depth.
 */
export function orderAllocation(
  allocated: number[],
  className: string
): string[] {
  const alloc = new Set(allocated.map(String).filter((id) => TREE.nodes[id]));
  const adj = getAdjacency();
  const start = startNodeForClass(className);
  const ordered: string[] = [];
  const visited = new Set<string>();

  const seed = start && alloc.has(start) ? start : [...alloc][0];
  if (!seed) return [];

  // BFS within the allocated subgraph.
  let frontier = [seed];
  visited.add(seed);
  while (frontier.length) {
    // notables first within a depth layer
    frontier.sort((a, b) => rank(a) - rank(b));
    ordered.push(...frontier);
    const next: string[] = [];
    for (const id of frontier) {
      for (const nb of adj.get(id) ?? []) {
        if (alloc.has(nb) && !visited.has(nb)) {
          visited.add(nb);
          next.push(nb);
        }
      }
    }
    frontier = next;
  }
  // Append any allocated nodes not reachable through allocated-only paths.
  for (const id of alloc) if (!visited.has(id)) ordered.push(id);
  return ordered;

  function rank(id: string): number {
    const k = TREE.nodes[id]?.kind;
    if (k === "keystone") return 0;
    if (k === "notable") return 1;
    if (k === "attribute") return 3;
    return 2;
  }
}

export function nodeSummary(id: string) {
  const n = TREE.nodes[id];
  if (!n) return null;
  return { id, name: n.name, kind: n.kind, stats: n.stats, icon: n.icon, asc: n.asc };
}

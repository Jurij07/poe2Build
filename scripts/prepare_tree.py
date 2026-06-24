#!/usr/bin/env python3
"""
Prepare a slimmed Path of Exile 2 passive-tree file for the web app.

Source of truth: Path of Building Community (PoE2 fork) tree data:
  https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/dev/src/TreeData/0_5/tree.json

The tree version must match the live game / Mobalytics, otherwise pasted builds
(whose node ids are version-specific) render as scattered, disconnected nodes.
Patch 0.5.x ("Return of the Ancients" / Runes of Aldur) uses TreeData/0_5.

The full tree (~1.4 MB) carries sprite-sheet packing, dds coords and a lot of
fields we don't need in the browser. This script:
  * precomputes each node's (x, y) from its group + orbit + orbitIndex
  * keeps only the fields the renderer / analyzer use
  * extracts the className -> start-node mapping from `classesStart`

Run:  python3 scripts/prepare_tree.py
Out:  data/poe2tree.json   (+ data/example_alloc.json for the demo build)
"""
import json
import math
import os
import urllib.request

# Tree data version. Bump this (and TREE_URL) when GGG ships a new tree so the
# app keeps matching the live game. 0_5 == patch 0.5.x (Runes of Aldur).
TREE_VERSION = "0_5"
TREE_URL = (
    "https://raw.githubusercontent.com/PathOfBuildingCommunity/"
    f"PathOfBuilding-PoE2/dev/src/TreeData/{TREE_VERSION}/tree.json"
)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", f"_tree_raw_{TREE_VERSION}.json")
OUT = os.path.join(ROOT, "data", "poe2tree.json")
EXAMPLE = os.path.join(ROOT, "data", "example_alloc.json")


def load_raw():
    os.makedirs(os.path.dirname(SRC), exist_ok=True)
    if not os.path.exists(SRC):
        print("downloading tree.json ...")
        urllib.request.urlretrieve(TREE_URL, SRC)
    return json.load(open(SRC))


def main():
    d = load_raw()
    nodes = d["nodes"]
    groups = d["groups"]
    C = d["constants"]
    orbit_radii = C["orbitRadii"]
    angles_by_orbit = C["orbitAnglesByOrbit"]

    # IMPORTANT: a node's `group` field is NOT a direct index into `groups`
    # (in the 0.5 data it is off by one). Build the authoritative node -> group
    # mapping from each group's own `nodes` list instead, so every node is
    # positioned at the true centre of the group that actually contains it.
    # Getting this wrong shifts ~a quarter of nodes to a neighbouring group and
    # makes connected nodes render far apart (long crossing lines).
    node2group = {}
    for gi, g in enumerate(groups):
        if isinstance(g, dict):
            for member in g.get("nodes", []):
                node2group[str(member)] = gi

    def angle_for(orbit, idx):
        arr = (
            angles_by_orbit[str(orbit)]
            if isinstance(angles_by_orbit, dict)
            else angles_by_orbit[orbit]
        )
        return arr[idx % len(arr)] if arr else 0.0

    def pos(nid, n):
        gi = node2group.get(str(nid))
        if gi is None or gi >= len(groups) or not groups[gi]:
            return None
        g = groups[gi]
        orbit = n.get("orbit", 0) or 0
        idx = n.get("orbitIndex", 0) or 0
        r = orbit_radii[orbit] if orbit < len(orbit_radii) else 0
        a = angle_for(orbit, idx)
        # PoE convention: angle 0 points up, increasing clockwise.
        return (round(g["x"] + r * math.sin(a), 1), round(g["y"] - r * math.cos(a), 1))

    slim_nodes = {}
    class_start = {}
    adj = {}
    xs, ys = [], []

    for nid, n in nodes.items():
        if not isinstance(n, dict) or nid == "root":
            continue
        p = pos(nid, n)
        conns = [c["id"] if isinstance(c, dict) else c for c in n.get("connections", [])]
        adj[str(nid)] = [str(c) for c in conns]

        kind = "normal"
        if n.get("isKeystone"):
            kind = "keystone"
        elif n.get("isNotable"):
            kind = "notable"
        elif n.get("isJewelSocket"):
            kind = "jewel"
        elif n.get("isAttribute"):
            kind = "attribute"

        entry = {
            "name": n.get("name"),
            "icon": n.get("icon"),
            "stats": n.get("stats") or [],
            "c": [str(c) for c in conns],
            "kind": kind,
        }
        if p:
            entry["x"], entry["y"] = p[0], p[1]
        asc = n.get("ascendancyName")
        if asc:
            entry["asc"] = asc
            if n.get("isAscendancyStart"):
                entry["ascStart"] = True
        else:
            # bounds only from the main tree (ascendancy clusters sit far away)
            if p:
                xs.append(p[0])
                ys.append(p[1])
        if n.get("classesStart"):
            entry["start"] = True
            for cls in n["classesStart"]:
                class_start[cls] = str(nid)
        slim_nodes[str(nid)] = entry

    # Connections in the source are stored one-directionally; build an
    # undirected adjacency so pathfinding/BFS works in both directions.
    undirected = {k: set(v) for k, v in adj.items()}
    for a, ns in adj.items():
        for b in ns:
            undirected.setdefault(b, set()).add(a)
    adj = {k: sorted(v) for k, v in undirected.items()}

    slim = {
        "tree": f"poe2-{TREE_VERSION.replace('_', '.')}",
        "source": f"PathOfBuilding-PoE2 TreeData/{TREE_VERSION}",
        "bounds": {"minX": min(xs), "maxX": max(xs), "minY": min(ys), "maxY": max(ys)},
        "classStartNodes": class_start,
        "classes": [
            {"name": c.get("name"), "ascendancies": [a["name"] for a in c.get("ascendancies", [])]}
            for c in d["classes"]
        ],
        "nodes": slim_nodes,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(slim, open(OUT, "w"), separators=(",", ":"))
    print(f"wrote {OUT} ({os.path.getsize(OUT)/1024/1024:.2f} MB, {len(slim_nodes)} nodes)")
    print("class start nodes:", class_start)

    # ---- Build a realistic *edge-connected* allocation for the demo build ----
    # The renderer highlights an edge only when BOTH endpoints are allocated, so a
    # spatially-grown (distance-based) allocation looks scattered and disconnected.
    # A real tree is a single connected sub-graph grown along the edges from the
    # class start, so do exactly that: greedily extend the allocated frontier to
    # the adjacent node that best fits the build theme, biasing toward notables and
    # keeping the cluster compact (distance to the nearest allocated node). This
    # guarantees connectivity, so it renders as one continuous gold path.
    start = class_start.get("Ranger")  # Ranger -> Deadeye Lightning Arrow demo
    THEME = (
        "evasion projectile bow dexterity attack speed critical lightning "
        "life accuracy frenzy charge pierce arrow damage"
    ).split()

    def themed(nid):
        n = slim_nodes[nid]
        text = (n.get("name", "") + " " + " ".join(n.get("stats", []))).lower()
        return any(w in text for w in THEME)

    def xy(nid):
        n = slim_nodes[nid]
        return n["x"], n["y"]

    def allocatable(nid):
        n = slim_nodes.get(nid)
        return bool(n) and n.get("x") is not None and not n.get("asc") and not n.get("start")

    order = [start]
    chosen = {start}
    chosen_xy = [xy(start)]
    while len(order) < 95:
        # candidates = edge-neighbours of the allocated set we could travel to next
        cands = set()
        for nid in chosen:
            for nb in adj.get(nid, ()):
                if nb not in chosen and allocatable(nb):
                    cands.add(nb)
        if not cands:
            break

        def score(nid):
            x, y = xy(nid)
            # compactness: distance to the closest already-allocated node
            d = min(math.hypot(x - cx, y - cy) for cx, cy in chosen_xy)
            if slim_nodes[nid]["kind"] in ("notable", "keystone"):
                d -= 650
            if themed(nid):
                d -= 380
            return d

        nxt = min(cands, key=score)
        chosen.add(nxt)
        chosen_xy.append(xy(nxt))
        order.append(nxt)
    json.dump(order, open(EXAMPLE, "w"))
    print(f"wrote {EXAMPLE} ({len(order)} allocated nodes, start={start})")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Prepare a slimmed Path of Exile 2 passive-tree file for the web app.

Source of truth: Path of Building Community (PoE2 fork) tree data:
  https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding-PoE2/dev/src/TreeData/0_3/tree.json

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

TREE_URL = (
    "https://raw.githubusercontent.com/PathOfBuildingCommunity/"
    "PathOfBuilding-PoE2/dev/src/TreeData/0_3/tree.json"
)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "_tree_raw.json")
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

    def angle_for(orbit, idx):
        arr = (
            angles_by_orbit[str(orbit)]
            if isinstance(angles_by_orbit, dict)
            else angles_by_orbit[orbit]
        )
        return arr[idx % len(arr)] if arr else 0.0

    def pos(n):
        gi = n.get("group")
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
        p = pos(n)
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
        "tree": "poe2-0.3",
        "source": "PathOfBuilding-PoE2 TreeData/0_3",
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

    # ---- Build a realistic connected allocation for the demo (Ranger -> Deadeye) ----
    start = class_start.get("Ranger")
    # In PoE2 the class-start nodes sit mid-tree and connect outward in every
    # direction, so edge-following BFS sprays across the whole tree. A real
    # allocation is directional, so grow the demo allocation *spatially* from the
    # start (organic local cluster) with a light bias toward bow/evasion themes.
    THEME = (
        "evasion projectile bow dexterity attack speed critical lightning "
        "life accuracy frenzy charge pierce arrow"
    ).split()

    def themed(nid):
        n = slim_nodes[nid]
        text = (n.get("name", "") + " " + " ".join(n.get("stats", []))).lower()
        return any(w in text for w in THEME)

    candidates = [
        nid
        for nid, n in slim_nodes.items()
        if n.get("x") is not None and not n.get("asc") and not n.get("start")
    ]
    sx, sy = slim_nodes[start]["x"], slim_nodes[start]["y"]
    # nearest distance from each candidate to the currently allocated set
    best = {
        nid: math.hypot(slim_nodes[nid]["x"] - sx, slim_nodes[nid]["y"] - sy)
        for nid in candidates
    }
    order = [start]
    chosen = {start}
    while len(order) < 95 and best:
        # pick the candidate closest to the cluster, with bonuses pulling in
        # notables and on-theme nodes a little sooner
        def score(nid):
            d = best[nid]
            if slim_nodes[nid]["kind"] in ("notable", "keystone"):
                d -= 220
            if themed(nid):
                d -= 160
            return d

        nxt = min(best, key=score)
        del best[nxt]
        if nxt in chosen:
            continue
        chosen.add(nxt)
        order.append(nxt)
        nx, ny = slim_nodes[nxt]["x"], slim_nodes[nxt]["y"]
        for nid in list(best):
            d = math.hypot(slim_nodes[nid]["x"] - nx, slim_nodes[nid]["y"] - ny)
            if d < best[nid]:
                best[nid] = d
    json.dump(order, open(EXAMPLE, "w"))
    print(f"wrote {EXAMPLE} ({len(order)} allocated nodes, start={start})")


if __name__ == "__main__":
    main()

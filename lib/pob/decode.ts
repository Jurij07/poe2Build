import zlib from "node:zlib";
import { XMLParser } from "fast-xml-parser";
import type {
  BuildStat,
  DecodedBuild,
  Gem,
  SkillGroup,
  TreeSpec,
} from "./types";
import { parseItemText } from "./items";

/**
 * A Path of Building export code is URL-safe base64 of a zlib-compressed XML
 * document. Decode it back to the raw XML string.
 */
export function pobCodeToXml(code: string): string {
  const cleaned = code.trim().replace(/\s+/g, "");
  if (!cleaned) throw new Error("Empty import code.");
  // URL-safe base64 -> standard base64
  const b64 = cleaned.replace(/-/g, "+").replace(/_/g, "/");
  let buf: Buffer;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    throw new Error("Code is not valid base64.");
  }
  if (buf.length === 0) throw new Error("Code decoded to no data.");

  const attempts = [zlib.inflateSync, zlib.inflateRawSync, zlib.gunzipSync];
  let out: Buffer | undefined;
  for (const fn of attempts) {
    try {
      out = fn(buf);
      break;
    } catch {
      /* try next */
    }
  }
  if (!out) {
    throw new Error(
      "Could not decompress the code. Make sure you pasted a full Path of Building (PoE2) export code."
    );
  }
  const xml = out.toString("utf8");
  if (!xml.includes("<PathOfBuilding")) {
    throw new Error("Decoded data is not a Path of Building document.");
  }
  return xml;
}

function arr<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

const isSupportName = (name: string) =>
  /\bsupport\b/i.test(name) || /Support$/i.test(name.trim());

/** Parse the allocated passive nodes out of a <Tree> spec. */
function parseTree(treeEl: any): TreeSpec {
  const specEl = treeEl ? arr<any>(treeEl.Spec)[0] : undefined;
  const spec: TreeSpec = { nodes: [] };
  if (!specEl) return spec;
  spec.treeVersion = specEl["@_treeVersion"];
  if (specEl["@_classId"] != null) spec.classId = num(specEl["@_classId"]);
  if (specEl["@_ascendClassId"] != null)
    spec.ascendClassId = num(specEl["@_ascendClassId"]);

  // Preferred: explicit comma-separated node list.
  const nodesAttr: string | undefined = specEl["@_nodes"];
  if (nodesAttr && nodesAttr.trim()) {
    spec.nodes = nodesAttr
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n));
    return spec;
  }

  // Fallback: decode the tree URL (…/passive-skill-tree/<base64url>).
  const url: string | undefined =
    (typeof specEl["#text"] === "string" && specEl["#text"]) ||
    specEl["@_url"] ||
    undefined;
  if (url) {
    try {
      spec.nodes = decodeTreeUrl(url);
    } catch {
      /* leave empty */
    }
  }
  return spec;
}

/** Best-effort decode of a PoE passive-tree share URL into node ids. */
function decodeTreeUrl(url: string): number[] {
  const tail = url.trim().split("/").pop() || "";
  const b64 = tail.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length < 7) return [];
  // [0..3] version, [4] class, [5] ascend, [6] fullscreen flag, then uint16 node ids
  const nodes: number[] = [];
  for (let i = 7; i + 1 < bytes.length; i += 2) {
    nodes.push(bytes.readUInt16BE(i));
  }
  return nodes;
}

function parseSkills(root: any): { groups: SkillGroup[]; mainGroup: number } {
  const skillsEl = root.Skills ?? {};
  // Newer PoB wraps groups in a <SkillSet>; older lists <Skill> directly.
  const activeSet = arr<any>(skillsEl.SkillSet)[0];
  const skillContainer = activeSet ?? skillsEl;
  const skillEls = arr<any>(skillContainer.Skill);
  const mainGroup = num(skillsEl["@_activeSkillSet"] ?? root.Build?.["@_mainSocketGroup"], 1);

  const groups: SkillGroup[] = skillEls.map((sk: any, idx: number) => {
    const gems: Gem[] = arr<any>(sk.Gem).map((g: any) => {
      const name: string =
        g["@_nameSpec"] || g["@_name"] || g["@_skillId"] || "Unknown Gem";
      return {
        name,
        skillId: g["@_skillId"] || g["@_gemId"],
        level: num(g["@_level"], 1),
        quality: num(g["@_quality"], 0),
        enabled: g["@_enabled"] !== "false" && g["@_enabled"] !== "nil",
        isSupport:
          g["@_support"] === "true" ||
          g["@_isSupport"] === "true" ||
          isSupportName(name),
      };
    });
    // Active skill = the non-support gem the group's mainActiveSkill points at.
    const actives = gems.filter((g) => !g.isSupport);
    const mainIdx = num(sk["@_mainActiveSkill"], 1) - 1;
    const mainActive = actives[mainIdx]?.name ?? actives[0]?.name;
    return {
      slot: sk["@_slot"] || undefined,
      label: sk["@_label"] || undefined,
      enabled: sk["@_enabled"] !== "false",
      isMain: idx + 1 === num(root.Build?.["@_mainSocketGroup"], 0),
      mainActive,
      gems,
    };
  });
  return { groups, mainGroup };
}

function parseItems(root: any) {
  const itemsEl = root.Items ?? {};
  const itemEls = arr<any>(itemsEl.Item);
  const items = itemEls
    .map((it: any) => {
      const text: string =
        typeof it === "string" ? it : (it["#text"] ?? "").toString();
      const id = typeof it === "object" ? it["@_id"] : undefined;
      const parsed = parseItemText(text);
      if (!parsed) return null;
      parsed.id = id?.toString();
      return parsed;
    })
    .filter(Boolean) as ReturnType<typeof parseItemText>[];

  // Active item set -> slot mapping.
  const itemSlots: Record<string, string> = {};
  const activeSet =
    arr<any>(itemsEl.ItemSet).find(
      (s: any) => s["@_id"] === itemsEl["@_activeItemSet"]
    ) ?? arr<any>(itemsEl.ItemSet)[0];
  if (activeSet) {
    for (const slot of arr<any>(activeSet.Slot)) {
      const name = slot["@_name"];
      const itemId = slot["@_itemId"];
      if (name && itemId && itemId !== "0") itemSlots[name] = itemId.toString();
    }
  }
  // Annotate each item with its slot.
  for (const [slot, itemId] of Object.entries(itemSlots)) {
    const found = items.find((i) => i!.id === itemId);
    if (found) found.slot = slot;
  }
  return { items: items.filter(Boolean) as NonNullable<typeof items[number]>[], itemSlots };
}

export function decodeBuild(code: string): DecodedBuild {
  const xml = pobCodeToXml(code);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    trimValues: true,
    parseAttributeValue: false,
  });
  const doc = parser.parse(xml);
  const root = doc.PathOfBuilding ?? doc;
  const build = root.Build ?? {};

  const stats: BuildStat[] = arr<any>(build.PlayerStat).map((s: any) => ({
    stat: s["@_stat"],
    value: num(s["@_value"]),
  }));

  const { groups } = parseSkills(root);
  const { items, itemSlots } = parseItems(root);
  const tree = parseTree(root.Tree);

  const notesEl = root.Notes;
  const notes =
    typeof notesEl === "string"
      ? notesEl
      : typeof notesEl?.["#text"] === "string"
        ? notesEl["#text"]
        : undefined;

  return {
    level: num(build["@_level"], 1),
    className: build["@_className"] || "Unknown",
    ascendClassName:
      build["@_ascendClassName"] && build["@_ascendClassName"] !== "None"
        ? build["@_ascendClassName"]
        : undefined,
    mainSocketGroup: num(build["@_mainSocketGroup"], 1),
    stats,
    notes,
    tree,
    skillGroups: groups,
    items,
    itemSlots,
  };
}

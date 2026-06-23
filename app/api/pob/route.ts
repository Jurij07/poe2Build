import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Resolve a pobb.in / pastebin share link to its raw Path of Building code so
 * users can paste a URL instead of the (very long) code itself.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")?.trim();
  if (!url) return Response.json({ error: "Missing url." }, { status: 400 });

  let raw = url;
  try {
    const u = new URL(url);
    if (u.hostname.includes("pobb.in")) {
      const id = u.pathname.replace(/^\/+|\/+$/g, "");
      raw = `https://pobb.in/${id}/raw`;
    } else if (u.hostname.includes("pastebin.com") && !u.pathname.includes("/raw/")) {
      const id = u.pathname.replace(/^\/+/, "");
      raw = `https://pastebin.com/raw/${id}`;
    }
  } catch {
    return Response.json({ error: "Not a valid URL." }, { status: 400 });
  }

  try {
    const res = await fetch(raw, {
      headers: { "user-agent": "Mozilla/5.0 (poe2-build-leveler)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return Response.json({ error: `Source returned ${res.status}.` }, { status: 400 });
    }
    const code = (await res.text()).trim();
    return Response.json({ code });
  } catch {
    return Response.json({ error: "Could not fetch the link." }, { status: 502 });
  }
}

import type { NextRequest } from "next/server";
import { artPathToUrl, resolveByName } from "@/lib/images";

export const runtime = "nodejs";
// Cache resolved images at the edge/browser for a week.
export const revalidate = 604800;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  let url: string | null = null;

  const art = sp.get("art");
  if (art) {
    url = artPathToUrl(art);
  } else {
    const name = sp.get("gem") || sp.get("item") || sp.get("unique");
    if (name) url = await resolveByName(name, sp.get("support") === "1");
  }

  if (!url) {
    return new Response("not found", { status: 404 });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (poe2-build-leveler)",
        referer: "https://poe2db.tw/",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) return new Response("upstream miss", { status: 404 });
    const buf = Buffer.from(await upstream.arrayBuffer());
    return new Response(buf, {
      headers: {
        "content-type": upstream.headers.get("content-type") || "image/webp",
        "cache-control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return new Response("upstream error", { status: 502 });
  }
}

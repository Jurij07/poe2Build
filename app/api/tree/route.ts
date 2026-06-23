import { TREE } from "@/lib/tree/tree";

export const runtime = "nodejs";

// The passive tree is static data; let the browser cache it hard.
export async function GET() {
  return new Response(JSON.stringify(TREE), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=86400, immutable",
    },
  });
}

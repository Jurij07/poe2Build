import type { NextRequest } from "next/server";
import { decodeBuild } from "@/lib/pob/decode";
import { generateLeveling } from "@/lib/leveling/generate";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let code = "";
  try {
    const body = await req.json();
    code = body.code ?? "";
  } catch {
    return Response.json({ error: "Expected JSON body with a `code` field." }, { status: 400 });
  }
  if (!code || typeof code !== "string") {
    return Response.json({ error: "Paste a Path of Building import code." }, { status: 400 });
  }
  try {
    const build = decodeBuild(code);
    const leveling = generateLeveling(build);
    return Response.json({ build, leveling });
  } catch (e: any) {
    return Response.json(
      { error: e?.message || "Failed to decode the build." },
      { status: 400 }
    );
  }
}

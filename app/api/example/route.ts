import { buildExampleCode } from "@/lib/example";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ code: buildExampleCode() });
}

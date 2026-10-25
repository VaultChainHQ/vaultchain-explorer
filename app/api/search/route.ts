import { liveLoaders } from "@/lib/loaders";
import { search } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 200);
  try {
    return Response.json(await search(q, liveLoaders), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ hits: [], notes: ["The network did not answer, so suggestions are unavailable. Press Enter to try a full search."], error: e instanceof Error ? e.message : "error" }, { status: 502 });
  }
}

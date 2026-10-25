import { restBase } from "@/lib/config";
import { isAllowedNodePath } from "@/lib/proxy";

// Read-only proxy to the node REST for client-side widgets: GET only, whitelisted paths.
export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await ctx.params;
  const joined = path.join("/");
  if (!isAllowedNodePath(joined)) return Response.json({ error: "path not allowed" }, { status: 404 });
  const search = new URL(req.url).search;
  try {
    const upstream = await fetch(`${restBase()}/${joined}${search}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
    });
  } catch {
    return Response.json({ error: "node unreachable" }, { status: 502 });
  }
}

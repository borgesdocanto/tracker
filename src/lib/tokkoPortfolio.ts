// lib/tokkoPortfolio.ts — shared Tokko data fetching and stats
import { supabaseAdmin } from "./supabase";

const cache = new Map<string, { data: any[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export async function fetchAllTokkoProps(apiKey: string): Promise<any[]> {
  const cacheKey = "v3:" + apiKey.slice(-8);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  let allProps: any[] = [];
  let nextUrl: string | null =
    `https://www.tokkobroker.com/api/v1/property/?key=${apiKey}&format=json&lang=es_ar&limit=500`;
  while (nextUrl) {
    const r = await fetch(nextUrl);
    if (!r.ok) throw new Error(`Tokko error ${r.status}`);
    const d: any = await r.json();
    allProps = allProps.concat(d.objects || []);
    nextUrl = d.meta?.next ? `https://www.tokkobroker.com${d.meta.next}` : null;
  }
  cache.set(cacheKey, { data: allProps, ts: Date.now() });
  return allProps;
}

export interface TokkoPortfolioStats {
  total: number;
  complete: number;
  incomplete: number;
  stale: number;        // published >90 days (deleted_at proxy)
  missingPhotos: number;
  missingBlueprint: number;
  missingMedia: number;
}

export function computePortfolioStats(props: any[]): TokkoPortfolioStats {
  const now = Date.now();
  const available = props.filter((p: any) => p.status === 2 || p.status === "2");
  let complete = 0, incomplete = 0, stale = 0, missingPhotos = 0, missingBlueprint = 0, missingMedia = 0;

  for (const p of available) {
    const photos = (p.photos || []).filter((ph: any) => !ph.is_blueprint);
    const hasPhotos = photos.length >= 15;
    const hasBlueprint = (p.photos || []).some((ph: any) => ph.is_blueprint);
    const hasVideo = !!(p.videos?.length);
    const hasTour = !!(p.tags?.some((t: any) =>
      t.name?.toLowerCase().includes("360") || t.name?.toLowerCase().includes("tour")
    ));
    const dateStr = p.deleted_at || p.created_at;
    const ageDays = dateStr
      ? Math.floor((now - new Date(dateStr).getTime()) / 86400000)
      : null;
    const isStale = ageDays !== null && ageDays > 90;

    if (isStale) stale++;
    if (!hasPhotos) missingPhotos++;
    if (!hasBlueprint) missingBlueprint++;
    if (!hasVideo && !hasTour) missingMedia++;
    if (hasPhotos && hasBlueprint && (hasVideo || hasTour) && !isStale) complete++;
    else incomplete++;
  }

  return { total: available.length, complete, incomplete, stale, missingPhotos, missingBlueprint, missingMedia };
}

// Get portfolio stats for a given user email — fetches live from Tokko
export async function getAgentTokkoStats(email: string): Promise<TokkoPortfolioStats | null> {
  try {
    const { data: sub } = await supabaseAdmin
      .from("subscriptions").select("team_id").eq("email", email).single();
    if (!sub?.team_id) return null;

    const { data: team } = await supabaseAdmin
      .from("teams").select("tokko_api_key").eq("id", sub.team_id).single();
    if (!team?.tokko_api_key) return null;

    // Find agent's tokko_id
    const { data: agent } = await supabaseAdmin
      .from("tokko_agents").select("tokko_id")
      .eq("team_id", sub.team_id).eq("email", email).maybeSingle();

    const allProps = await fetchAllTokkoProps(team.tokko_api_key);
    // Filter to this agent's properties
    const agentProps = agent?.tokko_id
      ? allProps.filter((p: any) => p.producer?.id === agent.tokko_id)
      : allProps; // fallback: all team props if no tokko_id match

    if (!agentProps.length) return null;
    return computePortfolioStats(agentProps);
  } catch {
    return null;
  }
}

export function formatTokkoSectionForPrompt(stats: TokkoPortfolioStats): string {
  const issues: string[] = [];
  if (stats.missingPhotos > 0) issues.push(`${stats.missingPhotos} sin suficientes fotos (<15)`);
  if (stats.missingBlueprint > 0) issues.push(`${stats.missingBlueprint} sin plano`);
  if (stats.missingMedia > 0) issues.push(`${stats.missingMedia} sin video ni tour 360°`);
  if (stats.stale > 0) issues.push(`${stats.stale} publicadas hace más de 90 días sin actualizar`);

  return `
CARTERA DE PROPIEDADES (Tokko Broker — datos en tiempo real):
- Propiedades disponibles: ${stats.total}
- Fichas completas (fotos+plano+video/360): ${stats.complete} de ${stats.total}
- Fichas incompletas: ${stats.incomplete}${issues.length > 0 ? ` (${issues.join(", ")})` : ""}
- Sin actualizar +90 días: ${stats.stale}
${stats.incomplete > 0 || stats.stale > 0
    ? "⚠ La calidad de las fichas impacta directamente en las consultas recibidas."
    : "✓ Cartera en buen estado."}`;
}

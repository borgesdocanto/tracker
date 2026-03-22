// Sincroniza propiedades y usuarios de Tokko por equipo
// Cada equipo tiene su propia API key guardada en teams.tokko_api_key
import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabase";

export const config = { maxDuration: 300 };

async function syncTeam(teamId: string, apiKey: string): Promise<{ properties: number; users: number; errors: string[] }> {
  const results = { properties: 0, users: 0, errors: [] as string[] };

  // ── Propiedades ──────────────────────────────────────────────────────────
  try {
    let allProps: any[] = [];
    let nextUrl: string | null = `https://www.tokkobroker.com/api/v1/property/?key=${apiKey}&format=json&limit=500&lang=es_ar`;

    while (nextUrl) {
      const r: Response = await fetch(nextUrl);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d: any = await r.json();
      allProps = allProps.concat(d.objects || []);
      nextUrl = d.meta?.next ? `https://www.tokkobroker.com${d.meta.next}` : null;
    }

    const BATCH = 50;
    for (let i = 0; i < allProps.length; i += BATCH) {
      const batch = allProps.slice(i, i + BATCH);
      const rows = batch.map((p: any) => {
        const op = p.operations?.[0];
        const price = op?.prices?.[0];
        const photosCount = (p.photos || []).filter((ph: any) => !ph.is_blueprint).length;
        const daysSinceUpdate = p.last_update
          ? Math.floor((Date.now() - new Date(p.last_update).getTime()) / 86400000)
          : null;
        return {
          tokko_id: p.id,
          team_id: teamId,
          reference_code: p.reference_code || null,
          title: p.publication_title || null,
          address: p.address || null,
          property_type: p.type?.name || null,
          operation_type: op?.operation_type || null,
          status: p.status ?? null,
          price: price?.price || null,
          currency: price?.currency || null,
          photos_count: photosCount,
          days_since_update: daysSinceUpdate,
          producer_id: p.producer?.id || null,
          producer_name: p.producer?.name || null,
          producer_email: p.producer?.email || null,
          branch_id: p.branch?.id || null,
          branch_name: p.branch?.name || null,
          synced_at: new Date().toISOString(),
        };
      });
      await supabaseAdmin.from("tokko_properties").upsert(rows, { onConflict: "tokko_id" });
      results.properties += batch.length;
    }
  } catch (e: any) {
    results.errors.push(`properties: ${e.message}`);
  }

  // ── Usuarios/Agentes ─────────────────────────────────────────────────────
  try {
    const r: Response = await fetch(`https://www.tokkobroker.com/api/v1/user/?key=${apiKey}&format=json&limit=200`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d: any = await r.json();
    const users: any[] = d.objects || [];

    if (users.length > 0) {
      const rows = users.map((u: any) => ({
        tokko_id: u.id,
        team_id: teamId,
        name: u.name,
        email: u.email || null,
        phone: u.phone || u.cellphone || null,
        picture: u.picture || null,
        position: u.position || null,
        branch_id: u.branch?.id || null,
        branch_name: u.branch?.name || null,
        synced_at: new Date().toISOString(),
      }));
      await supabaseAdmin.from("tokko_agents").upsert(rows, { onConflict: "tokko_id" });
      results.users = users.length;
    }
  } catch (e: any) {
    results.errors.push(`users: ${e.message}`);
  }

  return results;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const isVercel = req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
  const isManual = req.headers["x-cron-secret"] === process.env.CRON_SECRET;
  if (!isVercel && !isManual) return res.status(401).json({ error: "No autorizado" });

  // Traer todos los equipos con API key configurada
  const { data: teams } = await supabaseAdmin
    .from("teams")
    .select("id, name, tokko_api_key")
    .not("tokko_api_key", "is", null)
    .eq("status", "active");

  if (!teams?.length) return res.status(200).json({ ok: true, message: "No hay equipos con Tokko configurado" });

  const summary: any[] = [];
  for (const team of teams) {
    const result = await syncTeam(team.id, team.tokko_api_key!);
    summary.push({ team: team.name, ...result });
    console.log(`[tokko-sync] ${team.name}:`, result);
  }

  return res.status(200).json({ ok: true, teams: summary.length, summary });
}

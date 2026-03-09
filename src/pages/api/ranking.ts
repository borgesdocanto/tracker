import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const email = session.user.email;
  const mode = (req.query.mode as string) || "iac_week";

  try {
    // Obtener team_id del usuario
    const { data: me } = await supabaseAdmin
      .from("subscriptions")
      .select("team_id, rank_slug")
      .eq("email", email)
      .single();

    // ── RANKING GLOBAL ──
    // Todos los usuarios con plan activo o en freemium con actividad
    let globalRank = 0;
    let globalTotal = 0;

    if (mode === "iac_week") {
      // Reuniones esta semana desde weekly_stats
      const weekStart = getMonday();
      const { data: global } = await supabaseAdmin
        .from("weekly_stats")
        .select("email, iac")
        .eq("week_start", weekStart)
        .order("iac", { ascending: false });

      globalTotal = global?.length ?? 0;
      const myIdx = global?.findIndex(r => r.email === email) ?? -1;
      globalRank = myIdx >= 0 ? myIdx + 1 : globalTotal + 1;

    } else if (mode === "iac_avg") {
      // Promedio de las últimas 12 semanas
      const { data: allEmails } = await supabaseAdmin
        .from("weekly_stats")
        .select("email, iac")
        .gt("iac", 0);

      // Agrupar por email
      const byEmail: Record<string, number[]> = {};
      for (const row of allEmails ?? []) {
        if (!byEmail[row.email]) byEmail[row.email] = [];
        byEmail[row.email].push(row.iac);
      }
      const averages = Object.entries(byEmail)
        .map(([e, iacs]) => ({ email: e, avg: Math.round(iacs.reduce((a, b) => a + b, 0) / iacs.length) }))
        .sort((a, b) => b.avg - a.avg);

      globalTotal = averages.length;
      const myIdx = averages.findIndex(r => r.email === email);
      globalRank = myIdx >= 0 ? myIdx + 1 : globalTotal + 1;

    } else if (mode === "rank") {
      const RANK_ORDER = ["junior", "corredor", "asesor", "senior", "top_producer", "master_broker"];
      const { data: allRanks } = await supabaseAdmin
        .from("subscriptions")
        .select("email, rank_slug")
        .not("rank_slug", "is", null);

      const sorted = (allRanks ?? [])
        .sort((a, b) => RANK_ORDER.indexOf(b.rank_slug) - RANK_ORDER.indexOf(a.rank_slug));

      globalTotal = sorted.length;
      const myIdx = sorted.findIndex(r => r.email === email);
      globalRank = myIdx >= 0 ? myIdx + 1 : globalTotal + 1;
    }

    // ── RANKING DEL EQUIPO ──
    let teamRank = 0;
    let teamTotal = 0;
    let teamName = "";

    if (me?.team_id) {
      // Obtener miembros del equipo
      const { data: members } = await supabaseAdmin
        .from("subscriptions")
        .select("email, rank_slug")
        .eq("team_id", me.team_id);

      const memberEmails = (members ?? []).map(m => m.email);
      teamTotal = memberEmails.length;

      // Obtener nombre del equipo
      const { data: team } = await supabaseAdmin
        .from("teams")
        .select("agency_name")
        .eq("id", me.team_id)
        .single();
      teamName = team?.agency_name || "Mi equipo";

      if (mode === "iac_week") {
        const weekStart = getMonday();
        const { data: teamStats } = await supabaseAdmin
          .from("weekly_stats")
          .select("email, iac")
          .in("email", memberEmails)
          .eq("week_start", weekStart)
          .order("iac", { ascending: false });

        const myIdx = teamStats?.findIndex(r => r.email === email) ?? -1;
        teamRank = myIdx >= 0 ? myIdx + 1 : teamTotal;

      } else if (mode === "iac_avg") {
        const { data: teamHistory } = await supabaseAdmin
          .from("weekly_stats")
          .select("email, iac")
          .in("email", memberEmails)
          .gt("iac", 0);

        const byEmail: Record<string, number[]> = {};
        for (const row of teamHistory ?? []) {
          if (!byEmail[row.email]) byEmail[row.email] = [];
          byEmail[row.email].push(row.iac);
        }
        const averages = Object.entries(byEmail)
          .map(([e, iacs]) => ({ email: e, avg: Math.round(iacs.reduce((a, b) => a + b, 0) / iacs.length) }))
          .sort((a, b) => b.avg - a.avg);

        const myIdx = averages.findIndex(r => r.email === email);
        teamRank = myIdx >= 0 ? myIdx + 1 : teamTotal;

      } else if (mode === "rank") {
        const RANK_ORDER = ["junior", "corredor", "asesor", "senior", "top_producer", "master_broker"];
        const sorted = (members ?? [])
          .sort((a, b) => RANK_ORDER.indexOf(b.rank_slug) - RANK_ORDER.indexOf(a.rank_slug));
        const myIdx = sorted.findIndex(r => r.email === email);
        teamRank = myIdx >= 0 ? myIdx + 1 : teamTotal;
      }
    }

    return res.status(200).json({
      globalRank,
      globalTotal,
      teamRank,
      teamTotal,
      teamName,
      hasTeam: !!me?.team_id,
      mode,
    });

  } catch (err: any) {
    console.error("Ranking API error:", err?.message);
    return res.status(500).json({ error: "Error al calcular ranking" });
  }
}

function getMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}

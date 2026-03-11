import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase";
import { getOrCreateTeam } from "../../../lib/teams";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const { memberEmail } = req.body;
  if (!memberEmail) return res.status(400).json({ error: "memberEmail requerido" });
  if (memberEmail === session.user.email) return res.status(400).json({ error: "No podés removerte a vos mismo" });

  // Solo owner puede remover
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("team_role, team_id")
    .eq("email", session.user.email)
    .single();

  if (sub?.team_role !== "owner") return res.status(403).json({ error: "Solo el owner puede remover agentes" });

  const team = await getOrCreateTeam(session.user.email, "");

  // Remover agente: limpiar team_id y team_role
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({ team_id: null, team_role: null })
    .eq("email", memberEmail)
    .eq("team_id", team.id);

  if (error) return res.status(500).json({ error: error.message });

  // Contar usuarios restantes incluyendo broker
  const { count: remainingCount } = await supabaseAdmin
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("team_id", team.id);

  const remaining = remainingCount ?? 1; // mínimo 1 (el broker)

  // Obtener max histórico — el precio mínimo no puede bajar de lo que alguna vez tuvo
  const { data: teamData } = await supabaseAdmin
    .from("teams")
    .select("max_agents_ever")
    .eq("id", team.id)
    .single();

  const effectiveMax = Math.max(remaining, teamData?.max_agents_ever ?? 1);

  await supabaseAdmin
    .from("teams")
    .update({ max_agents: remaining })
    .eq("id", team.id);

  // Recalcular precio del broker — llamada interna con CRON_SECRET
  fetch(`${process.env.NEXTAUTH_URL}/api/teams/recalculate-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({ ownerEmail: session.user.email }),
  }).catch(e => console.error("recalculate-plan error:", e));

  return res.status(200).json({ ok: true, remaining });
}

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase";
import { addDays } from "date-fns";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const { memberEmail, confirmed } = req.body;
  if (!memberEmail) return res.status(400).json({ error: "memberEmail requerido" });
  if (memberEmail === session.user.email) return res.status(400).json({ error: "No podés removerte a vos mismo" });

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("team_role, team_id")
    .eq("email", session.user.email)
    .single();

  if (sub?.team_role !== "owner") return res.status(403).json({ error: "Solo el owner puede remover agentes" });
  if (!sub?.team_id) return res.status(400).json({ error: "No tenés un equipo activo" });

  const teamId = sub.team_id;

  // Si no confirmó, devolver aviso primero
  if (!confirmed) {
    return res.status(200).json({
      requiresConfirmation: true,
      warning: `Al remover a este agente:\n• Tendrá 7 días de acceso gratuito, luego deberá contratar plan individual.\n• No podrás volver a invitar a este email por 60 días.`,
    });
  }

  // Verificar que el agente pertenece al equipo
  const { data: memberSub } = await supabaseAdmin
    .from("subscriptions")
    .select("email")
    .eq("email", memberEmail)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!memberSub) return res.status(404).json({ error: "El agente no pertenece a tu equipo" });

  // Remover agente
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({ team_id: null, team_role: null, plan: "free", status: "active" })
    .eq("email", memberEmail)
    .eq("team_id", teamId);

  if (error) return res.status(500).json({ error: error.message });

  // Registrar remoción con bloqueo de 60 días y 7 días free
  const now = new Date();
  await supabaseAdmin.from("team_removals").insert({
    team_id: teamId,
    owner_email: session.user.email,
    removed_email: memberEmail,
    removed_at: now.toISOString(),
    blocked_until: addDays(now, 60).toISOString(),
    free_until: addDays(now, 7).toISOString(),
  });

  // Actualizar created_at del agente removido para darle 7 días desde ahora
  await supabaseAdmin
    .from("subscriptions")
    .update({ created_at: now.toISOString() })
    .eq("email", memberEmail);

  // Actualizar max_agents del equipo
  const { count: remainingCount } = await supabaseAdmin
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId);

  await supabaseAdmin
    .from("teams")
    .update({ max_agents: remainingCount ?? 1 })
    .eq("id", teamId);

  // Recalcular precio
  fetch(`${process.env.NEXTAUTH_URL}/api/teams/recalculate-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.CRON_SECRET}` },
    body: JSON.stringify({ ownerEmail: session.user.email }),
  }).catch(e => console.error("recalculate-plan error:", e));

  return res.status(200).json({ ok: true });
}

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase";
import { syncAndPersist } from "../../../lib/calendarSync";
import { getValidAccessToken } from "../../../lib/googleToken";

export const config = { maxDuration: 60 }; // Vercel max duration

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const { agentEmail } = req.body;
  if (!agentEmail) return res.status(400).json({ error: "agentEmail requerido" });

  // Solo owner o team_leader del mismo equipo
  const { data: requester } = await supabaseAdmin
    .from("subscriptions")
    .select("team_id, team_role")
    .eq("email", session.user.email)
    .single();

  if (!requester?.team_id || !["owner", "team_leader"].includes(requester.team_role))
    return res.status(403).json({ error: "Sin acceso" });

  const { data: agent } = await supabaseAdmin
    .from("subscriptions")
    .select("email, team_id")
    .eq("email", agentEmail)
    .eq("team_id", requester.team_id)
    .single();

  if (!agent) return res.status(404).json({ error: "Agente no encontrado" });

  const accessToken = await getValidAccessToken(agentEmail);
  if (!accessToken) {
    return res.status(200).json({ ok: false, reason: "no_token", message: "El agente no vinculó su Google Calendar aún." });
  }

  try {
    const events = await syncAndPersist(accessToken, agentEmail, agent.team_id, 90);
    return res.status(200).json({ ok: true, synced: events.length });
  } catch (e: any) {
    console.error("[agent-sync] error:", e?.message);
    return res.status(200).json({ ok: false, reason: "sync_error", message: e?.message });
  }
}

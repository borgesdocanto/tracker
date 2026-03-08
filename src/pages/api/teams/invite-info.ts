import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabase";
import { getDisplayName } from "../../../lib/teams";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Token requerido" });

  const { data: inv } = await supabaseAdmin
    .from("team_invitations")
    .select("*, teams(*)")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (!inv) return res.status(404).json({ ok: false, error: "Invitación no encontrada" });

  // Obtener nombre del broker
  const { data: brokerSub } = await supabaseAdmin
    .from("subscriptions")
    .select("name")
    .eq("email", inv.teams.owner_email)
    .single();

  const brokerName = brokerSub?.name || inv.teams.owner_email.split("@")[0];
  const agencyName = inv.teams.agency_name || null;
  const displayName = getDisplayName(
    { id: inv.teams.id, name: inv.teams.name, agencyName, ownerEmail: inv.teams.owner_email, maxAgents: inv.teams.max_agents, createdAt: inv.teams.created_at },
    brokerName
  );

  return res.status(200).json({
    ok: true,
    brokerName,
    agencyName,
    displayName,
  });
}

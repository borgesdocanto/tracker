import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getOrCreateTeam } from "../../../lib/teams";
import { supabaseAdmin } from "../../../lib/supabase";

// Permite que cualquier usuario (incluyendo freemium) inicie su equipo como owner
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("team_role, team_id")
    .eq("email", session.user.email)
    .single();

  // Si ya tiene rol en un equipo, no hacer nada
  if (sub?.team_role) {
    return res.status(200).json({ ok: true, role: sub.team_role });
  }

  const brokerName = session.user.name || session.user.email.split("@")[0];
  const team = await getOrCreateTeam(session.user.email, `Equipo de ${brokerName}`);

  await supabaseAdmin
    .from("subscriptions")
    .update({ team_id: team.id, team_role: "owner" })
    .eq("email", session.user.email);

  return res.status(200).json({ ok: true, role: "owner", teamId: team.id });
}

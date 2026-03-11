import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { isSuperAdmin } from "../../../lib/adminGuard";
import { supabaseAdmin } from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email || !isSuperAdmin(session.user.email))
    return res.status(403).json({ error: "No autorizado" });

  const { teamId } = req.query;
  if (!teamId || typeof teamId !== "string")
    return res.status(400).json({ error: "teamId requerido" });

  const { data: members } = await supabaseAdmin
    .from("subscriptions")
    .select("email, name, avatar, plan, status, team_role, created_at")
    .eq("team_id", teamId)
    .order("team_role", { ascending: true }); // owner primero

  return res.status(200).json({ members: members || [] });
}

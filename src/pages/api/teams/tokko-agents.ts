import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase";

// GET /api/teams/tokko-agents
// Returns Tokko agents from DB that are NOT yet active team members
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).end();

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("team_id, team_role")
    .eq("email", session.user.email)
    .single();

  if (!sub?.team_id || !["owner", "team_leader"].includes(sub.team_role)) {
    return res.status(403).json({ error: "No autorizado" });
  }

  // Get all Tokko agents for this team
  const { data: tokkoAgents } = await supabaseAdmin
    .from("tokko_agents")
    .select("name, email, picture, branch_name")
    .eq("team_id", sub.team_id)
    .not("email", "is", null)
    .order("name");

  if (!tokkoAgents?.length) return res.status(200).json({ agents: [], hasKey: false });

  // Get current active team members emails
  const { data: members } = await supabaseAdmin
    .from("subscriptions")
    .select("email")
    .eq("team_id", sub.team_id);

  const memberEmails = new Set((members || []).map((m: any) => m.email.toLowerCase()));

  // Get pending invitations
  const { data: pending } = await supabaseAdmin
    .from("team_invitations")
    .select("email")
    .eq("team_id", sub.team_id)
    .eq("status", "pending");

  const pendingEmails = new Set((pending || []).map((p: any) => p.email.toLowerCase()));

  // Filter out agents already in team or with pending invite
  const available = tokkoAgents.filter((a: any) => {
    const email = a.email?.toLowerCase();
    return email && !memberEmails.has(email) && !pendingEmails.has(email);
  });

  return res.status(200).json({ agents: available, hasKey: true });
}

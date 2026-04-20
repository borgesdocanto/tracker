import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase";

const DEFAULT_PREFS = {
  recv_agent: true,
  recv_team: true,
  include_self_activity: true,
  include_self_tokko: true,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const email = session.user.email;

  if (req.method === "GET") {
    const { data } = await supabaseAdmin
      .from("subscriptions")
      .select("mail_prefs, team_role")
      .eq("email", email)
      .single();

    const prefs = { ...DEFAULT_PREFS, ...(data?.mail_prefs || {}) };
    return res.status(200).json({ prefs, teamRole: data?.team_role ?? null });
  }

  if (req.method === "PUT") {
    const { recv_agent, recv_team, include_self_activity, include_self_tokko } = req.body;
    const prefs = {
      recv_agent: recv_agent ?? true,
      recv_team: recv_team ?? true,
      include_self_activity: include_self_activity ?? true,
      include_self_tokko: include_self_tokko ?? true,
    };

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({ mail_prefs: prefs })
      .eq("email", email);

    if (error) return res.status(500).json({ error: "Error al guardar" });
    return res.status(200).json({ ok: true, prefs });
  }

  return res.status(405).end();
}

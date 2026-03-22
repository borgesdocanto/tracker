import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).end();

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("team_id, team_role")
    .eq("email", session.user.email)
    .single();

  if (!sub?.team_id || !["owner", "team_leader"].includes(sub.team_role ?? ""))
    return res.status(403).json({ error: "Sin acceso" });

  if (req.method === "GET") {
    const { data: team } = await supabaseAdmin
      .from("teams")
      .select("tokko_api_key")
      .eq("id", sub.team_id)
      .single();

    // Enmascarar la key — solo mostrar últimos 4 caracteres
    const apiKey = team?.tokko_api_key;
    return res.status(200).json({
      apiKey: apiKey ? `${"*".repeat(Math.max(0, apiKey.length - 4))}${apiKey.slice(-4)}` : null,
      hasKey: !!apiKey,
    });
  }

  if (req.method === "POST") {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: "API key requerida" });

    await supabaseAdmin
      .from("teams")
      .update({ tokko_api_key: apiKey })
      .eq("id", sub.team_id);

    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}

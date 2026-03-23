import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase";

// GET /api/agency-info — returns agency name and logo from Tokko branches
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).end();

  // Get team info
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("team_id")
    .eq("email", session.user.email)
    .single();

  if (!sub?.team_id) return res.status(200).json({ agencyName: null, logo: null });

  const { data: team } = await supabaseAdmin
    .from("teams")
    .select("agency_name, tokko_api_key")
    .eq("id", sub.team_id)
    .single();

  const agencyName = team?.agency_name ?? null;

  // If no Tokko key, return just agency name
  if (!team?.tokko_api_key) {
    return res.status(200).json({ agencyName, logo: null });
  }

  // Try to get logo from Tokko branches
  try {
    const r = await fetch(
      `https://www.tokkobroker.com/api/v1/branch/?key=${team.tokko_api_key}&format=json&limit=1`
    );
    if (r.ok) {
      const d = await r.json();
      const branch = d.objects?.[0];
      const logo = branch?.logo_url || branch?.logo || null;
      const name = agencyName || branch?.name || null;
      return res.status(200).json({ agencyName: name, logo });
    }
  } catch { /* silencioso */ }

  return res.status(200).json({ agencyName, logo: null });
}

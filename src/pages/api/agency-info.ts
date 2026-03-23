import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase";

const cache: Record<string, { logo: string | null; ts: number }> = {};
const TTL = 1000 * 60 * 60;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).end();

  const email = session.user.email.toLowerCase().trim();

  // 1. Get team_id
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("team_id")
    .eq("email", email)
    .single();

  if (!sub?.team_id) return res.status(200).json({ logo: null });

  // 2. Get API key
  const { data: team } = await supabaseAdmin
    .from("teams")
    .select("tokko_api_key")
    .eq("id", sub.team_id)
    .single();

  if (!team?.tokko_api_key) return res.status(200).json({ logo: null });

  // 3. Find agent's branch_id — match by team_id AND exact email
  const { data: agents } = await supabaseAdmin
    .from("tokko_agents")
    .select("branch_id, branch_name, email")
    .eq("team_id", sub.team_id)
    .eq("email", email);  // exact match, not ilike

  const agent = agents?.[0];
  const branchId = agent?.branch_id ?? null;

  if (!branchId) return res.status(200).json({ logo: null });

  const cacheKey = `${sub.team_id}:${branchId}`;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.ts < TTL) {
    return res.status(200).json({ logo: cached.logo });
  }

  // 4. Fetch all branches and find the one matching branchId
  try {
    const r = await fetch(
      `https://www.tokkobroker.com/api/v1/branch/?key=${team.tokko_api_key}&format=json&limit=50`
    );
    if (r.ok) {
      const d = await r.json();
      const branches: any[] = d.objects || [];
      const branch = branches.find((b: any) => b.id === branchId || String(b.id) === String(branchId));
      // Try multiple possible logo fields from Tokko API
      const logo = branch?.logo || branch?.logo_url || branch?.picture || branch?.image || null;
      cache[cacheKey] = { logo, ts: Date.now() };
      return res.status(200).json({ logo });
    }
  } catch { /* silencioso */ }

  cache[cacheKey] = { logo: null, ts: Date.now() };
  return res.status(200).json({ logo: null });
}

// Debug temporal — ver qué devuelve Tokko para branches de un equipo
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { isSuperAdmin } from "../../../lib/adminGuard";
import { supabaseAdmin } from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email || !isSuperAdmin(session.user.email)) return res.status(403).end();

  const { teamId } = req.query;
  if (!teamId || typeof teamId !== "string") return res.status(400).json({ error: "teamId requerido" });

  const { data: team } = await supabaseAdmin
    .from("teams")
    .select("tokko_api_key, agency_name, name")
    .eq("id", teamId)
    .single();

  if (!team?.tokko_api_key) return res.status(200).json({ error: "Sin API key" });

  const r = await fetch(`https://www.tokkobroker.com/api/v1/branch/?key=${team.tokko_api_key}&format=json&limit=50`);
  const d = await r.json();

  // Devolver los objetos raw completos para ver todos los campos
  return res.status(200).json({
    agency_name: team.agency_name,
    status: r.status,
    branches: (d.objects || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      display_name: b.display_name,
      logo: b.logo,
      logo_url: b.logo_url,
      picture: b.picture,
      // Todos los campos para encontrar el correcto
      all_keys: Object.keys(b),
    })),
  });
}

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { isSuperAdmin } from "../../../lib/adminGuard";
import { supabaseAdmin } from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email || !isSuperAdmin(session.user.email)) return res.status(403).end();

  const { data: sub } = await supabaseAdmin.from("subscriptions").select("team_id").eq("email", session.user.email).single();
  const { data: team } = await supabaseAdmin.from("teams").select("tokko_api_key").eq("id", sub?.team_id || "").single();
  if (!team?.tokko_api_key) return res.status(400).json({ error: "no api key" });

  const searchData = JSON.stringify({ only_available: "checked" });
  const url = `https://tokkobroker.com/api/v1/property/search/?lang=es_ar&format=json&key=${team.tokko_api_key}&data=${encodeURIComponent(searchData)}`;

  const r = await fetch(url);
  const d = await r.json();
  const p = d.objects?.[0];

  if (!p) return res.status(200).json({ error: "no props", raw: d });

  // Show all keys and values of first property
  return res.status(200).json({
    totalCount: d.count,
    paginates: d.meta,
    firstPropAllKeys: Object.keys(p).sort(),
    // Key fields we care about
    owners: p.owners,
    contact: p.contact,
    client: p.client,
    contacts: p.contacts,
    photos_sample: p.photos?.slice(0, 2),
    operations_sample: p.operations?.slice(0, 1),
    producer: p.producer,
    id: p.id,
    title: p.publication_title,
  });
}

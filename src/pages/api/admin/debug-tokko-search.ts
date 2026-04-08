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

  const key = team.tokko_api_key;

  // Try the search endpoint (note: www.tokkobroker.com)
  const searchData = encodeURIComponent(JSON.stringify({ only_available: "checked" }));
  const searchUrl = `https://www.tokkobroker.com/api/v1/property/search/?lang=es_ar&format=json&key=${key}&data=${searchData}`;

  // Also try the regular endpoint to compare
  const regularUrl = `https://www.tokkobroker.com/api/v1/property/?key=${key}&format=json&lang=es_ar&limit=1`;

  const [searchRes, regularRes] = await Promise.all([
    fetch(searchUrl).then(r => ({ status: r.status, ok: r.ok, data: r.ok ? r.json() : r.text() })).catch(e => ({ error: e.message })),
    fetch(regularUrl).then(r => ({ status: r.status, ok: r.ok, data: r.ok ? r.json() : r.text() })).catch(e => ({ error: e.message })),
  ]);

  const [searchData2, regularData] = await Promise.all([
    (searchRes as any).data,
    (regularRes as any).data,
  ]);

  // Extract interesting fields from first property of each
  const extractFields = (d: any) => {
    const p = d?.objects?.[0];
    if (!p) return { error: "no objects", raw_keys: Object.keys(d || {}) };
    return {
      id: p.id,
      title: p.publication_title,
      all_keys: Object.keys(p).sort(),
      owners: p.owners,
      contact: p.contact,
      client: p.client,
      contacts: p.contacts,
      producer: p.producer,
      photos_count: p.photos?.length,
      photos_sample: p.photos?.slice(0, 1)?.map((ph: any) => Object.keys(ph)),
    };
  };

  return res.status(200).json({
    search: {
      url: searchUrl.replace(key, "***"),
      status: (searchRes as any).status,
      count: searchData2?.count,
      fields: extractFields(searchData2),
    },
    regular: {
      url: regularUrl.replace(key, "***"),
      status: (regularRes as any).status,
      count: regularData?.meta?.total_count,
      fields: extractFields(regularData),
    },
  });
}

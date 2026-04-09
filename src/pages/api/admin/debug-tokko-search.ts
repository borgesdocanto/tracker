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

  // Replicar exactamente el formato de la URL que funciona en Tokko
  const dataObj = {
    filters: [],
    only_available: "checked",
    only_reserved: "undefined",
    only_to_be_cotized: "undefined",
    only_not_available: "undefined",
    with_tags: [],
    without_tags: [],
    with_custom_tags: [],
    with_or_custom_tags: [],
    without_custom_tags: [],
    division_filters: [],
    state_filters: [],
    network: [],
    price_from: "0",
    price_to: "9999999999",
    operation_types: [1, 2],
    property_types: [],
    currency: "USD",
    bounding_box: [],
  };

  const url = `https://www.tokkobroker.com/api/v1/property/search/?lang=es_ar&format=json&key=${key}&data=${JSON.stringify(dataObj)}`;

  try {
    const r = await fetch(url);
    const text = await r.text();

    if (!r.ok) {
      return res.status(200).json({ status: r.status, error: text.slice(0, 500) });
    }

    const d = JSON.parse(text);
    const p = d?.objects?.[0];

    if (!p) return res.status(200).json({ status: r.status, count: d.count, meta: d.meta, raw_sample: text.slice(0, 500) });

    return res.status(200).json({
      status: r.status,
      count: d.count,
      all_keys: Object.keys(p).sort(),
      // Campos de propietario
      owners: p.owners,
      owner: p.owner,
      contacts: p.contacts,
      contact: p.contact,
      client: p.client,
      // Campos conocidos
      producer: p.producer,
      id: p.id,
      title: p.publication_title,
    });
  } catch (e: any) {
    return res.status(200).json({ error: e.message });
  }
}

import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }
  // Query mínimo para mantener Supabase activo
  await supabaseAdmin.from("subscriptions").select("email").limit(1);
  return res.status(200).json({ ok: true, ts: new Date().toISOString() });
}

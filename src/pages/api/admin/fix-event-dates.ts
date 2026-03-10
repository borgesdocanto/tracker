// One-time migration: normalize start_at / end_at from local timezone strings to UTC ISO
import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Super admin only
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();

  // Fetch all events that have timezone offset in start_at (contain + or - after T)
  const { data: events, error } = await supabaseAdmin
    .from("calendar_events")
    .select("id, start_at, end_at")
    .or("start_at.like.%+0%,start_at.like.%+1%,start_at.like.%-0%,start_at.like.%-1%,start_at.like.%-2%,start_at.like.%-3%")
    .limit(5000);

  if (error) return res.status(500).json({ error: error.message });
  if (!events?.length) return res.status(200).json({ fixed: 0, message: "Nothing to fix" });

  let fixed = 0;
  const updates = events.map(e => {
    let start_at = e.start_at;
    let end_at = e.end_at;
    try {
      if (e.start_at && !e.start_at.endsWith("Z")) {
        start_at = new Date(e.start_at).toISOString();
      }
      if (e.end_at && !e.end_at.endsWith("Z")) {
        end_at = new Date(e.end_at).toISOString();
      }
    } catch {}
    return { id: e.id, start_at, end_at };
  });

  // Update in batches of 100
  for (let i = 0; i < updates.length; i += 100) {
    const batch = updates.slice(i, i + 100);
    for (const u of batch) {
      await supabaseAdmin.from("calendar_events").update({ start_at: u.start_at, end_at: u.end_at }).eq("id", u.id);
      fixed++;
    }
  }

  return res.status(200).json({ fixed, total: events.length });
}

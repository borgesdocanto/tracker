import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { getEffectiveEmail } from "../../lib/impersonation";
import { supabaseAdmin } from "../../lib/supabase";

// POST /api/coach-seen — mark all unseen reports as seen
// GET  /api/coach-seen — returns count of unseen reports
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).end();

  const email = getEffectiveEmail(req, session) ?? session.user.email;

  
  if (req.method === "GET") {
    // Count reports where seen_at is null (generated after last seen)
    const { data, error } = await supabaseAdmin
      .from("coach_reports")
      .select("id, period_key, created_at, seen_at")
      .eq("user_email", email)
      .is("seen_at", null)
      .not("advice", "is", null);

    if (error) {
      // Column might not exist yet — return 0 gracefully
      return res.status(200).json({ unseen: 0 });
    }

    return res.status(200).json({ unseen: (data || []).length });
  }

  if (req.method === "POST") {
    // Mark all as seen
    const { error } = await supabaseAdmin
      .from("coach_reports")
      .update({ seen_at: new Date().toISOString() })
      .eq("user_email", email)
      .is("seen_at", null);

    if (error) return res.status(200).json({ ok: true }); // graceful
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}

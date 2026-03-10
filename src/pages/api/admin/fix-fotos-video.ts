import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { isSuperAdmin } from "../../../lib/adminGuard";
import { supabaseAdmin } from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email || !isSuperAdmin(session.user.email))
    return res.status(403).json({ error: "Solo super admin" });

  // Marcar fotos_video como NO productivo en la DB
  const { data, error } = await supabaseAdmin
    .from("calendar_events")
    .update({ is_productive: false })
    .eq("event_type", "fotos_video")
    .eq("is_productive", true)
    .select("google_event_id");

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true, fixed: data?.length ?? 0 });
}

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { isSuperAdmin } from "../../../lib/adminGuard";
import { supabaseAdmin } from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!isSuperAdmin(session?.user?.email)) return res.status(403).json({ error: "Forbidden" });

  const { action, email } = req.body;
  const baseUrl = process.env.NEXTAUTH_URL;
  const secret = process.env.CRON_SECRET;

  // Triggerear deep sync manualmente
  if (action === "trigger_deep_sync") {
    try {
      const res2 = await fetch(`${baseUrl}/api/cron/deep-sync`, {
        method: "POST",
        headers: { "x-cron-secret": secret! },
      });
      const data = await res2.json();
      return res.status(200).json({ ok: true, result: data });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Triggerear email semanal para un usuario específico
  if (action === "send_weekly_email") {
    if (!email) return res.status(400).json({ error: "Email requerido" });
    try {
      const res2 = await fetch(`${baseUrl}/api/cron/weekly-email`, {
        method: "POST",
        headers: {
          "x-cron-secret": secret!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetEmail: email }),
      });
      const data = await res2.json();
      return res.status(200).json({ ok: true, result: data });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Ver logs de sync errors de un usuario
  if (action === "get_sync_errors") {
    if (!email) return res.status(400).json({ error: "Email requerido" });
    const { data } = await supabaseAdmin
      .from("subscriptions")
      .select("email, name, plan, status, google_access_token, google_token_expiry, updated_at")
      .eq("email", email)
      .single();
    return res.status(200).json({ ok: true, user: data });
  }

  return res.status(400).json({ error: "Acción inválida" });
}

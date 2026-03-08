import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).end();

  if (req.method === "POST") {
    await supabaseAdmin
      .from("subscriptions")
      .update({
        onboarding_done: true,
        onboarding_dismissed_at: new Date().toISOString(),
      })
      .eq("email", session.user.email);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}

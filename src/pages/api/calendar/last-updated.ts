// Endpoint liviano para polling — devuelve cuándo fue la última sync del webhook
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).end();

  // Leer timestamp de última sync desde subscriptions
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("last_webhook_sync")
    .eq("email", session.user.email)
    .single();

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    lastUpdated: data?.last_webhook_sync ?? null,
  });
}

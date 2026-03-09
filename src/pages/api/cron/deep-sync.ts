import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabase";
import { syncAndPersist } from "../../../lib/calendarSync";
import { getValidAccessToken } from "../../../lib/googleToken";

// Cron: domingos a las 3am UTC — sync profundo 365 días para todos los usuarios activos
// vercel.json: "0 3 * * 0"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const secret = req.headers["x-cron-secret"] || req.query.secret;
  if (secret !== process.env.CRON_SECRET) return res.status(401).json({ error: "Unauthorized" });

  const startTime = Date.now();
  const results = { synced: 0, skipped: 0, errors: 0, users: [] as string[] };

  try {
    // Traer todos los usuarios activos con token de Google
    const { data: users } = await supabaseAdmin
      .from("subscriptions")
      .select("email, team_id")
      .eq("status", "active")
      .not("google_access_token", "is", null);

    if (!users?.length) return res.status(200).json({ ok: true, ...results });

    for (const user of users) {
      try {
        // Obtener token válido — refresca automáticamente si expiró
        const accessToken = await getValidAccessToken(user.email);
        if (!accessToken) {
          results.skipped++;
          continue;
        }

        // Sync profundo: 365 días
        await syncAndPersist(accessToken, user.email, user.team_id, 365);
        results.synced++;
        results.users.push(user.email);

        // Pausa entre usuarios para no saturar la API de Google
        await new Promise(r => setTimeout(r, 500));
      } catch (err: any) {
        console.error(`Deep sync error for ${user.email}:`, err.message);
        results.errors++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Deep sync completado en ${duration}s:`, results);
    return res.status(200).json({ ok: true, duration: `${duration}s`, ...results });

  } catch (err: any) {
    console.error("Deep sync fatal:", err);
    return res.status(500).json({ error: err.message });
  }
}

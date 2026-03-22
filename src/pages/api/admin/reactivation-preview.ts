import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { isSuperAdmin } from "../../../lib/adminGuard";
import { supabaseAdmin } from "../../../lib/supabase";

const RED = "#aa0000";

function buildReactivationHtml(name: string, streak: number, daysSinceActive: number): string {
  const firstName = name.split(" ")[0];
  const streakAtRisk = streak > 0;

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Te extrañamos — InmoCoach</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 16px;">
  <div style="background:white;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

    <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:24px 28px;">
      <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.5);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;">InmoCoach</div>
      <div style="font-size:22px;font-weight:900;color:white;font-family:Georgia,serif;">
        ${streakAtRisk ? `Tu racha de ${streak} días está en riesgo` : `Hace ${daysSinceActive} días que no agendás`}
      </div>
      <div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:4px;">${firstName}, el negocio inmobiliario no para.</div>
    </div>

    <div style="padding:28px;">
      ${streakAtRisk ? `
      <div style="background:#fef2f2;border-radius:12px;padding:16px 20px;margin-bottom:20px;border:1px solid #fecaca;text-align:center;">
        <div style="font-size:40px;margin-bottom:8px;">🔥</div>
        <div style="font-size:28px;font-weight:900;color:${RED};font-family:Georgia,serif;">${streak} días</div>
        <div style="font-size:13px;color:#991b1b;margin-top:4px;">de racha activa — no la pierdas ahora</div>
      </div>` : `
      <div style="background:#f9fafb;border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center;">
        <div style="font-size:40px;margin-bottom:8px;">📅</div>
        <div style="font-size:28px;font-weight:900;color:#374151;font-family:Georgia,serif;">${daysSinceActive} días</div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px;">sin registrar actividad comercial</div>
      </div>`}

      <p style="font-size:15px;line-height:1.7;color:#374151;margin:0 0 20px;">
        Los agentes que mantienen el hábito de agendar <strong>3 reuniones cara a cara por día</strong> generan resultados predecibles. Los que paran, pierden el ritmo.
      </p>

      <div style="background:#f9fafb;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:12px;">Hoy podés hacer:</div>
        ${["📅 Agendar una tasación o visita", "🤝 Llamar a un cliente que tenés pendiente", "🏠 Generar una nueva captación"].map(item =>
          `<div style="margin-bottom:8px;font-size:13px;color:#4b5563;">${item}</div>`
        ).join("")}
      </div>

      <div style="text-align:center;">
        <a href="https://inmocoach.com.ar"
          style="display:inline-block;background:${RED};color:white;font-weight:900;font-size:14px;padding:14px 36px;border-radius:12px;text-decoration:none;">
          Ver mi dashboard →
        </a>
      </div>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #f3f4f6;text-align:center;font-size:11px;color:#9ca3af;">
      Este mail es automático — no hace falta que respondas. · <a href="https://inmocoach.com.ar" style="color:#9ca3af;text-decoration:none;">inmocoach.com.ar</a>
    </div>
  </div>
</div>
</body></html>`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!isSuperAdmin(session?.user?.email)) return res.status(403).end();

  const email = session!.user!.email!;
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("name, streak_current")
    .eq("email", email)
    .single();

  // Simular 5 días inactivo con racha actual
  const html = buildReactivationHtml(
    sub?.name || email,
    sub?.streak_current ?? 3,
    5
  );

  res.setHeader("Content-Type", "text/html");
  res.status(200).send(html);
}

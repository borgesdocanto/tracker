interface WeeklyReportData {
  userName: string;
  email: string;
  weekDates: string;          // "2 al 8 de junio"
  greenTotal: number;
  tasaciones: number;
  visitas: number;
  propuestas: number;
  productiveDays: number;
  totalDays: number;
  productivityRate: number;
  coachAdvice: string;        // generado por Claude
  planName: string;
  isExpiringSoon?: boolean;   // freemium últimos 2 días
  daysLeft?: number;
}

export function generateWeeklyEmailHtml(data: WeeklyReportData): string {
  const {
    userName, weekDates, greenTotal, tasaciones, visitas, propuestas,
    productiveDays, totalDays, productivityRate, coachAdvice,
    planName, isExpiringSoon, daysLeft,
  } = data;

  const firstName = userName?.split(" ")[0] ?? "Inmobiliario";
  const rateColor = productivityRate >= 60 ? "#16a34a" : productivityRate >= 40 ? "#d97706" : "#dc2626";
  const rateLabel = productivityRate >= 60 ? "Excelente semana" : productivityRate >= 40 ? "Semana en construcción" : "Semana para activar";

  const expireBanner = isExpiringSoon ? `
    <tr>
      <td style="background:#fff7ed;border-left:4px solid #f97316;padding:16px 24px;border-radius:0 12px 12px 0;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;font-weight:700;color:#c2410c;">
          ⏰ Te quedan ${daysLeft} día${daysLeft === 1 ? "" : "s"} de prueba gratuita.
          Después de eso, tu acceso se pausa. Seguí recibiendo este informe cada lunes →
          <a href="https://instacoach.app/pricing" style="color:#0ea5e9;text-decoration:underline;">Activá tu plan</a>
        </p>
      </td>
    </tr>
  ` : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu informe semanal — InstaCoach</title>
</head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0ea5e9,#0369a1);border-radius:24px 24px 0 0;padding:32px;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:28px;font-weight:900;color:#fff;letter-spacing:-1px;">
                Insta<span style="color:#bae6fd;">Coach</span>
              </p>
              <p style="margin:0;font-size:12px;color:#bae6fd;font-weight:600;letter-spacing:2px;text-transform:uppercase;">
                Tu informe semanal
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="background:#fff;padding:28px 32px 8px;">
              <p style="margin:0 0 4px;font-size:22px;font-weight:900;color:#0f172a;">
                Hola, ${firstName}!
              </p>
              <p style="margin:0;font-size:14px;color:#64748b;font-weight:500;">
                Semana del ${weekDates} · Plan ${planName}
              </p>
            </td>
          </tr>

          <!-- Expire banner if needed -->
          ${expireBanner ? `<tr><td style="background:#fff;padding:8px 32px;">${expireBanner}</td></tr>` : ""}

          <!-- Productivity rate -->
          <tr>
            <td style="background:#fff;padding:20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f8fafc;border-radius:16px;padding:20px;">
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                      Productividad de la semana
                    </p>
                    <p style="margin:0;font-size:42px;font-weight:900;color:${rateColor};line-height:1;">
                      ${productivityRate}%
                    </p>
                    <p style="margin:4px 0 0;font-size:13px;font-weight:700;color:${rateColor};">
                      ${rateLabel} — ${productiveDays} de ${totalDays} días productivos
                    </p>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <div style="background:#0ea5e9;border-radius:12px;padding:12px 16px;display:inline-block;text-align:center;">
                      <p style="margin:0;font-size:28px;font-weight:900;color:#fff;line-height:1;">${greenTotal}</p>
                      <p style="margin:4px 0 0;font-size:10px;font-weight:700;color:#bae6fd;text-transform:uppercase;letter-spacing:1px;">eventos verdes</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- KPIs -->
          <tr>
            <td style="background:#fff;padding:0 32px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="padding:0 4px 0 0;">
                    <table width="100%" style="background:#f0f9ff;border-radius:14px;padding:16px;text-align:center;">
                      <tr><td>
                        <p style="margin:0;font-size:32px;font-weight:900;color:#0ea5e9;">${tasaciones}</p>
                        <p style="margin:4px 0 0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Tasaciones</p>
                      </td></tr>
                    </table>
                  </td>
                  <td width="33%" style="padding:0 2px;">
                    <table width="100%" style="background:#f0f9ff;border-radius:14px;padding:16px;text-align:center;">
                      <tr><td>
                        <p style="margin:0;font-size:32px;font-weight:900;color:#0ea5e9;">${visitas}</p>
                        <p style="margin:4px 0 0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Visitas</p>
                      </td></tr>
                    </table>
                  </td>
                  <td width="33%" style="padding:0 0 0 4px;">
                    <table width="100%" style="background:#f0f9ff;border-radius:14px;padding:16px;text-align:center;">
                      <tr><td>
                        <p style="margin:0;font-size:32px;font-weight:900;color:#0ea5e9;">${propuestas}</p>
                        <p style="margin:4px 0 0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Propuestas</p>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Insta Coach advice -->
          <tr>
            <td style="background:#fff;padding:0 32px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:20px;padding:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:2px;">
                      ⚡ Insta Coach
                    </p>
                    <p style="margin:0;font-size:15px;color:#e2e8f0;line-height:1.7;font-weight:500;">
                      ${coachAdvice.replace(/\n/g, "<br>")}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="background:#fff;padding:0 32px 32px;text-align:center;">
              <a href="https://instacoach.com.ar"
                style="display:inline-block;background:#aa0000;color:#fff;font-weight:900;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.5px;">
                Ver mi dashboard completo →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 20px 20px;padding:24px 32px;text-align:center;">
              <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:15px;font-weight:900;color:#111827;">Insta<span style="color:#aa0000;">Coach</span></p>
              <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;line-height:1.6;">
                Este es un email automático — por favor no respondas este mensaje.<br/>
                Para consultas escribí a <a href="mailto:hola@instacoach.com.ar" style="color:#aa0000;text-decoration:none;">hola@instacoach.com.ar</a>
              </p>
              <p style="margin:0;font-size:11px;color:#d1d5db;">
                Recibís este mail porque usás InstaCoach · <a href="https://instacoach.com.ar" style="color:#9ca3af;text-decoration:none;">instacoach.com.ar</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

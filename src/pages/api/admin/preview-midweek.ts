import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { isSuperAdmin } from "../../../lib/adminGuard";

// Inline the buildHtml and helpers from midweek-alert to avoid circular imports
const RED = "#aa0000";

const CONGRATS_MESSAGES = [
  { emoji: "✦", text: "Tu cartera está impecable. Fotos, planos, videos — todo completo y actualizado. Eso se nota en las consultas." },
  { emoji: "🏆", text: "Fichas perfectas. Los compradores ven lo que necesitan para tomar decisiones. Así se genera confianza antes de la visita." },
  { emoji: "⭐", text: "Tu cartera habla bien de vos. Fichas completas y al día — una ventaja real sobre el mercado." },
  { emoji: "✅", text: "Todo en orden en Tokko. Fotos, plano, video y actualizado. El 80% de los agentes no llega a este nivel. Vos sí." },
  { emoji: "🎯", text: "Cartera perfecta esta semana. Cada ficha tiene lo que un comprador necesita para dar el paso. Ese trabajo silencioso genera resultados." },
  { emoji: "💎", text: "Tus propiedades están listas para vender. Ficha completa y actualizada — la base de toda operación que se cierra rápido." },
];

function weeklyCongratsMessage() {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return CONGRATS_MESSAGES[weekNum % CONGRATS_MESSAGES.length];
}

function buildMidweekHtml(params: {
  firstName: string;
  greenCount: number;
  minGreens: number;
  weeklyGoal: number;
  advice: string;
  tokkoTotal?: number;
  tokkoNeedAction?: number;
  tokkoTop3?: { title: string; address: string; issues: string[]; editUrl: string }[];
}): string {
  const { firstName, greenCount, minGreens, weeklyGoal, advice, tokkoTotal, tokkoNeedAction, tokkoTop3 } = params;
  const pct = Math.min(100, Math.round((greenCount / minGreens) * 100));
  const barColor = pct >= 100 ? "#16a34a" : pct >= 50 ? "#d97706" : RED;
  const missing = Math.max(0, minGreens - greenCount);
  const adviceParts = advice.split(/\n\n+/).filter(Boolean);

  const { emoji: congratsEmoji, text: congratsText } = weeklyCongratsMessage();

  const tokkoCongrats = tokkoTotal ? `
        <tr>
          <td style="padding:0 32px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;">
              <tr><td>
                <p style="margin:0 0 6px;font-size:22px;">${congratsEmoji}</p>
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#166534;">Cartera en orden</p>
                <p style="margin:0;font-size:13px;color:#15803d;line-height:1.6;">${congratsText}</p>
              </td></tr>
            </table>
          </td>
        </tr>` : "";

  const tokkoProblems = (tokkoTotal !== undefined && (tokkoNeedAction ?? 0) > 0 && tokkoTop3?.length) ? `
        <tr>
          <td style="padding:0 32px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="background:#111827;padding:14px 20px;">
                  <p style="margin:0;font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:2px;">🏠 Cartera Tokko</p>
                  <p style="margin:4px 0 0;font-size:14px;color:#fff;">
                    <span style="font-family:Georgia,serif;font-size:24px;font-weight:900;color:#aa0000;">${tokkoNeedAction}</span>
                    de ${tokkoTotal} propiedades necesitan atención
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:0;">
                  ${(tokkoTop3 || []).map((prop, idx) => `
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f3f4f6;">
                    <tr>
                      <td style="padding:12px 20px;">
                        <p style="margin:0;font-size:12px;font-weight:700;color:#111827;">${idx + 1}. ${prop.title}</p>
                        ${prop.address ? `<p style="margin:2px 0 6px;font-size:11px;color:#9ca3af;">${prop.address}</p>` : ""}
                        <p style="margin:0 0 8px;">
                          ${prop.issues.map(issue => `<span style="display:inline-block;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700;color:#aa0000;margin:0 4px 4px 0;">${issue}</span>`).join("")}
                        </p>
                        <a href="${prop.editUrl}" style="font-size:11px;color:#aa0000;font-weight:700;text-decoration:none;">Editar en Tokko →</a>
                      </td>
                    </tr>
                  </table>`).join("")}
                </td>
              </tr>
            </table>
          </td>
        </tr>` : "";

  const tokkoSection = (tokkoNeedAction ?? 0) > 0 ? tokkoProblems : tokkoCongrats;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>A mitad de semana — InmoCoach</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Barra roja -->
        <tr><td style="background:#aa0000;height:5px;border-radius:12px 12px 0 0;font-size:0;">&nbsp;</td></tr>

        <!-- Header -->
        <tr>
          <td style="background:#fff;padding:24px 32px 16px;border-bottom:1px solid #f3f4f6;">
            <p style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:900;color:#111827;">
              Inmo<span style="color:#aa0000;">Coach</span>
            </p>
            <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Alerta de mitad de semana</p>
          </td>
        </tr>

        <!-- Saludo -->
        <tr>
          <td style="background:#fff;padding:20px 32px 16px;">
            <p style="margin:0;font-family:Georgia,serif;font-size:18px;font-weight:900;color:#111827;">
              Hola, ${firstName}. Estamos a mitad de semana.
            </p>
          </td>
        </tr>

        <!-- KPIs -->
        <tr>
          <td style="background:#fff;padding:0 28px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="padding:0 4px;">
                <table width="100%" cellpadding="0" cellspacing="0"
                  style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:16px 12px;text-align:center;">
                  <tr><td>
                    <p style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:900;color:#111827;">${greenCount}</p>
                    <p style="margin:5px 0 0;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Reuniones lun–hoy</p>
                  </td></tr>
                </table>
              </td>
              <td style="padding:0 4px;">
                <table width="100%" cellpadding="0" cellspacing="0"
                  style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:16px 12px;text-align:center;">
                  <tr><td>
                    <p style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:900;color:${barColor};">${missing > 0 ? missing : "✓"}</p>
                    <p style="margin:5px 0 0;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">${missing > 0 ? "Para llegar al mínimo" : "Objetivo cumplido"}</p>
                  </td></tr>
                </table>
              </td>
              <td style="padding:0 4px;">
                <table width="100%" cellpadding="0" cellspacing="0"
                  style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:16px 12px;text-align:center;">
                  <tr><td>
                    <p style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:900;color:#111827;">${weeklyGoal}</p>
                    <p style="margin:5px 0 0;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Meta semanal</p>
                  </td></tr>
                </table>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Barra progreso -->
        <tr>
          <td style="background:#fff;padding:0 32px 20px;">
            <div style="background:#f3f4f6;border-radius:8px;height:10px;overflow:hidden;">
              <div style="background:${barColor};height:10px;width:${pct}%;border-radius:8px;"></div>
            </div>
            <p style="margin:6px 0 0;font-size:11px;color:${barColor};font-weight:700;text-align:right;">${pct}% del mínimo para el miércoles</p>
          </td>
        </tr>

        <!-- Coach -->
        <tr>
          <td style="background:#fff;padding:0 32px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#111827;border-radius:12px;padding:18px 20px;">
              <tr><td>
                <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px;">Inmo<span style="color:#aa0000;">Coach</span></p>
                ${adviceParts.map(p => `<p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#fff;font-style:italic;">${p.trim()}</p>`).join("")}
              </td></tr>
            </table>
          </td>
        </tr>

        ${tokkoSection}

        <!-- CTA -->
        <tr>
          <td style="background:#fff;padding:0 32px 32px;text-align:center;">
            <a href="https://inmocoach.com.ar"
              style="display:inline-block;background:#aa0000;color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
              Ver mi dashboard →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-family:Georgia,serif;font-size:13px;color:#111827;">Inmo<span style="color:#aa0000;">Coach</span></p>
            <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">Mail automático · <a href="https://inmocoach.com.ar" style="color:#9ca3af;">inmocoach.com.ar</a></p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email || !isSuperAdmin(session.user.email)) return res.status(403).end();

  const caso = req.query.caso as string || "problems";
  const firstName = "Leandro";
  const advice = "Llegaste a mitad de semana con actividad real. Ese ritmo es el que separa al que cierra del que espera. Hoy y mañana son tus dos días para llegar al objetivo — agendá tres reuniones más antes del jueves y terminás la semana con números que importan.";

  if (caso === "congrats") {
    // Caso: cartera perfecta
    const html = buildMidweekHtml({
      firstName,
      greenCount: 7,
      minGreens: 6,
      weeklyGoal: 12,
      advice,
      tokkoTotal: 18,
      tokkoNeedAction: 0,
      tokkoTop3: [],
    });
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(html);
  }

  // Caso: con problemas (default)
  const html = buildMidweekHtml({
    firstName,
    greenCount: 3,
    minGreens: 6,
    weeklyGoal: 12,
    advice,
    tokkoTotal: 18,
    tokkoNeedAction: 7,
    tokkoTop3: [
      {
        title: "PH 3 ambientes en venta",
        address: "Av. Rivadavia 4521, Castelar",
        issues: ["4/15 fotos", "sin plano", "sin video/tour"],
        editUrl: "https://www.tokkobroker.com/property/123456/",
      },
      {
        title: "Casa 4 ambientes con jardín",
        address: "Belgrano 890, Ituzaingó",
        issues: ["+127 días sin editar", "sin video/tour"],
        editUrl: "https://www.tokkobroker.com/property/234567/",
      },
      {
        title: "Departamento 2 ambientes",
        address: "Mitre 340, Morón",
        issues: ["8/15 fotos", "sin plano"],
        editUrl: "https://www.tokkobroker.com/property/345678/",
      },
    ],
  });
  res.setHeader("Content-Type", "text/html");
  return res.status(200).send(html);
}

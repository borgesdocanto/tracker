// lib/teamEmailTemplate.ts — Email semanal para brokers y team leaders

interface AgentRow {
  name: string;
  email: string;
  role: string; // "owner" | "team_leader" | "member"
  iac: number;           // 0-100
  greenTotal: number;
  productiveDays: number;
  totalDays: number;
  tokkoTotal?: number;
  tokkoIncomplete?: number;
  tokkoStale?: number;
  isSelf: boolean;
}

interface TeamEmailData {
  recipientName: string;
  recipientEmail: string;
  recipientRole: string;  // "owner" | "team_leader"
  weekDates: string;
  agents: AgentRow[];
  includeSelfActivity: boolean;
  includeSelfTokko: boolean;
  weeklyGoal: number;
}

const RED = "#aa0000";
const ORANGE = "#d97706";
const GREEN = "#16a34a";
const GRAY = "#9ca3af";

function iacColor(iac: number): string {
  if (iac >= 70) return GREEN;
  if (iac >= 40) return ORANGE;
  return RED;
}

function iacLabel(iac: number): string {
  if (iac >= 70) return "✓ Activo";
  if (iac >= 40) return "⚡ En desarrollo";
  return "⚠ Bajo";
}

function tokkoAlert(incomplete: number, stale: number): string {
  const issues: string[] = [];
  if (incomplete > 0) issues.push(`${incomplete} incompleta${incomplete > 1 ? "s" : ""}`);
  if (stale > 0) issues.push(`${stale} sin actualizar`);
  if (!issues.length) return `<span style="color:${GREEN};font-weight:600;">✓ OK</span>`;
  return `<span style="color:${RED};font-weight:600;">⚠ ${issues.join(", ")}</span>`;
}

export function generateTeamEmailHtml(data: TeamEmailData): string {
  const {
    recipientName, recipientRole, weekDates, agents,
    includeSelfActivity, includeSelfTokko, weeklyGoal,
  } = data;

  const firstName = recipientName.split(" ")[0] || "Broker";
  const roleLabel = recipientRole === "owner" ? "Broker" : "Team Leader";

  // Separar self vs team
  const self = agents.find(a => a.isSelf);
  const teamMembers = agents.filter(a => !a.isSelf);

  // Alertas de actividad baja
  const lowActivity = teamMembers.filter(a => a.iac < 40);
  const highActivity = teamMembers.filter(a => a.iac >= 70);

  // Alertas de fichas
  const withTokkoIssues = agents.filter(a =>
    (a.tokkoIncomplete || 0) + (a.tokkoStale || 0) > 0
  );

  const alertBanner = lowActivity.length > 0 ? `
    <tr>
      <td style="padding:0 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#fff8f8;border:1px solid #fca5a5;border-radius:12px;padding:16px 20px;">
          <tr><td>
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:${RED};text-transform:uppercase;letter-spacing:0.5px;">
              🔴 Agentes con actividad baja esta semana
            </p>
            ${lowActivity.map(a => `
              <p style="margin:4px 0 0;font-size:13px;color:#374151;">
                <strong>${a.name}</strong> — IAC ${a.iac}% (${a.greenTotal} de ${weeklyGoal} reuniones)
              </p>
            `).join("")}
          </td></tr>
        </table>
      </td>
    </tr>
  ` : "";

  const tokkoBanner = withTokkoIssues.length > 0 ? `
    <tr>
      <td style="padding:0 32px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:16px 20px;">
          <tr><td>
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:${ORANGE};text-transform:uppercase;letter-spacing:0.5px;">
              🟡 Fichas de propiedades incompletas
            </p>
            ${withTokkoIssues.map(a => {
              const issues: string[] = [];
              if ((a.tokkoIncomplete || 0) > 0) issues.push(`${a.tokkoIncomplete} incompleta${(a.tokkoIncomplete || 0) > 1 ? "s" : ""}`);
              if ((a.tokkoStale || 0) > 0) issues.push(`${a.tokkoStale} sin actualizar`);
              const tag = a.isSelf ? " (vos)" : "";
              return `
                <p style="margin:4px 0 0;font-size:13px;color:#374151;">
                  <strong>${a.name}${tag}</strong> — ${issues.join(", ")} de ${a.tokkoTotal ?? "?"} propiedades
                </p>
              `;
            }).join("")}
          </td></tr>
        </table>
      </td>
    </tr>
  ` : "";

  // Tabla de agentes
  const agentRows = (rows: AgentRow[]) => rows.map(a => {
    const color = iacColor(a.iac);
    const showTokko = !a.isSelf || includeSelfTokko;
    const showActivity = !a.isSelf || includeSelfActivity;
    return `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:10px 0;font-size:13px;color:#111827;font-weight:600;">
          ${a.name}
          ${a.role === "owner" ? `<span style="font-size:10px;color:${GRAY};font-weight:400;margin-left:4px;">Broker</span>` : ""}
          ${a.role === "team_leader" ? `<span style="font-size:10px;color:${GRAY};font-weight:400;margin-left:4px;">Team Leader</span>` : ""}
        </td>
        <td style="padding:10px 8px;text-align:center;">
          ${showActivity ? `
            <span style="font-size:14px;font-weight:900;color:${color};">${a.iac}%</span>
            <span style="display:block;font-size:10px;color:${color};font-weight:600;">${iacLabel(a.iac)}</span>
          ` : `<span style="font-size:11px;color:${GRAY};">—</span>`}
        </td>
        <td style="padding:10px 8px;text-align:center;font-size:12px;color:#6b7280;">
          ${showActivity ? `${a.greenTotal} reuniones / ${a.productiveDays}d prod.` : "—"}
        </td>
        <td style="padding:10px 0;text-align:right;font-size:12px;">
          ${showTokko && a.tokkoTotal !== undefined
            ? tokkoAlert(a.tokkoIncomplete || 0, a.tokkoStale || 0)
            : `<span style="color:${GRAY};">—</span>`
          }
        </td>
      </tr>
    `;
  }).join("");

  const selfSection = self && (includeSelfActivity || includeSelfTokko) ? `
    <tr>
      <td style="background:#ffffff;padding:0 32px 8px;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">
          Tu actividad
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <thead>
            <tr>
              <th style="text-align:left;font-size:10px;color:${GRAY};font-weight:600;text-transform:uppercase;padding-bottom:8px;">Agente</th>
              <th style="text-align:center;font-size:10px;color:${GRAY};font-weight:600;text-transform:uppercase;padding-bottom:8px;">IAC</th>
              <th style="text-align:center;font-size:10px;color:${GRAY};font-weight:600;text-transform:uppercase;padding-bottom:8px;">Actividad</th>
              <th style="text-align:right;font-size:10px;color:${GRAY};font-weight:600;text-transform:uppercase;padding-bottom:8px;">Fichas Tokko</th>
            </tr>
          </thead>
          <tbody>${agentRows([self])}</tbody>
        </table>
      </td>
    </tr>
    <tr><td style="background:#ffffff;padding:0 32px 24px;"><div style="height:1px;background:#f3f4f6;"></div></td></tr>
  ` : "";

  const teamSection = teamMembers.length > 0 ? `
    <tr>
      <td style="background:#ffffff;padding:0 32px 8px;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">
          Tu equipo (${teamMembers.length} agente${teamMembers.length > 1 ? "s" : ""})
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <thead>
            <tr>
              <th style="text-align:left;font-size:10px;color:${GRAY};font-weight:600;text-transform:uppercase;padding-bottom:8px;">Agente</th>
              <th style="text-align:center;font-size:10px;color:${GRAY};font-weight:600;text-transform:uppercase;padding-bottom:8px;">IAC</th>
              <th style="text-align:center;font-size:10px;color:${GRAY};font-weight:600;text-transform:uppercase;padding-bottom:8px;">Actividad</th>
              <th style="text-align:right;font-size:10px;color:${GRAY};font-weight:600;text-transform:uppercase;padding-bottom:8px;">Fichas Tokko</th>
            </tr>
          </thead>
          <tbody>${agentRows(teamMembers)}</tbody>
        </table>
      </td>
    </tr>
    <tr><td style="background:#ffffff;padding:0 32px 32px;"></td></tr>
  ` : "";

  // Resumen global
  const avgIac = teamMembers.length > 0
    ? Math.round(teamMembers.reduce((s, a) => s + a.iac, 0) / teamMembers.length)
    : 0;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumen de equipo — InmoCoach</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Barra roja superior -->
        <tr>
          <td style="background:${RED};height:5px;border-radius:12px 12px 0 0;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Header -->
        <tr>
          <td style="background:#ffffff;padding:28px 32px 20px;border-bottom:1px solid #f3f4f6;">
            <p style="margin:0;font-family:Georgia,serif;font-size:26px;font-weight:900;color:#111827;line-height:1;">
              Inmo<span style="color:${RED};">Coach</span>
            </p>
            <p style="margin:6px 0 0;font-size:12px;color:${GRAY};font-weight:500;letter-spacing:0.5px;">
              Resumen de equipo · ${weekDates}
            </p>
          </td>
        </tr>

        <!-- Saludo -->
        <tr>
          <td style="background:#ffffff;padding:24px 32px 20px;">
            <p style="margin:0;font-family:Georgia,serif;font-size:20px;font-weight:900;color:#111827;">
              Hola, ${firstName}.
            </p>
            <p style="margin:6px 0 0;font-size:14px;color:#6b7280;">
              Este es el resumen semanal de tu equipo como <strong>${roleLabel}</strong>.
            </p>
          </td>
        </tr>

        <!-- KPIs del equipo -->
        <tr>
          <td style="background:#ffffff;padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:0 4px;">
                  <table width="100%" cellpadding="0" cellspacing="0"
                    style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:16px 12px;text-align:center;">
                    <tr><td>
                      <p style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:900;color:#111827;">${teamMembers.length}</p>
                      <p style="margin:5px 0 0;font-size:10px;font-weight:700;color:${GRAY};text-transform:uppercase;letter-spacing:1px;">Agentes</p>
                    </td></tr>
                  </table>
                </td>
                <td style="padding:0 4px;">
                  <table width="100%" cellpadding="0" cellspacing="0"
                    style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:16px 12px;text-align:center;">
                    <tr><td>
                      <p style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:900;color:${iacColor(avgIac)};">${avgIac}%</p>
                      <p style="margin:5px 0 0;font-size:10px;font-weight:700;color:${GRAY};text-transform:uppercase;letter-spacing:1px;">IAC Promedio</p>
                    </td></tr>
                  </table>
                </td>
                <td style="padding:0 4px;">
                  <table width="100%" cellpadding="0" cellspacing="0"
                    style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:16px 12px;text-align:center;">
                    <tr><td>
                      <p style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:900;color:${GREEN};">${highActivity.length}</p>
                      <p style="margin:5px 0 0;font-size:10px;font-weight:700;color:${GRAY};text-transform:uppercase;letter-spacing:1px;">Muy activos</p>
                    </td></tr>
                  </table>
                </td>
                <td style="padding:0 4px;">
                  <table width="100%" cellpadding="0" cellspacing="0"
                    style="background:${lowActivity.length > 0 ? "#fff8f8" : "#f9fafb"};border:1px solid ${lowActivity.length > 0 ? "#fca5a5" : "#e5e7eb"};border-radius:14px;padding:16px 12px;text-align:center;">
                    <tr><td>
                      <p style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:900;color:${lowActivity.length > 0 ? RED : GRAY};">${lowActivity.length}</p>
                      <p style="margin:5px 0 0;font-size:10px;font-weight:700;color:${GRAY};text-transform:uppercase;letter-spacing:1px;">Bajo actividad</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Alertas -->
        ${alertBanner}
        ${tokkoBanner}

        <!-- Tabla equipo -->
        ${selfSection}
        ${teamSection}

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:${GRAY};">
              InmoCoach · Este mail se envía porque sos ${roleLabel} de tu equipo.<br>
              <a href="https://inmocoach.com.ar/config/mails" style="color:${RED};text-decoration:none;">Configurar preferencias de mail</a>
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

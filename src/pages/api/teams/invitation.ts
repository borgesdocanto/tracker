import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase";
import { Resend } from "resend";
import { EMAIL_FROM, emailWrapper } from "../../../lib/email";
import { getDisplayName } from "../../../lib/teams";

const resend = new Resend(process.env.RESEND_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const { action, token } = req.body as { action: "resend" | "cancel"; token: string };
  if (!action || !token) return res.status(400).json({ error: "Datos inválidos" });

  // Verificar que la invitación pertenece a un equipo del que es owner
  const { data: inv } = await supabaseAdmin
    .from("team_invitations")
    .select("*, teams(owner_email)")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (!inv) return res.status(404).json({ error: "Invitación no encontrada" });
  if (inv.teams.owner_email !== session.user.email) return res.status(403).json({ error: "No autorizado" });

  if (action === "cancel") {
    await supabaseAdmin
      .from("team_invitations")
      .update({ status: "cancelled" })
      .eq("token", token);
    return res.status(200).json({ ok: true });
  }

  if (action === "resend") {
    const brokerName = session.user.name || session.user.email!;
    const agencyName = inv.teams.agency_name || null;
    const displayName = agencyName || `el equipo de ${brokerName}`;
    const inviteUrl = `${process.env.NEXTAUTH_URL}/equipo/aceptar?token=${token}`;

    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: inv.email,
        subject: `Recordatorio: todavía podés unirte a ${displayName} en InstaCoach`,
        html: emailWrapper(`
          <h2 style="font-family:Georgia,serif;font-size:22px;font-weight:900;color:#111827;margin:0 0 12px;">Tu invitación sigue esperando</h2>
          ${agencyName ? `<p style="color:#aa0000;font-size:12px;font-weight:700;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">${agencyName}</p>` : ""}
          <p style="color:#374151;font-size:14px;line-height:1.75;margin:0 0 16px;">
            <strong>${brokerName}</strong> te invitó a InstaCoach y todavía no aceptaste.<br/>
            Al unirte, recibís tu informe semanal automático y tenés visibilidad de tu propia actividad comercial.
          </p>
          <a href="${inviteUrl}" style="display:inline-block;background:#aa0000;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
            Unirme al equipo →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin:20px 0 0;">Tu acceso queda cubierto por el plan del equipo — no pagás nada extra.</p>
        `),
      });
    } catch (e) {
      console.error("Error reenviando invitación:", e);
      return res.status(500).json({ error: "No se pudo reenviar el mail" });
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Acción inválida" });
}

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getOrCreateTeam, inviteAgent, getPendingInvitations, getTeamMembers } from "../../../lib/teams";
import { supabaseAdmin } from "../../../lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, team_role")
    .eq("email", session.user.email)
    .single();

  if (!sub || sub.plan !== "teams" || sub.team_role !== "owner") {
    return res.status(403).json({ error: "Solo los brokers con plan Teams pueden invitar agentes" });
  }

  if (req.method === "GET") {
    const [members, pending] = await Promise.all([
      getTeamMembers(session.user.email),
      getPendingInvitations(session.user.email),
    ]);
    return res.status(200).json({ members, pending });
  }

  if (req.method === "POST") {
    const { email } = req.body;
    if (!email || !email.includes("@")) return res.status(400).json({ error: "Email inválido" });

    const brokerName = session.user.name || session.user.email;
    const team = await getOrCreateTeam(session.user.email, `Equipo de ${brokerName}`);

    const members = await getTeamMembers(session.user.email);
    if (members.filter(m => m.teamRole === "member").length >= team.maxAgents) {
      return res.status(400).json({ error: `Límite de ${team.maxAgents} agentes alcanzado` });
    }

    const { token } = await inviteAgent(team.id, email, session.user.email);
    const inviteUrl = `${process.env.NEXTAUTH_URL}/equipo/aceptar?token=${token}`;

    try {
      await resend.emails.send({
        from: "Insta Coach <onboarding@resend.dev>",
        to: email,
        subject: `${brokerName} te invitó a su equipo en InstaCoach`,
        html: `
          <div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;padding:40px 20px;">
            <div style="border-top:3px solid #aa0000;margin-bottom:32px;"></div>
            <h1 style="font-family:Georgia,serif;font-size:28px;color:#111827;margin:0 0 8px;">
              Insta<span style="color:#aa0000;">Coach</span>
            </h1>
            <p style="color:#6b7280;font-size:14px;margin:0 0 32px;">Tu entrenador de productividad comercial</p>
            <h2 style="font-size:20px;color:#111827;margin:0 0 12px;">Fuiste invitado al equipo</h2>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
              <strong>${brokerName}</strong> te invitó a unirte a su equipo en InstaCoach.
              Al aceptar, tu acceso queda cubierto por el plan del equipo — no pagás nada extra.
            </p>
            <a href="${inviteUrl}" style="display:inline-block;background:#aa0000;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
              Aceptar invitación
            </a>
            <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;">
              Si no esperabas esta invitación, podés ignorar este mail.
            </p>
          </div>
        `,
      });
    } catch (e) {
      console.error("Error enviando invitación:", e);
    }

    return res.status(200).json({ ok: true, token, inviteUrl });
  }

  return res.status(405).end();
}

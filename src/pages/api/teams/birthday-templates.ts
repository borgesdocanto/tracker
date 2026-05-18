import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase";
import { getEffectiveEmail } from "../../../lib/impersonation";

export const DEFAULT_BIRTHDAY_AGENT = `¡Feliz cumpleaños, {nombre}! 🎂

Desde {inmobiliaria} te deseamos un día lleno de alegría y todo lo mejor en este nuevo año de vida.

¡Gracias por ser parte de nuestro equipo!`;

export const DEFAULT_BIRTHDAY_TEAM = `¡Mañana es el cumpleaños de {nombre}! 🎂

Desde {inmobiliaria} te invitamos a saludar a tu compañero/a en este día especial.

¡Que lo pase muy bien!`;

export const DEFAULT_ANNIVERSARY_AGENT = `¡Feliz aniversario, {nombre}! 🏡

Hoy se cumplen {años} año{plural} desde que te uniste a {inmobiliaria}. Gracias por tu dedicación y por ser parte de nuestro equipo.

¡Seguimos creciendo juntos!`;

export const DEFAULT_ANNIVERSARY_TEAM = `¡Mañana {nombre} cumple {años} año{plural} en {inmobiliaria}! 🏡

Acompañalo/a en este día especial y celebrá junto a tu equipo.`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const effectiveEmail = getEffectiveEmail(req, session);

  const { data: requester } = await supabaseAdmin
    .from("subscriptions")
    .select("team_id, team_role")
    .eq("email", effectiveEmail)
    .single();

  if (!requester?.team_id) return res.status(403).json({ error: "Sin equipo" });
  const canManage = requester.team_role === "owner" || requester.team_role === "team_leader";

  if (req.method === "GET") {
    const { data: team } = await supabaseAdmin
      .from("teams")
      .select("birthday_msg_agent, birthday_msg_team, anniversary_msg_agent, anniversary_msg_team, agency_name")
      .eq("id", requester.team_id)
      .single();

    return res.json({
      birthdayMsgAgent: team?.birthday_msg_agent || DEFAULT_BIRTHDAY_AGENT,
      birthdayMsgTeam: team?.birthday_msg_team || DEFAULT_BIRTHDAY_TEAM,
      anniversaryMsgAgent: team?.anniversary_msg_agent || DEFAULT_ANNIVERSARY_AGENT,
      anniversaryMsgTeam: team?.anniversary_msg_team || DEFAULT_ANNIVERSARY_TEAM,
      agencyName: team?.agency_name || "",
    });
  }

  if (req.method === "PUT") {
    if (!canManage) return res.status(403).json({ error: "Sin permisos" });
    const { birthdayMsgAgent, birthdayMsgTeam, anniversaryMsgAgent, anniversaryMsgTeam } = req.body;
    const { error } = await supabaseAdmin
      .from("teams")
      .update({
        birthday_msg_agent: birthdayMsgAgent || null,
        birthday_msg_team: birthdayMsgTeam || null,
        anniversary_msg_agent: anniversaryMsgAgent || null,
        anniversary_msg_team: anniversaryMsgTeam || null,
      })
      .eq("id", requester.team_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Método no permitido" });
}

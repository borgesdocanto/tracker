import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { isSuperAdmin } from "../../../lib/adminGuard";
import { supabaseAdmin } from "../../../lib/supabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return res.status(403).json({ error: "No autorizado" });
  }

  const { oldEmail, newEmail } = req.body as { oldEmail: string; newEmail: string };

  if (!oldEmail || !newEmail) {
    return res.status(400).json({ error: "Faltan oldEmail o newEmail" });
  }
  if (oldEmail === newEmail) {
    return res.status(400).json({ error: "El email nuevo es igual al actual" });
  }

  // Validar formato básico de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return res.status(400).json({ error: "Formato de email inválido" });
  }

  // Verificar que el usuario origen existe
  const { data: existingUser, error: userError } = await supabaseAdmin
    .from("subscriptions")
    .select("email, name, plan, team_role")
    .eq("email", oldEmail)
    .single();

  if (userError || !existingUser) {
    return res.status(404).json({ error: `Usuario no encontrado: ${oldEmail}` });
  }

  // Verificar que el email destino no existe ya en subscriptions
  const { data: existingNew } = await supabaseAdmin
    .from("subscriptions")
    .select("email")
    .eq("email", newEmail)
    .single();

  if (existingNew) {
    return res.status(409).json({ error: `Ya existe un usuario con el email ${newEmail}` });
  }

  const errors: string[] = [];
  const updates: { table: string; rows: number }[] = [];

  // 1. calendar_events
  const { error: ceError, count: ceCount } = await supabaseAdmin
    .from("calendar_events")
    .update({ user_email: newEmail })
    .eq("user_email", oldEmail);
  if (ceError) errors.push(`calendar_events: ${ceError.message}`);
  else updates.push({ table: "calendar_events", rows: ceCount ?? 0 });

  // 2. coach_reports
  const { error: crError, count: crCount } = await supabaseAdmin
    .from("coach_reports")
    .update({ user_email: newEmail })
    .eq("user_email", oldEmail);
  if (crError) errors.push(`coach_reports: ${crError.message}`);
  else updates.push({ table: "coach_reports", rows: crCount ?? 0 });

  // 3. weekly_stats
  const { error: wsError, count: wsCount } = await supabaseAdmin
    .from("weekly_stats")
    .update({ email: newEmail })
    .eq("email", oldEmail);
  if (wsError) errors.push(`weekly_stats: ${wsError.message}`);
  else updates.push({ table: "weekly_stats", rows: wsCount ?? 0 });

  // 4. team_invitations
  const { error: tiError, count: tiCount } = await supabaseAdmin
    .from("team_invitations")
    .update({ email: newEmail })
    .eq("email", oldEmail);
  if (tiError) errors.push(`team_invitations: ${tiError.message}`);
  else updates.push({ table: "team_invitations", rows: tiCount ?? 0 });

  // 5. push_subscriptions
  const { error: psError, count: psCount } = await supabaseAdmin
    .from("push_subscriptions")
    .update({ user_email: newEmail })
    .eq("user_email", oldEmail);
  if (psError) errors.push(`push_subscriptions: ${psError.message}`);
  else updates.push({ table: "push_subscriptions", rows: psCount ?? 0 });

  // 6. tokko_properties (producer_email)
  const { error: tpError, count: tpCount } = await supabaseAdmin
    .from("tokko_properties")
    .update({ producer_email: newEmail })
    .eq("producer_email", oldEmail);
  if (tpError) errors.push(`tokko_properties: ${tpError.message}`);
  else updates.push({ table: "tokko_properties", rows: tpCount ?? 0 });

  // 7. tokko_agents (email)
  const { error: taError, count: taCount } = await supabaseAdmin
    .from("tokko_agents")
    .update({ email: newEmail })
    .eq("email", oldEmail);
  if (taError) errors.push(`tokko_agents: ${taError.message}`);
  else updates.push({ table: "tokko_agents", rows: taCount ?? 0 });

  // 8. calendar_watch_channels
  const { error: cwError, count: cwCount } = await supabaseAdmin
    .from("calendar_watch_channels")
    .update({ user_email: newEmail })
    .eq("user_email", oldEmail);
  if (cwError) errors.push(`calendar_watch_channels: ${cwError.message}`);
  else updates.push({ table: "calendar_watch_channels", rows: cwCount ?? 0 });

  // 9. team_removals
  const { error: trError, count: trCount } = await supabaseAdmin
    .from("team_removals")
    .update({ email: newEmail })
    .eq("email", oldEmail);
  if (trError) {
    // Tabla puede no existir — no es bloqueante
    console.warn("team_removals update skipped:", trError.message);
  } else {
    updates.push({ table: "team_removals", rows: trCount ?? 0 });
  }

  // 10. teams (owner_email) — si es broker
  if (existingUser.team_role === "owner") {
    const { error: teamsError, count: teamsCount } = await supabaseAdmin
      .from("teams")
      .update({ owner_email: newEmail })
      .eq("owner_email", oldEmail);
    if (teamsError) errors.push(`teams: ${teamsError.message}`);
    else updates.push({ table: "teams", rows: teamsCount ?? 0 });
  }

  // Si hubo errores bloqueantes antes de actualizar subscriptions, abortar
  if (errors.length > 0) {
    return res.status(500).json({ error: "Error en tablas dependientes", details: errors, updates });
  }

  // 11. subscriptions — AL FINAL (es la tabla principal / FK)
  // Limpiar tokens de Google para que el nuevo login reconfigure el calendario
  const { error: subError } = await supabaseAdmin
    .from("subscriptions")
    .update({
      email: newEmail,
      google_access_token: null,
      google_refresh_token: null,
      google_token_expiry: null,
    })
    .eq("email", oldEmail);

  if (subError) {
    return res.status(500).json({ error: `Error actualizando subscriptions: ${subError.message}`, updates });
  }

  updates.push({ table: "subscriptions", rows: 1 });

  return res.status(200).json({
    ok: true,
    oldEmail,
    newEmail,
    userName: existingUser.name,
    updates,
    message: `Email cambiado correctamente. El usuario deberá loguearse con ${newEmail} para vincular el nuevo calendario.`,
  });
}

import { supabaseAdmin } from "./supabase";

export interface TeamMember {
  email: string;
  name?: string;
  avatar?: string;
  plan: string;
  teamRole: "owner" | "member";
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  ownerEmail: string;
  maxAgents: number;
  createdAt: string;
}

// Crear o recuperar el equipo del broker
export async function getOrCreateTeam(ownerEmail: string, teamName: string): Promise<Team> {
  const { data } = await supabaseAdmin
    .from("teams")
    .select("*")
    .eq("owner_email", ownerEmail)
    .single();

  if (data) return mapTeam(data);

  const { data: newTeam } = await supabaseAdmin
    .from("teams")
    .insert({ name: teamName, owner_email: ownerEmail, max_agents: 10 })
    .select()
    .single();

  return mapTeam(newTeam);
}

// Invitar agente al equipo
export async function inviteAgent(teamId: string, agentEmail: string, invitedBy: string): Promise<{ token: string }> {
  // Verificar si ya existe invitación pendiente
  const { data: existing } = await supabaseAdmin
    .from("team_invitations")
    .select("*")
    .eq("team_id", teamId)
    .eq("email", agentEmail)
    .eq("status", "pending")
    .single();

  if (existing) return { token: existing.token };

  const { data } = await supabaseAdmin
    .from("team_invitations")
    .insert({ team_id: teamId, email: agentEmail, invited_by: invitedBy, status: "pending" })
    .select()
    .single();

  return { token: data.token };
}

// Aceptar invitación — Opción A: team absorbe al agente
export async function acceptInvitation(token: string, agentEmail: string): Promise<{ ok: boolean; error?: string }> {
  // Buscar invitación
  const { data: inv } = await supabaseAdmin
    .from("team_invitations")
    .select("*, teams(*)")
    .eq("token", token)
    .eq("status", "pending")
    .single();

  if (!inv) return { ok: false, error: "Invitación inválida o ya usada" };
  if (inv.email !== agentEmail) return { ok: false, error: "Esta invitación no es para tu email" };

  // Actualizar suscripción del agente: pasa a ser cubierto por el team
  await supabaseAdmin
    .from("subscriptions")
    .upsert({
      email: agentEmail,
      plan: "teams",
      status: "active",
      team_id: inv.team_id,
      team_role: "member",
      // Cancelar cualquier suscripción individual al fin del ciclo actual
      // (no tocamos current_period_end si existe, se usa para mostrar "hasta cuándo")
    }, { onConflict: "email" });

  // Marcar invitación como aceptada
  await supabaseAdmin
    .from("team_invitations")
    .update({ status: "accepted" })
    .eq("token", token);

  return { ok: true };
}

// Obtener miembros del equipo del broker
export async function getTeamMembers(ownerEmail: string): Promise<TeamMember[]> {
  const { data: team } = await supabaseAdmin
    .from("teams")
    .select("id")
    .eq("owner_email", ownerEmail)
    .single();

  if (!team) return [];

  const { data: members } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("team_id", team.id);

  return (members || []).map(m => ({
    email: m.email,
    name: m.name,
    avatar: m.avatar,
    plan: m.plan,
    teamRole: m.team_role,
    createdAt: m.created_at,
  }));
}

// Obtener invitaciones pendientes del equipo
export async function getPendingInvitations(ownerEmail: string) {
  const { data: team } = await supabaseAdmin
    .from("teams")
    .select("id")
    .eq("owner_email", ownerEmail)
    .single();

  if (!team) return [];

  const { data } = await supabaseAdmin
    .from("team_invitations")
    .select("*")
    .eq("team_id", team.id)
    .eq("status", "pending");

  return data || [];
}

function mapTeam(data: any): Team {
  return {
    id: data.id,
    name: data.name,
    ownerEmail: data.owner_email,
    maxAgents: data.max_agents,
    createdAt: data.created_at,
  };
}

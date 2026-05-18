import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase";
import { getEffectiveEmail } from "../../../lib/impersonation";

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

  // GET — todos los miembros con birthday y work_anniversary
  if (req.method === "GET") {
    const { data: members } = await supabaseAdmin
      .from("subscriptions")
      .select("email, name, birthday, work_anniversary, team_role")
      .eq("team_id", requester.team_id)
      .order("name");
    return res.json({ members: members || [] });
  }

  // PUT — actualizar birthday y/o work_anniversary
  if (req.method === "PUT") {
    const { agentEmail, birthday, work_anniversary } = req.body;
    if (!agentEmail) return res.status(400).json({ error: "Falta agentEmail" });

    const isSelf = agentEmail === effectiveEmail;
    if (!isSelf && !canManage) return res.status(403).json({ error: "Sin permisos" });

    // Verificar que pertenece al equipo
    const { data: agent } = await supabaseAdmin
      .from("subscriptions")
      .select("email, team_id")
      .eq("email", agentEmail)
      .eq("team_id", requester.team_id)
      .single();

    if (!agent) return res.status(404).json({ error: "Agente no encontrado en el equipo" });

    const updates: Record<string, string | null> = {};
    if (birthday !== undefined) updates.birthday = birthday || null;
    if (work_anniversary !== undefined) updates.work_anniversary = work_anniversary || null;

    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update(updates)
      .eq("email", agentEmail);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Método no permitido" });
}

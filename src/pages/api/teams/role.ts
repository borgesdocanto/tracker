import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { updateMemberRole } from "../../../lib/teams";
import { TeamRole } from "../../../lib/teams";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const { memberEmail, newRole } = req.body as { memberEmail: string; newRole: TeamRole };

  if (!memberEmail || !["team_leader", "member"].includes(newRole)) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  const result = await updateMemberRole(session.user.email, memberEmail, newRole as "team_leader" | "member");
  return res.status(result.ok ? 200 : 403).json(result);
}

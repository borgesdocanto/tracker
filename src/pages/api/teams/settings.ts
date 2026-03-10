import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { getTeamByOwner, updateTeamSettings } from "../../../lib/teams";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });
  const email = session.user.email;

  if (req.method === "GET") {
    const team = await getTeamByOwner(email);
    if (!team) return res.status(404).json({ error: "Equipo no encontrado" });
    return res.status(200).json({
      showTeamLeaders: team.showTeamLeaders ?? true,
      anonymizeGlobal: team.anonymizeGlobal ?? false,
    });
  }

  if (req.method === "POST") {
    const { showTeamLeaders, anonymizeGlobal } = req.body;
    const result = await updateTeamSettings(email, { showTeamLeaders, anonymizeGlobal });
    return res.status(result.ok ? 200 : 403).json(result);
  }

  return res.status(405).end();
}

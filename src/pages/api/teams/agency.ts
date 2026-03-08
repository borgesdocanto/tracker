import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { updateAgencyName, getTeamByOwner } from "../../../lib/teams";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  if (req.method === "GET") {
    const team = await getTeamByOwner(session.user.email);
    return res.status(200).json({ agencyName: team?.agencyName || "" });
  }

  if (req.method === "POST") {
    const { agencyName } = req.body;
    if (typeof agencyName !== "string") return res.status(400).json({ error: "Nombre inválido" });
    const result = await updateAgencyName(session.user.email, agencyName);
    return res.status(result.ok ? 200 : 403).json(result);
  }

  return res.status(405).end();
}

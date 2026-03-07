import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { acceptInvitation } from "../../../lib/teams";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token requerido" });

  const result = await acceptInvitation(token, session.user.email);
  return res.status(result.ok ? 200 : 400).json(result);
}

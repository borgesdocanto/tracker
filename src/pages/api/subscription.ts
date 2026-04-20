import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { isSuperAdmin } from "../../lib/adminGuard";
import { getOrCreateSubscription, isFreemiumExpired } from "../../lib/subscription";
import { getPlanById } from "../../lib/plans";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  // Este endpoint SIEMPRE usa el email real del usuario logueado.
  // La impersonación es para ver datos de otros — nunca para determinar acceso.
  const realEmail = session.user.email;

  const sub = await getOrCreateSubscription(
    realEmail,
    session.user.name ?? undefined,
    session.user.image ?? undefined
  );

  const plan = getPlanById(sub.plan);

  const isExpiredRaw = isFreemiumExpired(sub) || sub.status === "cancelled" || sub.status === "past_due";
  // El super admin nunca queda bloqueado — tiene acceso siempre
  const isExpired = isSuperAdmin(realEmail) ? false : isExpiredRaw;

  return res.status(200).json({
    subscription: { ...sub, isExpired },
    plan,
    isActive: sub.status === "active" && !isExpired,
    isPaid: sub.plan !== "free",
  });
}

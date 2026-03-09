import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { isSuperAdmin } from "../../../lib/adminGuard";
import { updatePricing } from "../../../lib/pricing";

// MP plan IDs — se sincronizan con Supabase tabla pricing
const MP_PLAN_IDS: Record<string, string | undefined> = {
  individual: process.env.MP_PLAN_INDIVIDUAL_ID,
  teams: process.env.MP_PLAN_TEAMS_ID,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!isSuperAdmin(session?.user?.email)) return res.status(403).json({ error: "Forbidden" });

  // GET — obtener precios actuales desde MP
  if (req.method === "GET") {
    const results: Record<string, any> = {};
    for (const [planId, mpId] of Object.entries(MP_PLAN_IDS)) {
      if (!mpId) { results[planId] = { error: "ID no configurado" }; continue; }
      try {
        const r = await fetch(`https://api.mercadopago.com/preapproval_plan/${mpId}`, {
          headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
        });
        const d = await r.json();
        results[planId] = {
          id: mpId,
          reason: d.reason,
          amount: d.auto_recurring?.transaction_amount,
          currency: d.auto_recurring?.currency_id,
          status: d.status,
        };
      } catch (e: any) {
        results[planId] = { error: e.message };
      }
    }
    return res.status(200).json(results);
  }

  // POST — actualizar precio de un plan
  if (req.method === "POST") {
    const { planId, amount, supabaseOnly } = req.body;
    if (!planId || !amount || isNaN(Number(amount))) {
      return res.status(400).json({ error: "planId y amount requeridos" });
    }

    // supabaseOnly: solo actualiza Supabase (para descuentos y configs sin plan en MP)
    if (supabaseOnly) {
      await updatePricing(planId, Number(amount));
      return res.status(200).json({ ok: true, planId, newAmount: Number(amount) });
    }

    const mpId = MP_PLAN_IDS[planId];
    if (!mpId) return res.status(400).json({ error: "Plan ID no configurado en Vercel" });

    const r = await fetch(`https://api.mercadopago.com/preapproval_plan/${mpId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ auto_recurring: { transaction_amount: Number(amount) } }),
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: d.message || "Error en MP" });

    const newAmount = d.auto_recurring?.transaction_amount;
    await updatePricing(planId, newAmount);

    return res.status(200).json({ ok: true, planId, newAmount });
  }

  return res.status(405).end();
}

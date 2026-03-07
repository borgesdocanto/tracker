import { NextApiRequest, NextApiResponse } from "next";
import MercadoPagoConfig, { Payment } from "mercadopago";
import { upgradePlan } from "../../../lib/subscription";
import { supabaseAdmin } from "../../../lib/supabase";
import { PlanId } from "../../../lib/plans";
import { getOrCreateTeam } from "../../../lib/teams";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { type, data } = req.body;

  if (type !== "payment") return res.status(200).json({ ok: true });

  try {
    const payment = new Payment(client);
    const paymentData = await payment.get({ id: data.id });

    if (paymentData.status !== "approved") {
      return res.status(200).json({ ok: true, status: paymentData.status });
    }

    const [email, planId] = (paymentData.external_reference ?? "").split("|");
    if (!email || !planId) return res.status(400).json({ error: "Referencia inválida" });

    // Actualizar plan
    await upgradePlan(email, planId as PlanId, String(paymentData.id), String(paymentData.payer?.id ?? ""));

    // Si compró Teams → asignar owner + crear equipo automáticamente
    if (planId === "teams") {
      // Obtener nombre del usuario
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("name")
        .eq("email", email)
        .single();

      const brokerName = sub?.name || email.split("@")[0];

      // Crear equipo y asignar rol owner
      const team = await getOrCreateTeam(email, `Equipo de ${brokerName}`);

      await supabaseAdmin
        .from("subscriptions")
        .update({ team_id: team.id, team_role: "owner" })
        .eq("email", email);
    }

    // Registrar pago
    await supabaseAdmin.from("payments").insert({
      email,
      mp_payment_id: String(paymentData.id),
      plan: planId,
      amount: paymentData.transaction_amount,
      currency: paymentData.currency_id,
      status: paymentData.status,
    });

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
}

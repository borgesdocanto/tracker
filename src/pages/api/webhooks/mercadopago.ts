import { NextApiRequest, NextApiResponse } from "next";
import MercadoPagoConfig, { Payment } from "mercadopago";
import { upgradePlan } from "../../lib/subscription";
import { supabaseAdmin } from "../../lib/supabase";
import { PlanId } from "../../lib/plans";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { type, data } = req.body;

  // Solo procesamos notificaciones de pago
  if (type !== "payment") return res.status(200).json({ ok: true });

  try {
    const payment = new Payment(client);
    const paymentData = await payment.get({ id: data.id });

    if (paymentData.status !== "approved") {
      return res.status(200).json({ ok: true, status: paymentData.status });
    }

    // external_reference = "email|planId"
    const [email, planId] = (paymentData.external_reference ?? "").split("|");
    if (!email || !planId) return res.status(400).json({ error: "Referencia inválida" });

    // Actualizar plan en Supabase
    await upgradePlan(
      email,
      planId as PlanId,
      String(paymentData.id),
      String(paymentData.payer?.id ?? "")
    );

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

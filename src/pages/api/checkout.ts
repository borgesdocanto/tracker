import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase";
import { calcTeamsTotal, getTierForAgents } from "../../lib/pricing";

const BASE_PRICE = 10500;
const BASE_URL = process.env.NEXTAUTH_URL!;
const MP_TOKEN = process.env.MP_ACCESS_TOKEN!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const email = session.user.email;
  const { agentCount = 1 } = req.body as { agentCount?: number };

  // Verificar que no se contrate por menos seats que los usuarios activos
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("team_id")
    .eq("email", email)
    .single();

  let activeUsers = 1;
  if (sub?.team_id) {
    const { count: activeCount } = await supabaseAdmin
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("team_id", sub.team_id);
    activeUsers = activeCount ?? 1;
  }

  const requested = Math.max(1, Number(agentCount));
  if (requested < activeUsers) {
    return res.status(400).json({
      error: `No podés contratar para ${requested} usuario${requested !== 1 ? "s" : ""} — tenés ${activeUsers} usuarios activos. Primero remové usuarios y luego reducí el plan.`,
      activeUsers,
    });
  }
  const count = requested;
  const total = calcTeamsTotal(BASE_PRICE, count);
  const tier = getTierForAgents(count);

  try {
    // Crear preapproval_plan — MP genera el init_point listo para redirigir al usuario
    const mpRes = await fetch("https://api.mercadopago.com/preapproval_plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MP_TOKEN}`,
      },
      body: JSON.stringify({
        reason: count === 1
          ? "InmoCoach — Plan Individual"
          : `InmoCoach — Equipo ${count} agentes (${tier.label})`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: total,
          currency_id: "ARS",
        },
        payment_methods_allowed: {
          payment_types: [{ id: "credit_card" }, { id: "debit_card" }],
        },
        back_url: `${BASE_URL}/pago/exito?plan=teams&agents=${count}`,
        notification_url: `${BASE_URL}/api/webhooks/mercadopago`,
        external_reference: `${email}|teams|${count}`,
      }),
    });

    const plan = await mpRes.json();
    console.log("MP preapproval_plan response:", JSON.stringify(plan));

    if (!mpRes.ok || !plan.init_point) {
      return res.status(500).json({ error: plan.message || "Error al crear plan en MP" });
    }

    // Guardar plan ID y el external_reference para el webhook
    await supabaseAdmin
      .from("subscriptions")
      .update({ mp_plan_id: plan.id })
      .eq("email", email);

    console.log(`✅ Checkout para ${email}: ${count} agentes → $${total}/mes → ${plan.init_point}`);
    return res.status(200).json({ checkoutUrl: plan.init_point, planId: plan.id, total });

  } catch (err: any) {
    console.error("Checkout error:", err);
    return res.status(500).json({ error: err.message || "Error al procesar" });
  }
}

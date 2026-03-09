import { supabaseAdmin } from "./supabase";
import { getPricing, calcTeamsTotal } from "./pricing";

// Cuando un broker agrega un agente extra, recalcula y actualiza su suscripción en MP
export async function recalcTeamsSubscription(ownerEmail: string, newTotalAgents: number): Promise<{
  ok: boolean;
  newAmount?: number;
  checkoutUrl?: string;
  error?: string;
}> {
  try {
    const pricing = await getPricing();
    const newAmount = calcTeamsTotal(pricing, newTotalAgents);

    // Obtener suscripción actual del broker en MP
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("mp_subscription_id, mp_payer_id")
      .eq("email", ownerEmail)
      .single();

    const mpSubscriptionId = sub?.mp_subscription_id;

    if (mpSubscriptionId) {
      // Cancelar suscripción actual
      await fetch(`https://api.mercadopago.com/preapproval/${mpSubscriptionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
    }

    // Crear nueva suscripción con el monto actualizado
    const planMPId = process.env.MP_PLAN_TEAMS_ID;
    if (!planMPId) return { ok: false, error: "MP_PLAN_TEAMS_ID no configurado" };

    // Crear un preapproval_plan temporal con el nuevo monto
    const planRes = await fetch("https://api.mercadopago.com/preapproval_plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        reason: `InmoCoach — Teams (${newTotalAgents} agentes)`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: newAmount,
          currency_id: "ARS",
        },
        payment_methods_allowed: {
          payment_types: [{ id: "credit_card" }, { id: "debit_card" }],
        },
        back_url: `${process.env.NEXTAUTH_URL}/pago/exito?plan=teams`,
        notification_url: `${process.env.NEXTAUTH_URL}/api/webhooks/mercadopago`,
      }),
    });

    const planData = await planRes.json();
    if (!planRes.ok || !planData.init_point) {
      return { ok: false, error: planData.message || "Error creando plan en MP" };
    }

    // Guardar nuevo plan ID en Supabase
    await supabaseAdmin
      .from("subscriptions")
      .update({ mp_subscription_id: planData.id })
      .eq("email", ownerEmail);

    return {
      ok: true,
      newAmount,
      checkoutUrl: planData.init_point,
    };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// Obtener cuántos agentes activos tiene un equipo
export async function getActiveAgentCount(teamId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("status", "active");
  return count ?? 0;
}

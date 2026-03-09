import { supabaseAdmin } from "./supabase";
import { getPricing, calcTeamsTotal } from "./pricing";

// Opción B: agentes extra entran gratis hasta el próximo ciclo de cobro.
// Solo actualizamos el monto del preapproval activo en MP — cobra el nuevo total en el próximo ciclo.
export async function recalcTeamsSubscription(ownerEmail: string, newTotalAgents: number): Promise<{
  ok: boolean;
  newAmount?: number;
  error?: string;
}> {
  try {
    const pricing = await getPricing();
    const newAmount = calcTeamsTotal(pricing, newTotalAgents);

    // Obtener suscripción activa del broker
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("mp_subscription_id")
      .eq("email", ownerEmail)
      .single();

    const mpSubscriptionId = sub?.mp_subscription_id;

    if (mpSubscriptionId) {
      // PATCH al preapproval activo — cambia el monto del PRÓXIMO ciclo, no cobra ahora
      const r = await fetch(`https://api.mercadopago.com/preapproval/${mpSubscriptionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          auto_recurring: {
            transaction_amount: newAmount,
          },
        }),
      });

      if (!r.ok) {
        const err = await r.json();
        console.error("MP preapproval update error:", err);
        // No bloqueamos — igual subimos el límite en Supabase
      }
    }

    // Subir límite de agentes en Supabase
    const { data: team } = await supabaseAdmin
      .from("subscriptions")
      .select("team_id")
      .eq("email", ownerEmail)
      .single();

    if (team?.team_id) {
      await supabaseAdmin
        .from("teams")
        .update({ max_agents: newTotalAgents })
        .eq("id", team.team_id);
    }

    return { ok: true, newAmount };
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

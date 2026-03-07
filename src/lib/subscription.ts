import { supabaseAdmin } from "./supabase";
import { getPlanById, PlanId } from "./plans";

export interface Subscription {
  email: string;
  name?: string;
  plan: PlanId;
  status: "active" | "cancelled" | "past_due";
  currentPeriodEnd?: string;
  coachMessagesUsed: number;
  coachResetAt: string;
}

// Obtener suscripción — si no existe la crea en plan free
export async function getOrCreateSubscription(
  email: string,
  name?: string,
  avatar?: string
): Promise<Subscription> {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("email", email)
    .single();

  if (data && !error) {
    return {
      email: data.email,
      name: data.name,
      plan: data.plan as PlanId,
      status: data.status,
      currentPeriodEnd: data.current_period_end,
      coachMessagesUsed: data.coach_messages_used ?? 0,
      coachResetAt: data.coach_reset_at,
    };
  }

  // Primera vez — crear en free
  const { data: newSub } = await supabaseAdmin
    .from("subscriptions")
    .insert({ email, name, avatar, plan: "free", status: "active" })
    .select()
    .single();

  return {
    email,
    name,
    plan: "free",
    status: "active",
    coachMessagesUsed: 0,
    coachResetAt: new Date().toISOString(),
  };
}

// Verificar si el usuario puede usar Coach IA
export async function canUseCoach(email: string): Promise<{ allowed: boolean; reason?: string }> {
  const sub = await getOrCreateSubscription(email);
  const plan = getPlanById(sub.plan);

  if (plan.limits.coachMessages === -1) return { allowed: true };

  // Resetear contador si pasó el mes
  const resetAt = new Date(sub.coachResetAt);
  const now = new Date();
  if (now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
    await supabaseAdmin
      .from("subscriptions")
      .update({ coach_messages_used: 0, coach_reset_at: now.toISOString() })
      .eq("email", email);
    return { allowed: true };
  }

  if (sub.coachMessagesUsed >= plan.limits.coachMessages) {
    return {
      allowed: false,
      reason: `Alcanzaste el límite de ${plan.limits.coachMessages} análisis del plan ${plan.name}. Actualizá tu plan para continuar.`,
    };
  }

  return { allowed: true };
}

// Incrementar contador de Coach
export async function incrementCoachUsage(email: string) {
  await supabaseAdmin.rpc("increment_coach_messages", { user_email: email }).catch(() => {
    // fallback manual si la función RPC no existe
    supabaseAdmin
      .from("subscriptions")
      .select("coach_messages_used")
      .eq("email", email)
      .single()
      .then(({ data }) => {
        if (data) {
          supabaseAdmin
            .from("subscriptions")
            .update({ coach_messages_used: (data.coach_messages_used ?? 0) + 1 })
            .eq("email", email);
        }
      });
  });
}

// Actualizar plan tras pago aprobado
export async function upgradePlan(
  email: string,
  plan: PlanId,
  mpSubscriptionId?: string,
  mpPayerId?: string
) {
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await supabaseAdmin
    .from("subscriptions")
    .upsert({
      email,
      plan,
      status: "active",
      mp_subscription_id: mpSubscriptionId,
      mp_payer_id: mpPayerId,
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
    }, { onConflict: "email" });
}

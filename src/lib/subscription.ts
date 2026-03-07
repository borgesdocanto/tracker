import { supabaseAdmin } from "./supabase";
import { getPlanById, isVipEmail, PlanId } from "./plans";
import { FREEMIUM_DAYS } from "./brand";

export interface Subscription {
  email: string;
  name?: string;
  plan: PlanId;
  status: "active" | "cancelled" | "past_due" | "expired";
  currentPeriodEnd?: string;
  createdAt: string;
  teamId?: string;
  teamRole?: string;
  isVip: boolean;
}

export async function getOrCreateSubscription(
  email: string,
  name?: string,
  avatar?: string
): Promise<Subscription> {
  const vip = isVipEmail(email);

  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("email", email)
    .single();

  if (data && !error) {
    // VIP siempre activo en individual
    if (vip && data.plan === "free") {
      await supabaseAdmin
        .from("subscriptions")
        .update({ plan: "individual", status: "active" })
        .eq("email", email);
      return { ...mapSub(data), plan: "individual", status: "active", isVip: true };
    }
    return { ...mapSub(data), isVip: vip };
  }

  // Primera vez — crear
  const plan = vip ? "individual" : "free";
  const { data: newSub } = await supabaseAdmin
    .from("subscriptions")
    .insert({ email, name, avatar, plan, status: "active" })
    .select()
    .single();

  return {
    email,
    name,
    plan,
    status: "active",
    createdAt: new Date().toISOString(),
    isVip: vip,
  };
}

function mapSub(data: any): Subscription {
  return {
    email: data.email,
    name: data.name,
    plan: data.plan,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    createdAt: data.created_at,
    teamId: data.team_id,
    teamRole: data.team_role,
    isVip: isVipEmail(data.email),
  };
}

// Verifica si el freemium expiró (más de FREEMIUM_DAYS desde created_at)
export function isFreemiumExpired(sub: Subscription): boolean {
  if (sub.plan !== "free") return false;
  if (sub.isVip) return false;
  const created = new Date(sub.createdAt);
  const now = new Date();
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > FREEMIUM_DAYS;
}

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

// Trae todos los usuarios activos para el cron de mail
export async function getAllActiveSubscriptions(): Promise<Subscription[]> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .in("status", ["active"]);
  if (!data) return [];
  return data
    .filter(s => !isFreemiumExpired(mapSub(s)))
    .map(mapSub);
}

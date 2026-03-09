import { supabaseAdmin } from "./supabase";
import { createClient } from "@supabase/supabase-js";

export interface PricingRow {
  plan_id: string;
  price_ars: number;
  mp_plan_id: string;
  updated_at: string;
}

// Leer precios desde Supabase (server-side con admin)
export async function getPricing(): Promise<Record<string, PricingRow>> {
  const { data } = await supabaseAdmin
    .from("pricing")
    .select("*");
  const result: Record<string, PricingRow> = {};
  for (const row of data || []) result[row.plan_id] = row;
  return result;
}

// Leer precios desde Supabase (client-side con anon key — solo lectura)
export async function getPricingPublic(): Promise<Record<string, PricingRow>> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data } = await supabase.from("pricing").select("*");
  const result: Record<string, PricingRow> = {};
  for (const row of data || []) result[row.plan_id] = row;
  return result;
}

// Actualizar precio en Supabase
export async function updatePricing(planId: string, priceArs: number): Promise<void> {
  await supabaseAdmin
    .from("pricing")
    .update({ price_ars: priceArs, updated_at: new Date().toISOString() })
    .eq("plan_id", planId);
}

// Formatear precio ARS
export function formatPriceARS(amount: number): string {
  return `$ ${amount.toLocaleString("es-AR")} / mes`;
}

// Calcular precio de agente extra = individual × (1 - descuento%)
export function calcExtraAgentPrice(pricing: Record<string, PricingRow>): number {
  const individualPrice = pricing["individual"]?.price_ars ?? 10500;
  const discount = pricing["teams_extra_discount"]?.price_ars ?? 30;
  return Math.round(individualPrice * (1 - discount / 100));
}

// Calcular monto total de suscripción Teams = base + extras
export function calcTeamsTotal(pricing: Record<string, PricingRow>, totalAgents: number): number {
  const basePrice = pricing["teams"]?.price_ars ?? 75000;
  const extraAgentPrice = calcExtraAgentPrice(pricing);
  const includedAgents = 10;
  const extraAgents = Math.max(0, totalAgents - includedAgents);
  return basePrice + extraAgents * extraAgentPrice;
}

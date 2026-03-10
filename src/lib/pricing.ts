import { supabaseAdmin } from "./supabase";
import { createClient } from "@supabase/supabase-js";

export interface PricingRow {
  plan_id: string;
  price_ars: number;
  mp_plan_id: string;
  updated_at: string;
}

// ── TIERS DE DESCUENTO POR VOLUMEN ──────────────────────────────────────────
// 1      → precio individual lleno
// 2-4    → precio individual lleno (sin descuento)
// 5-9    → 20% off por agente
// 10-19  → 30% off por agente
// 20+    → 40% off por agente

export interface VolumeTier {
  minAgents: number;
  maxAgents: number | null; // null = infinito
  discountPct: number;
  label: string;
}

export const VOLUME_TIERS: VolumeTier[] = [
  { minAgents: 1,  maxAgents: 4,  discountPct: 0,  label: "Precio base" },
  { minAgents: 5,  maxAgents: 9,  discountPct: 20, label: "Equipo (-20%)" },
  { minAgents: 10, maxAgents: 19, discountPct: 30, label: "Agencia (-30%)" },
  { minAgents: 20, maxAgents: null, discountPct: 40, label: "Red (-40%)" },
];

export function getTierForAgents(agentCount: number): VolumeTier {
  for (let i = VOLUME_TIERS.length - 1; i >= 0; i--) {
    if (agentCount >= VOLUME_TIERS[i].minAgents) return VOLUME_TIERS[i];
  }
  return VOLUME_TIERS[0];
}

export function getNextTier(agentCount: number): VolumeTier | null {
  const current = getTierForAgents(agentCount);
  const idx = VOLUME_TIERS.findIndex(t => t.minAgents === current.minAgents);
  return idx < VOLUME_TIERS.length - 1 ? VOLUME_TIERS[idx + 1] : null;
}

// Precio por agente según cantidad
export function pricePerAgent(basePrice: number, agentCount: number): number {
  const tier = getTierForAgents(agentCount);
  return Math.round(basePrice * (1 - tier.discountPct / 100));
}

// Total mensual para N agentes
export function calcTeamsTotal(pricingOrBase: Record<string, PricingRow> | number, agentCount: number): number {
  const base = typeof pricingOrBase === "number"
    ? pricingOrBase
    : (pricingOrBase["individual"]?.price_ars ?? 10500);
  return pricePerAgent(base, agentCount) * agentCount;
}

// Cuántos agentes faltan para el próximo tier
export function agentsToNextTier(agentCount: number): number | null {
  const next = getNextTier(agentCount);
  if (!next) return null;
  return next.minAgents - agentCount;
}

// Ahorro mensual si llega al próximo tier
export function savingsAtNextTier(basePrice: number, agentCount: number): number | null {
  const next = getNextTier(agentCount);
  if (!next) return null;
  const currentTotal = calcTeamsTotal(basePrice, agentCount);
  const nextTotal = calcTeamsTotal(basePrice, next.minAgents);
  // Ahorro = lo que pagarían sin descuento vs con descuento del próximo tier
  const fullPrice = basePrice * next.minAgents;
  return fullPrice - nextTotal;
}

// ── SUPABASE ─────────────────────────────────────────────────────────────────

export async function getPricing(): Promise<Record<string, PricingRow>> {
  const { data } = await supabaseAdmin.from("pricing").select("*");
  const result: Record<string, PricingRow> = {};
  for (const row of data || []) result[row.plan_id] = row;
  return result;
}

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

export async function updatePricing(planId: string, priceArs: number): Promise<void> {
  await supabaseAdmin
    .from("pricing")
    .update({ price_ars: priceArs, updated_at: new Date().toISOString() })
    .eq("plan_id", planId);
}

export function formatPriceARS(amount: number): string {
  return `$${amount.toLocaleString("es-AR")}`;
}

// Legacy compat
export function calcExtraAgentPrice(pricing: Record<string, PricingRow>): number {
  const base = pricing["individual"]?.price_ars ?? 10500;
  return pricePerAgent(base, 5); // precio con primer descuento
}

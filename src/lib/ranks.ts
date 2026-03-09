import { supabaseAdmin } from "./supabase";

export interface Rank {
  slug: string;
  label: string;
  icon: string;
  minWeeks: number;
  minIacAvg: number;
  minStreak?: number;
  requiresCierre?: boolean;
  description: string;
}

export const RANKS: Rank[] = [
  {
    slug: "junior",
    label: "Agente Junior",
    icon: "🏠",
    minWeeks: 0,
    minIacAvg: 0,
    description: "Recién arrancaste. Conocé el sistema y empezá a cargar tus reuniones.",
  },
  {
    slug: "corredor",
    label: "Corredor",
    icon: "🚶",
    minWeeks: 4,
    minIacAvg: 30,
    description: "4 semanas activo con IAC promedio ≥ 30%. Estás tomando el hábito.",
  },
  {
    slug: "asesor",
    label: "Asesor Comercial",
    icon: "📋",
    minWeeks: 8,
    minIacAvg: 50,
    description: "8 semanas activo con IAC promedio ≥ 50%. Tu actividad es consistente.",
  },
  {
    slug: "senior",
    label: "Senior",
    icon: "⭐",
    minWeeks: 12,
    minIacAvg: 70,
    description: "12 semanas activo con IAC promedio ≥ 70%. Sos un referente de actividad.",
  },
  {
    slug: "top_producer",
    label: "Top Producer",
    icon: "🔥",
    minWeeks: 20,
    minIacAvg: 85,
    description: "20 semanas activo con IAC promedio ≥ 85%. Estás en la élite.",
  },
  {
    slug: "master_broker",
    label: "Master Broker",
    icon: "👑",
    minWeeks: 30,
    minIacAvg: 90,
    minStreak: 20,
    description: "30 semanas activo, IAC promedio ≥ 90% y racha máxima ≥ 20 días. El nivel más alto.",
  },
];

export function getRankBySlug(slug: string): Rank {
  return RANKS.find(r => r.slug === slug) ?? RANKS[0];
}

export function getRankLabel(slug: string): string {
  const r = getRankBySlug(slug);
  return `${r.icon} ${r.label}`;
}

// Calcular el rango que le corresponde a un agente
export function calcRank(activeWeeks: number, iacAvg: number, bestStreak: number): Rank {
  // Recorrer rangos de mayor a menor y devolver el primero que cumple
  for (let i = RANKS.length - 1; i >= 0; i--) {
    const r = RANKS[i];
    if (
      activeWeeks >= r.minWeeks &&
      iacAvg >= r.minIacAvg &&
      (r.minStreak === undefined || bestStreak >= r.minStreak)
    ) {
      return r;
    }
  }
  return RANKS[0];
}

// Siguiente rango y cuánto falta
export function getNextRank(currentSlug: string): Rank | null {
  const idx = RANKS.findIndex(r => r.slug === currentSlug);
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

// Guardar stats semanales y recalcular rango
export async function saveWeeklyStatsAndRank(
  email: string,
  weekStart: string, // YYYY-MM-DD lunes
  iac: number,
  greenTotal: number,
  bestStreak: number
): Promise<Rank> {
  // Guardar stats de esta semana
  await supabaseAdmin
    .from("weekly_stats")
    .upsert({ email, week_start: weekStart, iac, green_total: greenTotal }, { onConflict: "email,week_start" });

  // Leer últimas 12 semanas activas (iac > 0)
  const { data: history } = await supabaseAdmin
    .from("weekly_stats")
    .select("iac, week_start")
    .eq("email", email)
    .gt("iac", 0)
    .order("week_start", { ascending: false })
    .limit(12);

  const activeWeeks = history?.length ?? 0;
  const iacAvg = activeWeeks > 0
    ? Math.round(history!.reduce((sum, w) => sum + w.iac, 0) / activeWeeks)
    : 0;

  const rank = calcRank(activeWeeks, iacAvg, bestStreak);

  // Persistir rango
  await supabaseAdmin
    .from("subscriptions")
    .update({ rank_slug: rank.slug, rank_updated_at: new Date().toISOString() })
    .eq("email", email);

  return rank;
}

// Obtener stats de rango para mostrar en UI
export async function getAgentRankStats(email: string): Promise<{
  rank: Rank;
  nextRank: Rank | null;
  activeWeeks: number;
  iacAvg: number;
  bestStreak: number;
}> {
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("rank_slug, streak_best")
    .eq("email", email)
    .single();

  const { data: history } = await supabaseAdmin
    .from("weekly_stats")
    .select("iac")
    .eq("email", email)
    .gt("iac", 0)
    .order("week_start", { ascending: false })
    .limit(12);

  const activeWeeks = history?.length ?? 0;
  const iacAvg = activeWeeks > 0
    ? Math.round(history!.reduce((sum, w) => sum + w.iac, 0) / activeWeeks)
    : 0;
  const bestStreak = sub?.streak_best ?? 0;
  const rank = getRankBySlug(sub?.rank_slug ?? "junior");
  const nextRank = getNextRank(rank.slug);

  return { rank, nextRank, activeWeeks, iacAvg, bestStreak };
}

/**
 * eventStore.ts
 * Persiste eventos de Google Calendar en Supabase.
 * Detecta tipo, deduplicapoar google_event_id, y computa estadísticas
 * por período (semana, mes, Q1-Q4, semestre, año).
 */
import { supabaseAdmin } from "./supabase";

const GREEN_COLOR_IDS = new Set(["2", "10"]);

const TYPE_KEYWORDS: Record<string, string[]> = {
  tasacion:     ["tasac"],
  visita:       ["visit"],
  propuesta:    ["propuesta", "oferta"],
  cierre:       ["cierre", "firma", "escritura", "boleto"],
  seguimiento:  ["seguimiento", "follow", "llamada", "llamado"],
  entrevista:   ["entrevista", "incorpora", "captac"],
  reunion:      ["reuni", "meeting", "junta"],
};

const PRODUCTIVE_KEYWORDS = Object.values(TYPE_KEYWORDS).flat();

export type EventType = "tasacion" | "visita" | "propuesta" | "cierre" | "seguimiento" | "entrevista" | "reunion" | "otro";

export interface CalendarEventRow {
  user_email: string;
  google_event_id: string;
  title: string;
  start_at: string;
  end_at: string;
  event_type: EventType;
  is_productive: boolean;
  attendees_count: number;
  source: "google_calendar";
  team_id?: string | null;
}

function detectType(title: string): EventType {
  const t = title.toLowerCase();
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    if (keywords.some(kw => t.includes(kw))) return type as EventType;
  }
  return "otro";
}

function isProductive(event: any): boolean {
  if (event.colorId && GREEN_COLOR_IDS.has(event.colorId)) return true;
  const title = (event.summary || "").toLowerCase();
  return PRODUCTIVE_KEYWORDS.some(kw => title.includes(kw));
}

function getAttendeesCount(event: any): number {
  if (!event.attendees) return 1;
  return event.attendees.filter((a: any) => a.responseStatus !== "declined").length || 1;
}

function getEndAt(event: any, startAt: string): string {
  if (event.end?.dateTime) return event.end.dateTime;
  if (event.end?.date) return new Date(event.end.date).toISOString();
  // Sin end: asumir 1 hora
  const d = new Date(startAt);
  d.setHours(d.getHours() + 1);
  return d.toISOString();
}

/**
 * Convierte eventos de Google Calendar API al formato de la tabla.
 */
export function mapGoogleEvents(
  googleEvents: any[],
  userEmail: string,
  teamId?: string | null
): CalendarEventRow[] {
  return googleEvents
    .filter(e => e.status !== "cancelled" && e.summary && (e.start?.dateTime || e.start?.date))
    .map(e => {
      const startAt = e.start.dateTime || new Date(e.start.date!).toISOString();
      return {
        user_email: userEmail,
        google_event_id: e.id!,
        title: e.summary!,
        start_at: startAt,
        end_at: getEndAt(e, startAt),
        event_type: detectType(e.summary!),
        is_productive: isProductive(e),
        attendees_count: getAttendeesCount(e),
        source: "google_calendar" as const,
        team_id: teamId || null,
      };
    });
}

/**
 * Upsert batch de eventos. Deduplicada por (user_email, google_event_id).
 */
export async function upsertEvents(events: CalendarEventRow[]): Promise<{ inserted: number; error?: string }> {
  if (!events.length) return { inserted: 0 };

  const { error, count } = await supabaseAdmin
    .from("calendar_events")
    .upsert(events, {
      onConflict: "user_email,google_event_id",
      ignoreDuplicates: false, // actualiza si cambió el título/fecha
    })
    .select("id");

  if (error) return { inserted: 0, error: error.message };
  return { inserted: count ?? events.length };
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────

export interface PeriodStats {
  total: number;
  productive: number;         // eventos is_productive = true
  byType: Record<EventType, number>;
  avgPerWeek: number;
  avgDurationMinutes: number;
  bestDayOfWeek: number;      // 0-6, el que más reuniones tiene
  bestHour: number;           // hora con más reuniones
  consistencyScore: number;   // 0-100: qué tan regular es semana a semana
  weeks: number;              // semanas en el período
}

export interface AgentStats {
  email: string;
  name?: string;
  avatar?: string;
  teamRole: string;
  currentWeek: number;        // reuniones esta semana
  prevWeek: number;           // semana anterior
  trend: "up" | "down" | "stable";
  productiveDaysThisWeek: number;
  monthly: PeriodStats;
  quarterly: Record<"Q1"|"Q2"|"Q3"|"Q4", PeriodStats>;
  semiannual: { H1: PeriodStats; H2: PeriodStats };
  annual: PeriodStats;
  funnel: {
    tasaciones: number;
    visitas: number;
    propuestas: number;
    cierres: number;
    conversionRate: number;   // cierres / tasaciones %
  };
}

async function getEventsInRange(email: string, from: Date, to: Date) {
  const { data } = await supabaseAdmin
    .from("calendar_events")
    .select("*")
    .eq("user_email", email)
    .gte("start_at", from.toISOString())
    .lte("start_at", to.toISOString())
    .order("start_at", { ascending: true });
  return data || [];
}

function computePeriodStats(events: any[], periodWeeks: number): PeriodStats {
  const productive = events.filter(e => e.is_productive);
  const byType: Record<string, number> = {};
  const byDow: Record<number, number> = {};
  const byHour: Record<number, number> = {};
  const byWeek: Record<number, number> = {};

  for (const e of events) {
    byType[e.event_type] = (byType[e.event_type] || 0) + 1;
    byDow[e.day_of_week] = (byDow[e.day_of_week] || 0) + 1;
    byHour[e.hour_of_day] = (byHour[e.hour_of_day] || 0) + 1;
    byWeek[e.week_of_year] = (byWeek[e.week_of_year] || 0) + 1;
  }

  const totalDuration = events.reduce((s, e) => s + (e.duration_minutes || 60), 0);
  const weekCounts = Object.values(byWeek) as number[];
  const avgPerWeek = periodWeeks > 0 ? events.length / periodWeeks : 0;

  // Consistencia: qué tan cerca de la media es cada semana (inverso de desviación)
  let consistencyScore = 100;
  if (weekCounts.length > 1 && avgPerWeek > 0) {
    const variance = weekCounts.reduce((s, v) => s + Math.pow(v - avgPerWeek, 2), 0) / weekCounts.length;
    const cv = Math.sqrt(variance) / avgPerWeek; // coeficiente de variación
    consistencyScore = Math.max(0, Math.round(100 - cv * 50));
  }

  const bestDow = Object.entries(byDow).sort((a, b) => b[1] - a[1])[0];
  const bestHr = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];

  return {
    total: events.length,
    productive: productive.length,
    byType: byType as Record<EventType, number>,
    avgPerWeek: Math.round(avgPerWeek * 10) / 10,
    avgDurationMinutes: events.length > 0 ? Math.round(totalDuration / events.length) : 0,
    bestDayOfWeek: bestDow ? parseInt(bestDow[0]) : 1,
    bestHour: bestHr ? parseInt(bestHr[0]) : 10,
    consistencyScore,
    weeks: periodWeeks,
  };
}

export async function getAgentStats(
  email: string,
  name?: string,
  avatar?: string,
  teamRole?: string
): Promise<AgentStats> {
  const now = new Date();
  const year = now.getFullYear();

  // Esta semana (lun-dom)
  const dow = now.getDay() || 7;
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - dow + 1); weekStart.setHours(0,0,0,0);
  const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(weekStart.getDate() - 7);
  const prevWeekEnd = new Date(weekStart); prevWeekEnd.setMilliseconds(-1);

  // Año completo
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const [thisWeekEvts, prevWeekEvts, yearEvts] = await Promise.all([
    getEventsInRange(email, weekStart, now),
    getEventsInRange(email, prevWeekStart, prevWeekEnd),
    getEventsInRange(email, yearStart, yearEnd),
  ]);

  const thisWeekProductive = thisWeekEvts.filter(e => e.is_productive);
  const prevWeekProductive = prevWeekEvts.filter(e => e.is_productive);

  // Tendencia
  const trend: "up" | "down" | "stable" =
    thisWeekProductive.length > prevWeekProductive.length ? "up" :
    thisWeekProductive.length < prevWeekProductive.length ? "down" : "stable";

  // Días productivos esta semana (días con ≥ 1 reunión productiva)
  const productiveDays = new Set(
    thisWeekProductive.map(e => new Date(e.start_at).toDateString())
  ).size;

  // Quarterly
  const quarters: Record<"Q1"|"Q2"|"Q3"|"Q4", PeriodStats> = {
    Q1: computePeriodStats(yearEvts.filter(e => e.quarter === 1), 13),
    Q2: computePeriodStats(yearEvts.filter(e => e.quarter === 2), 13),
    Q3: computePeriodStats(yearEvts.filter(e => e.quarter === 3), 13),
    Q4: computePeriodStats(yearEvts.filter(e => e.quarter === 4), 13),
  };

  // Semestral
  const H1 = computePeriodStats(yearEvts.filter(e => e.month <= 6), 26);
  const H2 = computePeriodStats(yearEvts.filter(e => e.month > 6), 26);

  // Mensual (mes actual)
  const monthStart = new Date(year, now.getMonth(), 1);
  const monthEvts = await getEventsInRange(email, monthStart, now);
  const monthly = computePeriodStats(monthEvts, 4);

  // Annual
  const annual = computePeriodStats(yearEvts, 52);

  // Funnel
  const funnelEvts = yearEvts.filter(e => e.is_productive);
  const tasaciones = funnelEvts.filter(e => e.event_type === "tasacion").length;
  const visitas = funnelEvts.filter(e => e.event_type === "visita").length;
  const propuestas = funnelEvts.filter(e => e.event_type === "propuesta").length;
  const cierres = funnelEvts.filter(e => e.event_type === "cierre").length;

  return {
    email,
    name,
    avatar,
    teamRole: teamRole || "member",
    currentWeek: thisWeekProductive.length,
    prevWeek: prevWeekProductive.length,
    trend,
    productiveDaysThisWeek: productiveDays,
    monthly,
    quarterly: quarters,
    semiannual: { H1, H2 },
    annual,
    funnel: {
      tasaciones,
      visitas,
      propuestas,
      cierres,
      conversionRate: tasaciones > 0 ? Math.round((cierres / tasaciones) * 100) : 0,
    },
  };
}

export async function getTeamStats(teamId: string) {
  const { data: members } = await supabaseAdmin
    .from("subscriptions")
    .select("email, name, avatar, team_role")
    .eq("team_id", teamId);

  if (!members?.length) return [];

  return Promise.all(
    members.map(m => getAgentStats(m.email, m.name, m.avatar, m.team_role))
  );
}

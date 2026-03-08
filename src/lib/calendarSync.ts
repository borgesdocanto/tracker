import { google } from "googleapis";
import { subDays, startOfDay, formatISO, startOfWeek, endOfWeek, subMonths } from "date-fns";
import { supabaseAdmin } from "./supabase";

const GREEN_COLOR_IDS = new Set(["2", "10"]);
const PRODUCTIVE_KEYWORDS = [
  "tasacion", "tasación", "visita", "propuesta", "reunion", "reunión",
  "meeting", "seguimiento", "cierre", "entrevista",
];

export type EventType = "tasacion" | "visita" | "propuesta" | "cierre" | "reunion" | "seguimiento" | "entrevista" | "otro";

export interface SyncedEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: EventType;
  isGreen: boolean;
  durationMinutes: number;
  attendeesCount: number;
}

export interface WeekStats {
  greenTotal: number;
  tasaciones: number;
  visitas: number;
  propuestas: number;
  cierres: number;
  reuniones: number;
  seguimientos: number;
  entrevistas: number;
  productiveDays: number;
  totalDays: number;
  productivityRate: number;
  weekDates: string;
}

export interface PeriodStats {
  total: number;
  tasaciones: number;
  visitas: number;
  propuestas: number;
  cierres: number;
  reuniones: number;
  seguimientos: number;
  entrevistas: number;
  productiveDays: number;
  avgPerWeek: number;
  conversionRate: number; // propuestas / tasaciones
  consistencyIndex: number; // 0-100
}

function detectType(title: string): EventType {
  const t = title.toLowerCase();
  if (t.includes("tasac")) return "tasacion";
  if (t.includes("visit")) return "visita";
  if (t.includes("propuesta")) return "propuesta";
  if (t.includes("cierr")) return "cierre";
  if (t.includes("seguim")) return "seguimiento";
  if (t.includes("entrevist")) return "entrevista";
  if (t.includes("reuni") || t.includes("meeting")) return "reunion";
  return "otro";
}

function isGreen(event: any): boolean {
  if (event.colorId && GREEN_COLOR_IDS.has(event.colorId)) return true;
  const title = (event.summary || "").toLowerCase();
  return PRODUCTIVE_KEYWORDS.some(kw => title.includes(kw));
}

function durationMinutes(event: any): number {
  if (!event.start?.dateTime || !event.end?.dateTime) return 60;
  return Math.round((new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / 60000);
}

function attendeesCount(event: any): number {
  return event.attendees?.length ?? 1;
}

// ── Fetch desde Google Calendar ───────────────────────────────────────────────
export async function fetchCalendarEvents(
  accessToken: string,
  days = 90
): Promise<SyncedEvent[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const timeMin = formatISO(startOfDay(subDays(now, days)));
  const timeMax = formatISO(now);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 2500,
  });

  return (response.data.items || [])
    .filter(e => e.status !== "cancelled" && e.summary && isGreen(e))
    .map(e => ({
      id: e.id!,
      title: e.summary!,
      start: e.start?.dateTime || e.start?.date || "",
      end: e.end?.dateTime || e.end?.date || "",
      type: detectType(e.summary!),
      isGreen: true,
      durationMinutes: durationMinutes(e),
      attendeesCount: attendeesCount(e),
    }));
}

// ── Persistir eventos en Supabase ─────────────────────────────────────────────
export async function persistEvents(
  userEmail: string,
  teamId: string | null | undefined,
  events: SyncedEvent[]
): Promise<void> {
  if (!events.length) return;

  const rows = events
    .filter(e => e.type !== "otro" && e.start)
    .map(e => ({
      user_email: userEmail,
      team_id: teamId || null,
      google_event_id: e.id,
      title: e.title,
      start_at: e.start,
      end_at: e.end || e.start,
      attendees_count: e.attendeesCount,
      event_type: e.type,
      is_productive: true,
      source: "google_calendar",
      synced_at: new Date().toISOString(),
    }));

  if (!rows.length) return;

  // Upsert — ignora duplicados por (user_email, google_event_id)
  await supabaseAdmin
    .from("calendar_events")
    .upsert(rows, { onConflict: "user_email,google_event_id", ignoreDuplicates: false });
}

// ── Sync completo: fetch + persist ────────────────────────────────────────────
export async function syncAndPersist(
  accessToken: string,
  userEmail: string,
  teamId: string | null | undefined,
  days = 30
): Promise<SyncedEvent[]> {
  const events = await fetchCalendarEvents(accessToken, days);
  await persistEvents(userEmail, teamId, events);
  return events;
}

// ── Leer eventos desde Supabase (sin tocar Google) ────────────────────────────
export async function getStoredEvents(
  userEmail: string,
  from: Date,
  to: Date
): Promise<SyncedEvent[]> {
  const { data } = await supabaseAdmin
    .from("calendar_events")
    .select("*")
    .eq("user_email", userEmail)
    .gte("start_at", from.toISOString())
    .lte("start_at", to.toISOString())
    .order("start_at", { ascending: true });

  return (data || []).map(r => ({
    id: r.google_event_id,
    title: r.title,
    start: r.start_at,
    end: r.end_at,
    type: r.event_type as EventType,
    isGreen: r.is_productive,
    durationMinutes: r.duration_minutes ?? 60,
    attendeesCount: r.attendees_count ?? 1,
  }));
}

// ── Stats de un período ───────────────────────────────────────────────────────
export function computePeriodStats(events: SyncedEvent[], periodDays: number): PeriodStats {
  const prod = events.filter(e => e.isGreen);
  const t = (type: EventType) => prod.filter(e => e.type === type).length;

  const tasaciones = t("tasacion");
  const propuestas = t("propuesta");

  // Días productivos (≥10 reuniones cara a cara en el día)
  const byDay: Record<string, number> = {};
  prod.forEach(e => {
    const day = e.start.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  });
  const productiveDays = Object.values(byDay).filter(c => c >= 10).length;

  // Consistencia: % de semanas con al menos 10 reuniones
  const byWeek: Record<string, number> = {};
  prod.forEach(e => {
    const d = new Date(e.start);
    const weekStart = startOfWeek(d, { weekStartsOn: 1 }).toISOString().slice(0, 10);
    byWeek[weekStart] = (byWeek[weekStart] || 0) + 1;
  });
  const weeks = Object.values(byWeek);
  const productiveWeeks = weeks.filter(c => c >= 10).length;
  const totalWeeks = Math.max(1, Math.ceil(periodDays / 7));
  const consistencyIndex = Math.round((productiveWeeks / totalWeeks) * 100);

  const avgPerWeek = Math.round((prod.length / totalWeeks) * 10) / 10;
  const conversionRate = tasaciones > 0 ? Math.round((propuestas / tasaciones) * 100) : 0;

  return {
    total: prod.length,
    tasaciones,
    visitas: t("visita"),
    propuestas,
    cierres: t("cierre"),
    reuniones: t("reunion"),
    seguimientos: t("seguimiento"),
    entrevistas: t("entrevista"),
    productiveDays,
    avgPerWeek,
    conversionRate,
    consistencyIndex,
  };
}

// ── Períodos estándar ─────────────────────────────────────────────────────────
export function getQuarter(q: 1 | 2 | 3 | 4, year: number): { from: Date; to: Date; days: number } {
  const starts = [0, 3, 6, 9];
  const from = new Date(year, starts[q - 1], 1);
  const to = new Date(year, starts[q - 1] + 3, 0, 23, 59, 59);
  const days = Math.ceil((to.getTime() - from.getTime()) / 86400000);
  return { from, to, days };
}

export function getSemester(s: 1 | 2, year: number): { from: Date; to: Date; days: number } {
  const from = new Date(year, s === 1 ? 0 : 6, 1);
  const to = new Date(year, s === 1 ? 6 : 12, 0, 23, 59, 59);
  const days = Math.ceil((to.getTime() - from.getTime()) / 86400000);
  return { from, to, days };
}

export function getYear(year: number): { from: Date; to: Date; days: number } {
  return {
    from: new Date(year, 0, 1),
    to: new Date(year, 11, 31, 23, 59, 59),
    days: 365,
  };
}

// ── WeekStats (para compatibilidad con el dashboard existente) ────────────────
export function computeWeekStats(events: SyncedEvent[], goalPerDay = 10): WeekStats {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const week = events.filter(e => {
    const d = new Date(e.start);
    return d >= weekStart && d <= weekEnd && e.isGreen;
  });

  const byDay: Record<string, number> = {};
  week.forEach(e => {
    const day = new Date(e.start).toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  });

  const workDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  }).filter(d => new Date(d).getDay() !== 0);

  const productiveDays = workDays.filter(d => (byDay[d] || 0) >= goalPerDay).length;
  const t = (type: EventType) => week.filter(e => e.type === type).length;

  return {
    greenTotal: week.length,
    tasaciones: t("tasacion"),
    visitas: t("visita"),
    propuestas: t("propuesta"),
    cierres: t("cierre"),
    reuniones: t("reunion"),
    seguimientos: t("seguimiento"),
    entrevistas: t("entrevista"),
    productiveDays,
    totalDays: workDays.length,
    productivityRate: workDays.length > 0 ? Math.round((productiveDays / workDays.length) * 100) : 0,
    weekDates: `${weekStart.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`,
  };
}

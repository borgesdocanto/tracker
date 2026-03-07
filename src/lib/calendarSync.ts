import { google } from "googleapis";
import { subDays, startOfDay, formatISO, startOfWeek, endOfWeek } from "date-fns";

const GREEN_COLOR_IDS = new Set(["2", "10"]);
const PRODUCTIVE_KEYWORDS = [
  "tasacion", "tasación", "visita", "propuesta", "reunion", "reunión",
  "meeting", "seguimiento", "cierre", "entrevista",
];

export interface SyncedEvent {
  id: string;
  title: string;
  start: string;
  type: "tasacion" | "visita" | "propuesta" | "reunion" | "otro";
  isGreen: boolean;
}

export interface WeekStats {
  greenTotal: number;
  tasaciones: number;
  visitas: number;
  propuestas: number;
  reuniones: number;
  productiveDays: number;
  totalDays: number;
  productivityRate: number;
  weekDates: string;
}

function detectType(title: string): SyncedEvent["type"] {
  const t = title.toLowerCase();
  if (t.includes("tasac")) return "tasacion";
  if (t.includes("visit")) return "visita";
  if (t.includes("propuesta")) return "propuesta";
  if (t.includes("reuni") || t.includes("meeting")) return "reunion";
  return "otro";
}

function isGreen(event: any): boolean {
  if (event.colorId && GREEN_COLOR_IDS.has(event.colorId)) return true;
  const title = (event.summary || "").toLowerCase();
  return PRODUCTIVE_KEYWORDS.some(kw => title.includes(kw));
}

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
    maxResults: 1000,
  });

  return (response.data.items || [])
    .filter(e => e.status !== "cancelled" && e.summary)
    .map(e => ({
      id: e.id!,
      title: e.summary!,
      start: e.start?.dateTime || e.start?.date || "",
      type: detectType(e.summary!),
      isGreen: isGreen(e),
    }));
}

export function computeWeekStats(events: SyncedEvent[], goalPerDay = 10): WeekStats {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // lunes
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const weekEvents = events.filter(e => {
    const d = new Date(e.start);
    return d >= weekStart && d <= weekEnd;
  });

  const byDay: Record<string, SyncedEvent[]> = {};
  weekEvents.forEach(e => {
    const day = e.start.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(e);
  });

  const greens = weekEvents.filter(e => e.isGreen);
  const productiveDays = Object.values(byDay).filter(
    d => d.filter(e => e.isGreen).length >= goalPerDay
  ).length;
  const totalDays = Object.keys(byDay).length || 1;

  // Formato "2 al 8 de junio"
  const fmt = (d: Date) => d.toLocaleDateString("es-AR", { day: "numeric", month: "long" });
  const weekDates = `${fmt(weekStart)} al ${fmt(weekEnd)}`;

  return {
    greenTotal: greens.length,
    tasaciones: greens.filter(e => e.type === "tasacion").length,
    visitas: greens.filter(e => e.type === "visita").length,
    propuestas: greens.filter(e => e.type === "propuesta").length,
    reuniones: greens.filter(e => e.type === "reunion").length,
    productiveDays,
    totalDays,
    productivityRate: Math.round((productiveDays / totalDays) * 100),
    weekDates,
  };
}

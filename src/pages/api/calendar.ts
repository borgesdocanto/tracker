import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { google } from "googleapis";
import { startOfDay, endOfDay, subDays, formatISO } from "date-fns";
import { syncAndPersist } from "../../lib/calendarSync";
import { supabaseAdmin } from "../../lib/supabase";

const GREEN_COLOR_IDS = new Set(["2", "10"]);
const PRODUCTIVE_KEYWORDS = [
  "tasacion", "tasación", "visita", "propuesta", "reunion", "reunión",
  "meeting", "seguimiento", "cierre", "entrevista",
];

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  colorId?: string;
  isGreen: boolean;
  type: "tasacion" | "visita" | "propuesta" | "cierre" | "reunion" | "seguimiento" | "entrevista" | "otro";
  attendees: string[];
}

export interface DailySummary {
  date: string;
  greenCount: number;
  events: CalendarEvent[];
  isProductive: boolean;
}

function detectType(title: string): CalendarEvent["type"] {
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

function isGreenEvent(event: any): boolean {
  if (event.colorId && GREEN_COLOR_IDS.has(event.colorId)) return true;
  const title = (event.summary || "").toLowerCase();
  return PRODUCTIVE_KEYWORDS.some(kw => title.includes(kw));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "No autenticado" });

  const accessToken = (session as any).accessToken;
  if (!accessToken) return res.status(401).json({ error: "Sin token de Calendar" });

  const days = parseInt(req.query.days as string) || 30;

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date();
    const timeMin = formatISO(startOfDay(subDays(now, days)));
    const timeMax = formatISO(endOfDay(now));

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 2500,
    });

    const items = response.data.items || [];

    const mappedEvents: CalendarEvent[] = items
      .filter(e => e.status !== "cancelled" && e.summary)
      .map(e => ({
        id: e.id!,
        title: e.summary!,
        start: e.start?.dateTime || e.start?.date || "",
        end: e.end?.dateTime || e.end?.date || "",
        colorId: e.colorId ?? undefined,
        isGreen: isGreenEvent(e),
        type: detectType(e.summary!),
        attendees: (e.attendees || []).filter((a: any) => !a.self).map((a: any) => a.email || a.displayName || ""),
      }));

    // Persistir en background sin bloquear la respuesta
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("team_id")
      .eq("email", session.user?.email!)
      .single();

    syncAndPersist(accessToken, session.user?.email!, sub?.team_id, days)
      .catch(e => console.error("Persist error:", e));

    // Agrupar por día
    const byDay: Record<string, CalendarEvent[]> = {};
    mappedEvents.forEach(ev => {
      const day = ev.start.slice(0, 10);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(ev);
    });

    const productivityGoal = parseInt(process.env.NEXT_PUBLIC_PRODUCTIVITY_GOAL || "10");

    const dailySummaries: DailySummary[] = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, events]) => {
        const greenCount = events.filter(e => e.isGreen).length;
        return { date, greenCount, events, isProductive: greenCount >= productivityGoal };
      });

    const greenEvents = mappedEvents.filter(e => e.isGreen);
    const totals = {
      tasaciones: greenEvents.filter(e => e.type === "tasacion").length,
      visitas: greenEvents.filter(e => e.type === "visita").length,
      propuestas: greenEvents.filter(e => e.type === "propuesta").length,
      cierres: greenEvents.filter(e => e.type === "cierre").length,
      reuniones: greenEvents.filter(e => e.type === "reunion").length,
      seguimientos: greenEvents.filter(e => e.type === "seguimiento").length,
      entrevistas: greenEvents.filter(e => e.type === "entrevista").length,
      totalGreen: greenEvents.length,
      totalEvents: mappedEvents.length,
    };

    const productiveDays = dailySummaries.filter(d => d.isProductive).length;
    const totalDays = dailySummaries.length;

    return res.status(200).json({
      user: { name: session.user?.name, email: session.user?.email, image: session.user?.image },
      syncedAt: new Date().toISOString(),
      period: { from: timeMin, to: timeMax, days },
      totals,
      productivityGoal,
      productiveDays,
      totalDays,
      productivityRate: totalDays > 0 ? Math.round((productiveDays / totalDays) * 100) : 0,
      dailySummaries,
      recentEvents: mappedEvents.slice(-50).reverse(),
    });
  } catch (err: any) {
    console.error("Calendar API error:", err?.message);
    return res.status(500).json({ error: "Error al consultar Google Calendar", detail: err?.message });
  }
}

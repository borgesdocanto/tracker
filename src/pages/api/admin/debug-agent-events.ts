import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase";
import { isSuperAdmin } from "../../../lib/adminGuard";
import { getValidAccessToken } from "../../../lib/googleToken";
import { google } from "googleapis";
import { formatISO, startOfDay, subDays, addDays } from "date-fns";

export const config = { maxDuration: 60 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!isSuperAdmin(session?.user?.email)) return res.status(403).end();

  const email = req.query.email as string;
  if (!email) return res.status(400).json({ error: "email requerido" });

  const accessToken = await getValidAccessToken(email);
  if (!accessToken) return res.status(200).json({ error: "no token" });

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const timeMin = formatISO(startOfDay(subDays(now, 7)));
  const timeMax = formatISO(addDays(now, 7));

  // 1. Listar calendarios
  let calendars: any[] = [];
  let calListError = null;
  try {
    const calList = await calendar.calendarList.list();
    calendars = (calList.data.items || []).map(c => ({
      id: c.id, name: c.summary, primary: !!c.primary, role: c.accessRole,
    }));
  } catch (e: any) { calListError = e.message; }

  // 2. Fetch eventos de cada calendario esta semana
  const calResults: any[] = [];
  const calIds = calendars.length > 0
    ? calendars.filter(c => c.role === "owner" || c.role === "writer").map((c: any) => c.id)
    : ["primary"];

  for (const calId of calIds) {
    const events: any[] = [];
    let err = null;
    try {
      let pageToken: string | undefined;
      do {
        const r: any = await calendar.events.list({
          calendarId: calId, timeMin, timeMax,
          singleEvents: true, orderBy: "startTime", maxResults: 250,
          ...(pageToken ? { pageToken } : {}),
        });
        events.push(...(r.data.items || []).filter((e: any) => e.status !== "cancelled" && e.summary));
        pageToken = r.data.nextPageToken ?? undefined;
      } while (pageToken);
    } catch (e: any) { err = e.message; }

    calResults.push({
      calendarId: calId,
      name: calendars.find(c => c.id === calId)?.name ?? calId,
      primary: calendars.find(c => c.id === calId)?.primary ?? false,
      error: err,
      count: events.length,
      events: events.map(e => ({
        title: e.summary,
        start: e.start?.dateTime || e.start?.date,
        organizer_self: e.organizer?.self ?? "MISSING",
        organizer_email: e.organizer?.email,
        status: e.status,
        colorId: e.colorId ?? null,
      })),
    });
  }

  // 3. DB esta semana
  const { data: dbEvents } = await supabaseAdmin
    .from("calendar_events").select("title, start_at, is_productive, is_organizer, event_type")
    .eq("user_email", email)
    .gte("start_at", timeMin).lte("start_at", timeMax)
    .order("start_at");

  const { count: dbTotal } = await supabaseAdmin
    .from("calendar_events").select("*", { count: "exact", head: true }).eq("user_email", email);

  return res.status(200).json({
    calListError,
    calendars,
    google: calResults,
    db: {
      total: dbTotal,
      this_week: dbEvents?.length,
      events: dbEvents?.map(e => ({
        title: e.title,
        start_ar: new Date(e.start_at).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
        green: e.is_productive, organizer: e.is_organizer, type: e.event_type,
      })),
    },
  });
}

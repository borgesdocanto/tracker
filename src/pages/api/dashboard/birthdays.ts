import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase";
import { getEffectiveEmail } from "../../../lib/impersonation";

export interface UpcomingEvent {
  email: string;
  name: string;
  date: string; // "YYYY-MM-DD"
  daysUntil: number;
  isToday: boolean;
  type: "birthday" | "anniversary";
  years?: number; // años de aniversario (si tiene año real)
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d = new Date(dateStr + "T12:00:00");
  let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (next < todayNorm) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
  return Math.round((next.getTime() - todayNorm.getTime()) / (1000 * 60 * 60 * 24));
}

function getYears(dateStr: string): number | undefined {
  const d = new Date(dateStr + "T12:00:00");
  if (d.getFullYear() === 1900) return undefined;
  const today = new Date();
  return today.getFullYear() - d.getFullYear();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const effectiveEmail = getEffectiveEmail(req, session);

  const { data: requester } = await supabaseAdmin
    .from("subscriptions")
    .select("team_id")
    .eq("email", effectiveEmail)
    .single();

  if (!requester?.team_id) return res.json({ events: [] });

  const { data: members } = await supabaseAdmin
    .from("subscriptions")
    .select("email, name, birthday, work_anniversary")
    .eq("team_id", requester.team_id)
    .neq("email", effectiveEmail); // excluir al usuario actual

  if (!members || members.length === 0) return res.json({ events: [] });

  const DAYS_AHEAD = 7;
  const events: UpcomingEvent[] = [];

  for (const m of members) {
    if (m.birthday) {
      const days = getDaysUntil(m.birthday);
      if (days <= DAYS_AHEAD) {
        events.push({
          email: m.email,
          name: m.name || m.email,
          date: m.birthday,
          daysUntil: days,
          isToday: days === 0,
          type: "birthday",
        });
      }
    }
    if (m.work_anniversary) {
      const days = getDaysUntil(m.work_anniversary);
      if (days <= DAYS_AHEAD) {
        events.push({
          email: m.email,
          name: m.name || m.email,
          date: m.work_anniversary,
          daysUntil: days,
          isToday: days === 0,
          type: "anniversary",
          years: getYears(m.work_anniversary),
        });
      }
    }
  }

  events.sort((a, b) => a.daysUntil - b.daysUntil);
  return res.json({ events });
}

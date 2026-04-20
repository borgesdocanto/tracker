import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { getEffectiveEmail } from "../../lib/impersonation";
import { getStoredEvents, computePeriodStats, getQuarter, getSemester, getYear } from "../../lib/calendarSync";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const email = getEffectiveEmail(req, session) ?? session.user.email;

    const now = new Date();
  const year = now.getFullYear();

  // Calculamos todos los períodos en paralelo
  const [q1, q2, q3, q4, s1, s2, annual, last30, last90] = await Promise.all([
    getStoredEvents(email, getQuarter(1, year).from, getQuarter(1, year).to),
    getStoredEvents(email, getQuarter(2, year).from, getQuarter(2, year).to),
    getStoredEvents(email, getQuarter(3, year).from, getQuarter(3, year).to),
    getStoredEvents(email, getQuarter(4, year).from, getQuarter(4, year).to),
    getStoredEvents(email, getSemester(1, year).from, getSemester(1, year).to),
    getStoredEvents(email, getSemester(2, year).from, getSemester(2, year).to),
    getStoredEvents(email, getYear(year).from, getYear(year).to),
    getStoredEvents(email, new Date(now.getTime() - 30 * 86400000), now),
    getStoredEvents(email, new Date(now.getTime() - 90 * 86400000), now),
  ]);

  return res.status(200).json({
    year,
    quarters: {
      q1: computePeriodStats(q1, getQuarter(1, year).days),
      q2: computePeriodStats(q2, getQuarter(2, year).days),
      q3: computePeriodStats(q3, getQuarter(3, year).days),
      q4: computePeriodStats(q4, getQuarter(4, year).days),
    },
    semesters: {
      s1: computePeriodStats(s1, getSemester(1, year).days),
      s2: computePeriodStats(s2, getSemester(2, year).days),
    },
    annual: computePeriodStats(annual, getYear(year).days),
    last30: computePeriodStats(last30, 30),
    last90: computePeriodStats(last90, 90),
  });
}

import { supabaseAdmin } from "./supabase";

// Racha: mínimo 1 evento verde por día hábil (lunes a viernes)
const MIN_GREENS_STREAK = 1;

// Día hábil = lunes a viernes
function isWeekday(date: Date): boolean {
  const d = date.getDay();
  return d !== 0 && d !== 6;
}

// Día hábil anterior
function prevWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  do { d.setDate(d.getDate() - 1); } while (!isWeekday(d));
  return d.toISOString().slice(0, 10);
}

// Fecha local Argentina (UTC-3)
function localDateStr(d: Date = new Date()): string {
  const ar = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return ar.toISOString().slice(0, 10);
}

export interface StreakData {
  current: number;
  best: number;
  lastActiveDate: string | null;
  todayActive: boolean;
  minGreens: number;
}

// Calcula y persiste el streak leyendo el historial completo desde DB
export async function computeAndSaveStreak(
  email: string,
  _dailySummaries: Array<{ date: string; greenCount: number }> // mantenemos firma para compatibilidad
): Promise<StreakData> {

  // Leer todos los eventos verdes del último año desde DB
  const from = new Date();
  from.setDate(from.getDate() - 365);

  const { data: events } = await supabaseAdmin
    .from("calendar_events")
    .select("start_at")
    .eq("user_email", email)
    .eq("is_productive", true)
    .gte("start_at", from.toISOString())
    .order("start_at");

  // Contar eventos verdes por fecha local AR
  const countByDay: Record<string, number> = {};
  for (const ev of events || []) {
    const dateStr = localDateStr(new Date(ev.start_at));
    countByDay[dateStr] = (countByDay[dateStr] || 0) + 1;
  }

  // Días activos = días hábiles con al menos 1 evento verde
  const activeDays = new Set(
    Object.entries(countByDay)
      .filter(([date, count]) => isWeekday(new Date(date + "T12:00:00")) && count >= MIN_GREENS_STREAK)
      .map(([date]) => date)
  );

  const todayStr = localDateStr();
  const todayActive = activeDays.has(todayStr);

  // Racha actual: desde hoy hacia atrás en días hábiles
  let cursor = todayStr;
  if (!isWeekday(new Date(cursor + "T12:00:00"))) {
    cursor = prevWeekday(cursor); // si hoy es sáb/dom, empezar desde el viernes
  }

  const allDates = Object.keys(countByDay).sort();
  const oldest = allDates[0] ?? todayStr;

  let current = 0;
  while (cursor >= oldest) {
    if (activeDays.has(cursor)) {
      current++;
      cursor = prevWeekday(cursor);
    } else if (cursor === todayStr && !todayActive) {
      // Hoy puede estar en progreso — no rompe la racha
      cursor = prevWeekday(cursor);
    } else {
      break;
    }
  }

  // Mejor racha histórica
  const weekdays = allDates
    .filter(d => isWeekday(new Date(d + "T12:00:00")))
    .sort();

  let best = current;
  let tempStreak = 0;
  let prevDay: string | null = null;

  for (const day of weekdays) {
    if (activeDays.has(day)) {
      if (prevDay !== null && prevWeekday(day) === prevDay) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      if (tempStreak > best) best = tempStreak;
      prevDay = day;
    } else {
      tempStreak = 0;
      prevDay = null;
    }
  }

  // Preservar mejor racha histórica guardada
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("streak_best")
    .eq("email", email)
    .single();

  const finalBest = Math.max(best, sub?.streak_best ?? 0, current);

  await supabaseAdmin
    .from("subscriptions")
    .update({
      streak_current: current,
      streak_best: finalBest,
      streak_last_active_date: todayActive ? todayStr : (current > 0 ? prevWeekday(todayStr) : null),
    })
    .eq("email", email);

  return { current, best: finalBest, lastActiveDate: todayActive ? todayStr : null, todayActive, minGreens: MIN_GREENS_STREAK };
}

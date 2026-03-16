import { supabaseAdmin } from "./supabase";
import { getGoals } from "./appConfig";

// Día hábil = lunes a viernes (0=Dom, 6=Sab)
function isWeekday(date: Date): boolean {
  const d = date.getDay();
  return d !== 0 && d !== 6;
}

// Retorna el día hábil anterior a una fecha dada
function prevWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  do { d.setDate(d.getDate() - 1); } while (!isWeekday(d));
  return d.toISOString().slice(0, 10);
}

export interface StreakData {
  current: number;
  best: number;
  lastActiveDate: string | null;
  todayActive: boolean;
  minGreens: number; // umbral para mantener racha
}

// Calcular y persistir el streak a partir de los dailySummaries
export async function computeAndSaveStreak(
  email: string,
  dailySummaries: Array<{ date: string; greenCount: number }>
): Promise<StreakData> {

  const { productiveDayMin } = await getGoals();
  const MIN_GREENS = productiveDayMin;
  const activeDays = new Set(
    dailySummaries
      .filter(d => {
        const dt = new Date(d.date + "T12:00:00");
        return isWeekday(dt) && d.greenCount >= MIN_GREENS;
      })
      .map(d => d.date)
  );

  // Ordenar días hábiles disponibles
  const sortedDays = dailySummaries
    .map(d => d.date)
    .filter(d => isWeekday(new Date(d + "T12:00:00")))
    .sort();

  if (sortedDays.length === 0) {
    return { current: 0, best: 0, lastActiveDate: null, todayActive: false, minGreens: MIN_GREENS };
  }

  // Calcular racha actual desde hoy hacia atrás
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const todayActive = activeDays.has(todayStr);

  // Empezar desde hoy o desde el último día hábil si hoy no hay datos
  let cursor = todayStr;
  // Si hoy es finde, empezar desde el último viernes
  if (!isWeekday(new Date(cursor + "T12:00:00"))) {
    cursor = prevWeekday(cursor);
  }

  let current = 0;
  // Contar hacia atrás mientras haya días activos consecutivos
  // Si hoy aún no tiene datos (puede estar en progreso), no lo contamos como roto
  let checkCursor = cursor;
  const oldestDay = sortedDays[0];

  while (checkCursor >= oldestDay) {
    if (activeDays.has(checkCursor)) {
      current++;
      checkCursor = prevWeekday(checkCursor);
    } else if (checkCursor === todayStr && !todayActive) {
      // Hoy aún no completó pero no rompemos — puede estar en progreso
      checkCursor = prevWeekday(checkCursor);
    } else {
      break;
    }
  }

  // Calcular mejor racha histórica
  let best = current;
  let tempStreak = 0;
  let prevDay: string | null = null;

  for (const day of sortedDays) {
    if (activeDays.has(day)) {
      if (prevDay === null || day === prevWeekday(day) || true) {
        // Verificar consecutividad real
        if (prevDay !== null) {
          const expectedPrev = prevWeekday(day);
          if (prevDay === expectedPrev) {
            tempStreak++;
          } else {
            tempStreak = 1;
          }
        } else {
          tempStreak = 1;
        }
        if (tempStreak > best) best = tempStreak;
        prevDay = day;
      }
    } else {
      tempStreak = 0;
      prevDay = null;
    }
  }

  // Recuperar mejor racha guardada (puede ser mayor que lo calculado con datos actuales)
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("streak_best")
    .eq("email", email)
    .single();

  const savedBest = sub?.streak_best ?? 0;
  const finalBest = Math.max(best, savedBest, current);

  // Guardar en Supabase
  await supabaseAdmin
    .from("subscriptions")
    .update({
      streak_current: current,
      streak_best: finalBest,
      streak_last_active_date: todayActive ? todayStr : (current > 0 ? prevWeekday(todayStr) : null),
    })
    .eq("email", email);

  return {
    current,
    best: finalBest,
    lastActiveDate: todayActive ? todayStr : null,
    todayActive,
    minGreens: MIN_GREENS,
  };
}

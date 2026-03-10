import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Loader2, DollarSign } from "lucide-react";

const RED = "#aa0000";
const GREEN = "#16a34a";

interface CalendarEvent { id: string; title: string; type: string; isGreen: boolean; start: string; }
interface DaySummary { date: string; greenCount: number; isProductive: boolean; events: CalendarEvent[]; }

function formatHour(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Weekly Calendar View — idéntica al dashboard ─────────────────────────────
function WeeklyView({ summaries, weekOffset, onPrev, onNext }: {
  summaries: DaySummary[]; weekOffset: number; onPrev: () => void; onNext: () => void;
}) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7); // Monday

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const byDate = useMemo(() => {
    const m: Record<string, DaySummary> = {};
    summaries.forEach(s => { m[s.date] = s; });
    return m;
  }, [summaries]);

  const weekLabel = `${days[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" })} — ${days[6].toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}`;
  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <span className="text-sm font-bold text-gray-700">{weekLabel}</span>
        <div className="flex items-center gap-1">
          <button onClick={onPrev} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <ChevronLeft size={14} className="text-gray-500" />
          </button>
          <button onClick={onNext} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <ChevronRight size={14} className="text-gray-500" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 divide-x divide-gray-100 min-h-[320px]">
        {days.map((day, i) => {
          const dateStr = day.toISOString().slice(0, 10);
          const summary = byDate[dateStr];
          const isToday = dateStr === today.toISOString().slice(0, 10);
          return (
            <div key={dateStr} className="flex flex-col">
              <div className="px-2 py-2 text-center border-b border-gray-100">
                <div className="text-xs font-semibold text-gray-400 uppercase">{dayNames[i]}</div>
                <div className={`text-sm font-black mt-0.5 w-7 h-7 rounded-full flex items-center justify-center mx-auto ${isToday ? "text-white" : "text-gray-700"}`}
                  style={{ background: isToday ? RED : "transparent" }}>
                  {day.getDate()}
                </div>
                {summary && (
                  <div className="mt-1 text-xs font-bold" style={{ color: summary.isProductive ? GREEN : "#9ca3af" }}>
                    {summary.greenCount}✦
                  </div>
                )}
              </div>
              <div className="flex-1 p-1 space-y-1 overflow-y-auto max-h-60">
                {summary?.events.map(ev => (
                  <div key={ev.id}
                    className={`text-xs px-2 py-1.5 rounded-md font-medium truncate border-l-2 ${ev.isGreen ? "bg-green-50 border-green-400 text-green-800" : "bg-gray-50 border-gray-200 text-gray-400"}`}
                    title={ev.title}>
                    {ev.start.includes("T") && (
                      <span className={`text-xs mr-1 ${ev.isGreen ? "text-green-600" : "text-gray-300"}`}>{formatHour(ev.start)}</span>
                    )}
                    {ev.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Monthly Calendar View — idéntica al dashboard ───────────────────────────
function MonthlyView({ summaries, monthOffset, onPrev, onNext }: {
  summaries: DaySummary[]; monthOffset: number; onPrev: () => void; onNext: () => void;
}) {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = target.getFullYear();
  const month = target.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;

  const byDate = useMemo(() => {
    const m: Record<string, DaySummary> = {};
    summaries.forEach(s => { m[s.date] = s; });
    return m;
  }, [summaries]);

  const monthLabel = target.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <span className="text-sm font-bold text-gray-700 capitalize">{monthLabel}</span>
        <div className="flex gap-1">
          <button onClick={onPrev} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <ChevronLeft size={14} className="text-gray-500" />
          </button>
          <button onClick={onNext} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
            <ChevronRight size={14} className="text-gray-500" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-gray-100">
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2 uppercase">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - startPad + 1;
          if (dayNum < 1 || dayNum > lastDay.getDate()) {
            return <div key={i} className="h-20 bg-gray-50/50" />;
          }
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const summary = byDate[dateStr];
          const isToday = dateStr === today.toISOString().slice(0, 10);
          const greenEvs = summary?.events.filter(e => e.isGreen) ?? [];
          const grayEvs = summary?.events.filter(e => !e.isGreen) ?? [];

          return (
            <div key={dateStr} className={`h-20 p-1.5 flex flex-col ${isToday ? "bg-red-50" : ""}`}>
              <div className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center mb-1 ${isToday ? "text-white" : "text-gray-600"}`}
                style={{ background: isToday ? RED : "transparent" }}>
                {dayNum}
              </div>
              <div className="flex-1 overflow-hidden space-y-0.5">
                {greenEvs.slice(0, 2).map(ev => (
                  <div key={ev.id} className="text-xs bg-green-100 text-green-800 rounded px-1 truncate font-medium leading-tight py-0.5">
                    {ev.title}
                  </div>
                ))}
                {grayEvs.slice(0, 1).map(ev => (
                  <div key={ev.id} className="text-xs bg-gray-100 text-gray-400 rounded px-1 truncate leading-tight py-0.5">
                    {ev.title}
                  </div>
                ))}
                {(greenEvs.length + grayEvs.length) > 3 && (
                  <div className="text-xs text-gray-300 font-medium">+{greenEvs.length + grayEvs.length - 3} más</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main exported component ──────────────────────────────────────────────────
export default function AgentCalendar({ agentEmail }: { agentEmail: string }) {
  const [calView, setCalView] = useState<"week" | "month">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [summaries, setSummaries] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRange = useMemo(() => {
    const today = new Date();
    if (calView === "week") {
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
      return { year: monday.getFullYear(), month: monday.getMonth() };
    } else {
      const target = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      return { year: target.getFullYear(), month: target.getMonth() };
    }
  }, [calView, weekOffset, monthOffset]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/agent-calendar?agentEmail=${encodeURIComponent(agentEmail)}&year=${fetchRange.year}&month=${fetchRange.month}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.events) return;
        const byDate: Record<string, DaySummary> = {};
        d.events.forEach((e: CalendarEvent) => {
          const date = e.start.slice(0, 10);
          if (!byDate[date]) byDate[date] = { date, greenCount: 0, isProductive: false, events: [] };
          byDate[date].events.push(e);
          if (e.isGreen) byDate[date].greenCount++;
        });
        // sort events within each day by start time
        Object.values(byDate).forEach(s => {
          s.events.sort((a, b) => a.start.localeCompare(b.start));
          s.isProductive = s.greenCount >= 3;
        });
        setSummaries(Object.values(byDate));
      })
      .finally(() => setLoading(false));
  }, [agentEmail, fetchRange]);

  return (
    <div className="space-y-3">
      {/* Toggle semana / mes — mismo estilo que dashboard */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["week", "month"] as const).map(v => (
            <button key={v} onClick={() => setCalView(v)}
              className="text-xs font-bold px-4 py-1.5 rounded-lg transition-all"
              style={{
                background: calView === v ? "white" : "transparent",
                color: calView === v ? "#111827" : "#9ca3af",
                boxShadow: calView === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}>
              {v === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
        {loading && <Loader2 size={13} className="animate-spin text-gray-300" />}
      </div>

      {calView === "week" ? (
        <WeeklyView
          summaries={summaries}
          weekOffset={weekOffset}
          onPrev={() => setWeekOffset(o => o - 1)}
          onNext={() => setWeekOffset(o => o + 1)}
        />
      ) : (
        <MonthlyView
          summaries={summaries}
          monthOffset={monthOffset}
          onPrev={() => setMonthOffset(o => o - 1)}
          onNext={() => setMonthOffset(o => o + 1)}
        />
      )}
    </div>
  );
}

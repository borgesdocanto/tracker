import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Users, Target, Award, AlertTriangle, Loader2, ChevronDown } from "lucide-react";
import type { AgentStats } from "../../lib/eventStore";

const RED = "#aa0000";
const GREEN = "#16a34a";

const DOW = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const QUARTERS = ["Q1","Q2","Q3","Q4"] as const;

function TrendIcon({ trend }: { trend: "up"|"down"|"stable" }) {
  if (trend === "up") return <TrendingUp size={13} style={{ color: GREEN }} />;
  if (trend === "down") return <TrendingDown size={13} style={{ color: RED }} />;
  return <Minus size={13} className="text-gray-400" />;
}

function Semaforo({ value, low = 5, high = 12 }: { value: number; low?: number; high?: number }) {
  const color = value >= high ? GREEN : value >= low ? "#f59e0b" : RED;
  return (
    <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
  );
}

function StatPill({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 900, color: "#111827", lineHeight: 1 }}>{value}</div>
      <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function AgentCard({ stats, onClick }: { stats: AgentStats; onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="bg-white border border-gray-100 rounded-2xl p-5 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all">
      <div className="flex items-center gap-3 mb-4">
        {stats.avatar
          ? <img src={stats.avatar} className="w-9 h-9 rounded-full" alt="" />
          : <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-black text-gray-400">
              {(stats.name || stats.email)[0].toUpperCase()}
            </div>
        }
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{stats.name || stats.email}</div>
          <div className="text-xs text-gray-400 truncate">{stats.email}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <Semaforo value={stats.currentWeek} />
          <TrendIcon trend={stats.trend} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <StatPill label="Esta semana" value={stats.currentWeek} />
        <StatPill label="Días prod." value={stats.productiveDaysThisWeek} />
        <StatPill label="Promedio/sem" value={stats.monthly.avgPerWeek} />
        <StatPill label="Consistencia" value={`${stats.monthly.consistencyScore}%`} />
      </div>

      {/* Mini funnel */}
      <div className="mt-4 pt-4 border-t border-gray-50 flex gap-3 text-xs">
        {[
          { label: "Tasaciones", val: stats.funnel.tasaciones },
          { label: "Propuestas", val: stats.funnel.propuestas },
          { label: "Cierres", val: stats.funnel.cierres },
          { label: "Conversión", val: `${stats.funnel.conversionRate}%` },
        ].map((f, i) => (
          <div key={i} className="flex-1 text-center">
            <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 900, color: i === 3 ? RED : "#111827" }}>{f.val}</div>
            <div className="text-gray-400 mt-0.5">{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentDetail({ stats, onBack }: { stats: AgentStats; onBack: () => void }) {
  const [period, setPeriod] = useState<"monthly"|"Q1"|"Q2"|"Q3"|"Q4"|"H1"|"H2"|"annual">("monthly");

  const periodData = period === "monthly" ? stats.monthly
    : period === "annual" ? stats.annual
    : period === "H1" ? stats.semiannual.H1
    : period === "H2" ? stats.semiannual.H2
    : stats.quarterly[period as "Q1"|"Q2"|"Q3"|"Q4"];

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-gray-700">
        <ArrowLeft size={13} /> Volver al equipo
      </button>

      {/* Header agente */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4">
        {stats.avatar
          ? <img src={stats.avatar} className="w-12 h-12 rounded-full" alt="" />
          : <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-black text-gray-400">
              {(stats.name || stats.email)[0].toUpperCase()}
            </div>
        }
        <div>
          <div className="font-black text-lg text-gray-900" style={{ fontFamily: "Georgia, serif" }}>{stats.name || stats.email}</div>
          <div className="text-xs text-gray-400">{stats.email}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <TrendIcon trend={stats.trend} />
          <span className="text-xs font-medium text-gray-500">
            {stats.currentWeek} esta semana vs {stats.prevWeek} anterior
          </span>
        </div>
      </div>

      {/* Selector de período */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "monthly", label: "Este mes" },
          { key: "Q1", label: "Q1" }, { key: "Q2", label: "Q2" },
          { key: "Q3", label: "Q3" }, { key: "Q4", label: "Q4" },
          { key: "H1", label: "H1" }, { key: "H2", label: "H2" },
          { key: "annual", label: "Anual" },
        ].map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key as any)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={period === p.key
              ? { background: "#111827", color: "#fff" }
              : { background: "#f3f4f6", color: "#6b7280" }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Stats del período */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
          <div style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 900, color: RED, lineHeight: 1 }}>{periodData.total}</div>
          <div className="text-xs text-gray-500 mt-1">Reuniones totales</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
          <div style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 900, color: "#111827", lineHeight: 1 }}>{periodData.productive}</div>
          <div className="text-xs text-gray-500 mt-1">Productivas</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
          <div style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 900, color: "#111827", lineHeight: 1 }}>{periodData.avgPerWeek}</div>
          <div className="text-xs text-gray-500 mt-1">Promedio / semana</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
          <div style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 900, color: "#111827", lineHeight: 1 }}>{periodData.consistencyScore}%</div>
          <div className="text-xs text-gray-500 mt-1">Consistencia</div>
        </div>
      </div>

      {/* Por tipo */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Desglose por tipo</div>
        <div className="space-y-3">
          {[
            { key: "tasacion", label: "Tasaciones", color: "#7c3aed" },
            { key: "visita", label: "Visitas", color: "#0ea5e9" },
            { key: "propuesta", label: "Propuestas", color: "#f59e0b" },
            { key: "cierre", label: "Cierres", color: GREEN },
            { key: "reunion", label: "Reuniones", color: "#6b7280" },
            { key: "seguimiento", label: "Seguimientos", color: "#ec4899" },
          ].map(t => {
            const val = ((periodData.byType || {}) as any)[t.key] || 0;
            const max = Math.max(...Object.values(periodData.byType || {}), 1);
            return (
              <div key={t.key} className="flex items-center gap-3">
                <div className="text-xs font-medium text-gray-600 w-24 shrink-0">{t.label}</div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div style={{ width: `${(val/max)*100}%`, background: t.color, height: "100%", borderRadius: 99, transition: "width 0.4s ease" }} />
                </div>
                <div className="text-xs font-bold text-gray-700 w-6 text-right">{val}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mejor día y hora */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center">
          <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Mejor día</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 900, color: RED }}>{DOW[periodData.bestDayOfWeek]}</div>
          <div className="text-xs text-gray-400 mt-1">más reuniones históricamente</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center">
          <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Mejor hora</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 900, color: RED }}>{periodData.bestHour}:00</div>
          <div className="text-xs text-gray-400 mt-1">pico de actividad</div>
        </div>
      </div>

      {/* Funnel anual */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Funnel del año</div>
        <div className="flex items-end gap-4 justify-center">
          {[
            { label: "Tasaciones", val: stats.funnel.tasaciones, color: "#7c3aed" },
            { label: "Visitas", val: stats.funnel.visitas, color: "#0ea5e9" },
            { label: "Propuestas", val: stats.funnel.propuestas, color: "#f59e0b" },
            { label: "Cierres", val: stats.funnel.cierres, color: GREEN },
          ].map((f, i) => (
            <div key={i} className="flex-1 text-center">
              <div style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 900, color: f.color }}>{f.val}</div>
              <div className="text-xs text-gray-400 mt-1">{f.label}</div>
            </div>
          ))}
          <div className="flex-1 text-center">
            <div style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 900, color: RED }}>{stats.funnel.conversionRate}%</div>
            <div className="text-xs text-gray-400 mt-1">Conversión</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Estadisticas() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teamStats, setTeamStats] = useState<AgentStats[]>([]);
  const [selected, setSelected] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teams/stats");
      if (res.status === 403) { router.replace("/"); return; }
      const data = await res.json();
      if (data.teamStats) setTeamStats(data.teamStats);
      else setError(data.error || "Error cargando estadísticas");
    } catch { setError("Error de conexión"); }
    setLoading(false);
  };

  // Resumen del equipo
  const totalThisWeek = teamStats.reduce((s, a) => s + a.currentWeek, 0);
  const activeAgents = teamStats.filter(a => a.currentWeek > 0).length;
  const needsAttention = teamStats.filter(a => a.trend === "down" && a.currentWeek < 5);
  const topAgent = teamStats.sort((a, b) => b.currentWeek - a.currentWeek)[0];

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: RED }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <Head><title>Estadísticas del Equipo — InstaCoach</title></Head>
      <div className="h-0.5 w-full" style={{ background: RED }} />

      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-4">
          <button onClick={() => router.push("/equipo")}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 mr-auto">
            <ArrowLeft size={13} /> Mi equipo
          </button>
          <div className="font-black text-lg" style={{ fontFamily: "Georgia, serif" }}>
            Insta<span style={{ color: RED }}>Coach</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-6">

        {selected ? (
          <AgentDetail stats={selected} onBack={() => setSelected(null)} />
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: "Georgia, serif" }}>
                Estadísticas del equipo
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">{teamStats.length} agentes · datos en tiempo real</p>
            </div>

            {error && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
                <AlertTriangle size={15} className="text-amber-500" />
                <p className="text-sm text-amber-700">{error === "Error de conexión" ? error : "Aún no hay eventos sincronizados. Los datos aparecerán después del primer sync completo."}</p>
              </div>
            )}

            {/* KPIs del equipo */}
            {teamStats.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 900, color: RED, lineHeight: 1 }}>{totalThisWeek}</div>
                  <div className="text-xs text-gray-500 mt-1">Reuniones del equipo esta semana</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 900, color: "#111827", lineHeight: 1 }}>{activeAgents}</div>
                  <div className="text-xs text-gray-500 mt-1">Agentes activos esta semana</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 900, color: needsAttention.length > 0 ? RED : GREEN, lineHeight: 1 }}>{needsAttention.length}</div>
                  <div className="text-xs text-gray-500 mt-1">Necesitan atención</div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-4 text-center">
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 900, color: "#111827", lineHeight: 1 }}>{topAgent ? topAgent.currentWeek : 0}</div>
                  <div className="text-xs text-gray-500 mt-1">Mejor semana · {topAgent?.name?.split(" ")[0] || "—"}</div>
                </div>
              </div>
            )}

            {/* Agentes que necesitan atención */}
            {needsAttention.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={13} style={{ color: RED }} />
                  <span className="text-xs font-black text-red-700 uppercase tracking-widest">Requieren atención</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {needsAttention.map(a => (
                    <button key={a.email} onClick={() => setSelected(a)}
                      className="flex items-center gap-2 bg-white border border-red-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 hover:border-red-400 transition-colors">
                      <TrendingDown size={11} style={{ color: RED }} />
                      {a.name || a.email}
                      <span className="text-gray-400">{a.currentWeek} esta sem.</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lista de agentes */}
            <div>
              <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Todos los agentes</div>
              {teamStats.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-sm text-gray-400">
                  Los datos aparecerán una vez que los agentes sincronicen su calendario.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[...teamStats].sort((a, b) => b.currentWeek - a.currentWeek).map(agent => (
                    <AgentCard key={agent.email} stats={agent} onClick={() => setSelected(agent)} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

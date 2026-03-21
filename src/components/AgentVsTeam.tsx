import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const RED = "#aa0000";
const GREEN = "#16a34a";

interface VsTeamData {
  agentIac: number;
  agentWeekTotal: number;
  teamAvgIac: number | null;
  diff: number | null;
  rank: number | null;
  teamTotal: number | null;
  weeklyHistory: { week_start: string; iac: number; green_total: number }[];
  weeklyGoal: number;
}

function weekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function iacColor(iac: number): string {
  if (iac >= 100) return GREEN;
  if (iac >= 67) return "#d97706";
  if (iac > 0) return RED;
  return "#e5e7eb";
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const iac = payload[0]?.value ?? 0;
  return (
    <div className="bg-gray-900 rounded-xl px-3 py-2.5 shadow-2xl text-white" style={{ fontSize: 12 }}>
      <div className="font-bold text-gray-400 mb-1">Sem. {label}</div>
      <div className="font-black" style={{ color: iacColor(iac) }}>{iac}% IAC</div>
    </div>
  );
}

export default function AgentVsTeam({ weekOffset = 0 }: { weekOffset?: number }) {
  const [data, setData] = useState<VsTeamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/agent-vs-team?weekOffset=${weekOffset}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [weekOffset]);

  if (loading || !data) return null;

  const { agentIac, teamAvgIac, diff, rank, teamTotal, weeklyHistory, weeklyGoal } = data;
  const hasTeam = teamAvgIac !== null && diff !== null;
  const chartData = weeklyHistory.map(w => ({ label: weekLabel(w.week_start), iac: w.iac, greens: w.green_total }));

  return (
    <div className="space-y-4">

      {/* Comparativa vs equipo */}
      {hasTeam && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-4" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
              Tu posición vs el equipo esta semana
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">Tu IAC</div>
                <div className="text-4xl font-black" style={{ fontFamily: "Georgia, serif", color: iacColor(agentIac) }}>
                  {agentIac}%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Promedio equipo</div>
                <div className="text-4xl font-black text-white" style={{ fontFamily: "Georgia, serif" }}>
                  {teamAvgIac}%
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Diferencia</div>
                <div className="flex items-center gap-1">
                  <div className="text-4xl font-black" style={{
                    fontFamily: "Georgia, serif",
                    color: diff > 0 ? "#4ade80" : diff < 0 ? "#f87171" : "#9ca3af"
                  }}>
                    {diff > 0 ? "+" : ""}{diff}%
                  </div>
                  {diff > 5 ? <TrendingUp size={20} color="#4ade80" /> :
                   diff < -5 ? <TrendingDown size={20} color="#f87171" /> :
                   <Minus size={20} color="#9ca3af" />}
                </div>
              </div>
            </div>

            {/* Mensaje motivador */}
            <div className="mt-4 text-sm font-medium" style={{
              color: diff > 10 ? "#4ade80" : diff > 0 ? "#86efac" : diff === 0 ? "#9ca3af" : "#fca5a5"
            }}>
              {rank === 1 ? "🏆 Sos el mejor del equipo esta semana — mantené el ritmo" :
               diff > 10 ? `🔥 Estás ${diff}pts sobre el promedio — en la élite del equipo` :
               diff > 0 ? `💪 Estás sobre el promedio del equipo (puesto ${rank} de ${teamTotal})` :
               diff === 0 ? `En el promedio del equipo — podés subir más` :
               `📉 Estás ${Math.abs(diff)}pts bajo el promedio — subí tu actividad esta semana`}
            </div>
          </div>

          {/* Barra visual de diferencia */}
          <div className="px-5 py-3">
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300" />
              {diff !== 0 && (
                <div className="absolute top-0 bottom-0 rounded-full transition-all"
                  style={{
                    background: diff > 0 ? GREEN : RED,
                    width: `${Math.min(50, Math.abs(diff) / 2)}%`,
                    left: diff > 0 ? "50%" : `${50 - Math.min(50, Math.abs(diff) / 2)}%`,
                  }} />
              )}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-400">Por debajo del promedio</span>
              <span className="text-xs text-gray-400">Por encima del promedio</span>
            </div>
          </div>
        </div>
      )}

      {/* Historial personal 12 semanas */}
      {chartData.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-black text-gray-800">Tu evolución</div>
              <div className="text-xs text-gray-400 mt-0.5">Últimas {chartData.length} semanas</div>
            </div>
            {chartData.length >= 4 && (() => {
              const last4 = chartData.slice(-4);
              const prev4 = chartData.slice(-8, -4);
              const avg4 = Math.round(last4.reduce((s, w) => s + w.iac, 0) / last4.length);
              const avgPrev = prev4.length ? Math.round(prev4.reduce((s, w) => s + w.iac, 0) / prev4.length) : null;
              const trend = avgPrev !== null ? avg4 - avgPrev : null;
              return (
                <div className="text-right">
                  <div className="text-xs text-gray-400">Promedio 4 sem.</div>
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-lg font-black" style={{ color: iacColor(avg4) }}>{avg4}%</span>
                    {trend !== null && (
                      <span className="text-xs font-bold" style={{ color: trend > 0 ? GREEN : trend < 0 ? RED : "#9ca3af" }}>
                        {trend > 0 ? `↑+${trend}` : trend < 0 ? `↓${trend}` : "→"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#d1d5db", fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#d1d5db" }} axisLine={false} tickLine={false} domain={[0, Math.max(110, ...chartData.map(d => d.iac))]} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={100} stroke="#16a34a" strokeDasharray="4 4" strokeWidth={1.5} />
              <ReferenceLine y={67} stroke="#d97706" strokeDasharray="3 3" strokeWidth={1} />
              <Line type="monotone" dataKey="iac" stroke={RED} strokeWidth={2.5}
                dot={(props: any) => (
                  <circle key={props.payload.label} cx={props.cx} cy={props.cy} r={4}
                    fill={iacColor(props.payload.iac)} stroke="white" strokeWidth={2} />
                )}
                activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>

          {/* Mini heatmap */}
          <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-50">
            {chartData.map((w, i) => (
              <div key={i} title={`Sem. ${w.label}: ${w.iac}% IAC`}
                className="flex-1 h-2 rounded-full transition-all hover:scale-y-150"
                style={{ background: iacColor(w.iac) }} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-300">← hace {chartData.length} sem.</span>
            <span className="text-xs text-gray-300">esta semana →</span>
          </div>
        </div>
      )}
    </div>
  );
}

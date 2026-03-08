import { GetServerSideProps } from "next";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { requireSuperAdmin } from "../../lib/adminGuard";
import {
  Users, CreditCard, BarChart2, Zap, Search, RefreshCw,
  ChevronDown, CheckCircle, XCircle, Clock, Loader2,
  Calendar, Mail, Shield, TrendingUp, AlertTriangle
} from "lucide-react";

const RED = "#aa0000";

const PLAN_COLOR: Record<string, string> = {
  free: "#6b7280", individual: "#7c3aed", teams: "#16a34a"
};
const PLAN_BG: Record<string, string> = {
  free: "#f3f4f6", individual: "#f5f3ff", teams: "#f0fdf4"
};
const PLAN_LABEL: Record<string, string> = {
  free: "Free", individual: "Individual", teams: "Teams"
};

interface AdminStats {
  totals: { users: number; paid: number; free: number; withCalendar: number; newLast7: number; newLast30: number; conversionRate: number };
  byPlan: { free: number; individual: number; teams: number };
  teams: { id: string; name: string; agency_name?: string; owner_email: string; ownerName: string; memberCount: number; created_at: string }[];
  recentPayments: { amount: number; created_at: string; status: string }[];
}

interface AdminUser {
  email: string; name?: string; avatar?: string; plan: string; status: string;
  teamRole?: string; hasCalendar: boolean; createdAt: string; daysSince: number;
  freemiumExpired: boolean; freemiumDaysLeft: number | null;
}

export default function AdminPanel() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tab, setTab] = useState<"overview" | "users" | "teams" | "ops" | "precios">("overview");
  const [planFilter, setPlanFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({});
  const [opsLoading, setOpsLoading] = useState(false);
  const [opsMsg, setOpsMsg] = useState("");
  const [plans, setPlans] = useState<Record<string, any>>({});
  const [plansLoading, setPlansLoading] = useState(false);
  const [planInputs, setPlanInputs] = useState<Record<string, string>>({});
  const [planSaving, setPlanSaving] = useState<string | null>(null);
  const [planMsg, setPlanMsg] = useState<Record<string, string>>({});

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { if (tab === "users" || tab === "teams") loadUsers(); }, [tab, planFilter, search]);
  useEffect(() => { if (tab === "precios") loadPlans(); }, [tab]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      setStats(data);
    } catch { }
    setLoadingStats(false);
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      if (planFilter !== "all") params.set("plan", planFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch { }
    setLoadingUsers(false);
  };

  const loadPlans = async () => {
    setPlansLoading(true);
    try {
      const r = await fetch("/api/admin/plans");
      const d = await r.json();
      setPlans(d);
      const inputs: Record<string, string> = {};
      for (const [id, p] of Object.entries(d) as any) {
        if (p.amount) inputs[id] = String(p.amount);
      }
      setPlanInputs(inputs);
    } catch {}
    setPlansLoading(false);
  };

  const updatePlanPrice = async (planId: string) => {
    const amount = planInputs[planId];
    if (!amount || isNaN(Number(amount))) return;
    setPlanSaving(planId);
    setPlanMsg(prev => ({ ...prev, [planId]: "" }));
    try {
      const r = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, amount: Number(amount) }),
      });
      const d = await r.json();
      if (d.ok) {
        setPlanMsg(prev => ({ ...prev, [planId]: `✓ Actualizado a $ ${Number(d.newAmount).toLocaleString("es-AR")}` }));
        loadPlans();
      } else {
        setPlanMsg(prev => ({ ...prev, [planId]: d.error || "Error" }));
      }
    } catch {
      setPlanMsg(prev => ({ ...prev, [planId]: "Error de conexion" }));
    }
    setPlanSaving(null);
  };

  const userAction = async (email: string, action: string, extra?: any) => {
    setActionLoading(`${email}-${action}`);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email, ...extra }),
      });
      const data = await res.json();
      setActionMsg(prev => ({ ...prev, [email]: data.ok ? "✓ Listo" : (data.error || "Error") }));
      if (data.ok) { setTimeout(() => { setActionMsg(prev => { const n = {...prev}; delete n[email]; return n; }); loadUsers(); }, 2000); }
    } catch { setActionMsg(prev => ({ ...prev, [email]: "Error" })); }
    setActionLoading(null);
  };

  const triggerOp = async (action: string, email?: string) => {
    setOpsLoading(true); setOpsMsg("");
    try {
      const res = await fetch("/api/admin/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email }),
      });
      const data = await res.json();
      setOpsMsg(data.ok ? `✓ ${action} ejecutado` : (data.error || "Error"));
    } catch { setOpsMsg("Error de conexión"); }
    setOpsLoading(false);
  };

  const KPI = ({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) => (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-3xl font-black" style={{ fontFamily: "Georgia, serif", color: color || "#111827" }}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <Head><title>Admin — InstaCoach</title></Head>
      <div className="h-0.5 w-full" style={{ background: RED }} />

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-4">
          <div className="font-black text-lg mr-auto" style={{ fontFamily: "Georgia, serif" }}>
            Insta<span style={{ color: RED }}>Coach</span>
            <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500 align-middle">ADMIN</span>
          </div>
          <button onClick={() => router.push("/")}
            className="text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors">
            ← Dashboard
          </button>
        </div>
        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-5 flex gap-1 pb-0">
          {([
            { key: "overview", label: "Overview", icon: <BarChart2 size={13} /> },
            { key: "users", label: "Usuarios", icon: <Users size={13} /> },
            { key: "teams", label: "Equipos", icon: <Shield size={13} /> },
            { key: "ops", label: "Operaciones", icon: <Zap size={13} /> },
            { key: "precios", label: "Precios", icon: <CreditCard size={13} /> },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors"
              style={{ borderColor: tab === t.key ? RED : "transparent", color: tab === t.key ? RED : "#9ca3af" }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-5">

        {/* OVERVIEW */}
        {tab === "overview" && (
          <>
            {loadingStats ? (
              <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-300" /></div>
            ) : stats && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <KPI label="Usuarios totales" value={stats.totals.users} sub={`+${stats.totals.newLast7} esta semana`} />
                  <KPI label="Pagos activos" value={stats.totals.paid} sub={`${stats.totals.conversionRate}% conversión`} color="#16a34a" />
                  <KPI label="Free / Trial" value={stats.totals.free} />
                  <KPI label="Con calendario" value={stats.totals.withCalendar} sub="Google Calendar conectado" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Free", value: stats.byPlan.free, color: PLAN_COLOR.free },
                    { label: "Individual", value: stats.byPlan.individual, color: PLAN_COLOR.individual },
                    { label: "Teams", value: stats.byPlan.teams, color: PLAN_COLOR.teams },
                  ].map((p, i) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
                      <div>
                        <div className="text-xs text-gray-400">{p.label}</div>
                        <div className="text-2xl font-black text-gray-900" style={{ fontFamily: "Georgia, serif" }}>{p.value}</div>
                      </div>
                      <div className="ml-auto text-sm font-bold text-gray-300">
                        {stats.totals.users > 0 ? Math.round((p.value / stats.totals.users) * 100) : 0}%
                      </div>
                    </div>
                  ))}
                </div>

                {/* Equipos resumen */}
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                    <Shield size={13} className="text-gray-400" />
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Equipos activos</span>
                    <span className="ml-auto text-xs text-gray-400">{stats.teams.length} equipos</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {stats.teams.slice(0, 8).map(t => (
                      <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-800">{t.agency_name || t.name}</div>
                          <div className="text-xs text-gray-400">{t.ownerName} · {t.owner_email}</div>
                        </div>
                        <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                          {t.memberCount} agente{t.memberCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    ))}
                    {stats.teams.length === 0 && (
                      <div className="px-5 py-6 text-center text-sm text-gray-400">Sin equipos todavía</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* USUARIOS */}
        {tab === "users" && (
          <>
            {/* Filtros */}
            <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-48">
                <Search size={13} className="text-gray-400 shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && loadUsers()}
                  placeholder="Buscar por email..."
                  className="flex-1 text-sm text-gray-700 outline-none bg-transparent" />
              </div>
              <div className="flex gap-2">
                {["all", "free", "individual", "teams"].map(p => (
                  <button key={p} onClick={() => setPlanFilter(p)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                    style={{ background: planFilter === p ? RED : "#f3f4f6", color: planFilter === p ? "#fff" : "#6b7280" }}>
                    {p === "all" ? "Todos" : PLAN_LABEL[p]}
                  </button>
                ))}
              </div>
              <button onClick={loadUsers} className="text-xs font-semibold text-gray-400 hover:text-gray-700 flex items-center gap-1">
                <RefreshCw size={11} /> Actualizar
              </button>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{users.length} usuarios</span>
              </div>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {users.map(u => (
                    <div key={u.email} className="px-5 py-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        {u.avatar ? (
                          <img src={u.avatar} alt="" className="w-8 h-8 rounded-full shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-400 shrink-0">
                            {(u.name || u.email)[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800">{u.name || u.email}</span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                              style={{ background: PLAN_BG[u.plan], color: PLAN_COLOR[u.plan] }}>
                              {PLAN_LABEL[u.plan] || u.plan}
                            </span>
                            {u.status === "cancelled" && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-red-50 text-red-400">Cancelado</span>
                            )}
                            {u.freemiumExpired && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-500">Trial expirado</span>
                            )}
                            {u.plan === "free" && !u.freemiumExpired && u.freemiumDaysLeft !== null && (
                              <span className="text-xs text-gray-400">{u.freemiumDaysLeft}d restantes</span>
                            )}
                            {u.hasCalendar && <Calendar size={11} className="text-green-500" />}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{u.email} · hace {u.daysSince}d</div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {actionMsg[u.email] && (
                            <span className="text-xs font-semibold text-green-600">{actionMsg[u.email]}</span>
                          )}
                          {/* Cambiar plan */}
                          <select onChange={e => e.target.value && userAction(u.email, "change_plan", { plan: e.target.value })}
                            value=""
                            className="text-xs font-semibold text-gray-500 bg-gray-100 border-0 rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none appearance-none">
                            <option value="" disabled>Cambiar plan</option>
                            <option value="free">→ Free</option>
                            <option value="individual">→ Individual</option>
                            <option value="teams">→ Teams</option>
                          </select>
                          {/* Extender trial */}
                          {u.plan === "free" && (
                            <button onClick={() => userAction(u.email, "extend_trial", { daysExtension: 7 })}
                              disabled={actionLoading === `${u.email}-extend_trial`}
                              className="text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                              {actionLoading === `${u.email}-extend_trial` ? <Loader2 size={10} className="animate-spin" /> : <Clock size={10} />}
                              +7 días
                            </button>
                          )}
                          {/* Activar/desactivar */}
                          {u.status === "active" ? (
                            <button onClick={() => userAction(u.email, "deactivate")}
                              disabled={actionLoading === `${u.email}-deactivate`}
                              className="text-xs font-semibold text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors">
                              Desactivar
                            </button>
                          ) : (
                            <button onClick={() => userAction(u.email, "reactivate")}
                              disabled={actionLoading === `${u.email}-reactivate`}
                              className="text-xs font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors">
                              Reactivar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && !loadingUsers && (
                    <div className="px-5 py-8 text-center text-sm text-gray-400">Sin usuarios para los filtros seleccionados</div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* EQUIPOS */}
        {tab === "teams" && (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{stats?.teams.length || 0} equipos</span>
            </div>
            <div className="divide-y divide-gray-50">
              {(stats?.teams || []).map(t => (
                <div key={t.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-gray-900">{t.agency_name || t.name}</span>
                        {t.agency_name && <span className="text-xs text-gray-400">{t.name}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Owner: <strong>{t.ownerName}</strong> · {t.owner_email}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Creado: {new Date(t.created_at).toLocaleDateString("es-AR")} ·
                        <span className="ml-1 font-semibold text-gray-600">{t.memberCount} agente{t.memberCount !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <button onClick={() => triggerOp("send_weekly_email", t.owner_email)}
                      className="text-xs font-semibold text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shrink-0">
                      <Mail size={11} /> Mail al broker
                    </button>
                  </div>
                </div>
              ))}
              {(!stats?.teams.length) && (
                <div className="px-5 py-8 text-center text-sm text-gray-400">Sin equipos todavía</div>
              )}
            </div>
          </div>
        )}

        {/* OPERACIONES */}
        {tab === "ops" && (
          <div className="space-y-4">
            {opsMsg && (
              <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm font-semibold text-green-600">
                {opsMsg}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  title: "Deep Sync ahora",
                  desc: "Sincroniza 365 días de calendario para todos los usuarios activos. Normalmente corre los domingos a las 3am.",
                  action: "trigger_deep_sync",
                  icon: <RefreshCw size={18} style={{ color: RED }} />,
                  label: "Ejecutar deep sync",
                },
                {
                  title: "Email semanal global",
                  desc: "Envía el informe semanal a todos los usuarios activos. Normalmente corre los lunes a las 9am.",
                  action: "send_weekly_email",
                  icon: <Mail size={18} style={{ color: RED }} />,
                  label: "Enviar emails ahora",
                },
              ].map((op, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                      {op.icon}
                    </div>
                    <div>
                      <div className="font-black text-sm text-gray-900">{op.title}</div>
                      <div className="text-xs text-gray-400 mt-1 leading-relaxed">{op.desc}</div>
                    </div>
                  </div>
                  <button onClick={() => triggerOp(op.action)} disabled={opsLoading}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: RED }}>
                    {opsLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                    {op.label}
                  </button>
                </div>
              ))}
            </div>

            {/* Enviar mail a usuario específico */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="font-black text-sm text-gray-900 mb-1">Enviar informe a usuario específico</div>
              <div className="text-xs text-gray-400 mb-4">Útil para debugging o reenvíos manuales.</div>
              <SendToUser onSend={(email) => triggerOp("send_weekly_email", email)} loading={opsLoading} />
            </div>
          </div>
        )}

        {/* PRECIOS */}
        {tab === "precios" && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Modificá el precio de los planes en MercadoPago. El cambio aplica a todos los nuevos suscriptores inmediatamente.
                Los suscriptores activos continúan pagando el precio anterior hasta su próxima renovación.
              </p>
            </div>

            {plansLoading ? (
              <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { id: "individual", label: "Plan Individual", desc: "Inmobiliario solo" },
                  { id: "teams", label: "Plan Teams", desc: "Broker con equipo" },
                ].map(({ id, label, desc }) => {
                  const p = plans[id] || {};
                  return (
                    <div key={id} className="bg-white border border-gray-100 rounded-2xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="font-black text-base text-gray-900" style={{ fontFamily: "Georgia, serif" }}>{label}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded-lg ${p.status === "active" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                          {p.status || "—"}
                        </div>
                      </div>

                      {p.error ? (
                        <p className="text-xs text-red-400">{p.error}</p>
                      ) : (
                        <>
                          <div className="mb-1 text-xs text-gray-400">Precio actual en MP</div>
                          <div className="text-3xl font-black mb-4" style={{ color: RED, fontFamily: "Georgia, serif" }}>
                            $ {p.amount ? Number(p.amount).toLocaleString("es-AR") : "—"}
                            <span className="text-sm font-normal text-gray-400 ml-1">/mes</span>
                          </div>

                          <div className="mb-1 text-xs text-gray-400">Nuevo precio (ARS)</div>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={planInputs[id] || ""}
                              onChange={e => setPlanInputs(prev => ({ ...prev, [id]: e.target.value }))}
                              onKeyDown={e => e.key === "Enter" && updatePlanPrice(id)}
                              placeholder="Ej: 12000"
                              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                            />
                            <button
                              onClick={() => updatePlanPrice(id)}
                              disabled={planSaving === id || planInputs[id] === String(p.amount)}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 hover:opacity-90 transition-all"
                              style={{ background: RED }}>
                              {planSaving === id ? <Loader2 size={12} className="animate-spin" /> : "Actualizar"}
                            </button>
                          </div>
                          {planMsg[id] && (
                            <p className={`text-xs mt-2 font-semibold ${planMsg[id].startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
                              {planMsg[id]}
                            </p>
                          )}
                          <p className="text-xs text-gray-300 mt-3">ID: {p.id}</p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

function SendToUser({ onSend, loading }: { onSend: (email: string) => void; loading: boolean }) {
  const [email, setEmail] = useState("");
  return (
    <div className="flex gap-2">
      <input value={email} onChange={e => setEmail(e.target.value)}
        placeholder="email@dominio.com"
        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400 transition-colors" />
      <button onClick={() => email && onSend(email)} disabled={loading || !email}
        className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 hover:opacity-90"
        style={{ background: RED }}>
        Enviar
      </button>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const redirect = await requireSuperAdmin(ctx);
  if (redirect) return redirect;
  return { props: {} };
};

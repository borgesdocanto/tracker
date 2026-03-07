import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
import Head from "next/head";
import { CheckCircle2, Zap, Users, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { PLANS, Plan } from "../lib/plans";
import { BRAND } from "../lib/brand";

const C = BRAND.color;

function PlanCard({ plan, current, onSelect, loading }: {
  plan: Plan; current?: string;
  onSelect: (id: string) => void; loading: string | null;
}) {
  const isCurrent = current === plan.id;
  const isLoading = loading === plan.id;
  const icons: Record<string, any> = { free: Sparkles, individual: Zap, teams: Users };
  const Icon = icons[plan.id];

  return (
    <div className={`bg-white rounded-3xl p-6 border-2 flex flex-col transition-all ${plan.highlight ? "shadow-2xl" : "shadow-sm"}`}
      style={{ borderColor: plan.highlight ? C : "#e2e8f0", transform: plan.highlight ? "scale(1.03)" : "none" }}>
      {plan.badge && (
        <div className="text-xs font-black text-white px-3 py-1 rounded-xl self-start mb-3"
          style={{ background: plan.id === "free" ? "#64748b" : plan.id === "teams" ? "#0f172a" : C }}>
          {plan.badge}
        </div>
      )}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: plan.highlight ? BRAND.colorLight : "#f1f5f9" }}>
          <Icon size={18} style={{ color: plan.highlight ? C : "#64748b" }} />
        </div>
        <div>
          <div className="font-black text-xl text-slate-800">{plan.name}</div>
          <div className="text-xs text-slate-400 font-medium">{plan.description}</div>
        </div>
      </div>

      <div className="mb-6">
        {plan.price === 0 ? (
          <div>
            <span className="font-black text-4xl text-slate-800">Gratis</span>
            <div className="text-xs text-slate-400 font-medium mt-1">7 días completos, sin tarjeta</div>
          </div>
        ) : (
          <div>
            <span className="font-black text-4xl" style={{ color: C }}>USD {plan.price}</span>
            <span className="text-slate-400 font-bold text-sm"> / mes</span>
            <div className="text-xs text-slate-400 font-medium mt-1">≈ ARS {plan.priceARS.toLocaleString("es-AR")} / mes</div>
          </div>
        )}
      </div>

      <ul className="space-y-2.5 mb-6 flex-1">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm font-medium text-slate-600">
            <CheckCircle2 size={15} style={{ color: plan.highlight ? C : "#94a3b8", flexShrink: 0, marginTop: 1 }} />
            {f}
          </li>
        ))}
      </ul>

      <button onClick={() => onSelect(plan.id)} disabled={isCurrent || isLoading}
        className="w-full py-4 rounded-2xl font-black text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
        style={plan.highlight
          ? { background: `linear-gradient(135deg, ${C}, ${BRAND.colorDark})`, color: "#fff", boxShadow: `0 4px 20px ${C}44` }
          : { background: "#f1f5f9", color: "#334155" }}>
        {isLoading && <Loader2 size={14} className="animate-spin" />}
        {isCurrent ? "Plan actual"
          : plan.price === 0 ? "Empezar gratis — sin tarjeta"
          : `Activar ${plan.name}`}
      </button>
    </div>
  );
}

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const current = router.query.current as string ?? "free";

  const handleSelect = async (planId: string) => {
    if (planId === "free") { router.push("/"); return; }
    if (!session) { router.push("/login"); return; }
    setLoading(planId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch { alert("Error al procesar. Intentá de nuevo."); }
    setLoading(null);
  };

  return (
    <div className="min-h-screen" style={{ background: "#f0f9ff" }}>
      <Head><title>Planes — InstaCoach</title></Head>
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${C}, ${BRAND.colorDark})` }} />

      <div className="max-w-5xl mx-auto px-4 py-12">
        <button onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-700 mb-10 transition-colors">
          <ArrowLeft size={14} /> Volver
        </button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-black mb-4"
            style={{ background: BRAND.colorLight, color: C }}>
            <Zap size={14} /> Sin contratos · Cancelás cuando querés
          </div>
          <h1 className="font-black text-5xl text-slate-900 mb-3" style={{ letterSpacing: "-2px" }}>
            Elegí tu plan
          </h1>
          <p className="text-slate-400 font-medium text-lg max-w-lg mx-auto">
            7 días para vivir la experiencia completa. Después, elegís si seguís. Simple.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-center">
          {Object.values(PLANS).map(plan => (
            <PlanCard key={plan.id} plan={plan} current={current} onSelect={handleSelect} loading={loading} />
          ))}
        </div>

        {/* Teams extra info */}
        <div className="mt-8 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "#f1f5f9" }}>
              <Users size={18} className="text-slate-500" />
            </div>
            <div>
              <div className="font-black text-slate-800 mb-1">Cómo funciona Teams</div>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Con Teams activado, cargás los emails de tus agentes y el sistema les manda una invitación.
                Hasta 10 agentes incluidos en USD 50/mes — son USD 5/agente vs USD 7 del plan Individual.
                Si necesitás más de 10, agregás agentes adicionales a USD 7/mes cada uno.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-300 font-medium mt-6">
          Pagos procesados por MercadoPago · Los emails @galas.com.ar tienen acceso Individual gratuito permanente
        </p>
      </div>
    </div>
  );
}

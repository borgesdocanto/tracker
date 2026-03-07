import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState } from "react";
import Head from "next/head";
import { CheckCircle2, Zap, Building2, Loader2, ArrowLeft, Star } from "lucide-react";
import { PLANS, Plan } from "../lib/plans";

const GALAS_RED = "#aa0000";

function PlanCard({ plan, current, onSelect, loading }: {
  plan: Plan;
  current?: string;
  onSelect: (id: string) => void;
  loading: string | null;
}) {
  const isCurrent = current === plan.id;
  const isLoading = loading === plan.id;
  const icons: Record<string, any> = { free: Star, pro: Zap, agencia: Building2 };
  const Icon = icons[plan.id];

  return (
    <div
      className={`bg-white rounded-3xl p-6 border-2 transition-all flex flex-col ${plan.highlight ? "shadow-xl scale-[1.02]" : "shadow-sm"}`}
      style={{ borderColor: plan.highlight ? GALAS_RED : "#e2e8f0" }}
    >
      {plan.highlight && (
        <div className="text-xs font-black text-white px-3 py-1 rounded-xl self-start mb-3"
          style={{ background: GALAS_RED }}>
          MÁS POPULAR
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: plan.highlight ? "#f9e6e6" : "#f1f5f9" }}>
          <Icon size={18} style={{ color: plan.color }} />
        </div>
        <div>
          <div className="font-black text-lg text-slate-800">{plan.name}</div>
          <div className="text-xs text-slate-400 font-medium">{plan.description}</div>
        </div>
      </div>

      <div className="mb-5">
        {plan.price === 0 ? (
          <div className="font-black text-4xl text-slate-800">Gratis</div>
        ) : (
          <div>
            <span className="font-black text-4xl" style={{ color: GALAS_RED }}>
              USD {plan.price}
            </span>
            <span className="text-slate-400 font-bold text-sm"> / mes</span>
            <div className="text-xs text-slate-400 font-medium mt-0.5">
              ≈ ARS {plan.priceARS.toLocaleString("es-AR")} / mes
            </div>
          </div>
        )}
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <CheckCircle2 size={14} style={{ color: plan.price === 0 ? "#94a3b8" : GALAS_RED, flexShrink: 0 }} />
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan.id)}
        disabled={isCurrent || isLoading}
        className="w-full py-3.5 rounded-2xl font-black text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
        style={plan.highlight
          ? { background: `linear-gradient(135deg, ${GALAS_RED}, #6b0000)`, color: "#fff", boxShadow: "0 4px 16px rgba(170,0,0,0.3)" }
          : { background: "#f1f5f9", color: "#1e293b" }}
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
        {isCurrent ? "Plan actual" : plan.price === 0 ? "Empezar gratis" : `Suscribirme a ${plan.name}`}
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
    } catch {
      alert("Error al procesar el pago. Intentá de nuevo.");
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Head><title>Planes — GALAS Management</title></Head>
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${GALAS_RED}, #6b0000, ${GALAS_RED})` }} />

      <div className="max-w-5xl mx-auto px-4 py-10">
        <button onClick={() => router.push("/")}
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-700 mb-8 transition-colors">
          <ArrowLeft size={14} /> Volver al dashboard
        </button>

        <div className="text-center mb-10">
          <h1 className="font-display font-black text-4xl sm:text-5xl text-slate-800 mb-3">
            Elegí tu plan
          </h1>
          <p className="text-slate-400 font-medium text-lg max-w-xl mx-auto">
            Cada inmobiliario merece una herramienta que trabaje tan duro como él.
            Sin contratos, cancelás cuando querés.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          {Object.values(PLANS).map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={current}
              onSelect={handleSelect}
              loading={loading}
            />
          ))}
        </div>

        <p className="text-center text-xs text-slate-300 font-medium mt-8">
          Pagos procesados por MercadoPago · Podés cancelar en cualquier momento
        </p>
      </div>
    </div>
  );
}

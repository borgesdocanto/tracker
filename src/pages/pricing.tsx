import Head from "next/head";
import AppLayout from "../components/AppLayout";
import { useRouter } from "next/router";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { VOLUME_TIERS, calcTeamsTotal, pricePerAgent, formatPriceARS, agentsToNextTier, getNextTier } from "../lib/pricing";
import { ArrowLeft, Users, Check, Loader2 } from "lucide-react";

const RED = "#aa0000";
const BASE_PRICE = 10500;

function AgentSimulator({ onCheckout }: { onCheckout: (count: number) => void }) {
  const [count, setCount] = useState(5);
  const total = calcTeamsTotal(BASE_PRICE, count);
  const perAgent = pricePerAgent(BASE_PRICE, count);
  const toNext = agentsToNextTier(count);
  const nextTier = getNextTier(count);
  const saving = BASE_PRICE * count - total;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Calculá tu precio</div>
        <div className="text-sm text-gray-500">¿Cuántos agentes tiene tu equipo?</div>
      </div>
      <div className="px-6 py-5">
        {/* Slider */}
        <div className="flex items-center gap-4 mb-5">
          <input type="range" min={1} max={30} value={count} onChange={e => setCount(Number(e.target.value))}
            className="flex-1 accent-red-700" />
          <div className="w-16 text-center">
            <span className="font-black text-2xl" style={{ fontFamily: "Georgia, serif", color: RED }}>{count}</span>
            <div className="text-xs text-gray-400">agentes</div>
          </div>
        </div>

        {/* Resultado */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-400 mb-1">Total por mes</div>
            <div className="font-black text-2xl" style={{ fontFamily: "Georgia, serif", color: RED }}>{formatPriceARS(total)}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-400 mb-1">Por agente</div>
            <div className="font-black text-2xl" style={{ fontFamily: "Georgia, serif", color: RED }}>{formatPriceARS(perAgent)}</div>
            {saving > 0 && <div className="text-xs text-green-600 font-bold mt-1">Ahorrás {formatPriceARS(saving)}/mes</div>}
          </div>
        </div>

        {/* Incentivo */}
        {nextTier && toNext !== null && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: toNext === 1 ? "#fffbeb" : "#fff8f8", border: `1px solid ${toNext === 1 ? "#fde68a" : "#fee2e2"}` }}>
            {toNext === 1
              ? <span className="font-black text-amber-700">🔥 Con 1 agente más todos bajan a {formatPriceARS(pricePerAgent(BASE_PRICE, nextTier.minAgents))}/agente — pagás lo mismo</span>
              : <span className="font-bold" style={{ color: RED }}>💡 Faltan {toNext} agentes para -{nextTier.discountPct}% en todo el equipo</span>
            }
          </div>
        )}
        {!nextTier && (
          <div className="rounded-xl px-4 py-3 bg-yellow-50 border border-yellow-200 text-sm font-black text-yellow-700 text-center">
            👑 Máximo descuento — -40% activo
          </div>
        )}

        <button onClick={() => onCheckout(count)}
          className="w-full mt-4 py-3 rounded-xl text-sm font-black text-white hover:opacity-90 transition-all"
          style={{ background: RED }}>
          Empezar con {count} agente{count !== 1 ? "s" : ""} — {formatPriceARS(total)}/mes →
        </button>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleCheckout = async (agentCount: number) => {
    // Si no está logueado, guardar intención y mandar al login
    if (!session?.user) {
      router.push(`/login?callbackUrl=/pricing&agents=${agentCount}`);
      return;
    }
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentCount }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || "Error al iniciar el pago");
      }
    } catch {
      alert("Error de conexión");
    }
    setCheckoutLoading(false);
  };

  return (
    <AppLayout>
      <Head><title>Precios — InmoCoach</title></Head>

      <style>{`
        .pr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .pr-tiers { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .pr-features { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        @media (max-width: 900px) { .pr-grid { grid-template-columns: 1fr; } .pr-tiers { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .pr-features { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ padding: "32px 24px 60px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 500, color: "#111827", fontFamily: "Georgia, serif", marginBottom: 6 }}>
            Un precio que crece con vos
          </div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>7 días gratis · Sin tarjeta de crédito · Cancelás cuando querés</div>
        </div>

        <div className="pr-grid" style={{ marginBottom: 20 }}>

          {/* Plan individual */}
          <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderTop: `3px solid ${RED}`, borderRadius: "0 0 14px 14px", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Individual</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: "#111827", fontFamily: "Georgia, serif", marginBottom: 4 }}>Para el agente solo</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>Dashboard personal, IAC, racha, ranking global.</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
                <div style={{ fontSize: 36, fontWeight: 500, fontFamily: "Georgia, serif", color: RED, lineHeight: 1 }}>{formatPriceARS(BASE_PRICE)}</div>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>/mes</div>
              </div>
              <button onClick={() => handleCheckout(1)} disabled={checkoutLoading}
                style={{ width: "100%", background: RED, color: "#fff", border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                Empezar gratis 7 días →
              </button>
            </div>
          </div>

          {/* Simulador */}
          <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderTop: "3px solid #111827", borderRadius: "0 0 14px 14px", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Equipos</div>
              <AgentSimulator onCheckout={handleCheckout} />
            </div>
          </div>
        </div>

        {/* Tiers de descuento */}
        <div className="pr-tiers" style={{ marginBottom: 20 }}>
          {VOLUME_TIERS.map((tier, i) => {
            const agentPrice = pricePerAgent(BASE_PRICE, tier.minAgents);
            return (
              <div key={i} style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", marginBottom: 4 }}>
                  {tier.minAgents === 1 ? "1–4" : tier.minAgents === 5 ? "5–9" : tier.minAgents === 10 ? "10–19" : "20+"} agentes
                </div>
                <div style={{ fontSize: 22, fontWeight: 500, fontFamily: "Georgia, serif", color: RED, lineHeight: 1 }}>
                  {formatPriceARS(agentPrice)}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>/agente/mes</div>
                {tier.discountPct > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11, fontWeight: 500, background: "#EAF3DE", color: "#3B6D11", borderRadius: 6, padding: "2px 7px", display: "inline-block" }}>
                    -{tier.discountPct}%
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Qué incluye */}
        <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 14, padding: "20px 24px" }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 16 }}>Todo lo que incluye el plan equipo</div>
          <div className="pr-features">
            {[
              "Dashboard individual para cada agente",
              "Dashboard del broker con ranking del equipo",
              "IAC colectivo e individual",
              "Alertas automáticas de racha en riesgo",
              "Ranking interno del equipo",
              "Inmo Coach con IA para cada agente",
              "Mail semanal personalizado por agente",
              "Integración con Tokko Broker",
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: "#16a34a", fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 13, color: "#4b5563" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

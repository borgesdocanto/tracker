import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import { CheckCircle2, Users, User } from "lucide-react";
import { calcTeamsTotal, pricePerAgent, getTierForAgents, formatPriceARS } from "../../lib/pricing";

const BASE_PRICE = 10500;
const RED = "#aa0000";

export default function PagoExito() {
  const router = useRouter();
  const { agents } = router.query;
  const agentCount = Math.max(1, parseInt((agents as string) || "1", 10));
  const isTeam = agentCount > 1;
  const total = calcTeamsTotal(BASE_PRICE, agentCount);
  const perAgent = pricePerAgent(BASE_PRICE, agentCount);
  const tier = getTierForAgents(agentCount);
  const [seconds, setSeconds] = useState(15);
  const [planActivated, setPlanActivated] = useState(false);

  // Polling: esperar que el webhook de MP active el plan antes de redirigir
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;
    const poll = async () => {
      try {
        const res = await fetch("/api/subscription");
        const data = await res.json();
        if (data.subscription?.plan !== "free") {
          setPlanActivated(true);
          setTimeout(() => router.push("/"), 1500);
          return;
        }
      } catch {}
      attempts++;
      if (attempts < maxAttempts) setTimeout(poll, 1500);
      else router.push("/"); // fallback
    };
    const timeout = setTimeout(poll, 2000); // primer check a los 2s
    return () => clearTimeout(timeout);
  }, [router]);

  // Countdown visual
  useEffect(() => {
    if (planActivated) return;
    const interval = setInterval(() => {
      setSeconds(s => { if (s <= 1) clearInterval(interval); return Math.max(0, s - 1); });
    }, 1000);
    return () => clearInterval(interval);
  }, [planActivated]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#fafafa", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <Head><title>Suscripción activada — InmoCoach</title></Head>

      <div className="bg-white rounded-3xl p-10 text-center max-w-sm w-full"
        style={{ border: "1px solid #f3f4f6", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>

        {/* Ícono */}
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "#f0fdf4" }}>
          <CheckCircle2 size={32} color="#16a34a" />
        </div>

        {/* Título */}
        <h1 className="font-black text-2xl text-gray-900 mb-1"
          style={{ fontFamily: "Georgia, serif" }}>
          ¡Suscripción activada!
        </h1>

        {/* Detalle */}
        <div className="mt-5 mb-6 rounded-2xl p-4" style={{ background: "#fafafa", border: "1px solid #f3f4f6" }}>
          {isTeam ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users size={15} color={RED} />
                <span className="font-black text-sm" style={{ color: RED }}>{tier.label}</span>
              </div>
              <div className="font-black text-3xl" style={{ fontFamily: "Georgia, serif", color: "#111", lineHeight: 1 }}>
                {formatPriceARS(total)}
              </div>
              <div className="text-xs text-gray-400 mt-1">/mes · {agentCount} agentes</div>
              {tier.discountPct > 0 && (
                <div className="mt-2 text-xs font-black text-green-600">
                  {formatPriceARS(perAgent)}/agente · -{tier.discountPct}% aplicado
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <User size={15} color={RED} />
                <span className="font-black text-sm" style={{ color: RED }}>Plan Individual</span>
              </div>
              <div className="font-black text-3xl" style={{ fontFamily: "Georgia, serif", color: "#111", lineHeight: 1 }}>
                {formatPriceARS(BASE_PRICE)}
              </div>
              <div className="text-xs text-gray-400 mt-1">/mes</div>
            </>
          )}
        </div>

        {isTeam && (
          <p className="text-xs text-gray-400 mb-5 leading-relaxed">
            Podés invitar agentes desde el dashboard del equipo. El precio se actualiza automáticamente cuando sumás más.
          </p>
        )}

        {/* Botones */}
        <button onClick={() => router.push("/")}
          className="w-full py-3 rounded-xl font-black text-white text-sm hover:opacity-90 transition-all"
          style={{ background: RED }}>
          Ir al dashboard →
        </button>

        <p className="text-xs text-gray-300 mt-4">
          {planActivated ? "¡Listo! Redirigiendo..." : `Activando tu plan${seconds > 0 ? ` · ${seconds}s` : "..."}` }
        </p>
      </div>
    </div>
  );
}

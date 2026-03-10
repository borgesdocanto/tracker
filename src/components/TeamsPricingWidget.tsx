import { useRouter } from "next/router";
import { VOLUME_TIERS, getTierForAgents, getNextTier, agentsToNextTier, calcTeamsTotal, formatPriceARS, pricePerAgent } from "../lib/pricing";

const RED = "#aa0000";
const BASE_PRICE = 10500;

interface Props {
  agentCount: number;
  onInvite?: () => void;
}

export default function TeamsPricingWidget({ agentCount, onInvite }: Props) {
  const router = useRouter();
  const tier = getTierForAgents(agentCount);
  const nextTier = getNextTier(agentCount);
  const toNext = agentsToNextTier(agentCount);
  const totalMonthly = calcTeamsTotal(BASE_PRICE, agentCount);
  const perAgent = pricePerAgent(BASE_PRICE, agentCount);

  // Cuánto ahorra vs precio lleno
  const fullPrice = BASE_PRICE * agentCount;
  const saving = fullPrice - totalMonthly;

  // Cuánto costaría el próximo agente si invita ahora
  const costOfNextAgent = nextTier
    ? calcTeamsTotal(BASE_PRICE, agentCount + 1) - totalMonthly
    : BASE_PRICE;

  // Si están justo en el umbral, el próximo agente baja el precio de todos
  const nextAgentIsFree = toNext === 1 && nextTier !== null;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Tu plan</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-black text-gray-900" style={{ fontFamily: "Georgia, serif", fontSize: 18 }}>
              {tier.label}
            </span>
            {tier.discountPct > 0 && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full text-white" style={{ background: "#16a34a" }}>
                -{tier.discountPct}%
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="font-black" style={{ fontFamily: "Georgia, serif", fontSize: 28, color: RED, lineHeight: 1 }}>
            {formatPriceARS(totalMonthly)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">/mes · {agentCount} agente{agentCount !== 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Desglose */}
      <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {formatPriceARS(perAgent)}/agente
          {tier.discountPct > 0 && (
            <span className="text-gray-400 line-through ml-2">{formatPriceARS(BASE_PRICE)}</span>
          )}
        </span>
        {saving > 0 && (
          <span className="text-xs font-black text-green-600">
            Ahorrás {formatPriceARS(saving)}/mes
          </span>
        )}
      </div>

      {/* Tiers progress */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-1 mb-3">
          {VOLUME_TIERS.map((t, i) => {
            const isActive = t.minAgents === tier.minAgents;
            const isPast = t.minAgents < tier.minAgents;
            return (
              <div key={t.minAgents} className="flex items-center gap-1 flex-1">
                <div className="flex-1">
                  <div className={`h-2 rounded-full transition-all ${isActive ? "" : isPast ? "" : "opacity-30"}`}
                    style={{ background: isActive ? RED : isPast ? "#16a34a" : "#e5e7eb" }} />
                  <div className="text-center mt-1" style={{ fontSize: 9 }}>
                    <span className={`font-bold ${isActive ? "text-gray-900" : isPast ? "text-green-600" : "text-gray-300"}`}>
                      {t.minAgents === 1 ? "1-4" : t.minAgents === 5 ? "5-9" : t.minAgents === 10 ? "10-19" : "20+"}
                    </span>
                  </div>
                </div>
                {i < VOLUME_TIERS.length - 1 && (
                  <div className="w-1.5 h-1.5 rounded-full mb-3 shrink-0"
                    style={{ background: isPast ? "#16a34a" : "#e5e7eb" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Incentivo — el corazón del widget */}
      {nextTier && toNext !== null && (
        <div className="mx-5 mb-5 rounded-xl overflow-hidden border"
          style={{ borderColor: nextAgentIsFree ? "#f59e0b" : "#fee2e2", background: nextAgentIsFree ? "#fffbeb" : "#fff8f8" }}>
          <div className="px-4 py-3">
            {nextAgentIsFree ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">🔥</span>
                  <span className="text-xs font-black text-amber-800 uppercase tracking-wide">
                    El próximo agente te sale GRATIS
                  </span>
                </div>
                <p className="text-sm text-amber-700 leading-relaxed">
                  Con 1 agente más todos bajan a <strong>{formatPriceARS(pricePerAgent(BASE_PRICE, nextTier.minAgents))}/agente</strong> — tu factura queda en{" "}
                  <strong>{formatPriceARS(calcTeamsTotal(BASE_PRICE, agentCount + 1))}</strong>, lo mismo que hoy.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">💡</span>
                  <span className="text-xs font-black uppercase tracking-wide" style={{ color: RED }}>
                    Faltan {toNext} agente{toNext !== 1 ? "s" : ""} para -{nextTier.discountPct}%
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#7f1d1d" }}>
                  Con {nextTier.minAgents} agentes todos bajan a <strong>{formatPriceARS(pricePerAgent(BASE_PRICE, nextTier.minAgents))}/agente</strong>.{" "}
                  Ahorrás <strong>{formatPriceARS(BASE_PRICE * nextTier.minAgents - calcTeamsTotal(BASE_PRICE, nextTier.minAgents))}/mes</strong>.
                </p>
              </>
            )}
            <button onClick={onInvite}
              className="mt-3 w-full py-2.5 rounded-xl text-xs font-black text-white hover:opacity-90 transition-all"
              style={{ background: nextAgentIsFree ? "#d97706" : RED }}>
              {nextAgentIsFree ? `🎁 Invitar agente gratis →` : `Invitar agente →`}
            </button>
          </div>
        </div>
      )}

      {/* Nivel máximo */}
      {!nextTier && (
        <div className="mx-5 mb-5 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-center">
          <div className="text-sm font-black text-yellow-700">👑 Máximo descuento activo — -40% para siempre</div>
          <div className="text-xs text-yellow-600 mt-1">Seguí creciendo, el precio por agente no sube más.</div>
        </div>
      )}
    </div>
  );
}

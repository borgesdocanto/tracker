import { useRouter } from "next/router";
import { RANKS, Rank } from "../lib/ranks";

const RED = "#aa0000";

interface RankStats {
  rank: Rank;
  nextRank: Rank | null;
  activeWeeks: number;
  iacAvg: number;
  bestStreak: number;
}

export default function RankBadge({ stats }: { stats: RankStats }) {
  const router = useRouter();
  const { rank, nextRank, activeWeeks, iacAvg } = stats;
  const currentIdx = RANKS.findIndex(r => r.slug === rank.slug);

  // Progreso hacia el próximo rango
  const progressWeeks = nextRank
    ? Math.min(100, Math.round((activeWeeks / nextRank.minWeeks) * 100))
    : 100;
  const progressIac = nextRank
    ? Math.min(100, Math.round((iacAvg / nextRank.minIacAvg) * 100))
    : 100;
  const overallProgress = nextRank ? Math.round((progressWeeks + progressIac) / 2) : 100;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5"
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Tu rango</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{rank.icon}</span>
            <span className="text-xl font-black text-gray-900" style={{ fontFamily: "Georgia, serif" }}>
              {rank.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">{rank.description}</p>
        </div>
        <button onClick={() => router.push("/rangos")}
          className="text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-all shrink-0 ml-3">
          Ver rangos
        </button>
      </div>

      {/* Escalera de rangos */}
      <div className="flex items-center gap-1 mb-4">
        {RANKS.map((r, i) => (
          <div key={r.slug} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all ${i <= currentIdx ? "shadow-sm" : ""}`}
                style={{ background: i <= currentIdx ? RED : "#f3f4f6", fontSize: i <= currentIdx ? 14 : 12 }}>
                {i <= currentIdx ? r.icon : <span className="text-gray-300">{r.icon}</span>}
              </div>
              <div className="text-gray-400 mt-0.5 text-center leading-tight hidden sm:block"
                style={{ fontSize: 8 }}>{r.label.split(" ")[0]}</div>
            </div>
            {i < RANKS.length - 1 && (
              <div className="h-0.5 flex-1 rounded-full mb-3"
                style={{ background: i < currentIdx ? RED : "#e5e7eb" }} />
            )}
          </div>
        ))}
      </div>

      {/* Progreso hacia próximo rango */}
      {nextRank ? (
        <div className="bg-gray-50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-600">Próximo: {nextRank.icon} {nextRank.label}</span>
            <span className="text-xs font-black" style={{ color: RED }}>{overallProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%`, background: RED }} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="text-xs text-gray-500">
              <span className={activeWeeks >= nextRank.minWeeks ? "text-green-600 font-bold" : ""}>
                {activeWeeks >= nextRank.minWeeks ? "✓" : ""} {activeWeeks}/{nextRank.minWeeks} semanas activas
              </span>
            </div>
            <div className="text-xs text-gray-500">
              <span className={iacAvg >= nextRank.minIacAvg ? "text-green-600 font-bold" : ""}>
                {iacAvg >= nextRank.minIacAvg ? "✓" : ""} IAC prom. {iacAvg}% / {nextRank.minIacAvg}%
              </span>
            </div>
            {nextRank.minStreak && (
              <div className="text-xs text-gray-500 col-span-2">
                <span className={stats.bestStreak >= nextRank.minStreak ? "text-green-600 font-bold" : ""}>
                  {stats.bestStreak >= nextRank.minStreak ? "✓" : ""} Racha máxima {stats.bestStreak}/{nextRank.minStreak} días
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
          <span className="text-sm font-black text-yellow-700">👑 Nivel máximo — Master Broker</span>
        </div>
      )}
    </div>
  );
}

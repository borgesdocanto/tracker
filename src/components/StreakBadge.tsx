interface Props {
  current: number;
  best: number;
  todayActive: boolean;
  minGreens?: number;
  shields?: number;
}

export default function StreakBadge({ current, best, todayActive, minGreens = 1, shields = 0 }: Props) {
  const isAlive = current > 0;
  const isOnFire = current >= 5;
  const isBest = current > 0 && current === best && best >= 3;

  const emoji = isOnFire ? "🔥" : isAlive ? "⚡" : "💤";
  const bg = isOnFire ? "#fff7ed" : isAlive ? "#fef2f2" : "#f9fafb";
  const color = isOnFire ? "#ea580c" : isAlive ? "#aa0000" : "#9ca3af";
  const border = isOnFire ? "#fed7aa" : isAlive ? "#fecaca" : "#e5e7eb";

  const reunionWord = minGreens === 1 ? "reunión" : "reuniones";
  const msgInactivo = `Agendá al menos ${minGreens} ${reunionWord} hoy para arrancar la racha`;
  const msgMantener = `Agendá al menos ${minGreens} ${reunionWord} hoy para mantenerla`;
  const msgActivo = `Hoy ya sumaste — seguí así`;

  // Próximo hito de protector
  const nextShieldAt = (Math.floor(current / 10) + 1) * 10;
  const daysToShield = nextShieldAt - current;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
        Racha de actividad
      </div>

      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black" style={{ fontFamily: "Georgia, serif", color }}>
              {current}
            </span>
            <span className="text-sm text-gray-400 mb-1">días</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {current === 0 ? msgInactivo : todayActive ? msgActivo : msgMantener}
          </div>
        </div>
        <div className="text-4xl">{emoji}</div>
      </div>

      {/* Barra de hoy */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: todayActive ? "100%" : "0%", background: isOnFire ? "#ea580c" : "#aa0000" }} />
        </div>
        <span className="text-xs font-bold" style={{ color: todayActive ? "#16a34a" : "#9ca3af" }}>
          {todayActive ? "Hoy ✓" : "Hoy pendiente"}
        </span>
      </div>

      <div className="text-xs text-gray-300 mb-3">
        Meta diaria: <span className="font-semibold text-gray-400">{minGreens} {reunionWord} verdes</span> para sumar un día
      </div>

      {/* Protectores de racha */}
      <div className="flex items-center justify-between py-3 border-t border-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-base">🛡️</span>
          <div>
            <span className="text-xs font-bold text-gray-700">
              {shields > 0 ? `${shields} protector${shields !== 1 ? "es" : ""} de racha` : "Sin protectores"}
            </span>
            <div className="text-xs text-gray-400">
              {shields === 0
                ? `Ganá uno llegando a ${nextShieldAt} días (faltan ${daysToShield})`
                : current > 0
                  ? `Próximo en ${daysToShield} día${daysToShield !== 1 ? "s" : ""} más`
                  : "Se usan automáticamente si perdés un día"}
            </div>
          </div>
        </div>
        {shields > 0 && (
          <div className="flex gap-1">
            {Array.from({ length: Math.min(shields, 5) }).map((_, i) => (
              <span key={i} className="text-sm">🛡️</span>
            ))}
            {shields > 5 && <span className="text-xs font-bold text-gray-400">+{shields - 5}</span>}
          </div>
        )}
      </div>

      {/* Récord */}
      {best > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
          <span className="text-xs text-gray-400">Récord personal</span>
          <div className="flex items-center gap-1">
            <span className="text-xs font-black text-gray-700">{best} días</span>
            {isBest && <span className="text-xs">🏆</span>}
          </div>
        </div>
      )}

      {/* Milestones */}
      {current > 0 && (
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {[1, 5, 10, 20, 30, 50].map(milestone => (
            <div key={milestone}
              className="text-xs px-2 py-0.5 rounded-lg font-bold transition-all"
              style={{
                background: current >= milestone ? bg : "#f9fafb",
                color: current >= milestone ? color : "#d1d5db",
                border: `1px solid ${current >= milestone ? border : "#f3f4f6"}`,
              }}>
              {milestone}d
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

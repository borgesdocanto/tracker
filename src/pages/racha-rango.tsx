import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";
import AppLayout from "../components/AppLayout";

const RED = "#aa0000";

function iacColor(v: number) {
  return v >= 100 ? "#16a34a" : v >= 67 ? "#d97706" : "#dc2626";
}

export default function RachaRangoPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/calendar/cached?days=90")
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status]);

  const streak = data?.streak ?? { current: 0, best: 0, shields: 0 };
  const rankStats = data?.rankStats;
  const ranks: any[] = rankStats?.ranks ?? [];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  })();

  if (loading || !data) return (
    <AppLayout>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Cargando...</div>
      </div>
    </AppLayout>
  );

  const currentRank = rankStats?.rank;
  const nextRank = rankStats?.nextRank;
  const weeksOnTrack = rankStats?.weeksOnTrack ?? 0;
  const weeksToUp = rankStats?.weeksToUp ?? 4;
  const progressPct = nextRank ? Math.min(100, Math.round((weeksOnTrack / weeksToUp) * 100)) : 100;

  const streakEmoji = streak.current >= 20 ? "🔥" : streak.current >= 10 ? "⚡" : streak.current > 0 ? "✦" : "💤";
  const streakMsg = streak.current >= 20 ? "En llamas — mantené el ritmo" :
    streak.current >= 10 ? "Muy activo — vas bien" :
    streak.current > 0 ? "Racha activa — seguí así" :
    "Sin racha activa — agendá una reunión verde hoy";

  return (
    <AppLayout greeting={greeting}>
      <Head><title>Racha y Rango — InmoCoach</title></Head>

      <style>{`
        .rr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 767px) { .rr-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ padding: "24px 24px 60px" }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => router.push("/")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#9ca3af", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
            ← Inicio
          </button>
          <div style={{ fontSize: 22, fontWeight: 500, color: "#111827", fontFamily: "Georgia, serif" }}>Racha y rango</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Tu consistencia y nivel de actividad</div>
        </div>

        <div className="rr-grid">

          {/* ── RACHA ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Card principal racha */}
            <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ background: streak.current > 0 ? "#111827" : "#f9fafb", padding: "20px" }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: streak.current > 0 ? "rgba(255,255,255,0.4)" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                  Racha de actividad
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <div style={{ fontSize: 64, fontWeight: 500, fontFamily: "Georgia, serif", color: streak.current > 0 ? "#fff" : "#9ca3af", lineHeight: 1 }}>{streak.current}</div>
                      <div style={{ fontSize: 16, color: streak.current > 0 ? "rgba(255,255,255,0.6)" : "#9ca3af" }}>días</div>
                    </div>
                    <div style={{ fontSize: 12, color: streak.current > 0 ? "rgba(255,255,255,0.5)" : "#9ca3af", marginTop: 4 }}>
                      Récord personal: {streak.best} días 🏆
                    </div>
                  </div>
                  <div style={{ fontSize: 52, lineHeight: 1 }}>{streakEmoji}</div>
                </div>
                <div style={{ marginTop: 14, fontSize: 13, color: streak.current > 0 ? "rgba(255,255,255,0.7)" : "#6b7280", fontStyle: "italic" }}>
                  {streakMsg}
                </div>
              </div>

              {/* Protectores */}
              <div style={{ padding: "16px 20px", borderTop: "0.5px solid #f3f4f6" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 10 }}>Protectores de racha</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} style={{
                      width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, background: i < streak.shields ? "#EEF2FF" : "#f9fafb",
                      border: `0.5px solid ${i < streak.shields ? "#c7d2fe" : "#e5e7eb"}`,
                    }}>
                      {i < streak.shields ? "🛡" : "·"}
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: "#6b7280", alignSelf: "center", marginLeft: 4 }}>
                    {streak.shields > 0 ? `${streak.shields} disponible${streak.shields !== 1 ? "s" : ""}` : "Sin protectores"}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.6 }}>
                  Un protector evita que pierdas la racha si un día no podés agendar una reunión verde. Ganás uno al llegar a 10 días consecutivos.
                </div>
              </div>
            </div>

            {/* Cómo funciona la racha */}
            <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 14, padding: "20px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 12 }}>Cómo funciona</div>
              {[
                { icon: "✦", text: "Agendá al menos 1 reunión verde por día para sumar días a tu racha" },
                { icon: "🛡", text: "Ganás un protector cada 10 días consecutivos (máx. 3)" },
                { icon: "⚡", text: "A los 10 días tu racha se vuelve más intensa" },
                { icon: "🔥", text: "A los 20 días entrás en modo elite" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 3 ? 10 : 0 }}>
                  <span style={{ fontSize: 16, flexShrink: 0, width: 20, textAlign: "center" }}>{item.icon}</span>
                  <span style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RANGO ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Rango actual */}
            {currentRank && (
              <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ background: "#111827", padding: "20px" }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                    Tu rango actual
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ fontSize: 52, lineHeight: 1 }}>{currentRank.icon}</div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 500, color: "#fff", fontFamily: "Georgia, serif" }}>{currentRank.label}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                        IAC promedio: <span style={{ color: iacColor(rankStats?.iacAvg ?? 0) }}>{rankStats?.iacAvg ?? 0}%</span> · {rankStats?.activeWeeks ?? 0} semanas activas
                      </div>
                    </div>
                  </div>

                  {/* Progreso al próximo */}
                  {nextRank && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Progreso hacia {nextRank.icon} {nextRank.label}</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{weeksOnTrack}/{weeksToUp} sem.</span>
                      </div>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: "#6366f1", borderRadius: 3, width: `${progressPct}%`, transition: "width 0.4s" }} />
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                        Necesitás {weeksToUp - weeksOnTrack} semana{weeksToUp - weeksOnTrack !== 1 ? "s" : ""} más con IAC ≥ {nextRank.minIacUp}%
                      </div>
                    </div>
                  )}
                </div>

                {nextRank && (
                  <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 28 }}>{nextRank.icon}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Próximo: {nextRank.label}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>Requiere IAC ≥ {nextRank.minIacUp}% por {weeksToUp} semanas consecutivas</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Escalera de rangos */}
            {ranks.length > 0 && (
              <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #f3f4f6" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Escalera de rangos</div>
                </div>
                <div style={{ padding: "8px 0" }}>
                  {[...ranks].reverse().map((r: any, i: number) => {
                    const isCurrent = r.slug === currentRank?.slug;
                    const isPast = ranks.indexOf(r) < ranks.findIndex((x: any) => x.slug === currentRank?.slug);
                    return (
                      <div key={r.slug} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
                        background: isCurrent ? "#fef2f2" : "transparent",
                        borderLeft: isCurrent ? `3px solid ${RED}` : "3px solid transparent",
                      }}>
                        <div style={{ fontSize: 24, width: 32, textAlign: "center" }}>{r.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: isCurrent ? 500 : 400, color: isCurrent ? "#111827" : "#374151" }}>
                            {r.label}
                            {isCurrent && <span style={{ fontSize: 10, color: RED, marginLeft: 6, fontWeight: 500 }}>← vos</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>IAC ≥ {r.minIacUp}% para subir</div>
                        </div>
                        <div style={{ fontSize: 16 }}>
                          {isCurrent ? "●" : isPast ? <span style={{ color: "#16a34a" }}>✓</span> : "○"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

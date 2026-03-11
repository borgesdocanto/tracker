import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const RED = "#aa0000";

const MENSAJES = [
  "Esta página salió a mostrar una propiedad y nunca volvió.",
  "Se fue a una reunión cara a cara y no dejó dirección.",
  "El agente que atendía esta URL ya no trabaja acá.",
  "Esta página está en cartera activa... de otro servidor.",
  "Fue a tasar y le dijeron que no valía nada.",
  "Salió a buscar leads y se perdió en el camino.",
];

export default function NotFound() {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [iac, setIac] = useState(0);
  const [dots, setDots] = useState(0);

  useEffect(() => {
    setMsg(MENSAJES[Math.floor(Math.random() * MENSAJES.length)]);
  }, []);

  // Animate IAC meter going up to 0%
  useEffect(() => {
    const t = setTimeout(() => setIac(0), 600);
    return () => clearTimeout(t);
  }, []);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => setDots(d => (d + 1) % 4), 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Head>
        <title>404 — Página no encontrada · InmoCoach</title>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .float { animation: float 3s ease-in-out infinite; }
        .fade-1 { animation: fadeUp 0.5s ease 0.1s both; }
        .fade-2 { animation: fadeUp 0.5s ease 0.25s both; }
        .fade-3 { animation: fadeUp 0.5s ease 0.4s both; }
        .fade-4 { animation: fadeUp 0.5s ease 0.55s both; }
        .fade-5 { animation: fadeUp 0.5s ease 0.7s both; }
        .shake-btn:hover { animation: shake 0.4s ease; }
        * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#0f0f0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Background grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `linear-gradient(rgba(170,0,0,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(170,0,0,0.07) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }} />

        {/* Glow blob */}
        <div style={{
          position: "absolute", width: 400, height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(170,0,0,0.15) 0%, transparent 70%)",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }} />

        {/* Floating house emoji */}
        <div className="float" style={{ fontSize: 72, marginBottom: 8, userSelect: "none" }}>🏠</div>

        {/* 404 */}
        <div className="fade-1" style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: "clamp(96px, 20vw, 160px)",
          fontWeight: 400,
          color: RED,
          lineHeight: 1,
          letterSpacing: "-4px",
          textShadow: `0 0 60px rgba(170,0,0,0.4)`,
        }}>
          404
        </div>

        {/* Subtitle */}
        <div className="fade-2" style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "clamp(18px, 3vw, 26px)",
          color: "#e5e5e5",
          marginTop: 8,
          marginBottom: 20,
          textAlign: "center",
          fontStyle: "italic",
        }}>
          Página no encontrada
        </div>

        {/* Funny message */}
        <div className="fade-3" style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14,
          padding: "16px 24px",
          maxWidth: 400,
          textAlign: "center",
          color: "#a1a1aa",
          fontSize: 15,
          lineHeight: 1.6,
          marginBottom: 32,
        }}>
          {msg || <span style={{ animation: "blink 1s infinite" }}>Buscando excusas{".".repeat(dots)}</span>}
        </div>

        {/* IAC meter — tragic */}
        <div className="fade-4" style={{ width: "100%", maxWidth: 340, marginBottom: 32 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 8,
          }}>
            <span style={{ color: "#71717a", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              IAC de esta página
            </span>
            <span style={{ color: RED, fontWeight: 700, fontSize: 14 }}>
              {iac}%
            </span>
          </div>
          <div style={{
            height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden",
          }}>
            <div style={{
              height: "100%", width: `${iac}%`,
              background: `linear-gradient(90deg, ${RED}, #ff4444)`,
              borderRadius: 999,
              transition: "width 1s ease",
            }} />
          </div>
          <div style={{ color: "#52525b", fontSize: 11, marginTop: 6, textAlign: "center" }}>
            Meta semanal: 15 reuniones · Esta URL: 0
          </div>
        </div>

        {/* Buttons */}
        <div className="fade-5" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            className="shake-btn"
            onClick={() => router.push("/")}
            style={{
              background: RED,
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "13px 28px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Volver al dashboard →
          </button>
          <button
            onClick={() => router.back()}
            style={{
              background: "transparent",
              color: "#71717a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "13px 28px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              transition: "color 0.2s, border-color 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#e5e5e5"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#71717a"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
          >
            ← Volver
          </button>
        </div>

        {/* Footer */}
        <div style={{
          position: "absolute", bottom: 24,
          color: "#3f3f46", fontSize: 12, textAlign: "center",
        }}>
          InmoCoach · Tu coach no encontró esta página pero sí encontró 3 propiedades hoy
        </div>

      </div>
    </>
  );
}

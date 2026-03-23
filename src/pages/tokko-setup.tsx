import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { CheckCircle2 } from "lucide-react";
import AppLayout from "../components/AppLayout";

const RED = "#aa0000";

export default function TokkoSetup() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tokkoSummary, setTokkoSummary] = useState<{ properties: number; agents: number } | null>(null);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setError("");
    try {
      const r = await fetch("/api/teams/tokko-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const d = await r.json();
      if (d.ok) {
        setSaved(true);
        // Get tokko summary before redirecting
        const test = await fetch("/api/admin/tokko-test", { method: "POST" });
        const td = await test.json();
        if (td.ok) setTokkoSummary({ properties: td.properties ?? 0, agents: td.users ?? 0 });
        setTimeout(() => router.push("/cuenta"), 4000);
      } else {
        setError(d.error || "API key inválida. Verificá en Tokko → Mi Empresa → Permisos.");
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    }
    setSaving(false);
  };

  return (
    <AppLayout>
      <Head><title>Conectar Tokko — InmoCoach</title></Head>

      <style>{`
        .tokko-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 767px) { .tokko-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ padding: "28px 28px 60px" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
            Configuración → Tokko Broker
          </div>
          <div style={{ fontSize: 24, fontWeight: 500, color: "#111827", marginBottom: 6, fontFamily: "Georgia, serif" }}>
            Conectá tu cartera de Tokko
          </div>
          <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, maxWidth: 600 }}>
            Gracias a la API Key de Tokko Broker vas a poder ver el estado de tus fichas,
            alertas de actualización y propiedades incompletas directamente en tu dashboard.
          </div>
        </div>

        {/* Grid 2 columnas desktop / 1 columna mobile */}
        <div className="tokko-grid">

          {/* Columna izquierda — GIF + pasos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* GIF */}
            <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #f3f4f6" }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#374151" }}>Cómo encontrar tu API Key en Tokko</div>
              </div>
              <img
                src="https://downloads.intercomcdn.com/i/o/72858699/0e637cedd7e0219e5fb8f168/118.gif?expires=1774226700&signature=cfd5956319187e731b8a64e861527fac4eb58e7a3d15babef34c0866aef9d3ab&req=cyIvE8F4lIgTWLcX3D%2B5hhi6feU18heq0FujpNulTTMlDF%2B%2FepdgkLHP4Ksa%0AxZSSjFaBc2CxoBsR%0A"
                alt="Cómo encontrar la API Key en Tokko"
                style={{ width: "100%", display: "block" }}
              />
            </div>

            {/* Pasos */}
            <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 14, padding: "20px" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 16 }}>Seguí estos pasos</div>
              {[
                { n: 1, text: <>Ingresá en Tokko y hacé click en <strong style={{ color: "#111827" }}>Mi Empresa</strong></> },
                { n: 2, text: <>Hacé click en <strong style={{ color: "#111827" }}>Permisos</strong></> },
                { n: 3, text: <>En la sección <strong style={{ color: "#111827" }}>API Key</strong> seleccioná el código y copialo</> },
                { n: 4, text: <>Pegalo en el campo de la derecha y guardalo para conectar InmoCoach</> },
              ].map((step, i, arr) => (
                <div key={step.n} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: i < arr.length - 1 ? 14 : 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: RED, color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{step.n}</div>
                  <div style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.6, paddingTop: 5 }}>{step.text}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Columna derecha — input + info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Input card */}
            <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 14, padding: "24px" }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: "#111827", marginBottom: 6 }}>Tu API Key de Tokko</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 20, lineHeight: 1.6 }}>
                Pegá tu API Key acá y conectá InmoCoach con tu cartera de propiedades en segundos.
              </div>

              <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                placeholder="Pegá tu API Key acá"
                style={{
                  width: "100%", fontSize: 13, border: "0.5px solid #d1d5db",
                  borderRadius: 10, padding: "11px 14px", fontFamily: "monospace",
                  outline: "none", marginBottom: 16, background: "#f9fafb",
                  boxSizing: "border-box",
                }}
              />

              {error && (
                <div style={{ fontSize: 12, color: "#dc2626", background: "#FEF2F2", border: "0.5px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                  ⚠ {error}
                </div>
              )}

              {saved ? (
                <div style={{ background: "#EAF3DE", border: "0.5px solid #86efac", borderRadius: 12, padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: tokkoSummary ? 14 : 0 }}>
                    <CheckCircle2 size={20} style={{ color: "#16a34a", flexShrink: 0 }} />
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#166534" }}>¡Tokko conectado correctamente!</div>
                  </div>
                  {tokkoSummary && (
                    <>
                      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                        <div style={{ flex: 1, background: "#fff", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                          <div style={{ fontSize: 28, fontWeight: 500, fontFamily: "Georgia, serif", color: "#16a34a" }}>{tokkoSummary.properties}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>propiedades</div>
                        </div>
                        <div style={{ flex: 1, background: "#fff", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                          <div style={{ fontSize: 28, fontWeight: 500, fontFamily: "Georgia, serif", color: "#16a34a" }}>{tokkoSummary.agents}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>agentes</div>
                        </div>
                      </div>
                      {tokkoSummary.agents > 0 && (
                        <button onClick={() => router.push("/cuenta")}
                          style={{ width: "100%", background: RED, color: "#fff", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
                          Invitar agentes de Tokko a InmoCoach →
                        </button>
                      )}
                      {tokkoSummary.agents === 0 && (
                        <div style={{ fontSize: 12, color: "#166534" }}>Redirigiendo al dashboard...</div>
                      )}
                    </>
                  )}
                  {!tokkoSummary && <div style={{ fontSize: 12, color: "#166534" }}>Sincronizando datos...</div>}
                </div>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || !apiKey.trim()}
                  style={{
                    width: "100%",
                    background: apiKey.trim() ? RED : "#e5e7eb",
                    color: apiKey.trim() ? "#fff" : "#9ca3af",
                    border: "none", borderRadius: 10, padding: "13px 0",
                    fontSize: 14, fontWeight: 500,
                    cursor: apiKey.trim() ? "pointer" : "not-allowed",
                    transition: "background 0.15s",
                  }}>
                  {saving ? "Verificando conexión..." : "Guardar y conectar"}
                </button>
              )}
            </div>

            {/* Info de seguridad */}
            <div style={{ background: "#f9fafb", border: "0.5px solid #e5e7eb", borderRadius: 14, padding: "20px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 10 }}>🔒 Tu información está segura</div>
              {[
                "Tu API Key se guarda de forma cifrada y nunca se comparte.",
                "InmoCoach solo lee el estado de tus propiedades — nunca escribe ni modifica datos en Tokko.",
                "Podés desconectar Tokko en cualquier momento desde esta pantalla.",
              ].map((txt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: i < 2 ? 8 : 0 }}>
                  <span style={{ color: "#16a34a", fontSize: 12, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{txt}</span>
                </div>
              ))}
            </div>

            {/* Beneficios */}
            <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 14, padding: "20px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 10 }}>✦ Qué vas a poder ver</div>
              {[
                "Propiedades disponibles y su estado de ficha en tu dashboard",
                "Alertas de fichas incompletas — fotos, plano, video o tour 360",
                "Propiedades sin actualizar hace más de 30 días",
                "El coach de IA va a incluir tu cartera en sus análisis",
              ].map((txt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: i < 3 ? 8 : 0 }}>
                  <span style={{ color: RED, fontSize: 12, marginTop: 1 }}>→</span>
                  <span style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}>{txt}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";
import AppLayout from "../../components/AppLayout";
import { Loader2, Check } from "lucide-react";

const RED = "#aa0000";

function Toggle({ val, onChange, disabled }: { val: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div onClick={() => !disabled && onChange(!val)} style={{
      position: "relative", width: 40, height: 22, borderRadius: 11,
      background: val ? RED : "#e5e7eb",
      cursor: disabled ? "not-allowed" : "pointer",
      flexShrink: 0, transition: "background 0.2s",
      opacity: disabled ? 0.5 : 1,
    }}>
      <div style={{
        position: "absolute", top: 2, width: 18, height: 18, background: "#fff",
        borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s",
        left: val ? "calc(100% - 20px)" : 2,
      }} />
    </div>
  );
}

function Checkbox({ val, onChange }: { val: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!val)} style={{
      width: 18, height: 18, borderRadius: 4, border: `2px solid ${val ? RED : "#d1d5db"}`,
      background: val ? RED : "#fff", cursor: "pointer", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
    }}>
      {val && <Check size={11} color="#fff" strokeWidth={3} />}
    </div>
  );
}

function Row({ label, desc, right }: { label: string; desc?: string; right: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #f3f4f6", gap: 16 }}>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>{label}</p>
        {desc && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>{desc}</p>}
      </div>
      {right}
    </div>
  );
}

export default function MailsConfigPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [teamRole, setTeamRole] = useState<string | null>(null);

  const [recvAgent, setRecvAgent] = useState(true);
  const [recvTeam, setRecvTeam] = useState(true);
  const [selfActivity, setSelfActivity] = useState(true);
  const [selfTokko, setSelfTokko] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/mail-prefs")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        // Solo owners y team_leaders pueden acceder a esta página
        if (!["owner", "team_leader"].includes(d.teamRole)) {
          router.replace("/");
          return;
        }
        setTeamRole(d.teamRole);
        setRecvAgent(d.prefs.recv_agent ?? true);
        setRecvTeam(d.prefs.recv_team ?? true);
        setSelfActivity(d.prefs.include_self_activity ?? true);
        setSelfTokko(d.prefs.include_self_tokko ?? true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status, router]);

  async function save() {
    setSaving(true);
    await fetch("/api/mail-prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recv_agent: recvAgent,
        recv_team: recvTeam,
        include_self_activity: selfActivity,
        include_self_tokko: selfTokko,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading || status === "loading") {
    return (
      <AppLayout>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
          <Loader2 size={28} color={RED} className="animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const roleLabel = teamRole === "owner" ? "Broker" : "Team Leader";

  return (
    <AppLayout>
      <Head><title>Preferencias de mail — InmoCoach</title></Head>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px 40px" }}>

        <div style={{ padding: "24px 0 20px" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#111827" }}>Preferencias de mail</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9ca3af" }}>Configurá qué mails querés recibir como {roleLabel}.</p>
        </div>

        {/* Mail de agente */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "4px 20px 8px", marginBottom: 16 }}>
          <p style={{ margin: "16px 0 4px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Mail de usuario general
          </p>
          <Row
            label="Recibir informe semanal"
            desc="El análisis de tu propia actividad (lunes) y alerta de mitad de semana (miércoles)."
            right={<Toggle val={recvAgent} onChange={setRecvAgent} />}
          />
        </div>

        {/* Mail de equipo */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "4px 20px 8px", marginBottom: 16 }}>
          <p style={{ margin: "16px 0 4px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Mail de {roleLabel}
          </p>
          <Row
            label={`Recibir resumen de equipo`}
            desc={`Un mail semanal con el IAC de cada agente, alertas de baja actividad y estado de fichas Tokko.`}
            right={<Toggle val={recvTeam} onChange={setRecvTeam} />}
          />

          {recvTeam && (
            <>
              <p style={{ margin: "16px 0 8px", fontSize: 12, color: "#6b7280" }}>
                ¿Incluir tu propia información en el resumen de equipo?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <Checkbox val={selfActivity} onChange={setSelfActivity} />
                  <span style={{ fontSize: 13, color: "#374151" }}>
                    Incluir mi nivel de actividad (IAC) en el resumen de equipo
                  </span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <Checkbox val={selfTokko} onChange={setSelfTokko} />
                  <span style={{ fontSize: 13, color: "#374151" }}>
                    Incluir el estado de mis fichas Tokko en el resumen de equipo
                  </span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Guardar */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          {saved && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#16a34a" }}>
              <Check size={14} /> Guardado
            </div>
          )}
          <button
            onClick={save}
            disabled={saving}
            style={{
              background: RED, color: "#fff", border: "none", borderRadius: 10,
              padding: "10px 24px", fontSize: 14, fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Guardar preferencias
          </button>
        </div>

        {/* Info */}
        <div style={{ marginTop: 24, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
            <strong style={{ color: "#374151" }}>Mail de usuario general:</strong> se envía los lunes (resumen semanal) y miércoles (alerta de mitad de semana) con tu actividad individual.<br /><br />
            <strong style={{ color: "#374151" }}>Mail de {roleLabel}:</strong> se envía los lunes con el resumen del equipo — IAC de cada agente, alertas de baja actividad y estado de fichas en Tokko Broker.
          </p>
        </div>

      </div>
    </AppLayout>
  );
}

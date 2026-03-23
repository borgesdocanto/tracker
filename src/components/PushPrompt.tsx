import { Bell, X } from "lucide-react";
import { useState } from "react";
import { usePushNotifications } from "../hooks/usePushNotifications";

const RED = "#aa0000";

export default function PushPrompt() {
  const { status, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (status === "loading" || status === "unsupported" || status === "denied" || dismissed) return null;

  if (status === "granted") {
    if (!done) return null;
    return (
      <div style={{
        position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
        background: "#EAF3DE", border: "0.5px solid #86efac", borderRadius: 12,
        padding: "10px 20px", display: "flex", alignItems: "center", gap: 10,
        fontSize: 13, color: "#166534", fontWeight: 500, zIndex: 50,
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)", whiteSpace: "nowrap",
      }}>
        <Bell size={14} /> Notificaciones activadas ✓
      </div>
    );
  }

  const handleEnable = async () => {
    setLoading(true);
    const ok = await subscribe();
    setLoading(false);
    if (ok) setDone(true);
  };

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20,
      background: "#fff", border: "0.5px solid #e5e7eb",
      borderRadius: 16, padding: "16px 18px", maxWidth: 320,
      boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 50,
      fontFamily: "'Helvetica Neue', sans-serif",
    }}>
      <button onClick={() => setDismissed(true)} style={{
        position: "absolute", top: 10, right: 10,
        background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: 4,
      }}>
        <X size={14} />
      </button>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>🔥</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginBottom: 3 }}>
            Activá las notificaciones de racha
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
            Te avisamos a las 18hs si tu racha está en riesgo — sin abrir la app.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleEnable} disabled={loading} style={{
          flex: 1, background: RED, color: "#fff", border: "none",
          borderRadius: 9, padding: "8px 0", fontSize: 12, fontWeight: 500,
          cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Bell size={12} />
          {loading ? "Activando..." : "Activar"}
        </button>
        <button onClick={() => setDismissed(true)} style={{
          padding: "8px 12px", fontSize: 12, color: "#9ca3af",
          background: "#f9fafb", border: "0.5px solid #e5e7eb",
          borderRadius: 9, cursor: "pointer",
        }}>
          No, gracias
        </button>
      </div>
    </div>
  );
}

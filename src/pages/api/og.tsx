import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const config = { runtime: "edge" };

export default function handler(req: NextRequest) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#111827",
          fontFamily: "Georgia, serif",
          position: "relative",
        }}
      >
        {/* Barra roja superior */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: 8, background: "#aa0000",
        }} />

        {/* Logo */}
        <div style={{
          fontSize: 96, fontWeight: 900, color: "#ffffff",
          letterSpacing: "-2px", lineHeight: 1, marginBottom: 24,
          display: "flex",
        }}>
          <span>Inmo</span>
          <span style={{ color: "#aa0000" }}>Coach</span>
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 32, color: "rgba(255,255,255,0.6)",
          fontFamily: "sans-serif", fontWeight: 400, letterSpacing: "0.5px",
          marginBottom: 48,
        }}>
          El 80% trabaja. El 20% produce.
        </div>

        {/* Pills */}
        <div style={{ display: "flex", gap: 16 }}>
          {["📅 Agenda", "📊 IAC", "🏠 Tokko", "✧ Coach IA"].map(label => (
            <div key={label} style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 40, padding: "10px 24px",
              fontSize: 22, color: "rgba(255,255,255,0.8)",
              fontFamily: "sans-serif",
              display: "flex",
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{
          position: "absolute", bottom: 32,
          fontSize: 20, color: "rgba(255,255,255,0.3)",
          fontFamily: "sans-serif",
          display: "flex",
        }}>
          inmocoach.com.ar
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

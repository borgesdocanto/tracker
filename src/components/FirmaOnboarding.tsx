// components/FirmaOnboarding.tsx — Tutorial paso a paso de Firma Digital

import { useState } from "react";

const RED = "#aa0000";

interface Props {
  onClose: (noMostrarMas: boolean) => void;
}

const PASOS = [
  {
    emoji: "✍️",
    bg: `linear-gradient(135deg, ${RED} 0%, #7f0000 100%)`,
    titulo: "Firma Electrónica",
    subtitulo: "Documentos con validez legal desde tu celular",
    contenido: (
      <div>
        <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
          Con este módulo podés enviar cualquier documento para que tus clientes lo firmen 
          digitalmente, <strong>sin que tengan que instalar nada</strong> ni crear una cuenta.
        </p>
        <div style={{ background: "#fff7f7", border: "1px solid #fecdd3", borderRadius: 10, padding: 14, fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
          <strong style={{ color: RED }}>¿Firma electrónica o digital?</strong><br/>
          Lo que hace InmoCoach es <strong>firma electrónica con evidencia reforzada</strong>: 
          captura foto del DNI, selfie, IP y timestamp. Tiene validez legal para 
          contratos inmobiliarios, aunque es distinta a la firma digital certificada por AFIP.
        </div>
      </div>
    ),
  },
  {
    emoji: "📄",
    bg: "linear-gradient(135deg, #1e3a5f 0%, #0f2340 100%)",
    titulo: "Paso 1: El documento",
    subtitulo: "Tenés dos formas de empezar",
    contenido: (
      <div style={{ display: "grid", gap: 12 }}>
        {[
          {
            icono: "📤",
            titulo: "Subir un PDF",
            descripcion: "Arrastrás cualquier PDF — un contrato de Word, un boleto escaneado, lo que sea. El sistema lo envía tal cual.",
            color: "#eff6ff",
            border: "#bfdbfe",
          },
          {
            icono: "📋",
            titulo: "Usar una plantilla",
            descripcion: "Creás plantillas de tus documentos más usados (boleto, mandato, alquiler). Completás los campos y listo, sin tocar el PDF.",
            color: "#f0fdf4",
            border: "#bbf7d0",
          },
        ].map((item, i) => (
          <div key={i} style={{ background: item.color, border: `1px solid ${item.border}`, borderRadius: 10, padding: 14, display: "flex", gap: 12 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icono}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 4 }}>{item.titulo}</div>
              <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>{item.descripcion}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    emoji: "👥",
    bg: "linear-gradient(135deg, #0369a1 0%, #01497c 100%)",
    titulo: "Paso 2: Los firmantes",
    subtitulo: "Podés agregar uno o varios",
    contenido: (
      <div>
        <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.7, marginBottom: 14 }}>
          Para cada firmante completás su nombre, email y rol (Vendedor, Comprador, Locatario, etc.).
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {[
            { icono: "📧", texto: "Cada firmante recibe un email con su link personal e intransferible." },
            { icono: "📱", texto: "Abre el link desde el celu, no necesita instalar nada ni registrarse." },
            { icono: "🔗", texto: "Si tenés 2 firmantes, cada uno recibe su propio link — firma de manera independiente." },
            { icono: "📊", texto: "En el panel ves el estado de cada uno: quién firmó, quién no, y cuándo." },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icono}</span>
              <span style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{item.texto}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    emoji: "🪪",
    bg: "linear-gradient(135deg, #065f46 0%, #022c22 100%)",
    titulo: "Paso 3: El cliente firma",
    subtitulo: "El proceso que vive tu cliente",
    contenido: (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[
            { num: "1", emoji: "📄", label: "Ve el documento", desc: "El PDF se muestra en pantalla. Debe leerlo antes de continuar.", color: "#eff6ff", border: "#bfdbfe" },
            { num: "2", emoji: "🪪", label: "Foto del DNI", desc: "Saca foto del frente y dorso de su DNI con la cámara del celu.", color: "#fef9c3", border: "#fde047" },
            { num: "3", emoji: "🤳", label: "Selfie", desc: "Se saca una foto sosteniendo el DNI — prueba de identidad.", color: "#f0fdf4", border: "#bbf7d0" },
            { num: "4", emoji: "✍️", label: "Firma", desc: "Dibuja su firma con el dedo directamente en la pantalla.", color: "#fff7ed", border: "#fed7aa" },
          ].map((item, i) => (
            <div key={i} style={{ background: item.color, border: `1.5px solid ${item.border}`, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{item.emoji}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#111", marginBottom: 4, lineHeight: 1.3 }}>{item.label}</div>
              <div style={{ fontSize: 10, color: "#6b7280", lineHeight: 1.4 }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, fontSize: 12, color: "#374151", lineHeight: 1.7 }}>
          🔒 <strong>Todo queda registrado:</strong> IP del dispositivo, timestamp exacto, fotos del DNI y selfie, y la firma manuscrita digital. Si alguien cuestiona la firma, tenés evidencia completa.
        </div>
      </div>
    ),
  },
  {
    emoji: "📊",
    bg: "linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)",
    titulo: "El panel de control",
    subtitulo: "Todo desde un solo lugar",
    contenido: (
      <div style={{ display: "grid", gap: 10 }}>
        {[
          {
            color: "#ffedd5", border: "#fdba74",
            icono: "🟠", titulo: "Pendiente",
            desc: "El documento fue enviado pero ningún firmante firmó todavía.",
          },
          {
            color: "#fef9c3", border: "#fde047",
            icono: "🟡", titulo: "En proceso",
            desc: "Al menos un firmante completó su firma. Esperando a los demás.",
          },
          {
            color: "#d1fae5", border: "#6ee7b7",
            icono: "🟢", titulo: "Completado",
            desc: "Todos firmaron. Podés descargar el PDF con la página de auditoría.",
          },
        ].map((item, i) => (
          <div key={i} style={{ background: item.color, border: `1px solid ${item.border}`, borderRadius: 10, padding: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16 }}>{item.icono}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#111", marginBottom: 2 }}>{item.titulo}</div>
              <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, padding: "4px 0" }}>
          Desde el detalle de cada documento podés: <strong>ver el PDF</strong>, 
          <strong> ampliar fotos de DNI y selfie</strong>, <strong>reenviar el link</strong> 
          a quien no firmó, <strong>reemplazar el PDF</strong> si hay un error, 
          y <strong>copiar el hash</strong> para enviarlo por WhatsApp como constancia.
        </div>
      </div>
    ),
  },
  {
    emoji: "💡",
    bg: `linear-gradient(135deg, ${RED} 0%, #7f0000 100%)`,
    titulo: "Tips para usar bien el sistema",
    subtitulo: "Consejos de uso",
    contenido: (
      <div style={{ display: "grid", gap: 10 }}>
        {[
          { icono: "✅", texto: <span>Siempre <strong>subí el PDF final y definitivo</strong> antes de enviarlo. Podés reemplazarlo después, pero los firmantes tienen que volver a abrir el link.</span> },
          { icono: "👤", texto: <span>Usá <strong>roles específicos</strong> (Vendedor, Comprador) en vez de "Firmante" genérico — aparece en el PDF de auditoría y queda más prolijo.</span> },
          { icono: "📋", texto: <span>Si usás los mismos documentos frecuentemente, creá <strong>plantillas</strong> en "Plantillas de Firma" — ahorrás tiempo llenando los campos cada vez.</span> },
          { icono: "📲", texto: <span>Después de enviar, <strong>avisale al cliente por WhatsApp</strong> que le llegó un mail para firmar — muchos lo tienen en spam.</span> },
          { icono: "🔐", texto: <span>Los documentos firmados tienen <strong>validez legal</strong> pero te recomendamos consultá a tu escribano para contratos de alto valor.</span> },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icono}</span>
            <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{item.texto}</span>
          </div>
        ))}
      </div>
    ),
  },
];

export default function FirmaOnboarding({ onClose }: Props) {
  const [paso, setPaso] = useState(0);
  const [noMostrar, setNoMostrar] = useState(false);

  const pasoActual = PASOS[paso];
  const esUltimo = paso === PASOS.length - 1;
  const esPrimero = paso === 0;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
      zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 520,
        boxShadow: "0 24px 80px rgba(0,0,0,.35)", overflow: "hidden",
        display: "flex", flexDirection: "column", maxHeight: "90vh"
      }}>
        {/* Header con gradiente */}
        <div style={{ background: pasoActual.bg, padding: "28px 28px 24px", flexShrink: 0, transition: "background .4s" }}>
          <div style={{ fontSize: 44, marginBottom: 10, textAlign: "center" }}>{pasoActual.emoji}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", textAlign: "center", marginBottom: 4 }}>
            {pasoActual.titulo}
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.75)", textAlign: "center" }}>
            {pasoActual.subtitulo}
          </div>

          {/* Indicadores de paso */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 18 }}>
            {PASOS.map((_, i) => (
              <button
                key={i}
                onClick={() => setPaso(i)}
                style={{
                  width: i === paso ? 24 : 8,
                  height: 8, borderRadius: 4,
                  background: i === paso ? "#fff" : "rgba(255,255,255,.35)",
                  border: "none", cursor: "pointer", padding: 0,
                  transition: "all .25s"
                }}
              />
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>
          {pasoActual.contenido}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 28px 20px", borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>
          {/* Check "no mostrar más" */}
          <label style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
            cursor: "pointer", fontSize: 13, color: "#6b7280"
          }}>
            <input
              type="checkbox"
              checked={noMostrar}
              onChange={e => setNoMostrar(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: RED }}
            />
            No volver a mostrar este tutorial
          </label>

          <div style={{ display: "flex", gap: 10 }}>
            {!esPrimero && (
              <button onClick={() => setPaso(p => p - 1)} style={{
                flex: 1, background: "#f3f4f6", border: "none", borderRadius: 12,
                padding: "12px 0", fontSize: 14, fontWeight: 600, color: "#374151",
                cursor: "pointer"
              }}>
                ← Anterior
              </button>
            )}
            {esUltimo ? (
              <button onClick={() => onClose(noMostrar)} style={{
                flex: 2, background: RED, color: "#fff", border: "none",
                borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 800,
                cursor: "pointer"
              }}>
                ¡Empezar a usar! →
              </button>
            ) : (
              <button onClick={() => setPaso(p => p + 1)} style={{
                flex: 2, background: RED, color: "#fff", border: "none",
                borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 800,
                cursor: "pointer"
              }}>
                Siguiente → {paso + 1}/{PASOS.length}
              </button>
            )}
            <button onClick={() => onClose(noMostrar)} style={{
              background: "none", border: "1px solid #e5e7eb", borderRadius: 12,
              padding: "12px 14px", fontSize: 12, color: "#9ca3af",
              cursor: "pointer", flexShrink: 0
            }}>
              Saltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

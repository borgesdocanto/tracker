import Head from "next/head";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";

const RED = "#aa0000";

const sections = [
  { title: "1. Quiénes somos", body: "InmoCoach es un servicio de seguimiento de productividad comercial para el sector inmobiliario, operado desde la República Argentina. Podés contactarnos en hola@inmocoach.com.ar." },
  { title: "2. Qué datos recopilamos", body: "Al conectar tu cuenta de Google, accedemos únicamente a tu calendario (lectura, sin modificación) para detectar tus reuniones comerciales. Guardamos tu nombre, email y foto de perfil que Google nos provee al autenticarte. No accedemos a tu email, documentos, ni ningún otro servicio de Google." },
  { title: "3. Para qué usamos tus datos", body: "Usamos tu información exclusivamente para: mostrar tu dashboard de productividad, generar el análisis semanal de Inmo Coach, enviarte el reporte semanal por email y gestionar tu suscripción. No compartimos ni vendemos tus datos con terceros." },
  { title: "4. Almacenamiento y seguridad", body: "Tus datos se almacenan en servidores de Supabase (región São Paulo, Brasil) con cifrado en tránsito y en reposo. Los tokens de acceso a Google Calendar se guardan de forma segura y se usan exclusivamente para sincronizar tu agenda. No almacenamos contraseñas — el acceso se gestiona mediante OAuth 2.0 de Google." },
  { title: "5. Retención de datos", body: "Conservamos tus datos mientras tu cuenta esté activa. Si cancelás tu suscripción o solicitás la eliminación de tu cuenta, eliminamos todos tus datos dentro de los 30 días siguientes. Para solicitar la eliminación, escribinos a hola@inmocoach.com.ar." },
  { title: "6. Servicios de terceros", body: "InmoCoach utiliza los siguientes servicios externos: Google OAuth y Calendar API (autenticación y lectura de agenda), MercadoPago (procesamiento de pagos — no almacenamos datos de tarjetas), Resend (envío de emails transaccionales) y Anthropic Claude (generación del análisis de IA — procesamos tu información de actividad, no datos personales identificatorios)." },
  { title: "7. Tus derechos", body: "Tenés derecho a acceder a tus datos, corregir información incorrecta, solicitar la eliminación de tu cuenta y datos, exportar tu información y revocar el acceso a Google Calendar desde tu cuenta de Google en cualquier momento. Para ejercer cualquiera de estos derechos, escribinos a hola@inmocoach.com.ar." },
  { title: "8. Cookies", body: "Usamos únicamente cookies de sesión necesarias para mantener tu sesión activa. No usamos cookies de seguimiento ni publicidad." },
  { title: "9. Cambios en esta política", body: "Si realizamos cambios significativos en esta política, te notificaremos por email con al menos 15 días de anticipación. El uso continuado del servicio después de los cambios implica tu aceptación." },
  { title: "10. Contacto", body: "Para cualquier consulta sobre privacidad, escribinos a hola@inmocoach.com.ar. Respondemos en un plazo máximo de 5 días hábiles." },
];

export default function Privacidad() {
  const router = useRouter();
  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <Head><title>Política de Privacidad — InmoCoach</title></Head>
      <div style={{ height: 3, background: RED }} />

      <nav style={{ background: "#fff", borderBottom: "1px solid #f3f4f6", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => router.push("/home")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
            <ArrowLeft size={13} /> Volver
          </button>
          <div style={{ marginLeft: "auto", fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 18 }}>
            Insta<span style={{ color: RED }}>Coach</span>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px" }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: "48px 48px", marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: RED, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 900, color: "#111827", marginBottom: 8, lineHeight: 1.1 }}>Política de Privacidad</h1>
          <p style={{ color: "#9ca3af", fontSize: 13 }}>Última actualización: enero 2025 · inmocoach.com.ar</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sections.map((s, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "24px 32px" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 10 }}>{s.title}</h2>
              <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.8 }}>{s.body}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 40 }}>
          <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>¿Preguntas? Escribinos a hola@inmocoach.com.ar</p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <a href="/terminos" style={{ color: "#6b7280", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>Términos de uso →</a>
            <a href="/login" style={{ color: "#6b7280", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>Iniciar sesión →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

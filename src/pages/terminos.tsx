import Head from "next/head";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";

const RED = "#aa0000";

const sections = [
  { title: "1. Aceptación de los términos", body: "Al crear una cuenta y usar InstaCoach, aceptás estos términos en su totalidad. Si no estás de acuerdo con alguna parte, no podés usar el servicio. El uso continuado del servicio implica la aceptación de cualquier actualización de estos términos." },
  { title: "2. Descripción del servicio", body: "InstaCoach es una plataforma SaaS que sincroniza tu Google Calendar para detectar reuniones comerciales cara a cara, medir tu productividad y generar análisis personalizados mediante inteligencia artificial. El servicio incluye dashboard de actividad, reporte semanal por email y, según el plan, funcionalidades de equipo para brokers." },
  { title: "3. Registro y cuenta", body: "Para usar InstaCoach necesitás una cuenta de Google válida. Sos responsable de mantener la confidencialidad de tu sesión. Cada cuenta es personal e intransferible. No podés compartir tu acceso con otras personas ni crear cuentas múltiples para un mismo usuario." },
  { title: "4. Planes y pagos", body: "InstaCoach ofrece un período de prueba gratuito de 7 días con acceso completo. Una vez vencido el período de prueba, el acceso requiere una suscripción mensual activa. Los precios están expresados en pesos argentinos (ARS) y se procesan a través de MercadoPago. Las suscripciones se renuevan automáticamente cada mes. Podés cancelar en cualquier momento desde tu cuenta de MercadoPago." },
  { title: "5. Política de reembolsos", body: "Dado que ofrecemos 7 días de prueba gratuita sin restricciones, no ofrecemos reembolsos una vez procesado el pago. Si tenés problemas con el servicio, escribinos a hola@instacoach.com.ar y lo resolvemos." },
  { title: "6. Uso aceptable", body: "Podés usar InstaCoach para gestionar tu actividad comercial personal y de tu equipo. No podés usar el servicio para actividades ilegales, revender el acceso a terceros, intentar acceder a datos de otros usuarios, hacer ingeniería inversa del software ni sobrecargar los servidores con solicitudes automatizadas." },
  { title: "7. Propiedad intelectual", body: "InstaCoach y todos sus componentes (software, diseño, textos, marca) son propiedad de sus creadores y están protegidos por las leyes de propiedad intelectual argentinas e internacionales. Los datos de tu actividad comercial son tuyos — InstaCoach no reclama propiedad sobre ellos." },
  { title: "8. Disponibilidad del servicio", body: "Nos esforzamos por mantener InstaCoach disponible el 99% del tiempo, pero no garantizamos disponibilidad ininterrumpida. Podemos realizar mantenimientos programados notificando con anticipación. No somos responsables por pérdidas derivadas de interrupciones del servicio." },
  { title: "9. Limitación de responsabilidad", body: "InstaCoach es una herramienta de medición y análisis. El análisis de Insta Coach es orientativo y no reemplaza el criterio profesional del usuario. No somos responsables por decisiones comerciales tomadas en base al análisis del servicio. La responsabilidad máxima de InstaCoach ante cualquier reclamo no superará el monto abonado en los últimos 3 meses de suscripción." },
  { title: "10. Cancelación y cierre de cuenta", body: "Podés cancelar tu suscripción en cualquier momento. Al cancelar, mantenés acceso hasta el fin del período pago. Podés solicitar el cierre completo de tu cuenta escribiendo a hola@instacoach.com.ar. Nos reservamos el derecho de suspender cuentas que violen estos términos." },
  { title: "11. Ley aplicable", body: "Estos términos se rigen por las leyes de la República Argentina. Cualquier disputa será resuelta en los tribunales ordinarios de la Ciudad Autónoma de Buenos Aires, con renuncia expresa a cualquier otro fuero." },
  { title: "12. Contacto", body: "Para consultas sobre estos términos, escribinos a hola@instacoach.com.ar." },
];

export default function Terminos() {
  const router = useRouter();
  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <Head><title>Términos de Uso — InstaCoach</title></Head>
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
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 900, color: "#111827", marginBottom: 8, lineHeight: 1.1 }}>Términos de Uso</h1>
          <p style={{ color: "#9ca3af", fontSize: 13 }}>Última actualización: enero 2025 · instacoach.com.ar</p>
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
          <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>¿Preguntas? Escribinos a hola@instacoach.com.ar</p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <a href="/privacidad" style={{ color: "#6b7280", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>Política de privacidad →</a>
            <a href="/login" style={{ color: "#6b7280", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>Iniciar sesión →</a>
          </div>
        </div>
      </div>
    </div>
  );
}

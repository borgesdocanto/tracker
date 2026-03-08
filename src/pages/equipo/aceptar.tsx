import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import { Loader2, CheckCircle, XCircle, BarChart2, Mail, Users } from "lucide-react";

const RED = "#aa0000";

interface InviteInfo {
  brokerName: string;
  agencyName?: string;
  displayName: string;
}

export default function AceptarInvitacion() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { token } = router.query;
  const [state, setState] = useState<"loading" | "success" | "error" | "idle">("idle");
  const [message, setMessage] = useState("");
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [accepted, setAccepted] = useState(false);

  // Cargar info de la invitación antes de aceptar
  useEffect(() => {
    if (!token) return;
    fetch(`/api/teams/invite-info?token=${token}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setInfo(d); })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (status === "unauthenticated" && token) {
      sessionStorage.setItem("pendingInviteToken", token as string);
      signIn("google", { callbackUrl: `/equipo/aceptar?token=${token}` });
    }
  }, [status, token]);

  // Solo aceptar automáticamente si ya estaba logueado y viene del mail
  useEffect(() => {
    if (status === "authenticated" && token && !accepted && state === "idle") {
      // Mostrar pantalla de bienvenida primero, no aceptar automáticamente
    }
  }, [status, token]);

  const acceptInvite = async () => {
    setState("loading");
    setAccepted(true);
    try {
      const res = await fetch("/api/teams/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.ok) {
        setState("success");
        setTimeout(() => router.push("/"), 3000);
      } else {
        setState("error");
        setMessage(data.error || "No se pudo procesar la invitación.");
      }
    } catch {
      setState("error");
      setMessage("Error de conexión. Intentá de nuevo.");
    }
  };

  const brokerLabel = info?.agencyName || info?.brokerName || "tu broker";
  const teamLabel = info?.displayName || "el equipo";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4"
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <Head><title>Invitación al equipo — InstaCoach</title></Head>
      <div className="h-0.5 fixed top-0 left-0 right-0" style={{ background: RED }} />

      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black" style={{ fontFamily: "Georgia, serif" }}>
            Insta<span style={{ color: RED }}>Coach</span>
          </h1>
        </div>

        {/* Estado: loading / procesando */}
        {(state === "loading" || (status === "loading")) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Loader2 size={28} className="animate-spin mx-auto mb-3" style={{ color: RED }} />
            <p className="text-sm text-gray-400">
              {status === "loading" ? "Verificando tu sesión..." : "Procesando invitación..."}
            </p>
          </div>
        )}

        {/* Estado: listo para aceptar */}
        {state === "idle" && status === "authenticated" && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Invitación de equipo</p>
              <h2 className="text-xl font-black text-gray-900" style={{ fontFamily: "Georgia, serif" }}>
                {info?.agencyName
                  ? <>Unirte a <span style={{ color: RED }}>{info.agencyName}</span></>
                  : <>Unirte al equipo de <span style={{ color: RED }}>{info?.brokerName || "tu broker"}</span></>
                }
              </h2>
            </div>

            {/* Beneficios */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong>{brokerLabel}</strong> te invitó a unirte a {teamLabel} en InstaCoach.
                Al aceptar, tu agenda empieza a trabajar para vos:
              </p>

              {[
                { icon: <BarChart2 size={15} style={{ color: RED }} />, title: "Tu propio dashboard", desc: "Visualizá tus reuniones comerciales, tendencias y días productivos en tiempo real." },
                { icon: <Mail size={15} style={{ color: RED }} />, title: "Informe semanal por mail", desc: "Cada lunes recibís un análisis personalizado de tu semana con recomendaciones concretas." },
                { icon: <Users size={15} style={{ color: RED }} />, title: "Visibilidad compartida", desc: `Vos y ${brokerLabel} pueden ver tu actividad. La diferencia es que ahora tenés los números para mejorar.` },
              ].map((b, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    {b.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{b.title}</div>
                    <div className="text-xs text-gray-400 leading-relaxed mt-0.5">{b.desc}</div>
                  </div>
                </div>
              ))}

              <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                Tu acceso queda cubierto por el plan del equipo — no pagás nada extra.
              </p>
            </div>

            {/* CTA */}
            <div className="px-6 pb-6">
              <button onClick={acceptInvite}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: RED }}>
                Unirme al equipo →
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                Ingresando como <strong>{session.user?.email}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Estado: éxito */}
        {state === "success" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} style={{ color: "#16a34a" }} />
            </div>
            <p className="font-black text-xl text-gray-900 mb-2" style={{ fontFamily: "Georgia, serif" }}>
              Bienvenido al equipo!
            </p>
            <p className="text-sm text-gray-400 leading-relaxed">
              Tu calendario ya está conectado. Vas a recibir tu primer informe el próximo lunes.
              <br />Redirigiendo a tu dashboard...
            </p>
          </div>
        )}

        {/* Estado: error */}
        {state === "error" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <XCircle size={28} style={{ color: RED }} />
            </div>
            <p className="font-black text-lg text-gray-900 mb-2">No se pudo procesar</p>
            <p className="text-sm text-gray-400">{message}</p>
            <button onClick={() => router.push("/")}
              className="mt-4 text-xs font-semibold text-gray-400 hover:text-gray-700 underline">
              Ir al inicio
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

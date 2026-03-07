import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const RED = "#aa0000";

export default function AceptarInvitacion() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { token } = router.query;
  const [state, setState] = useState<"loading" | "success" | "error" | "idle">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated" && token) {
      // Guardar token en sessionStorage y redirigir al login
      sessionStorage.setItem("pendingInviteToken", token as string);
      signIn("google", { callbackUrl: `/equipo/aceptar?token=${token}` });
    }
  }, [status, token]);

  useEffect(() => {
    if (status === "authenticated" && token) {
      acceptInvite();
    }
  }, [status, token]);

  const acceptInvite = async () => {
    setState("loading");
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

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <Head><title>Invitación al equipo — InstaCoach</title></Head>
      <div className="h-0.5 fixed top-0 left-0 right-0" style={{ background: RED }} />

      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-black mb-8" style={{ fontFamily: "Georgia, serif" }}>
          Insta<span style={{ color: RED }}>Coach</span>
        </h1>

        {(state === "idle" || state === "loading") && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: RED }} />
            <p className="text-sm text-gray-400">
              {status === "loading" ? "Verificando tu sesión..." : "Procesando invitación..."}
            </p>
          </div>
        )}

        {state === "success" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle size={28} style={{ color: "#16a34a" }} />
            </div>
            <div>
              <p className="font-black text-lg text-gray-900">Bienvenido al equipo!</p>
              <p className="text-sm text-gray-400 mt-1">Tu acceso está cubierto por el broker. Redirigiendo...</p>
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle size={28} style={{ color: RED }} />
            </div>
            <div>
              <p className="font-black text-lg text-gray-900">No se pudo procesar</p>
              <p className="text-sm text-gray-400 mt-1">{message}</p>
              <button onClick={() => router.push("/")}
                className="mt-4 text-xs font-semibold text-gray-400 hover:text-gray-700 underline">
                Ir al inicio
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

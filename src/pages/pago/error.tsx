import { useRouter } from "next/router";
import Head from "next/head";
import { XCircle } from "lucide-react";

export default function PagoError() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Head><title>Error en el pago — InmoCoach</title></Head>
      <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100 text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <XCircle size={32} style={{ color: "#aa0000" }} />
        </div>
        <h1 className="font-black text-2xl text-slate-800 mb-2">Hubo un problema</h1>
        <p className="text-slate-400 text-sm mb-6">No se procesó el pago. Podés intentarlo de nuevo.</p>
        <button onClick={() => router.push("/pricing")}
          className="w-full py-3 rounded-2xl font-black text-white text-sm"
          style={{ background: "#aa0000" }}>
          Volver a los planes
        </button>
      </div>
    </div>
  );
}

import { useRouter } from "next/router";
import { useEffect } from "react";
import Head from "next/head";
import { CheckCircle2 } from "lucide-react";
import { PLANS } from "../../lib/plans";

export default function PagoExito() {
  const router = useRouter();
  const { plan } = router.query;
  const planData = PLANS[(plan as string) ?? "pro"];

  useEffect(() => {
    const t = setTimeout(() => router.push("/"), 4000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Head><title>Pago aprobado — GALAS Management</title></Head>
      <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-100 text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h1 className="font-black text-2xl text-slate-800 mb-2">Pago aprobado!</h1>
        <p className="text-slate-500 font-medium mb-1">
          Bienvenido al plan <span className="font-black" style={{ color: "#aa0000" }}>{planData?.name}</span>
        </p>
        <p className="text-slate-400 text-sm">Redirigiendo al dashboard en unos segundos...</p>
      </div>
    </div>
  );
}

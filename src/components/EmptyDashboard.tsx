import { Calendar, Zap, ArrowRight, CheckCircle } from "lucide-react";

const RED = "#aa0000";

interface Props {
  userName: string;
  onSync: () => void;
  syncing: boolean;
}

const STEPS = [
  { icon: "📅", title: "Conectaste tu Google Calendar", done: true },
  { icon: "🔍", title: "InmoCoach busca reuniones cara a cara", done: true },
  { icon: "📊", title: "Tu primer IAC aparece aquí", done: false },
];

export default function EmptyDashboard({ userName, onSync, syncing }: Props) {
  const firstName = userName?.split(" ")[0] || "ahí";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">

        {/* Ícono */}
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "#fef2f2" }}>
          <Calendar size={36} style={{ color: RED }} />
        </div>

        {/* Título */}
        <h2 className="font-black text-2xl text-gray-900 mb-2"
          style={{ fontFamily: "Georgia, serif" }}>
          Hola {firstName}, todo listo
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Todavía no encontramos reuniones cara a cara en tu calendario. InmoCoach busca eventos marcados en <strong className="text-gray-600">verde</strong> o con palabras clave como "visita", "reunión", "cliente".
        </p>

        {/* Pasos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 text-left">
          <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Cómo funciona</div>
          <div className="space-y-3">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${step.done ? "" : "border-2 border-dashed border-gray-200"}`}
                  style={step.done ? { background: "#f0fdf4" } : {}}>
                  {step.done
                    ? <CheckCircle size={14} color="#16a34a" />
                    : <span className="text-gray-300 font-black">{i + 1}</span>}
                </div>
                <span className={`text-sm ${step.done ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tip */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 mb-6 text-left">
          <div className="text-xs font-black text-amber-700 uppercase tracking-widest mb-1">💡 Tip</div>
          <p className="text-sm text-amber-700 leading-relaxed">
            En Google Calendar, marcá tus visitas y reuniones con clientes en <strong>color verde</strong>. InmoCoach las detecta automáticamente y calcula tu IAC.
          </p>
        </div>

        {/* CTA */}
        <button onClick={onSync} disabled={syncing}
          className="w-full py-3.5 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
          style={{ background: RED }}>
          {syncing
            ? <><span className="animate-spin">⟳</span> Sincronizando...</>
            : <><Zap size={14} /> Sincronizar calendario ahora <ArrowRight size={14} /></>}
        </button>
        <p className="text-xs text-gray-300 mt-3">
          La sincronización es automática — este botón fuerza una actualización inmediata.
        </p>

      </div>
    </div>
  );
}

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { isSuperAdmin } from "../../../lib/adminGuard";
import { supabaseAdmin } from "../../../lib/supabase";
import { invalidateEventTypeCache } from "../../../lib/calendarSync";

export const EVENT_TYPE_LABELS: Record<string, string> = {
  tasacion:      "Tasación / Captación",
  visita:        "Visita de propiedad",
  primera_visita:"Primera visita (proceso compra)",
  fotos_video:   "Fotos y video / Contenido",
  propuesta:     "Propuesta de valor",
  firma:         "Firma / Cierre",
  conocer:       "Conocer propiedad",
  reunion:       "Reunión cara a cara",
  prospeccion:   "Prospección",
  capacitacion:  "Capacitación / Entrenamiento",
  llamada:       "Llamada telefónica",
  meet:          "Videollamada (Meet/Zoom)",
  otro:          "Otro",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email || !isSuperAdmin(session.user.email))
    return res.status(403).json({ error: "Solo super admin" });

  if (req.method === "GET") {
    const DEFAULTS = Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => ({
      event_type: type,
      label,
      is_green: ["tasacion","visita","primera_visita","propuesta","firma","conocer","reunion"].includes(type),
      is_proceso: ["tasacion","primera_visita"].includes(type),
      is_cierre: type === "firma",
    }));

    const { data, error } = await supabaseAdmin
      .from("event_type_config")
      .select("event_type, is_green, is_proceso, is_cierre, label")
      .order("event_type");

    if (error || !data?.length) return res.status(200).json(DEFAULTS);

    // Merge defaults with saved — asegura que todos los tipos aparezcan
    const savedMap = Object.fromEntries(data.map(r => [r.event_type, r]));
    const merged = DEFAULTS.map(d => savedMap[d.event_type] ? { ...d, ...savedMap[d.event_type] } : d);
    return res.status(200).json(merged);
  }

  if (req.method === "POST") {
    const { configs } = req.body; // array de { event_type, is_green, is_proceso, is_cierre, label }
    if (!Array.isArray(configs)) return res.status(400).json({ error: "configs requerido" });

    const { error } = await supabaseAdmin
      .from("event_type_config")
      .upsert(configs, { onConflict: "event_type" });

    if (error) return res.status(500).json({ error: error.message, hint: "¿Creaste la tabla event_type_config en Supabase?" });
    invalidateEventTypeCache();
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}

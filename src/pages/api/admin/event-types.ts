import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { isSuperAdmin } from "../../../lib/adminGuard";
import { supabaseAdmin } from "../../../lib/supabase";
import { invalidateEventTypeCache } from "../../../lib/calendarSync";

export const EVENT_TYPE_DEFAULTS: Array<{
  event_type: string; label: string; keywords: string;
  is_green: boolean; is_proceso: boolean; is_cierre: boolean; is_custom: boolean;
}> = [
  { event_type: "tasacion",      label: "Tasación / Captación",         keywords: "tasac,captac",                          is_green: true,  is_proceso: true,  is_cierre: false, is_custom: false },
  { event_type: "visita",        label: "Visita de propiedad",           keywords: "visita",                                is_green: true,  is_proceso: false, is_cierre: false, is_custom: false },
  { event_type: "primera_visita",label: "Primera visita (proceso compra)",keywords: "primera visita,1ra visita,1° visita",  is_green: true,  is_proceso: true,  is_cierre: false, is_custom: false },
  { event_type: "fotos_video",   label: "Fotos y video / Contenido",    keywords: "foto,video,creacion de contenido",       is_green: false, is_proceso: false, is_cierre: false, is_custom: false },
  { event_type: "propuesta",     label: "Propuesta de valor",           keywords: "propuesta,presentacion",                is_green: true,  is_proceso: false, is_cierre: false, is_custom: false },
  { event_type: "firma",         label: "Firma / Cierre",               keywords: "firma,escritura",                       is_green: true,  is_proceso: false, is_cierre: true,  is_custom: false },
  { event_type: "conocer",       label: "Conocer propiedad",            keywords: "conocer propiedad,conocer prop",        is_green: true,  is_proceso: false, is_cierre: false, is_custom: false },
  { event_type: "reunion",       label: "Reunión cara a cara",          keywords: "reuni,meeting",                         is_green: true,  is_proceso: false, is_cierre: false, is_custom: false },
  { event_type: "prospeccion",   label: "Prospección",                  keywords: "prospecc,prospección",                  is_green: false, is_proceso: false, is_cierre: false, is_custom: false },
  { event_type: "capacitacion",  label: "Capacitación / Entrenamiento", keywords: "capacitac,entrena,formac,curso",        is_green: false, is_proceso: false, is_cierre: false, is_custom: false },
  { event_type: "llamada",       label: "Llamada telefónica",           keywords: "llamada,call",                          is_green: false, is_proceso: false, is_cierre: false, is_custom: false },
  { event_type: "meet",          label: "Videollamada (Meet/Zoom)",     keywords: "meet,zoom,teams,videollamada",          is_green: false, is_proceso: false, is_cierre: false, is_custom: false },
  { event_type: "otro",          label: "Otro",                        keywords: "",                                      is_green: false, is_proceso: false, is_cierre: false, is_custom: false },
];

// Legacy map for backward compat
export const EVENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_TYPE_DEFAULTS.map(d => [d.event_type, d.label])
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email || !isSuperAdmin(session.user.email))
    return res.status(403).json({ error: "Solo super admin" });

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("event_type_config")
      .select("event_type, is_green, is_proceso, is_cierre, label, keywords, is_custom")
      .order("is_custom, event_type");

    const savedMap = Object.fromEntries((data || []).map((r: any) => [r.event_type, r]));
    // Merge defaults + saved custom types
    const merged = [
      ...EVENT_TYPE_DEFAULTS.map(d => savedMap[d.event_type] ? { ...d, ...savedMap[d.event_type] } : d),
      ...(data || []).filter((r: any) => r.is_custom),
    ];
    return res.status(200).json(merged);
  }

  if (req.method === "POST") {
    const { configs } = req.body; // array de { event_type, is_green, is_proceso, is_cierre, label, keywords, is_custom }
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

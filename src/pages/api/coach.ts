import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";

const WEEKLY_GOAL = 15;

function diagnose(greenTotal: number, productiveDays: number, totalDays: number): string {
  const rate = totalDays > 0 ? (productiveDays / totalDays) * 100 : 0;
  if (greenTotal === 0) return "semana_sin_actividad";
  if (greenTotal >= WEEKLY_GOAL && rate >= 60) return "semana_productiva";
  if (greenTotal >= 8 && rate >= 40) return "semana_ocupada";
  if (productiveDays <= 2 && greenTotal < 8) return "semana_reactiva";
  return "semana_riesgo";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const { totals, productivityRate, productiveDays, totalDays, productivityGoal, userName } = req.body;

  const firstName = (userName || "").split(" ")[0] || "";
  const nombreStr = firstName ? `El nombre del usuario es ${firstName}.` : "";
  const reunionesComerciales = totals.totalGreen;
  const faltaron = Math.max(0, WEEKLY_GOAL - reunionesComerciales);
  const perfil = diagnose(reunionesComerciales, productiveDays, totalDays);

  const perfilDescripcion: Record<string, string> = {
    semana_sin_actividad: "SEMANA SIN ACTIVIDAD COMERCIAL — el usuario no registró ningún evento productivo. Esta es la situación más crítica posible.",
    semana_productiva: "SEMANA PRODUCTIVA — el usuario alcanzó o superó el nivel de referencia de actividad comercial.",
    semana_ocupada: "SEMANA OCUPADA PERO POCO PRODUCTIVA — el usuario tuvo actividad pero por debajo del nivel necesario para generar resultados consistentes.",
    semana_reactiva: "SEMANA REACTIVA — el usuario concentró su actividad en muy pocos días, sin consistencia a lo largo de la semana.",
    semana_riesgo: "SEMANA CON RIESGO COMERCIAL — el nivel de actividad es insuficiente y puede comprometer los resultados de las próximas semanas.",
  };

  const prompt = `Sos InstaCoach, un entrenador de productividad comercial que analiza agendas reales y orienta al usuario hacia un modelo de trabajo productivo. ${nombreStr}

Hablás en segunda persona, tono directo, claro y constructivo. Nunca juzgás, siempre orientás. Usás el nombre del usuario cuando corresponde. Escribís en español rioplatense (vos, tenés, hacés).

DATOS DE LA SEMANA:
- Reuniones comerciales (eventos verdes): ${reunionesComerciales}
- Referencia semanal óptima: ${WEEKLY_GOAL} reuniones comerciales
- Reuniones que faltaron: ${faltaron}
- Tasaciones: ${totals.tasaciones}
- Visitas: ${totals.visitas}
- Propuestas de valor entregadas: ${totals.propuestas}
- Días con actividad comercial: ${productiveDays} de ${totalDays} analizados (${productivityRate}%)
- Diagnóstico del perfil: ${perfilDescripcion[perfil]}

ESTRUCTURA OBLIGATORIA — respondé con exactamente 3 bloques de texto, separados por una línea en blanco. Sin títulos ni bullets, solo párrafos:

BLOQUE 1 — LO QUE HICISTE BIEN: Reconocé lo positivo con honestidad. Si la semana fue muy floja, encontrá el punto de apoyo para arrancar desde ahí. Máximo 2 oraciones.

BLOQUE 2 — DÓNDE ESTÁS PERDIENDO OPORTUNIDADES: Identificá el cuello de botella principal con los números reales. Si hay desequilibrio en el embudo (tasaciones vs propuestas, o reuniones vs visitas), marcálo. Si la actividad fue baja, mostrá el impacto real. 2-3 oraciones.

BLOQUE 3 — LA ACCIÓN CONCRETA PARA LA PRÓXIMA SEMANA: Una sola acción, específica y ejecutable esta semana. No "hacé más reuniones" sino exactamente qué, cuándo y cómo. Máximo 2 oraciones.

Después de los 3 bloques, agregá una línea separada que diga exactamente:
"Número crítico: esta semana tuviste ${reunionesComerciales} reuniones comerciales. ${faltaron > 0 ? `Te faltaron ${faltaron} para alcanzar el nivel óptimo.` : `Superaste el nivel de referencia. Ahora el desafío es sostenerlo.`}"`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic error:", JSON.stringify(data));
      return res.status(500).json({ error: `API error: ${data?.error?.message || response.status}` });
    }

    const text = data.content?.map((b: any) => b.text || "").join("") || "";
    if (!text) return res.status(500).json({ error: "Sin respuesta del coach" });

    return res.status(200).json({ advice: text, profile: perfil, faltaron });
  } catch (err: any) {
    console.error("Insta Coach error:", err);
    return res.status(500).json({ error: "Error al generar el análisis" });
  }
}

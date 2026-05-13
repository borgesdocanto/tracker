// Reservas activas de un agente desde Tokko signed_operations (active: true)
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { getEffectiveEmail } from "../../lib/impersonation";
import { supabaseAdmin } from "../../lib/supabase";

export const config = { maxDuration: 60 };

const cache = new Map<string, { data: any[]; ts: number }>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutos

async function fetchSignedOps(apiKey: string): Promise<any[]> {
  const cacheKey = "reservas_" + apiKey.slice(-8);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  let allOps: any[] = [];
  let nextUrl: string | null =
    `https://www.tokkobroker.com/api/v1/signed_operations/?key=${apiKey}&format=json&limit=100`;

  while (nextUrl) {
    const r: Response = await fetch(nextUrl);
    if (!r.ok) throw new Error(`Tokko error ${r.status}`);
    const d: any = await r.json();
    allOps = allOps.concat(d.objects || []);
    nextUrl = d.meta?.next
      ? `https://www.tokkobroker.com${d.meta.next}`
      : null;
  }

  cache.set(cacheKey, { data: allOps, ts: Date.now() });
  return allOps;
}

function getAgentEmails(op: any): string[] {
  const emails: string[] = [];
  // Producer de la propiedad
  if (op.property?.producer?.email) emails.push(op.property.producer.email);
  // Agentes relacionados
  for (const ar of op.agents_related || []) {
    if (ar.agent?.email) emails.push(ar.agent.email);
  }
  // Owner agent (quien captó al propietario)
  for (const owner of op.owners || []) {
    if (owner.agent?.email) emails.push(owner.agent.email);
  }
  return [...new Set(emails)];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).end();

  const email = getEffectiveEmail(req, session) ?? session.user.email;
  const targetEmail = (req.query.email as string) || email;

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("team_id, team_role")
    .eq("email", email)
    .single();

  if (!sub?.team_id) return res.status(200).json({ reservas: [], connected: false });

  const isBroker = ["owner", "team_leader"].includes(sub.team_role || "");
  if (targetEmail !== email && !isBroker) return res.status(403).end();

  const { data: team } = await supabaseAdmin
    .from("teams")
    .select("tokko_api_key")
    .eq("id", sub.team_id)
    .single();

  if (!team?.tokko_api_key) return res.status(200).json({ reservas: [], connected: false });

  try {
    const allOps = await fetchSignedOps(team.tokko_api_key);

    // Filtrar reservas activas del agente target
    const reservas = allOps
      .filter((op: any) => {
        if (!op.active) return false;
        const agentEmails = getAgentEmails(op);
        return agentEmails.includes(targetEmail);
      })
      .map((op: any) => {
        const prop = op.property || {};
        const opType = op.operation_type === 1 ? "Venta" : op.operation_type === 2 ? "Alquiler" : null;
        const prices = prop.operations?.[0]?.prices || [];
        const price = prices[0] || null;

        return {
          id: op.id,
          createdAt: op.created_at,
          finishedAt: op.finished_at,
          operationType: opType,
          amount: op.operation_amount,
          currency: op.operation_amount_currency,
          address: prop.fake_address || prop.address || "Sin dirección",
          propertyType: prop.type?.name || null,
          branch: prop.branch?.display_name || prop.branch?.name || null,
          publicUrl: prop.public_url || null,
          referenceCode: prop.reference_code || null,
          listPrice: price ? { amount: price.price, currency: price.currency } : null,
          contact: op.contact ? {
            name: op.contact.name,
            phone: op.contact.phone || op.contact.cellphone || null,
          } : null,
          ownerName: op.owners?.[0]?.name || null,
        };
      })
      .sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return res.status(200).json({ reservas, connected: true });
  } catch (err) {
    console.error("tokko-reservas error:", err);
    return res.status(500).json({ error: "Error al obtener reservas" });
  }
}

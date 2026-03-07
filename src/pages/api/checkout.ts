import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { PLANS, PlanId } from "../../lib/plans";
import MercadoPagoConfig, { Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const { planId } = req.body as { planId: PlanId };
  const plan = PLANS[planId];
  if (!plan || plan.price === 0) return res.status(400).json({ error: "Plan inválido" });

  const baseUrl = process.env.NEXTAUTH_URL;

  try {
    const preference = new Preference(client);
    const response = await preference.create({
      body: {
        items: [
          {
            id: planId,
            title: `GALAS Management — Plan ${plan.name}`,
            description: plan.description,
            quantity: 1,
            unit_price: plan.priceARS,
            currency_id: "ARS",
          },
        ],
        payer: {
          email: session.user.email,
          name: session.user.name ?? undefined,
        },
        back_urls: {
          success: `${baseUrl}/pago/exito?plan=${planId}`,
          failure: `${baseUrl}/pago/error`,
          pending: `${baseUrl}/pago/pendiente`,
        },
        auto_return: "approved",
        external_reference: `${session.user.email}|${planId}`,
        notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        statement_descriptor: "GALAS Management",
      },
    });

    return res.status(200).json({ checkoutUrl: response.init_point });
  } catch (err: any) {
    console.error("MercadoPago error:", err);
    return res.status(500).json({ error: "Error al crear el checkout" });
  }
}

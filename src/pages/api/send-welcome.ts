import { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
import { generateWelcomeEmailHtml } from "../../lib/emailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: "email requerido" });

  const firstName = (name || email).split(" ")[0];

  const { error } = await resend.emails.send({
    from: "InmoCoach <coach@inmocoach.com.ar>",
    to: email,
    subject: `Bienvenido a InmoCoach, ${firstName} — tu primer objetivo es claro`,
    html: generateWelcomeEmailHtml(name || email),
  });

  if (error) {
    console.error("Welcome email error:", error);
    return res.status(500).json({ error });
  }

  return res.status(200).json({ ok: true });
}

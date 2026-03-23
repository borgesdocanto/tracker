import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { isSuperAdmin } from "../../../lib/adminGuard";
import { supabaseAdmin } from "../../../lib/supabase";

// POST /api/admin/migrate-seen — adds seen_at column to coach_reports
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email || !isSuperAdmin(session.user.email)) return res.status(403).end();

  // Try to add the column — will error if already exists, that's fine
  const { error } = await supabaseAdmin.rpc("exec_sql" as any, {
    sql: "ALTER TABLE coach_reports ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ DEFAULT NULL;"
  });

  // Fallback: try direct via supabase-js (won't work without rpc, but let's try)
  if (error) {
    // The column might already exist or rpc not available
    // Return instructions for manual migration
    return res.status(200).json({
      ok: false,
      error: error.message,
      manual: "Run in Supabase SQL editor: ALTER TABLE coach_reports ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ DEFAULT NULL;"
    });
  }

  return res.status(200).json({ ok: true, message: "Column seen_at added to coach_reports" });
}

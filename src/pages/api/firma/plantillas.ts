// pages/api/firma/plantillas.ts — ABM completo de plantillas con permisos por rol

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase";
import { getEffectiveEmail } from "../../../lib/impersonation";
import { isSuperAdmin } from "../../../lib/adminGuard";

export const config = { api: { bodyParser: { sizeLimit: "25mb" } } };

async function getUserContext(email: string) {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("team_id, team_role, plan")
    .eq("email", email)
    .single();
  return {
    teamId: data?.team_id || null,
    teamRole: data?.team_role || null,
    canManage: data?.team_role === "owner" || data?.team_role === "team_leader" || isSuperAdmin(email),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "No autenticado" });

  const email = getEffectiveEmail(req, session);
  if (!email) return res.status(401).json({ error: "No autenticado" });

  const ctx = await getUserContext(email);

  // ── GET — listar plantillas visibles (globales + del equipo) ──
  if (req.method === "GET") {
    let query = supabaseAdmin
      .from("firma_plantillas")
      .select("id, nombre, descripcion, campos, docuseal_template_id, es_global, team_id, activo, pdf_url, created_by, created_at, updated_at")
      .eq("activo", true)
      .order("es_global", { ascending: false })
      .order("nombre");

    if (ctx.teamId) {
      query = query.or(`es_global.eq.true,team_id.eq.${ctx.teamId}`);
    } else {
      query = query.eq("es_global", true);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // ── POST — crear plantilla nueva ──
  if (req.method === "POST") {
    if (!ctx.canManage) return res.status(403).json({ error: "Solo owners y team leaders pueden crear plantillas" });

    const { nombre, descripcion, campos, pdf_base64 } = req.body;
    if (!nombre) return res.status(400).json({ error: "El nombre es obligatorio" });

    let pdf_url: string | null = null;

    // Subir PDF al storage si viene
    if (pdf_base64) {
      const base64Clean = pdf_base64.replace(/^data:application\/pdf;base64,/, "");
      const buffer = Buffer.from(base64Clean, "base64");
      const fileName = `${ctx.teamId || "global"}/${Date.now()}-${nombre.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from("firma-plantillas")
        .upload(fileName, buffer, { contentType: "application/pdf", upsert: false });

      if (uploadErr) {
        console.error("Storage upload error:", uploadErr);
        return res.status(500).json({ error: "Error al subir el PDF" });
      }

      const { data: signed } = await supabaseAdmin.storage
        .from("firma-plantillas")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);
      pdf_url = signed?.signedUrl || null;
    }

    const { data, error } = await supabaseAdmin
      .from("firma_plantillas")
      .insert({
        nombre,
        descripcion: descripcion || "",
        campos: campos || [],
        team_id: isSuperAdmin(email) ? null : ctx.teamId,
        es_global: isSuperAdmin(email),
        activo: true,
        pdf_url,
        created_by: email,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // ── PATCH — editar plantilla (solo del propio equipo o superadmin) ──
  if (req.method === "PATCH") {
    if (!ctx.canManage) return res.status(403).json({ error: "Sin permisos para editar" });

    const { id, nombre, descripcion, campos, docuseal_template_id, activo, pdf_base64 } = req.body;
    if (!id) return res.status(400).json({ error: "ID requerido" });

    const { data: plantilla } = await supabaseAdmin
      .from("firma_plantillas")
      .select("team_id, es_global, pdf_url")
      .eq("id", id)
      .single();

    if (!plantilla) return res.status(404).json({ error: "Plantilla no encontrada" });
    // Verificar permisos: superadmin puede todo, el resto solo su equipo
    if (!isSuperAdmin(email) && plantilla.team_id !== ctx.teamId) {
      return res.status(403).json({ error: "No tenés permisos sobre esta plantilla" });
    }

    let pdf_url = plantilla.pdf_url;

    if (pdf_base64) {
      const base64Clean = pdf_base64.replace(/^data:application\/pdf;base64,/, "");
      const buffer = Buffer.from(base64Clean, "base64");
      const fileName = `${ctx.teamId || "global"}/${Date.now()}-${(nombre || "plantilla").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from("firma-plantillas")
        .upload(fileName, buffer, { contentType: "application/pdf", upsert: false });

      if (!uploadErr) {
        const { data: signed } = await supabaseAdmin.storage
          .from("firma-plantillas")
          .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);
        pdf_url = signed?.signedUrl || pdf_url;
      }
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (nombre !== undefined) updates.nombre = nombre;
    if (descripcion !== undefined) updates.descripcion = descripcion;
    if (campos !== undefined) updates.campos = campos;
    if (docuseal_template_id !== undefined) updates.docuseal_template_id = docuseal_template_id || null;
    if (activo !== undefined) updates.activo = activo;
    if (pdf_url !== undefined) updates.pdf_url = pdf_url;

    const { data, error } = await supabaseAdmin
      .from("firma_plantillas")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // ── DELETE — desactivar plantilla ──
  if (req.method === "DELETE") {
    if (!ctx.canManage) return res.status(403).json({ error: "Sin permisos" });

    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "ID requerido" });

    const { data: plantilla } = await supabaseAdmin
      .from("firma_plantillas")
      .select("team_id, es_global")
      .eq("id", id)
      .single();

    if (!plantilla) return res.status(404).json({ error: "No encontrada" });
    if (plantilla.es_global && !isSuperAdmin(email)) {
      return res.status(403).json({ error: "No podés eliminar plantillas del sistema" });
    }
    if (!isSuperAdmin(email) && plantilla.team_id !== ctx.teamId) {
      return res.status(403).json({ error: "Sin permisos" });
    }

    await supabaseAdmin.from("firma_plantillas").update({ activo: false }).eq("id", id);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Método no permitido" });
}

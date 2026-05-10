// lib/docuseal.ts — Cliente para la API REST de DocuSeal (self-hosted)

const DOCUSEAL_BASE_URL = process.env.DOCUSEAL_URL || "";
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY || "";

function docusealFetch(path: string, options?: RequestInit) {
  const url = `${DOCUSEAL_BASE_URL}/api${path}`;
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": DOCUSEAL_API_KEY,
      ...(options?.headers || {}),
    },
  });
}

export interface DocusealSubmitter {
  role: string;
  name: string;
  email: string;
  phone?: string;
  fields?: Array<{ name: string; default_value: string }>;
}

export interface DocusealSubmissionPayload {
  template_id: number;
  send_email?: boolean;
  send_sms?: boolean;
  submitters: DocusealSubmitter[];
  message?: { subject?: string; body?: string };
}

export interface DocusealSubmission {
  id: number;
  slug: string;
  status: string;
  submitters: Array<{
    id: number;
    email: string;
    status: string;
    sign_page_url?: string;
    completed_at?: string;
  }>;
}

export interface DocusealTemplate {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

// Crear una submission (enviar documento para firma)
export async function createSubmission(
  payload: DocusealSubmissionPayload
): Promise<DocusealSubmission[]> {
  const res = await docusealFetch("/submissions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DocuSeal error ${res.status}: ${err}`);
  }
  return res.json();
}

// Obtener estado de una submission
export async function getSubmission(submissionId: number): Promise<DocusealSubmission> {
  const res = await docusealFetch(`/submissions/${submissionId}`);
  if (!res.ok) throw new Error(`DocuSeal error ${res.status}`);
  return res.json();
}

// Obtener documentos firmados de una submission
export async function getSubmissionDocuments(
  submissionId: number
): Promise<{ id: number; documents: Array<{ name: string; url: string }> }> {
  const res = await docusealFetch(`/submissions/${submissionId}/documents`);
  if (!res.ok) throw new Error(`DocuSeal error ${res.status}`);
  return res.json();
}

// Listar templates disponibles
export async function listTemplates(): Promise<DocusealTemplate[]> {
  const res = await docusealFetch("/templates");
  if (!res.ok) throw new Error(`DocuSeal error ${res.status}`);
  const data = await res.json();
  return data.data || data;
}

// Reenviar email de firma a un submitter
export async function resendSubmitterEmail(submitterId: number): Promise<void> {
  await docusealFetch(`/submitters/${submitterId}`, {
    method: "PATCH",
    body: JSON.stringify({ send_email: true }),
  });
}

// Crear template + submission desde PDF en base64 (sin template previo)
// DocuSeal API: POST /api/templates/pdf → crea el template
// Luego: POST /api/submissions → crea la submission con el firmante
export async function createSubmissionFromPdf(payload: {
  name: string;
  base64: string;
  firmante_nombre: string;
  firmante_email: string;
  firmante_telefono?: string;
  send_email?: boolean;
  email_subject?: string;
  email_body?: string;
}): Promise<DocusealSubmission[]> {
  // Paso 1: Crear template desde PDF
  const templateRes = await docusealFetch("/templates/pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": DOCUSEAL_API_KEY,
    },
    body: JSON.stringify({
      name: payload.name,
      documents: [{ name: payload.name, file: payload.base64 }],
    }),
  });

  if (!templateRes.ok) {
    const err = await templateRes.text();
    throw new Error(`DocuSeal template error ${templateRes.status}: ${err}`);
  }

  const template = await templateRes.json();
  const templateId = template.id;

  // Paso 2: Crear submission con el firmante
  const submissionRes = await docusealFetch("/submissions", {
    method: "POST",
    body: JSON.stringify({
      template_id: templateId,
      send_email: payload.send_email ?? true,
      submitters: [
        {
          role: "First Party",
          name: payload.firmante_nombre,
          email: payload.firmante_email,
          ...(payload.firmante_telefono ? { phone: payload.firmante_telefono } : {}),
        },
      ],
      ...(payload.email_subject ? {
        message: {
          subject: payload.email_subject,
          body: payload.email_body || "",
        }
      } : {}),
    }),
  });

  if (!submissionRes.ok) {
    const err = await submissionRes.text();
    throw new Error(`DocuSeal submission error ${submissionRes.status}: ${err}`);
  }

  return submissionRes.json();
}

// Verificar que la config de DocuSeal esté presente
export function isDocusealConfigured(): boolean {
  return Boolean(DOCUSEAL_BASE_URL && DOCUSEAL_API_KEY);
}

import { google } from "googleapis";
import { supabaseAdmin } from "./supabase";

// Obtiene un access token válido para el usuario — refresca si está vencido
export async function getValidAccessToken(email: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("google_access_token, google_refresh_token, google_token_expiry")
    .eq("email", email)
    .single();

  if (!data?.google_access_token) return null;
  if (!data.google_refresh_token) return data.google_access_token;

  const expiry = data.google_token_expiry ? new Date(data.google_token_expiry).getTime() : 0;
  const isExpired = expiry < Date.now() + 60000; // 1 min buffer

  if (!isExpired) return data.google_access_token;

  // Token expirado — refrescar
  try {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2.setCredentials({
      access_token: data.google_access_token,
      refresh_token: data.google_refresh_token,
    });

    const { credentials } = await oauth2.refreshAccessToken();
    const newToken = credentials.access_token!;

    // Guardar token actualizado en Supabase
    await supabaseAdmin
      .from("subscriptions")
      .update({
        google_access_token: newToken,
        google_token_expiry: credentials.expiry_date
          ? new Date(credentials.expiry_date).toISOString()
          : null,
      })
      .eq("email", email);

    return newToken;
  } catch (err: any) {
    console.error(`Token refresh failed for ${email}:`, err.message);
    return null;
  }
}

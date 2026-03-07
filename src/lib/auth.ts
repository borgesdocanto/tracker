import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";
import { supabaseAdmin } from "./supabase";
import { isVipEmail } from "./plans";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid", "email", "profile",
            "https://www.googleapis.com/auth/calendar.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ account, profile }) {
      const allowedDomain = process.env.ALLOWED_DOMAIN;
      if (allowedDomain && profile?.email) {
        // VIP domain siempre pasa
        if (isVipEmail(profile.email)) return true;
        return profile.email.endsWith(`@${allowedDomain}`);
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile?.email) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;

        // Guardar/actualizar token en Supabase para el cron
        const plan = isVipEmail(profile.email) ? "individual" : "free";
        await supabaseAdmin
          .from("subscriptions")
          .upsert({
            email: profile.email,
            name: (profile as any).name,
            avatar: (profile as any).picture,
            google_access_token: account.access_token,
            google_refresh_token: account.refresh_token,
            google_token_expiry: account.expires_at
              ? new Date(account.expires_at * 1000).toISOString()
              : null,
            plan,
            status: "active",
          }, { onConflict: "email", ignoreDuplicates: false })
          .then(({ error }) => {
            // Si ya existe y tiene plan pago, no sobreescribir el plan
            if (!error) return;
            // Solo actualizar el token si el usuario ya existe con plan pago
            supabaseAdmin
              .from("subscriptions")
              .update({
                google_access_token: account.access_token,
                google_refresh_token: account.refresh_token,
              })
              .eq("email", profile.email!);
          });
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
};

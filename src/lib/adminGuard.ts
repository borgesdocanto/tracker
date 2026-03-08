import { GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { SUPER_ADMIN_EMAIL } from "./brand";

export async function requireSuperAdmin(ctx: GetServerSidePropsContext) {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session?.user?.email || session.user.email !== SUPER_ADMIN_EMAIL) {
    return { redirect: { destination: "/", permanent: false } };
  }
  return null;
}

export function isSuperAdmin(email?: string | null): boolean {
  return email === SUPER_ADMIN_EMAIL;
}

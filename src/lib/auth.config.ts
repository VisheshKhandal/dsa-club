import type { NextAuthConfig } from "next-auth";

const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  providers: [],
} satisfies NextAuthConfig;

export default authConfig;

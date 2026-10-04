import bcrypt from "bcrypt";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserModel } from "@/features/identity/models/user.model";
import { loginSchema } from "@/features/auth/validators/auth.validators";
import authConfig from "@/lib/auth.config";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const githubEnabled = Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Email and password",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Password", type: "password" } },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        await connectToDatabase();
        const user = await UserModel.findOne({ email: parsed.data.email, status: "active" }).select("+passwordHash");
        if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;
        
        // Determine correct role from ADMIN_EMAILS env
        const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()).filter(Boolean) ?? [];
        const isAdmin = adminEmails.includes(user.email.toLowerCase());
        const correctRole = isAdmin ? "admin" : "student";
        
        // Sync role in DB if it doesn't match
        if (user.role !== correctRole) {
          await UserModel.updateOne({ _id: user._id }, { $set: { role: correctRole } });
        }
        
        return { id: String(user._id), email: user.email, name: user.name, image: user.image ?? undefined, role: correctRole };
      },
    }),
    ...(googleEnabled ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!, allowDangerousEmailAccountLinking: false })] : []),
    ...(githubEnabled ? [GitHub({ clientId: process.env.GITHUB_ID!, clientSecret: process.env.GITHUB_SECRET!, allowDangerousEmailAccountLinking: false })] : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || !account) return false;
      
      const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim().toLowerCase()).filter(Boolean) ?? [];
      const isAdmin = adminEmails.includes(user.email.toLowerCase());
      const targetRole = isAdmin ? "admin" : "student";
      
      await connectToDatabase();
      const existing = await UserModel.findOne({ email: user.email.toLowerCase() });
      if (existing?.status === "suspended") return false;
      
      if (existing) {
        await UserModel.updateOne(
          { _id: existing._id }, 
          { 
            $set: { 
              name: user.name ?? existing.name, 
              image: user.image ?? existing.image, 
              emailVerified: existing.emailVerified ?? new Date(),
              role: isAdmin ? "admin" : existing.role === "admin" && !isAdmin ? "student" : existing.role 
            }, 
            $addToSet: { authProviders: account.provider } 
          }
        );
        user.id = String(existing._id);
        user.role = isAdmin ? "admin" : existing.role === "admin" && !isAdmin ? "student" : existing.role;
      } else {
        const created = await UserModel.create({ 
          email: user.email.toLowerCase(), 
          name: user.name?.trim() || user.email.split("@")[0], 
          image: user.image ?? null, 
          emailVerified: new Date(), 
          authProviders: [account.provider],
          role: targetRole
        });
        user.id = String(created._id);
        user.role = targetRole;
      }
      return true;
    },
    jwt({ token, user }) { 
      if (user?.id) {
        token.sub = user.id; 
        token.role = user.role;
      }
      return token; 
    },
    session({ session, token }) { 
      if (session.user && token.sub) {
        session.user.id = token.sub; 
        session.user.role = token.role as string;
      }
      return session; 
    },
  },
});

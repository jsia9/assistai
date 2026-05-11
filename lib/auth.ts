import { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { audit } from "./audit";

type ExtendedUser = User & { role: string; tenantId: string };

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Build a Request-like wrapper so audit() can capture IP/UA.
        // NextAuth gives req.headers as a plain object.
        const h = (req?.headers ?? {}) as Record<string, string>;
        const fakeReq = new Request("http://liya.local/audit", {
          headers: {
            "x-forwarded-for": h["x-forwarded-for"] ?? "",
            "user-agent": h["user-agent"] ?? "",
          },
        });

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        });

        if (!user) {
          await audit(fakeReq, null, "login.failure",
            { type: "User", id: "unknown" },
            { reason: "user_not_found" },
            { email: credentials.email });
          return null;
        }
        if (!user.active) {
          await audit(fakeReq, null, "login.failure",
            { type: "User", id: user.id },
            { reason: "account_suspended" },
            { email: user.email });
          throw new Error("Compte suspendu");
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          await audit(fakeReq, null, "login.failure",
            { type: "User", id: user.id },
            { reason: "bad_password" },
            { email: user.email });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        });

        const extUser: ExtendedUser = {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          tenantId: user.tenantId,
        };

        await audit(fakeReq,
          { user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId } },
          "login.success",
          { type: "User", id: user.id });

        return extUser;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as ExtendedUser;
        token.id = u.id;
        token.role = u.role;
        token.tenantId = u.tenantId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
      }
      return session;
    },
  },
};

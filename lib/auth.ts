import NextAuth, { type DefaultSession } from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/lib/db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "player" | "admin";
      displayName: string | null;
    } & DefaultSession["user"];
  }
}

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM,
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login?check=1",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // role and displayName come from the DB user row
        const dbUser = user as typeof user & {
          role?: "player" | "admin";
          displayName?: string | null;
        };
        session.user.role = dbUser.role ?? "player";
        session.user.displayName = dbUser.displayName ?? null;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      const [row] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      if (!row) return;

      const updates: Partial<typeof users.$inferInsert> = {};
      // Freeze tournament bets relative to the first login day.
      if (!row.firstLoginAt) updates.firstLoginAt = new Date();
      // Bootstrap admins from the ADMIN_EMAILS env var.
      if (
        row.role !== "admin" &&
        row.email &&
        adminEmails.includes(row.email.toLowerCase())
      ) {
        updates.role = "admin";
      }
      // Default display name to the email local-part until the user sets one.
      if (!row.displayName && row.email) {
        updates.displayName = row.email.split("@")[0];
      }
      if (Object.keys(updates).length > 0) {
        await db.update(users).set(updates).where(eq(users.id, user.id));
      }
    },
  },
});

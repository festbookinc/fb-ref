import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// 특정 이메일 허용
const allowedEmails = process.env.ALLOWED_EMAILS
  ? process.env.ALLOWED_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : [];

// 도메인 기반 허용 (둘 다 함께 적용 가능)
const allowedDomains = (
  process.env.ALLOWED_EMAIL_DOMAINS || ""
)
  .split(",")
  .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    signIn({ user }) {
      const email = user?.email?.toLowerCase();
      if (!email) return false;

      // 특정 이메일 허용
      if (allowedEmails.includes(email)) return true;

      // 도메인 기반 허용
      const domain = email.split("@")[1];
      const domainAllowed = allowedDomains.some(
        (d) => domain === d || domain?.endsWith(`.${d}`)
      );
      if (domainAllowed) return true;

      return "/login?error=AccessDenied";
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    jwt({ token }) {
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  trustHost: true,
});

import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { PASSWORD_MAX, PASSWORD_MIN, passwordError } from "./password";
import { db } from "./server/db";
import { sendAccountEmail } from "./server/mail";
import { accountStatus, deleteUserData, mailEnabled } from "./server/account";
import { trustedOrigins } from "./server/origins";

// Verification can only be required when mail can actually be delivered —
// otherwise every new account would be locked out.
const requireVerification = mailEnabled() && (process.env.NODE_ENV === "production" || process.env.REQUIRE_EMAIL_VERIFICATION === "true");
if (process.env.NODE_ENV === "production" && !mailEnabled()) console.warn("AI Book Creator: SMTP_HOST/MAIL_FROM are not set. Email verification and password reset emails are disabled.");

export const auth = betterAuth({
  appName: "AI Book Creator", database: db,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000", secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: trustedOrigins(),
  emailAndPassword: {
    enabled: true, minPasswordLength: PASSWORD_MIN, maxPasswordLength: PASSWORD_MAX,
    requireEmailVerification: requireVerification,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      if (!mailEnabled()) throw new APIError("SERVICE_UNAVAILABLE", { message: "Password reset email is not available right now. Please contact support." });
      await sendAccountEmail(user.email, "reset", url, user.name);
    },
  },
  emailVerification: {
    sendOnSignUp: mailEnabled(), autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => sendAccountEmail(user.email, "verify", url, user.name),
  },
  user: {
    deleteUser: { enabled: true, beforeDelete: async user => deleteUserData(user.id) },
  },
  hooks: {
    // better-auth only checks length; enforce the letter/number/special-character rule
    // on every endpoint that sets a new password.
    before: createAuthMiddleware(async ctx => {
      const field = ctx.path === "/sign-up/email" ? "password" : ["/reset-password", "/change-password", "/set-password"].includes(ctx.path) ? "newPassword" : null;
      if (!field) return;
      const message = passwordError(ctx.body?.[field]);
      if (message) throw new APIError("BAD_REQUEST", { message });
    }),
  },
  databaseHooks: {
    user: {
      create: { after: async user => { await db.execute("INSERT IGNORE INTO user_plans (user_id, plan) VALUES (?, 'free')", [user.id]); } },
    },
    session: {
      create: {
        before: async session => {
          if ((await accountStatus(session.userId)).suspended) throw new APIError("FORBIDDEN", { message: "This account is suspended. Contact support for help." });
        },
      },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
});

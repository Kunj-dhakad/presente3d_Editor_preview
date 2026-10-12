"use client";
import { useState, useSyncExternalStore } from "react";

// false during SSR and until React hydrates; true afterwards.
const noop = () => () => {};
const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);
import Link from "next/link";
import { ArrowLeft, ArrowRight, LoaderCircle, Eye, EyeOff, Check, Circle, Mail, LockKeyhole, UserRound, ShieldCheck } from "lucide-react";
import { authClient } from "@shared/auth-client";
import { SITE } from "@shared/site";
import { BrandMark } from "@shared/components/BrandMark";
import { PASSWORD_MAX, PASSWORD_MIN, PASSWORD_RULES, passwordError } from "@shared/password";
import BookShowcase from "./BookShowcase";
import CreationTypes from "./CreationTypes";
import styles from "@site/styles/public-studio.module.css";
export type Mode = "login" | "signup" | "forgot-password" | "reset-password" | "verify-email";

function PasswordField({ mode, value, onChange }: { mode: Mode; value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(false);
  const creating = mode !== "login";
  // The toggle sits outside any <label> so clicks reach it directly in every browser.
  return <div className="fs-field">
    <label htmlFor="fs-password-input"><span className={styles.fieldLabel}><LockKeyhole size={14} /> Password</span></label>
    <span className="fs-password">
      <input id="fs-password-input" name="password" type={visible ? "text" : "password"} value={value}
        onChange={e => { onChange(e.target.value); e.target.setCustomValidity(creating ? passwordError(e.target.value) || "" : ""); }}
        autoComplete={creating ? "new-password" : "current-password"} minLength={creating ? PASSWORD_MIN : 1} maxLength={PASSWORD_MAX} required
        placeholder={creating ? `At least ${PASSWORD_MIN} characters` : "Enter your password"} />
      <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setVisible(v => !v)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} title={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </span>
    {creating && <ul className="fs-password-rules" aria-live="polite">{PASSWORD_RULES.map(rule => {
      const ok = rule.test(value);
      return <li key={rule.id} className={ok ? "ok" : ""}>{ok ? <Check size={13} /> : <Circle size={13} />}{rule.label}</li>;
    })}</ul>}
  </div>;
}

export default function AuthForm({ mode, next = "/dashboard", mail = true, token = "", linkError = "" }: { mode: Mode; next?: string; mail?: boolean; token?: string; linkError?: string }) {
  const [error, setError] = useState(linkError ? "This link is invalid or has expired. Request a new one." : "");
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState(""); const [done, setDone] = useState(false);
  const hydrated = useHydrated();
  const titles = { login: "Welcome back", signup: "Start your next chapter", "forgot-password": "Forgot your password?", "reset-password": "Choose a new password", "verify-email": "Verify your email" };
  const subtitles = { login: "Your next great chapter is waiting for you.", signup: "A little imagination. A world of possibilities.", "forgot-password": "Enter your email and we will send you a reset link.", "reset-password": "Pick a strong password you have not used before.", "verify-email": "We will send a fresh verification link to your inbox." };
  const needsMail = mode === "forgot-password" || mode === "verify-email";
  const withNext = (path: string) => next !== "/dashboard" ? `${path}?next=${encodeURIComponent(next)}` : path;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    try {
      let result;
      if (mode === "signup") result = await authClient.signUp.email({ email, password, name: String(form.get("name")).trim(), callbackURL: next });
      else if (mode === "login") result = await authClient.signIn.email({ email, password, callbackURL: next, rememberMe: form.get("remember") === "on" });
      else if (mode === "forgot-password") result = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
      else if (mode === "verify-email") result = await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" });
      else {
        if (!token) throw new Error("This reset link is missing its token. Request a new link.");
        result = await authClient.resetPassword({ newPassword: password, token });
      }
      if (result.error) {
        if (result.error.status === 403 && mode === "login" && /verif/i.test(result.error.message || "")) throw new Error("Please verify your email first. Use “Resend verification email” below if you cannot find the link.");
        throw new Error(result.error.message || "Please try again.");
      }
      if (mode === "login" || (mode === "signup" && result.data && "token" in result.data && result.data.token)) { window.location.assign(next); return; }
      setDone(true);
      if (mode === "reset-password") setMessage("Password updated. You can now log in with your new password.");
      else if (mode === "signup") setMessage("Account created! Check your inbox and click the verification link to start creating.");
      else setMessage("If an account exists for that email, a message is on its way. Check your inbox and spam folder.");
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }

  return <main className={`fs-app fs-auth ${styles.auth}`} data-mode={mode}>
    <section className="fs-auth-story">
      <Link href="/" className="fs-brand"><BrandMark src="/icon.png" /> {SITE.name}</Link>
      <div className={styles.authStoryContent}>
        <BookShowcase compact />
        <h1>Your ideas. Your books.<br />Powered by <em>imagination & AI.</em></h1>
        <p>Create books, flipbooks and visual stories.<br />Everything you imagine, all in one place.</p>
        <CreationTypes compact />
      </div>
      <div className={styles.authStoryFooter}><span><Check size={14} /> Free to start</span><span><Check size={14} /> No credit card needed</span></div>
    </section>
    <section className="fs-auth-form">
      <div className={styles.authTop}><Link href="/" className="fs-mobile-brand fs-brand"><BrandMark src="/icon.png" /> {SITE.name}</Link><Link href="/" className={styles.backLink}><ArrowLeft size={15} /> Back to home</Link></div>
      <div className="fs-form-card"><div className={styles.formHeading}><span className={styles.authPill}>{mode === "signup" ? "LET’S CREATE SOMETHING GREAT" : "YOUR CREATIVE WORKSPACE"}</span><h2>{titles[mode]}{mode === "login" && <span className={styles.wave} aria-hidden="true"> 👋</span>}</h2><p className="fs-muted">{subtitles[mode]}</p><span className={styles.headingRule} /></div>
      {needsMail && !mail ? <p className="fs-alert" role="alert">Email delivery is not set up on this site yet. Please <Link href="/contact?topic=support">contact support</Link> for help with your account.</p>
      : done ? <p className="fs-success" role="status">{message}</p>
      : <form onSubmit={submit} method="post" action="#">
        {mode === "signup" && <label><span className={styles.fieldLabel}><UserRound size={14} /> Full name</span><input name="name" autoComplete="name" required maxLength={100} placeholder="Your full name" /></label>}
        {mode !== "reset-password" && <label><span className={styles.fieldLabel}><Mail size={14} /> Email address</span><input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="Enter your email address" /></label>}
        {["signup", "login", "reset-password"].includes(mode) && <PasswordField mode={mode} value={password} onChange={setPassword} />}
        {mode === "login" && <div className="fs-auth-row"><label className="fs-check"><input type="checkbox" name="remember" defaultChecked />Keep me logged in</label>{mail && <Link className="fs-text-link" href="/forgot-password">Forgot password?</Link>}</div>}
        {mode === "signup" && <label className="fs-check"><input type="checkbox" name="terms" required />I agree to the <Link href="/terms" target="_blank">Terms</Link> and <Link href="/privacy" target="_blank">Privacy Policy</Link></label>}
        {error && <p className="fs-alert" role="alert">{error}</p>}
        {/* Disabled until hydrated so a native submit can never send the password in the URL. */}
        <button className="fs-btn fs-primary" disabled={busy || !hydrated}>{busy ? <LoaderCircle className="fs-spin" size={18} /> : null}{mode === "login" ? "Log in" : mode === "signup" ? "Create free account" : mode === "reset-password" ? "Update password" : "Send email"}<ArrowRight size={17} /></button>
      </form>}
      <p className="fs-auth-switch">{mode === "login" ? <>New here? <Link href={withNext("/signup")}>Create an account</Link></> : <>{mode === "signup" ? "Already have an account?" : "Remembered it?"} <Link href={withNext("/login")}>Log in</Link></>}</p>
      {mode === "login" && mail && <Link className="fs-text-link fs-center" href="/verify-email">Resend verification email</Link>}
    </div><div className={styles.authBottom}><span><ShieldCheck size={14} /> Your ideas are in good hands.</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact?topic=support">Help</Link></div></div></section></main>;
}

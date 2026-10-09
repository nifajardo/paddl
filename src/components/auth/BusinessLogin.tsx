"use client";

import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { supabase } from "@/lib/supabase";

export function BusinessLogin() {
  const { loginWithEmail, registerStoreAccount, isAuthLoading, isSupabaseActive,
    passwordRecovery, finishPasswordRecovery } = useStore();
  const [view, setView] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submitting = busy || isAuthLoading;
  const newPassword = passwordRecovery || view === "signup";
  function changeView(next: typeof view) {
    setView(next); setError(""); setNotice(""); setPassword(""); setConfirmation("");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setNotice(""); setBusy(true);
    try {
      if (!supabase) throw new Error("Business sign-in is not configured yet. Contact the business administrator, or explore Demo Mode.");
      if (newPassword && password !== confirmation) throw new Error("The passwords do not match.");
      if (newPassword && password.length < 12) throw new Error("Use a password of at least 12 characters.");
      if (passwordRecovery) {
        const result = await supabase.auth.updateUser({ password });
        if (result.error) throw result.error;
        setPassword(""); setConfirmation(""); finishPasswordRecovery();
      } else if (view === "reset") {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        if (result.error) throw result.error;
        setNotice("If an account exists for that email, you'll receive a password reset link. Check your inbox and spam folder.");
      } else if (view === "signup") {
        const result = await registerStoreAccount(email, password);
        if (result.error) throw new Error(result.error);
        setPassword(""); setConfirmation("");
        if (result.needsConfirmation) setNotice("Check your email to confirm your account, then return here to sign in.");
      } else {
        const result = await loginWithEmail(email, password);
        if (result.error) throw new Error(result.error);
        setPassword("");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to sign in. Try again."); }
    finally { setBusy(false); }
  }
  return (
    <form className="production-setup business-login" onSubmit={submit}>
      <div>
        <div className="eyebrow">YOUR BUSINESS WORKSPACE</div>
        <h1>{passwordRecovery ? "Choose a new password" : view === "signup" ? "Create your account" : view === "reset" ? "Reset your password" : "Welcome back"}</h1>
        <p>{passwordRecovery ? "Choose a strong password you haven't used before." : view === "signup" ? "Start with a clean workspace for your own business." : view === "reset" ? "We'll send a link to your account email." : "Sign in to open your sales, stock, and customer records."}</p>
      </div>
      {!isSupabaseActive && <p role="alert" className="auth-message">Business sign-in needs connection setup. Demo Mode is available while your administrator connects the service.</p>}
      {!passwordRecovery && <label htmlFor="business-email">Email address
        <input id="business-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} placeholder="you@example.com" disabled={submitting} />
      </label>}
      {(view !== "reset" || passwordRecovery) && <>
        <label htmlFor="business-password">{newPassword ? "Create password" : "Password"}
          <span className="auth-password">
            <input id="business-password" type={visible ? "text" : "password"} autoComplete={newPassword ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={newPassword ? 12 : undefined} disabled={submitting} />
            <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </span>
          {newPassword && <small>At least 12 characters. A long, unique phrase works well.</small>}
        </label>
        {newPassword && <label htmlFor="business-confirm">Confirm password<input id="business-confirm" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required minLength={12} disabled={submitting} /></label>}
      </>}
      {error && <p role="alert" className="auth-message auth-error">{error}</p>}
      {notice && <p role="status" className="auth-message">{notice}</p>}
      <button type="submit" className="primary-button" disabled={submitting || !isSupabaseActive}>
        {submitting ? <><LoaderCircle size={18} className="animate-spin" /> Please wait</> : <>{passwordRecovery ? "Save new password" : view === "signup" ? "Create account" : view === "reset" ? "Send reset link" : "Sign in"}<ArrowRight size={18} /></>}
      </button>
      {!passwordRecovery && <div className="auth-links">
        <button type="button" disabled={submitting} onClick={() => changeView(view === "signin" ? "signup" : "signin")}>{view === "signin" ? "New to Paddl? Create an account" : "Back to sign in"}</button>
        {view === "signin" && <button type="button" disabled={submitting} onClick={() => changeView("reset")}>Forgot password?</button>}
      </div>}
    </form>
  );
}

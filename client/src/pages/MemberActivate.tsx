import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { SiteLogoStacked } from "@/components/SiteLogo";

type ActivationState = "checking" | "ready" | "invalid";

export default function MemberActivate() {
  const [location, navigate] = useLocation();
  const token = useMemo(() => new URLSearchParams(location.split("?")[1] || "").get("token") || "", [location]);
  const [state, setState] = useState<ActivationState>("checking");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token) {
      setState("invalid");
      setError("This activation link is invalid or incomplete.");
      return;
    }
    fetch(`/api/member/auth/activate?token=${encodeURIComponent(token)}`)
      .then(async (res) => ({ ok: res.ok, data: await res.json() }))
      .then(({ ok, data }) => {
        if (!active) return;
        if (!ok || !data.ok) {
          setState("invalid");
          setError(data.error || "This activation link is invalid or has expired.");
          return;
        }
        setFirstName(data.first_name || "");
        setEmail(data.email || "");
        setState("ready");
      })
      .catch(() => {
        if (!active) return;
        setState("invalid");
        setError("We could not verify this activation link. Please try again later.");
      });
    return () => { active = false; };
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/member/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirm_password: confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Unable to activate your account.");
        return;
      }
      navigate(data.redirect || "/portal");
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <SiteLogoStacked size="lg" className="mb-2" />
          <p className="text-gray-500 text-sm mt-1">Activate your Papa Life Membership account</p>
        </div>
        <div className="bg-[#111] border border-white/10 rounded-2xl p-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-yellow/10 mx-auto mb-6">
            <ShieldCheck className="w-5 h-5 text-brand-yellow" />
          </div>
          {state === "checking" ? (
            <div className="flex items-center justify-center gap-2 text-gray-300 py-8">
              <Loader2 className="w-4 h-4 animate-spin" /> Verifying your secure link…
            </div>
          ) : state === "invalid" ? (
            <div className="space-y-4 text-center">
              <h1 className="text-white font-bold text-lg">Activation link unavailable</h1>
              <p className="text-red-300 text-sm bg-red-400/10 py-3 px-4 rounded-lg">{error}</p>
              <a href="/member-login" className="inline-block text-brand-yellow text-sm hover:underline">Go to member sign in</a>
            </div>
          ) : (
            <>
              <h1 className="text-white font-bold text-lg text-center mb-2">Set your password</h1>
              <p className="text-gray-400 text-sm text-center mb-6">Your $4.99 membership is active. Set a password to enter Course 11.</p>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-sm">Member</Label>
                  <Input value={`${firstName}${email ? ` — ${email}` : ""}`} readOnly className="bg-white/5 border-white/10 text-gray-300" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-sm">Password</Label>
                  <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-brand-yellow/50" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-sm">Confirm password</Label>
                  <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter password" autoComplete="new-password" className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-brand-yellow/50" required />
                </div>
                {error && <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 px-3 rounded-lg">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-5 rounded-xl text-sm mt-2">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activating…</> : "Enter Course 11"}
                </Button>
              </form>
            </>
          )}
        </div>
        <p className="text-center text-gray-600 text-xs mt-6">Already set up your account? <a href="/member-login" className="hover:text-gray-400 transition-colors">Sign in</a></p>
      </div>
    </div>
  );
}

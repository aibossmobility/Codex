import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteLogoStacked } from "@/components/SiteLogo";

export default function MemberForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true);
    try { await fetch("/api/member/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); setSent(true); }
    finally { setLoading(false); }
  };
  return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4"><div className="w-full max-w-sm"><div className="flex flex-col items-center mb-8"><SiteLogoStacked size="lg" /><p className="text-gray-500 text-sm mt-3">Recover your member access</p></div><div className="bg-[#111] border border-white/10 rounded-2xl p-8"><div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-yellow/10 mx-auto mb-6"><KeyRound className="w-5 h-5 text-brand-yellow" /></div>{sent ? <div className="text-center"><h1 className="text-white font-bold text-lg">Check your email</h1><p className="mt-3 text-sm leading-relaxed text-gray-400">If that address belongs to an active Papa Life account, we sent a secure link that expires in two hours.</p><a href="/member-login" className="mt-6 inline-block text-brand-yellow text-sm">Return to sign in</a></div> : <><h1 className="text-white font-bold text-lg text-center">Reset your password</h1><p className="mt-2 mb-6 text-sm text-center text-gray-400">Enter the email used for your Papa Life membership.</p><form onSubmit={submit} className="space-y-4"><div className="space-y-1.5"><Label className="text-gray-400">Email</Label><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" required className="bg-white/5 border-white/10 text-white" /></div><Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-bold">{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Sending…</> : "Send secure reset link"}</Button></form></>}</div></div></div>;
}

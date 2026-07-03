import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Heart } from "lucide-react";
import { SiteLogoStacked } from "@/components/SiteLogo";

export default function MemberLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/member/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Login failed");
      } else {
        if (data.billing_required) navigate("/member-billing");
        else navigate("/portal");
      }
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <SiteLogoStacked size="lg" className="mb-2" />
          <p className="text-gray-500 text-sm mt-1">Member portal</p>
        </div>

        {/* Card */}
        <div className="bg-[#111] border border-white/10 rounded-2xl p-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-yellow/10 mx-auto mb-6">
            <Heart className="w-5 h-5 text-brand-yellow" />
          </div>

          <h2 className="text-white font-bold text-lg text-center mb-6">Member Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-gray-400 text-sm">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-brand-yellow/50"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-400 text-sm">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-brand-yellow/50"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center bg-red-400/10 py-2 px-3 rounded-lg">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-5 rounded-xl text-sm mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          PAPA Life · Member Portal
        </p>
        <p className="text-center text-gray-600 text-xs mt-2">
          New here?{" "}
          <a href="/member-register" className="hover:text-gray-400 transition-colors">
            Create an account
          </a>
        </p>
        <p className="text-center mt-2">
          <a href="/" className="text-gray-600 text-xs hover:text-gray-400 transition-colors">← Back to home</a>
        </p>
      </div>
    </div>
  );
}

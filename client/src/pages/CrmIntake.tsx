import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteLogoStacked } from "@/components/SiteLogo";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  PAPA_ISSUE_OPTIONS,
  type PapaIssueKey,
  persistFunnelSession,
} from "@/lib/papa-funnel";

export default function CrmIntake() {
  const [, navigate] = useLocation();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [issueKey, setIssueKey] = useState<PapaIssueKey | "">("");
  const [submitting, setSubmitting] = useState(false);

  const selectedLabel = issueKey ? PAPA_ISSUE_OPTIONS.find((o) => o.key === issueKey)?.label ?? "" : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueKey) {
      toast.error("Choose the one that best describes where things stand right now.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/papa-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          email: email.trim(),
          issue_key: issueKey,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Something went wrong. Please try again.");
        return;
      }
      persistFunnelSession(email.trim(), issueKey);
      navigate("/papa-intro");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="container max-w-2xl mx-auto px-4 py-6 flex justify-center">
          <a href="/" className="inline-block">
            <SiteLogoStacked size="sm" />
          </a>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto px-4 py-10 md:py-14">
        <Card className="border-white/10 bg-[#111]/90 backdrop-blur-sm shadow-xl">
          <CardHeader className="space-y-2 pb-2">
            <CardTitle className="font-heading text-2xl md:text-3xl text-white text-center">Start Here</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-2">
            <div className="space-y-3 text-gray-300 text-base leading-relaxed">
              <p>You are here because something does not feel right between you and your adult child.</p>
              <p>This is where we get clear on what is happening and what your next step should be.</p>
            </div>

            <p className="text-sm font-medium text-brand-yellow">
              Choose the one that best describes where things stand right now.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label className="text-gray-400 sr-only">Issue</Label>
                <div className="grid gap-2">
                  {PAPA_ISSUE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setIssueKey(opt.key)}
                      className={`text-left rounded-xl border px-4 py-3 text-sm md:text-base transition-all ${
                        issueKey === opt.key
                          ? "border-accent bg-accent/10 text-white ring-1 ring-accent/40"
                          : "border-white/15 bg-white/[0.03] text-gray-200 hover:border-white/25 hover:bg-white/[0.06]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-gray-400">
                    First Name
                  </Label>
                  <Input
                    id="first_name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-white/5 border-white/15 text-white"
                    placeholder="Your first name"
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-400">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/5 border-white/15 text-white"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="selected_issue" className="text-gray-400">
                  Selected issue
                </Label>
                <Input
                  id="selected_issue"
                  readOnly
                  value={selectedLabel}
                  placeholder="Choose an option above"
                  className="bg-white/[0.03] border-white/10 text-gray-400 cursor-not-allowed"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !issueKey}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-lg rounded-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Continue
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-600 mt-8">
          Questions? Reach Brian at{" "}
          <a href="mailto:brian@bossmobility.net" className="text-gray-400 hover:text-brand-yellow underline-offset-2 hover:underline">
            brian@bossmobility.net
          </a>
        </p>
      </main>
    </div>
  );
}

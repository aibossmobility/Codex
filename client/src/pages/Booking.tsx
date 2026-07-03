import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Lock,
  Unlock,
  Heart,
  Shield,
  Compass,
  MessageSquare,
} from "lucide-react";
import { SiteCtaBlocks } from "@/components/SiteCtaBlocks";

interface ConversionStatus {
  stage: string;
  eligible: boolean;
  intake_completed: boolean;
  content_interactions: number;
  community_participation: number;
  booked: boolean;
}

const CALENDLY_URL = "https://calendly.com/briankeithhill";

const CLOSER_STEPS = [
  {
    label: "Acknowledge",
    text: "You've been doing the work — showing up, reflecting, engaging.",
  },
  {
    label: "Reflect",
    text: "Based on what you've shared, we can see where you're growing and where the gap still lives.",
  },
  {
    label: "Name the gap",
    text: "The next step that would close this fastest is a guided conversation with Brian.",
  },
  {
    label: "Invitation",
    text: "Would you be open to a 60-minute PAPA Clarity Session?",
  },
];

export default function Booking() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<ConversionStatus | null>(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/conversion-status?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();
      setStatus(data);
      setChecked(true);
    } catch {
      setStatus(null);
    }
    setLoading(false);
  };

  const handleBook = async () => {
    if (email.trim()) {
      await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      }).catch(() => {});
      await fetch("/api/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          event_type: "booking_click",
          event_detail: "Clicked Calendly booking link",
        }),
      }).catch(() => {});
    }
    window.open(CALENDLY_URL, "_blank", "noopener,noreferrer");
  };

  const requirements = [
    {
      label: "Complete the Strategist Intake",
      met: status?.intake_completed ?? false,
      href: "/strategist",
    },
    {
      label: "Engage with 3+ pieces of content",
      met: (status?.content_interactions ?? 0) >= 3,
      href: "/",
    },
    {
      label: "Participate in the Brotherhood (1 post or RSVP)",
      met: (status?.community_participation ?? 0) >= 1,
      href: "/member-login",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      {/* Hero */}
      <header className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(56,189,248,0.12),transparent)]" />
        <div className="container relative z-10 text-center space-y-5">
          <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-1.5 text-xs tracking-widest uppercase">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            PAPA Clarity Session
          </Badge>
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-white text-glow">
            Book Your <span className="text-primary">Clarity Session</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            A 60-minute one-on-one session with Brian Keith Hill. Not a sales
            call — a guided conversation to find your next right step as a
            father.
          </p>
        </div>
      </header>

      <div className="container max-w-3xl mx-auto px-6 -mt-4 mb-6">
        <SiteCtaBlocks placement="booking" />
      </div>

      <main className="container max-w-3xl mx-auto px-6 pb-24 flex-1 space-y-10">
        {/* The Closer Script */}
        <Card className="glass-panel bg-transparent border-white/10">
          <CardContent className="py-8 space-y-6">
            {CLOSER_STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <div>
                  <p className="text-xs text-primary uppercase tracking-wider font-bold mb-1">
                    {s.label}
                  </p>
                  <p className="text-gray-300 leading-relaxed">{s.text}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Separator className="w-24 h-1 bg-primary mx-auto" />

        {/* Eligibility Check */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="font-heading text-2xl font-bold text-white mb-2">
              Check Your Readiness
            </h2>
            <p className="text-gray-500 text-sm">
              Enter the email you used during your intake to see where you
              stand.
            </p>
          </div>

          <div className="flex gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setChecked(false);
              }}
              placeholder="your@email.com"
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
              onKeyDown={(e) => e.key === "Enter" && checkStatus()}
            />
            <Button
              onClick={checkStatus}
              disabled={!email.trim() || loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl px-6"
            >
              {loading ? "..." : "Check"}
            </Button>
          </div>

          {checked && status && (
            <div className="space-y-4 animate-in fade-in duration-500">
              {/* Pipeline stage */}
              <Card className="glass-panel bg-transparent border-white/10">
                <CardContent className="py-5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">
                      Your Current Stage
                    </span>
                    <Badge
                      className={`capitalize ${
                        status.stage === "conversion"
                          ? "bg-primary/20 text-primary border-primary/30"
                          : status.stage === "community"
                          ? "bg-brand-yellow/20 text-brand-yellow border-brand-yellow/30"
                          : status.stage === "engagement"
                          ? "bg-primary/20 text-primary border-primary/30"
                          : "bg-gray-400/20 text-gray-400 border-gray-400/30"
                      }`}
                    >
                      {status.stage}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Requirements checklist */}
              <Card className="glass-panel bg-transparent border-white/10">
                <CardContent className="py-6 space-y-4">
                  <p className="text-sm text-gray-400 font-medium">
                    Booking Requirements
                  </p>
                  {requirements.map((req, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {req.met ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            req.met ? "text-white" : "text-gray-500"
                          }`}
                        >
                          {req.label}
                        </span>
                      </div>
                      {!req.met && (
                        <a
                          href={req.href}
                          className="text-primary text-xs hover:underline flex-shrink-0"
                        >
                          Start <ArrowRight className="w-3 h-3 inline" />
                        </a>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Booking CTA */}
              {status.eligible ? (
                <Card className="border-primary/40 border-2 shadow-[0_0_30px_rgba(56,189,248,0.15)] bg-transparent">
                  <CardContent className="py-8 text-center space-y-4">
                    <Unlock className="w-10 h-10 text-primary mx-auto" />
                    <h3 className="font-heading text-2xl font-bold text-white">
                      You're Ready
                    </h3>
                    <p className="text-gray-400 max-w-md mx-auto text-sm">
                      You've done the work. You've shown up. This is your
                      invitation — not a push, just an open door.
                    </p>
                    <Button
                      size="lg"
                      onClick={handleBook}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-10 py-6 rounded-full font-bold shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all hover:scale-105"
                    >
                      <Calendar className="mr-2 h-5 w-5" />
                      Book PAPA Clarity Session
                    </Button>
                    <p className="text-xs text-gray-600">
                      60 minutes with Brian Keith Hill via Calendly
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="glass-panel bg-transparent border-white/10">
                  <CardContent className="py-8 text-center space-y-4">
                    <Lock className="w-10 h-10 text-gray-500 mx-auto" />
                    <h3 className="font-heading text-xl font-bold text-gray-400">
                      Not Quite Yet
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto text-sm">
                      The booking opens when all three steps above are complete.
                      This isn't a gate — it's a foundation. The men who do the
                      work first get the most from the session.
                    </p>
                  </CardContent>
                </Card>
              )}

              {status.booked && (
                <Card className="border-green-400/40 border-2 bg-transparent">
                  <CardContent className="py-5 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 font-bold">
                      Session Already Booked
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Check your email for confirmation details.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {checked && !status && (
            <div className="text-center animate-in fade-in duration-500">
              <Card className="glass-panel bg-transparent border-white/10 inline-block">
                <CardContent className="py-6 px-8 space-y-3">
                  <MessageSquare className="w-8 h-8 text-gray-500 mx-auto" />
                  <p className="text-gray-400 text-sm">
                    We don't have a record for that email yet. Start your
                    journey with the Strategist Intake.
                  </p>
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-full"
                    asChild
                  >
                    <a href="/strategist">
                      Take the Intake <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <footer className="container pb-12 text-center">
        <Button
          variant="outline"
          className="border-white/20 text-white hover:bg-white/10 rounded-full px-8"
          asChild
        >
          <a href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </a>
        </Button>
      </footer>
    </div>
  );
}

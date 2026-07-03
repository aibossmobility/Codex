import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Compass,
  Shield,
  Heart,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Target,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { SiteCtaBlocks } from "@/components/SiteCtaBlocks";

type PillarKey = "Purpose" | "Authority" | "Presence" | "Alignment";

type FormQuestion = {
  question_key: string;
  label: string;
  help_text: string | null;
  input_type: string;
  required: boolean;
  sort_order: number;
  placeholder: string | null;
  options: string[];
};

const PILLARS: {
  name: PillarKey;
  tagline: string;
  Icon: typeof Compass;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    name: "Purpose",
    tagline: "Know why you were built for this.",
    Icon: Compass,
    color: "text-brand-yellow",
    bg: "bg-brand-yellow/10",
    border: "border-brand-yellow/30",
  },
  {
    name: "Authority",
    tagline: "Lead without control. Guide without force.",
    Icon: Shield,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
  },
  {
    name: "Presence",
    tagline: "Be the father who actually shows up.",
    Icon: Heart,
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/30",
  },
  {
    name: "Alignment",
    tagline: "Become who your words say you are.",
    Icon: Zap,
    color: "text-brand-yellow",
    bg: "bg-brand-yellow/10",
    border: "border-brand-yellow/30",
  },
];

const PILLAR_SET = new Set<string>(["Purpose", "Authority", "Presence", "Alignment"]);

const SMS_CONSENT_TEXT =
  "By submitting this form, you agree to receive text messages from Papa Life regarding coaching appointments, educational resources, reminders, and account notifications. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe or HELP for assistance. SMS consent is not shared with third parties.";

function isPillarOptionSelect(q: FormQuestion): boolean {
  if (q.input_type !== "select" || !q.options?.length) return false;
  return q.options.every((o) => PILLAR_SET.has(o));
}

function isPhoneQuestion(q: FormQuestion): boolean {
  return q.question_key === "phone" || q.input_type === "tel";
}

export default function Strategist() {
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [loadError, setLoadError] = useState("");
  const [schemaLoading, setSchemaLoading] = useState(true);

  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [smsConsent, setSmsConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/public/forms/intake_submission");
        if (!res.ok) throw new Error("bad");
        const data = await res.json();
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
      } catch {
        setLoadError("Could not load the intake form. Please refresh or try again later.");
      } finally {
        setSchemaLoading(false);
      }
    })();
  }, []);

  const totalSteps = questions.length + 1;
  const progressValue = questions.length > 0 ? (Math.min(step, totalSteps) / totalSteps) * 100 : 0;
  const currentIndex = step - 1;
  const currentQuestion = currentIndex >= 0 && currentIndex < questions.length ? questions[currentIndex] : null;
  const isResults = questions.length > 0 && step === totalSteps;

  const recommendedTrack = (answers.routed_pillar as PillarKey | undefined) || "Purpose";

  const setField = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const validateCurrent = (): boolean => {
    if (!currentQuestion) return true;
    if (isPhoneQuestion(currentQuestion) && (answers[currentQuestion.question_key] ?? "").trim() && !smsConsent) {
      return false;
    }
    if (!currentQuestion.required) return true;
    const v = (answers[currentQuestion.question_key] ?? "").trim();
    return !!v;
  };

  const goNext = () => {
    if (!validateCurrent()) return;
    if (step < totalSteps - 1) setStep((s) => s + 1);
  };

  const handleFinalSubmit = async () => {
    if (!validateCurrent()) return;
    setSubmitting(true);
    try {
      await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: { ...answers, sms_consent: smsConsent ? "true" : "" } }),
      });
      const email = answers.email?.trim();
      if (email) {
        await fetch("/api/engagement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            event_type: "content_click",
            event_detail: "Completed strategist intake",
          }),
        });
      }
    } catch {
      /* non-blocking */
    }
    setSubmitting(false);
    setStep(totalSteps);
  };

  const renderField = (q: FormQuestion) => {
    const value = answers[q.question_key] ?? "";

    if (isPillarOptionSelect(q)) {
      return (
        <div className="grid sm:grid-cols-2 gap-4">
          {q.options.map((opt) => {
            const pillar = PILLARS.find((p) => p.name === opt);
            if (!pillar) return null;
            const selected = value === opt;
            return (
              <Card
                key={opt}
                onClick={() => setField(q.question_key, opt)}
                className={`glass-panel bg-transparent cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                  selected ? `${pillar.border} border-2 shadow-[0_0_20px_rgba(56,189,248,0.15)]` : "border-white/10 hover:border-white/20"
                }`}
              >
                <CardContent className="flex flex-col items-center text-center py-8 space-y-4">
                  <div className={`w-16 h-16 rounded-2xl ${pillar.bg} flex items-center justify-center`}>
                    <pillar.Icon className={`w-8 h-8 ${pillar.color}`} />
                  </div>
                  <div>
                    <p className={`font-heading font-bold text-lg ${pillar.color}`}>{pillar.name}</p>
                    <p className="text-gray-400 text-sm mt-1">{pillar.tagline}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    }

    if (q.input_type === "select" && q.options.length > 0) {
      return (
        <div className="grid gap-3">
          {q.options.map((opt) => {
            const selected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setField(q.question_key, opt)}
                className={`text-left rounded-xl border px-4 py-3 text-sm transition-colors ${
                  selected ? "border-primary/50 bg-primary/10 text-white" : "border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    if (q.input_type === "textarea") {
      return (
        <textarea
          value={value}
          onChange={(e) => setField(q.question_key, e.target.value)}
          placeholder={q.placeholder || ""}
          rows={6}
          className="w-full min-h-[160px] bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-base"
        />
      );
    }

    const inputType = q.input_type === "email" ? "email" : q.input_type === "tel" ? "tel" : "text";
    return (
      <input
        type={inputType}
        value={value}
        onChange={(e) => setField(q.question_key, e.target.value)}
        placeholder={q.placeholder || ""}
        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
      />
    );
  };

  if (schemaLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-gray-500 text-sm">Loading intake…</p>
      </div>
    );
  }

  if (loadError || questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6">
        <p className="text-red-300 text-center max-w-md mb-6">{loadError || "No intake questions are configured yet."}</p>
        <Button variant="outline" className="border-white/20 text-white rounded-full" asChild>
          <a href="/">Back to Home</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      <header className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(56,189,248,0.12),transparent)]" />
        <div className="container relative z-10 text-center space-y-5">
          <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-1.5 text-xs tracking-widest uppercase">
            <Target className="w-3.5 h-3.5 mr-1.5" />
            Intake Assessment
          </Badge>
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold tracking-tight text-white text-glow">
            PAPA Life <span className="text-primary">Strategist</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">Answer honestly. Questions are managed in the system so your coach can update them anytime.</p>
        </div>
      </header>

      <div className="container max-w-3xl mx-auto px-6 -mt-4 mb-6">
        <SiteCtaBlocks placement="strategist" />
      </div>

      <div className="container max-w-2xl mx-auto px-6 mb-10">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>
            {isResults ? "Complete" : `Step ${step} of ${questions.length}`}
          </span>
          <span>{isResults ? "100%" : `${Math.round(progressValue)}%`}</span>
        </div>
        <Progress value={isResults ? 100 : progressValue} className="h-2" />
      </div>

      <main className="container max-w-3xl mx-auto px-6 pb-24 flex-1">
        {!isResults && currentQuestion && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center">
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-white mb-2">{currentQuestion.label}</h2>
              {currentQuestion.help_text && <p className="text-gray-500 text-sm max-w-lg mx-auto">{currentQuestion.help_text}</p>}
            </div>
            <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
              {currentQuestion.input_type === "textarea" && (
                <div className="flex items-start gap-3 mb-2">
                  <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <p className="text-gray-400 text-sm">Take your time. There is no judgment here — only clarity.</p>
                </div>
              )}
              {renderField(currentQuestion)}
              {isPhoneQuestion(currentQuestion) ? (
                <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-gray-400">
                  <input
                    type="checkbox"
                    checked={smsConsent}
                    required={Boolean((answers[currentQuestion.question_key] ?? "").trim())}
                    onChange={(event) => setSmsConsent(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-white/30 bg-black accent-primary"
                  />
                  <span>{SMS_CONSENT_TEXT}</span>
                </label>
              ) : null}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  disabled={step <= 1}
                  className="text-gray-500 hover:text-white text-sm transition-colors inline-flex items-center gap-1 disabled:opacity-30"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                {step < questions.length ? (
                  <Button
                    onClick={goNext}
                    disabled={!validateCurrent()}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-full px-8"
                  >
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleFinalSubmit}
                    disabled={!validateCurrent() || submitting}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-full px-8"
                  >
                    {submitting ? "Saving..." : <>Submit <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {isResults && (
          <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-2">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-heading text-3xl md:text-4xl font-extrabold text-white text-glow">Your PAPA Blueprint</h2>
              <p className="text-gray-400 max-w-lg mx-auto">Based on your answers, here&apos;s your personalized starting point.</p>
            </div>

            <Separator className="w-24 h-1 bg-primary mx-auto" />

            <Card className="glass-panel bg-transparent border-primary/40 border-2 shadow-[0_0_30px_rgba(56,189,248,0.15)]">
              <CardContent className="py-8 space-y-6">
                <div className="text-center">
                  <Badge className="bg-primary/20 text-primary border-primary/30 mb-3">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Recommended Track
                  </Badge>
                  <h3 className="font-heading text-3xl font-extrabold text-primary">{recommendedTrack}</h3>
                  <p className="text-gray-400 text-sm mt-2">{PILLARS.find((p) => p.name === recommendedTrack)?.tagline}</p>
                </div>
              </CardContent>
            </Card>

            {answers.disconnected_pillar && (
              <Card className="glass-panel bg-transparent border-white/10">
                <CardContent className="py-6">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Area Most Needing Attention</p>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const pillar = PILLARS.find((p) => p.name === answers.disconnected_pillar);
                      if (!pillar) return <p className="text-gray-300">{answers.disconnected_pillar}</p>;
                      return (
                        <>
                          <div className={`w-10 h-10 rounded-lg ${pillar.bg} flex items-center justify-center`}>
                            <pillar.Icon className={`w-5 h-5 ${pillar.color}`} />
                          </div>
                          <div>
                            <p className={`font-bold ${pillar.color}`}>{pillar.name}</p>
                            <p className="text-gray-400 text-sm">{pillar.tagline}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {answers.vision?.trim() && (
              <Card className="glass-panel bg-transparent border-white/10">
                <CardContent className="py-6">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Your Vision</p>
                  <p className="text-gray-300 leading-relaxed italic">&quot;{answers.vision}&quot;</p>
                </CardContent>
              </Card>
            )}

            <div className="text-center pt-4">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-10 py-6 rounded-full font-bold shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all hover:scale-105"
                asChild
              >
                <a href="/papa-journey">
                  Begin Your Journey <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>
        )}
      </main>

      <footer className="container pb-12 text-center">
        <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-full px-8" asChild>
          <a href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </a>
        </Button>
      </footer>
    </div>
  );
}

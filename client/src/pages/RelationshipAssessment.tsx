import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

type Pillar = "Purpose" | "Authority" | "Presence" | "Alignment";

type Question = {
  id: string;
  pillar: Pillar;
  text: string;
};

const questions: Question[] = [
  { id: "p1", pillar: "Purpose", text: "I have a clear sense of who I am beyond my role as a provider or family authority." },
  { id: "p2", pillar: "Purpose", text: "I know what I want from my relationship with my adult child beyond logistics and provision." },
  { id: "p3", pillar: "Purpose", text: "I feel a strong sense of purpose in this season of fatherhood—not loss or irrelevance." },
  { id: "a1", pillar: "Authority", text: "I lead my adult children through my character and integrity, not through position or pressure." },
  { id: "a2", pillar: "Authority", text: "I take accountability for my part in any distance or conflict with my adult child." },
  { id: "a3", pillar: "Authority", text: "My adult child would say my leadership is trustworthy and consistent, not controlling." },
  { id: "pr1", pillar: "Presence", text: "When my adult child shares something difficult, I listen first rather than advising or fixing." },
  { id: "pr2", pillar: "Presence", text: "I am comfortable having conversations that do not have a clear agenda or resolution." },
  { id: "pr3", pillar: "Presence", text: "I initiate connection without needing something from my adult child in return." },
  { id: "al1", pillar: "Alignment", text: "The way I actually live is consistent with the values I say I hold." },
  { id: "al2", pillar: "Alignment", text: "I have said the things I need to say—apologies, acknowledgments, and love." },
  { id: "al3", pillar: "Alignment", text: "I actively work to close the gap between who I want to be and who I am currently being." },
];

const pillarGuidance: Record<Pillar, string> = {
  Purpose: "Clarify who you are in this season and what kind of relationship you want to help create.",
  Authority: "Practice influence through humility, character, consistency, and accountability.",
  Presence: "Listen before fixing and become emotionally available without forcing an outcome.",
  Alignment: "Bring your faith, values, words, apologies, and daily actions into the same lane.",
};

export default function RelationshipAssessment() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const answeredCount = Object.keys(answers).length;

  const scores = useMemo(() => {
    const totals: Record<Pillar, number> = { Purpose: 0, Authority: 0, Presence: 0, Alignment: 0 };
    questions.forEach((question) => {
      totals[question.pillar] += answers[question.id] || 0;
    });
    return totals;
  }, [answers]);

  const focusPillar = useMemo(() => {
    return (Object.entries(scores) as [Pillar, number][]).sort((a, b) => a[1] - b[1])[0][0];
  }, [scores]);

  const handleResults = () => {
    if (answeredCount !== questions.length) return;
    setShowResults(true);
    window.setTimeout(() => document.getElementById("assessment-results")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const reset = () => {
    setAnswers({});
    setShowResults(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Free PAPA Fatherhood Assessment | Papa Life"
        description="Score yourself across Purpose, Authority, Presence, and Alignment. A free five-minute assessment for fathers of adult children."
        keywords="fatherhood assessment, fathers of adult children, PAPA assessment, Purpose Authority Presence Alignment"
      />

      <header className="border-b border-white/10 bg-black/90">
        <div className="container flex min-h-20 items-center justify-between gap-4 py-3">
          <a href="/" aria-label="Papa Life home"><SiteLogo size="md" /></a>
          <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-brand-yellow">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Papa Life
          </a>
        </div>
      </header>

      <main className="container max-w-4xl py-12 md:py-18">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-yellow">
            Free · Interactive · About 5 minutes
          </p>
          <h1 className="mt-4 text-4xl font-extrabold md:text-6xl">PAPA Self-Assessment</h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground md:text-xl">
            Score yourself across all four PAPA pillars and discover where to focus first. No signup is
            required, and your answers stay in your browser.
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild variant="outline" className="rounded-full border-white/20 text-white hover:border-brand-yellow hover:text-brand-yellow">
              <a href="/ai-coach">
                Open the saved AI assessment
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>

        {!showResults ? (
          <div className="mt-12 space-y-8">
            <div className="rounded-xl border border-brand-yellow/20 bg-brand-yellow/5 p-5 text-center">
              <p className="font-semibold text-white">
                Rate each statement from 1 (rarely true) to 5 (consistently true).
              </p>
              <p className="mt-2 text-sm text-white/60">Be honest. This is for clarity, not judgment.</p>
            </div>

            {(["Purpose", "Authority", "Presence", "Alignment"] as Pillar[]).map((pillar) => (
              <section key={pillar} aria-labelledby={`${pillar.toLowerCase()}-heading`}>
                <div className="mb-4 flex items-baseline gap-3">
                  <span className="text-3xl font-black text-brand-yellow">{pillar[0]}</span>
                  <h2 id={`${pillar.toLowerCase()}-heading`} className="text-2xl font-bold">{pillar}</h2>
                </div>
                <div className="space-y-4">
                  {questions
                    .filter((question) => question.pillar === pillar)
                    .map((question, index) => (
                      <Card key={question.id} className="border-white/10 bg-card/80">
                        <CardContent className="p-5 md:p-6">
                          <fieldset>
                            <legend className="text-base font-semibold leading-relaxed text-white md:text-lg">
                              {questions.indexOf(question) + 1}. {question.text}
                            </legend>
                            <div className="mt-5 grid grid-cols-5 gap-2" aria-label={`Rating for question ${index + 1}`}>
                              {[1, 2, 3, 4, 5].map((rating) => {
                                const selected = answers[question.id] === rating;
                                return (
                                  <label
                                    key={rating}
                                    className={`flex min-h-12 cursor-pointer items-center justify-center rounded-lg border text-base font-bold transition-colors ${
                                      selected
                                        ? "border-primary bg-primary text-black"
                                        : "border-white/15 bg-black/35 text-white hover:border-brand-yellow/60"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={question.id}
                                      value={rating}
                                      checked={selected}
                                      onChange={() => setAnswers((current) => ({ ...current, [question.id]: rating }))}
                                      className="sr-only"
                                    />
                                    {rating}
                                  </label>
                                );
                              })}
                            </div>
                            <div className="mt-2 flex justify-between text-xs text-white/45">
                              <span>Rarely true</span>
                              <span>Consistently true</span>
                            </div>
                          </fieldset>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </section>
            ))}

            <div className="sticky bottom-4 z-20 rounded-2xl border border-white/10 bg-black/90 p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <p className="text-sm font-semibold text-white/70">
                  {answeredCount} of {questions.length} answered
                </p>
                <Button
                  type="button"
                  size="lg"
                  disabled={answeredCount !== questions.length}
                  onClick={handleResults}
                  className="w-full rounded-full bg-primary font-extrabold text-black hover:bg-primary/90 sm:w-auto"
                >
                  Get My Results
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <section id="assessment-results" className="mx-auto mt-12 max-w-3xl scroll-mt-8">
            <Card className="overflow-hidden border-primary/30 bg-card/90">
              <CardContent className="p-7 md:p-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                </div>
                <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-brand-yellow">
                  Your starting point
                </p>
                <h1 className="mt-3 text-3xl font-extrabold md:text-5xl">
                  Focus first on {focusPillar}.
                </h1>
                <p className="mt-5 text-lg leading-relaxed text-white/70">
                  {pillarGuidance[focusPillar]} This is not a verdict on you or your relationship. It is a
                  practical place to begin changing how you show up.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {(Object.entries(scores) as [Pillar, number][]).map(([pillar, score]) => (
                    <div
                      key={pillar}
                      className={`rounded-xl border p-4 ${
                        pillar === focusPillar ? "border-brand-yellow/50 bg-brand-yellow/5" : "border-white/10 bg-black/25"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-bold">{pillar}</span>
                        <span className="text-lg font-black text-brand-yellow">{score}/15</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                  <Button asChild size="lg" className="rounded-full bg-primary font-extrabold text-black hover:bg-primary/90">
                    <a href="/papa-first-lesson">
                      Start the Free Workshop
                      <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                    </a>
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/20 text-white"
                    onClick={reset}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                    Retake Assessment
                  </Button>
                </div>
              </CardContent>
            </Card>

            <p className="mt-6 text-center text-sm leading-relaxed text-white/50">
              Papa Life offers guidance and practical tools. It does not guarantee reconciliation or
              replace professional mental-health or family counseling.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  HeartHandshake,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";

const marleeAssessmentLink = "https://getmarlee.com/app/invite/link/683d41b3ac650107f5a49f3de7866dc4";

const insightPatterns = [
  "decision-making",
  "communication style",
  "responsibility",
  "leadership motivation",
  "teamwork",
  "change",
  "personal growth",
];

const supportAreas = [
  {
    title: "Coaching Conversations",
    copy: "Bring clearer language into the work Brian Keith Hill does with fathers, leaders, and participants.",
    Icon: MessageCircle,
  },
  {
    title: "Relationship Growth",
    copy: "Notice how motivation, communication, and decision patterns may shape trust and connection.",
    Icon: HeartHandshake,
  },
  {
    title: "Leadership Development",
    copy: "Use greater self-awareness to lead with humility, responsibility, and stronger teamwork.",
    Icon: Users,
  },
];

export default function MarleeAssessment() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Marlee Motivation Assessment | Papa Life"
        description="Join Brian Keith Hill's Papa Life Marlee workspace and complete a motivational assessment for self-awareness, communication, leadership, and relationship growth."
        keywords="Marlee Motivation Assessment, Papa Life, Brian Keith Hill, motivational assessment, leadership, communication, relationships"
      />

      <header className="border-b border-white/10 bg-black/90">
        <div className="container flex min-h-20 items-center justify-between gap-4 py-3">
          <a href="/" aria-label="Papa Life home">
            <SiteLogo size="md" />
          </a>
          <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-brand-yellow">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Papa Life
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-white/10 py-16 md:py-24">
          <div className="absolute inset-0 papa-hero-radial opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black to-black" />
          <div className="container relative z-10">
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand-yellow">
                  Papa Life Growth System
                </p>
                <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight md:text-6xl">
                  Marlee Motivation Assessment
                </h1>
                <p className="mt-6 text-lg leading-relaxed text-white/75 md:text-xl">
                  Brian Keith Hill and Papa Life are using Marlee as a motivational insight tool to help
                  people better understand themselves and others.
                </p>
                <p className="mt-5 text-lg leading-relaxed text-white/70">
                  When you join through this invitation, you can complete your motivational assessment
                  and choose to share your results with Brian Keith Hill. This can help support coaching
                  conversations, leadership development, relationship growth, and father-adult child
                  understanding.
                </p>
                <div className="mt-8">
                  <Button
                    asChild
                    size="lg"
                    className="h-auto min-h-14 rounded-full bg-primary px-7 py-4 text-base font-extrabold text-black shadow-[0_0_24px_rgba(34,197,94,0.25)] hover:bg-primary/90"
                  >
                    <a href={marleeAssessmentLink}>
                      Join Brian Keith Hill on Marlee
                      <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                    </a>
                  </Button>
                </div>
              </div>

              <Card className="overflow-hidden border-brand-yellow/30 bg-black/65 shadow-2xl">
                <CardContent className="p-7 md:p-9">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-brand-yellow/30 bg-brand-yellow/10 text-brand-yellow">
                    <Brain className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Understand What Motivates You</h2>
                  <p className="mt-4 leading-relaxed text-white/70">
                    This assessment is not about labeling people. It is about creating greater
                    self-awareness, stronger communication, and healthier relationships.
                  </p>
                  <div className="mt-7 rounded-xl border border-primary/25 bg-primary/10 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <p className="text-sm leading-relaxed text-white/75">
                        Papa Life remains the main brand. Marlee is used as a supportive tool inside
                        the Papa Life Growth System.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.22em] text-primary">
                Motivational insight
              </p>
              <h2 className="text-3xl font-bold md:text-5xl">What Marlee May Help Identify</h2>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {insightPatterns.map((pattern) => (
                <div key={pattern} className="flex items-center gap-3 rounded-xl border border-white/10 bg-card/75 p-4">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-yellow" aria-hidden="true" />
                  <span className="font-semibold capitalize text-white/85">{pattern}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.025] py-16 md:py-20">
          <div className="container">
            <div className="grid gap-6 lg:grid-cols-3">
              {supportAreas.map(({ title, copy, Icon }) => (
                <Card key={title} className="border-white/10 bg-card/80">
                  <CardContent className="p-7">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/40 text-primary">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-2xl font-bold">{title}</h3>
                    <p className="mt-4 leading-relaxed text-muted-foreground">{copy}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="container">
            <div className="mx-auto max-w-4xl rounded-2xl border border-brand-yellow/30 bg-brand-yellow/10 p-6 md:p-9">
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/50 text-brand-yellow">
                  <LockKeyhole className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand-yellow">Privacy note</p>
                  <p className="mt-3 text-lg leading-relaxed text-white/75">
                    Participants&apos; coaching conversations, private boards, and Ask Marlee responses
                    are not visible unless they choose to share them.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Button
                asChild
                size="lg"
                className="h-auto min-h-14 rounded-full bg-primary px-7 py-4 text-base font-extrabold text-black hover:bg-primary/90"
              >
                <a href={marleeAssessmentLink}>
                  Join Brian Keith Hill on Marlee
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

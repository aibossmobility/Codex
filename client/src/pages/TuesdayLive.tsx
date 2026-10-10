import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { ArrowLeft, CalendarDays, ExternalLink, Video } from "lucide-react";

const liveUrl = "https://meet.google.com/ohx-nvaf-stt";

export default function TuesdayLive() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Papa Life Tuesday Trust | Live on Google Meet"
        description="Join Brian Keith Hill for Papa Life Tuesday Trust every Tuesday at 1:00 PM Pacific on Google Meet."
        keywords="Papa Life Tuesday Trust, fathers of adult children, Google Meet, Brian Keith Hill"
      />

      <header className="border-b border-white/10 bg-black/95">
        <div className="container flex min-h-20 items-center justify-between gap-4 py-3">
          <a href="/" aria-label="Papa Life home">
            <SiteLogo size="md" />
          </a>
          <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-brand-yellow">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back Home
          </a>
        </div>
      </header>

      <main className="bg-black">
        <section className="border-b border-white/10 py-14 md:py-20">
          <div className="container max-w-5xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-brand-yellow">Papa Life Tuesday Trust</p>
            <h1 className="mt-4 text-4xl font-extrabold text-white md:text-6xl">One Question. One Conversation. One Next Step.</h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-white/70">
              Join Brian Keith Hill for a live, human conversation for fathers of adult children navigating distance,
              trust, repair, boundaries, and reconnection.
            </p>

            <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 rounded-2xl border border-brand-yellow/25 bg-brand-yellow/8 p-6 text-left sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 h-6 w-6 flex-shrink-0 text-brand-yellow" aria-hidden="true" />
                <div>
                  <p className="font-extrabold text-white">Tuesdays at 1:00 PM Pacific</p>
                  <p className="mt-1 text-sm text-white/60">Live on Google Meet</p>
                </div>
              </div>
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-yellow px-6 font-extrabold text-black transition-opacity hover:opacity-90"
              >
                <Video className="h-5 w-5" aria-hidden="true" />
                Join Google Meet
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container max-w-5xl">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 md:p-8">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-yellow">What to expect</p>
                <h2 className="mt-3 text-3xl font-extrabold text-white">Conversation, not performance.</h2>
                <p className="mt-4 leading-relaxed text-white/70">
                  We begin with one real fatherhood question, connect it to the PAPA Framework, make room for honest
                  conversation, and finish with one practical next step a father can take that week.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 md:p-8">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-yellow">Recordings</p>
                <h2 className="mt-3 text-3xl font-extrabold text-white">A new Google-based archive is coming.</h2>
                <p className="mt-4 leading-relaxed text-white/70">
                  New sessions are being recorded through Google Meet. Recordings will be added to the Papa Life
                  archive after they are verified and prepared for sharing.
                </p>
              </div>
            </div>

            <div className="mt-10 rounded-2xl border border-brand-yellow/25 bg-brand-yellow/8 p-6 md:p-8">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-yellow">For Fathers of Adult Children</p>
              <h2 className="mt-3 text-3xl font-extrabold text-white">You do not have to solve the whole relationship today.</h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/70 md:text-lg">
                Come ready to listen, reflect, and choose one honest next step. Papa Life is about becoming more
                present, trustworthy, purposeful, and aligned over time.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

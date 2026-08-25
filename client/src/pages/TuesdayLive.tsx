import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { ArrowLeft, ExternalLink, PlayCircle } from "lucide-react";

const replayUrl = "https://meetn.com/replay/duxiNy0WzVrUwVxwvnYs6GkmzWToXzN5";

export default function TuesdayLive() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Papa Life Tuesday Live | August 25, 2026 Replay"
        description="Watch the Papa Life Tuesday Live replay for August 25, 2026: Consistency After the Conversation."
        keywords="Papa Life Tuesday Live, fathers of adult children, Consistency After the Conversation, Brian Keith Hill"
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
        <section className="border-b border-white/10 py-12 md:py-16">
          <div className="container max-w-5xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-brand-yellow">Papa Life Tuesday Live Replay</p>
            <h1 className="mt-4 text-4xl font-extrabold text-white md:text-6xl">Consistency After the Conversation</h1>
            <p className="mt-4 text-lg text-white/65">August 25, 2026 • Papa Life Tuesday Live</p>
            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/72">
              The conversation is only the beginning. This session is about what a father does next: staying present,
              keeping his word, rebuilding trust in small deposits, and becoming consistent enough that his adult child
              can experience the change over time.
            </p>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container max-w-5xl">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
              <div className="aspect-video bg-black">
                <iframe
                  src={replayUrl}
                  title="Papa Life Tuesday Live — August 25, 2026"
                  className="h-full w-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="border-t border-white/10 p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-bold text-white">Having trouble with the embedded player?</p>
                    <p className="mt-1 text-sm text-white/55">Open the official replay directly in Meetn.</p>
                  </div>
                  <a
                    href={replayUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-yellow px-6 font-extrabold text-black transition-opacity hover:opacity-90"
                  >
                    <PlayCircle className="h-5 w-5" aria-hidden="true" />
                    Watch Tuesday Replay
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-10 rounded-2xl border border-brand-yellow/25 bg-brand-yellow/8 p-6 md:p-8">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-yellow">For Fathers of Adult Children</p>
              <h2 className="mt-3 text-3xl font-extrabold text-white">The goal is not one perfect conversation.</h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/70 md:text-lg">
                Trust is rebuilt through what happens after the conversation. Stay humble. Stay present. Keep showing up.
                As long as you are both alive, it is not too late to take another faithful step toward reconnection.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

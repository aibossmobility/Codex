import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { Button } from "@/components/ui/button";
import { CalendarCheck, HeartHandshake, MessageCircle, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

const HEYGEN_TWIN_PREVIEW =
  "https://resource2.heygen.ai/avatar/v3/58763d9858c94dacb0d0bee6c258c316/half/2.2/preview_video_target.mp4";

const pillars = [
  ["Presence", "Show up consistently and safely."],
  ["Authority", "Lead wisely without controlling."],
  ["Purpose", "Become the father God is shaping now."],
  ["Alignment", "Live what you say matters."],
] as const;

export default function DigitalTwinDemo() {
  const [videoFailed, setVideoFailed] = useState(false);

  function openTwin() {
    window.dispatchEvent(new Event("papa-ai:open"));
  }

  return (
    <div className="min-h-screen bg-[#17231c] text-white">
      <PageMeta
        title="Meet Brian's Digital Twin | Papa Life"
        description="Meet Brian Keith Hill's Papa Life digital twin — a relationship-aware AI guide for fathers of adult children."
      />

      <header className="border-b border-[#f2c230]/25 bg-black/25">
        <div className="container flex items-center justify-between gap-4 py-4">
          <SiteLogo size="md" />
          <a href="/" className="text-sm font-bold text-white/70 hover:text-[#f2c230]">
            PapaLifeCoach.com
          </a>
        </div>
      </header>

      <main>
        <section className="py-12 md:py-16">
          <div className="container grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f2c230]">
                October 3 presentation experience
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight md:text-6xl">
                Meet Brian's Papa Life Digital Twin
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/78 md:text-xl">
                A relationship-aware AI guide grounded in Brian Keith Hill's approved Papa Life knowledge,
                voice, values, and fatherhood framework. The twin helps fathers think through a next step
                while keeping human relationship at the center.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={openTwin}
                  className="min-h-12 rounded-full bg-[#f2c230] px-6 font-extrabold text-black hover:bg-white"
                >
                  <Mic className="mr-2 h-5 w-5" />
                  Talk with Brian's Twin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={openTwin}
                  className="min-h-12 rounded-full border-white/25 bg-transparent px-6 font-extrabold text-white hover:border-[#f2c230] hover:text-[#f2c230]"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Type Instead
                </Button>
              </div>
              <p className="mt-3 text-sm text-white/55">
                Voice input and spoken replies use the browser, so the live conversation does not require another paid service.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {pillars.map(([name, copy]) => (
                  <div key={name} className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
                    <p className="font-extrabold text-[#f2c230]">{name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/68">{copy}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-[#f2c230]/35 bg-black shadow-2xl">
              <div className="aspect-video bg-black">
                {!videoFailed ? (
                  <video
                    src={HEYGEN_TWIN_PREVIEW}
                    poster="/images/brian-keith-hill.png"
                    className="h-full w-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                    onError={() => setVideoFailed(true)}
                  />
                ) : (
                  <img
                    src="/images/brian-keith-hill.png"
                    alt="Brian Keith Hill"
                    className="h-full w-full object-cover object-top"
                  />
                )}
              </div>
              <div className="border-t border-white/10 p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#f2c230]" />
                  <p className="font-extrabold">Brian Keith Hill — Papa Life Digital Twin</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/62">
                  The visual twin is generated from Brian's approved HeyGen digital twin. Conversation is
                  grounded in Papa Life's approved runtime instructions and knowledge base.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-black/25 py-12">
          <div className="container">
            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <HeartHandshake className="h-7 w-7 text-[#f2c230]" />
                <h2 className="mt-4 text-xl font-extrabold">Fatherhood Check-In</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  The twin can guide a father toward the 2-Minute Fatherhood Check-In when clarity is the right next step.
                </p>
                <a href="/assessment" className="mt-4 inline-block font-bold text-[#f2c230] hover:text-white">
                  Start the Check-In
                </a>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <CalendarCheck className="h-7 w-7 text-[#f2c230]" />
                <h2 className="mt-4 text-xl font-extrabold">Human Connection</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  When the conversation needs Brian personally, the twin routes back to the human relationship instead of pretending to replace it.
                </p>
                <a href="/booking" className="mt-4 inline-block font-bold text-[#f2c230] hover:text-white">
                  Talk with Brian
                </a>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <ShieldCheck className="h-7 w-7 text-[#f2c230]" />
                <h2 className="mt-4 text-xl font-extrabold">Built With Boundaries</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  The twin does not invent memories, expose private information, or claim Brian personally saw a conversation he has not seen.
                </p>
              </div>
            </div>

            <div className="mt-10 rounded-2xl border border-[#f2c230]/25 bg-[#f2c230]/[0.06] p-6 text-center">
              <p className="text-2xl font-extrabold text-[#f2c230]">
                "As long as you're both alive, it's never too late."
              </p>
              <p className="mt-2 text-sm text-white/60">Papa Life — Brian Keith Hill</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

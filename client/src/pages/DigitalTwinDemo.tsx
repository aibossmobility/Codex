import { HouseTrail } from "./PapaHouse";
import { BrianLiveAvatar } from "@/components/BrianLiveAvatar";
import { DigitalBrianGuide } from "@/components/DigitalBrianGuide";
import { useState } from "react";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { CalendarCheck, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";

const pillarColors = ["#f2c230", "#16853b", "#c62828", "#f2c230"] as const;

const pillars = [
  ["Presence", "Show up consistently and safely."],
  ["Authority", "Lead wisely without controlling."],
  ["Purpose", "Become the father God is shaping now."],
  ["Alignment", "Live what you say matters."],
] as const;

export default function DigitalTwinDemo() {
  const [voiceOpen, setVoiceOpen] = useState(false);
  return (
    <div className="papa-house-digital min-h-screen bg-[#2b211b] text-white">
      <PageMeta
        title="Meet Brian's Digital Twin | Papa Life"
        description="Explore free guided fatherhood help or choose an optional ElevenLabs voice conversation."
      />

      <header className="border-b border-[#f2c230]/35 bg-black">
        <div className="container flex items-center justify-between gap-4 py-4">
          <SiteLogo size="md" />
          <a href="/" className="text-sm font-bold text-white/70 hover:text-[#f2c230]">
            PapaLifeCoach.com
          </a>
        </div>
      </header>
      <div className="grid h-2 grid-cols-3" aria-hidden="true">
        <div className="bg-[#f2c230]" />
        <div className="bg-[#c62828]" />
        <div className="bg-[#16853b]" />
      </div>

      <HouseTrail current="The AI Guide" />

      <main>
        <section className="py-8 md:py-10 lg:py-14">
          <div className="container grid items-start gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(340px,.95fr)] lg:gap-10">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f2c230]">
                Meet Brian Keith Hill
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl">
                Meet Brian Keith Hill
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/78 md:text-xl">
                Choose a free starting point below. Live voice is optional and may use ElevenLabs credits; the recorded introduction does not start a voice session.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {pillars.map(([name, copy], index) => (
                  <div
                    key={name}
                    className="rounded-xl border bg-white/[0.04] p-4"
                    style={{ borderColor: pillarColors[index] }}
                  >
                    <p className="font-extrabold" style={{ color: pillarColors[index] }}>{name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/68">{copy}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-[#f2c230]/20 bg-black/20 p-5">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#f2c230]" />
                  <div>
                    <p className="font-extrabold">A place to begin.</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/65">
                      Read the free guide first. Start live voice only if you choose to use ElevenLabs credits.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:sticky md:top-4">
              <div className="space-y-4">
                <DigitalBrianGuide mode="visitor" />
                {!voiceOpen ? (
                  <div className="rounded-2xl border border-[#f2c230]/30 bg-black/60 p-5">
                    <video controls playsInline preload="metadata" poster="/videos/brian-green-sweater-papa-life-clean.jpg"
                      className="aspect-video w-full rounded-lg bg-black object-cover"
                      aria-label="Recorded Papa Life welcome video from Brian">
                      <source src="/videos/brian-green-sweater-papa-life-clean.mp4" type="video/mp4" />
                    </video>
                    <p className="mt-2 text-xs text-white/50">Recorded introduction — no AI conversation is started.</p>
                    <h2 className="mt-4 text-xl font-bold">Optional conversation in Brian's AI voice</h2>
                    <p className="mt-2 text-sm text-white/70">This uses ElevenLabs and may consume paid credits. You can use the guide above without starting a voice call.</p>
                    <button type="button" className="mt-4 rounded-lg bg-[#f2c230] px-5 py-3 font-bold text-black" onClick={() => setVoiceOpen(true)}>Load optional live voice</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button type="button" className="rounded-lg border border-white/30 px-4 py-2 text-sm font-bold" onClick={() => setVoiceOpen(false)}>Close voice panel</button>
                    <BrianLiveAvatar />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#07100b] py-12">
          <div className="container">
            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <HeartHandshake className="h-7 w-7 text-[#f2c230]" />
                <h2 className="mt-4 text-xl font-extrabold">Fatherhood Check-In</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  Start with a practical next step, without pressure.
                </p>
                <a href="/assessment" className="mt-4 inline-block font-bold text-[#f2c230] hover:text-white">
                  Start the Check-In
                </a>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <CalendarCheck className="h-7 w-7 text-[#16853b]" />
                <h2 className="mt-4 text-xl font-extrabold">Human Connection</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  Explore Papa Life courses and digital coaching resources.
                </p>
                <a href="/courses" className="mt-4 inline-block font-bold text-[#f2c230] hover:text-white">
                  Talk with Brian
                </a>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <ShieldCheck className="h-7 w-7 text-[#c62828]" />
                <h2 className="mt-4 text-xl font-extrabold">Built With Boundaries</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  Papa Life keeps human relationship at the center.
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

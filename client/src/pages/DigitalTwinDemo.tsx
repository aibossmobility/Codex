import { BrianLiveAvatar } from "@/components/BrianLiveAvatar";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { CalendarCheck, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";

const pillars = [
  ["Presence", "Show up consistently and safely."],
  ["Authority", "Lead wisely without controlling."],
  ["Purpose", "Become the father God is shaping now."],
  ["Alignment", "Live what you say matters."],
] as const;

export default function DigitalTwinDemo() {
  return (
    <div className="min-h-screen bg-[#17231c] text-white">
      <PageMeta
        title="Meet Brian's Digital Twin | Papa Life"
        description="Talk with Brian Keith Hill’s Papa Life AI using your microphone."
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
                Ask a question out loud. Brian’s Papa Life AI listens and responds in his voice while his image stays on screen.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {pillars.map(([name, copy]) => (
                  <div key={name} className="rounded-xl border border-white/10 bg-white/[0.05] p-4">
                    <p className="font-extrabold text-[#f2c230]">{name}</p>
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
                      Use the microphone by Brian’s image to start a voice conversation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:sticky md:top-4">
              <BrianLiveAvatar />
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
                  Start with a practical next step, without pressure.
                </p>
                <a href="/assessment" className="mt-4 inline-block font-bold text-[#f2c230] hover:text-white">
                  Start the Check-In
                </a>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <CalendarCheck className="h-7 w-7 text-[#f2c230]" />
                <h2 className="mt-4 text-xl font-extrabold">Human Connection</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  Book a personal conversation with Brian.
                </p>
                <a href="/booking" className="mt-4 inline-block font-bold text-[#f2c230] hover:text-white">
                  Talk with Brian
                </a>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <ShieldCheck className="h-7 w-7 text-[#f2c230]" />
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

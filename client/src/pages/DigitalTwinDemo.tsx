import { createElement, useEffect } from "react";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { CalendarCheck, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";

const AGENT_ID = "agent_7601kt209ptbe0qrd9b3e4gezyv6";
const AGENT_LINK = "https://elevenlabs.io/app/talk-to?agent_id=agent_7601kt209ptbe0qrd9b3e4gezyv6&branch_id=agtbrch_6301kt209qgde8vv2pdev2caj6bd";
const pillarColors = ["#f2c230", "#16853b", "#c62828", "#f2c230"] as const;

const pillars = [
  ["Presence", "Show up consistently and safely."],
  ["Authority", "Lead wisely without controlling."],
  ["Purpose", "Become the father God is shaping now."],
  ["Alignment", "Live what you say matters."],
] as const;

export default function DigitalTwinDemo() {
  useEffect(() => {
    if (document.querySelector("script[data-papa-elevenlabs-widget]")) return;
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    script.async = true;
    script.dataset.papaElevenlabsWidget = "true";
    document.body.appendChild(script);
  }, []);
  return (
    <div className="min-h-screen bg-[#050806] text-white">
      <PageMeta
        title="Meet Brian's Digital Twin | Papa Life"
        description="Talk by voice with Brian Keith Hill's Papa Life AI agent and explore the fatherhood resources."
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

      <main>
        <section className="py-8 md:py-10 lg:py-14">
          <div className="container grid items-start gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(340px,.95fr)] lg:gap-10">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f2c230]">
                Live Papa Life conversation
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl">
                Talk with Brian's Papa Life AI
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/78 md:text-xl">
                See Brian's image, press Start Call, and talk naturally with his ElevenLabs AI agent. Ask about fatherhood, the PAPA framework, or where to find a Papa Life resource.
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
                    <p className="font-extrabold">Your conversation uses Brian's ElevenLabs AI agent.</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/65">
                      The agent responds to your questions by voice. Brian's portrait identifies the guide; it is not a moving video avatar.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:sticky md:top-4">
              <div className="overflow-hidden rounded-3xl border border-[#f2c230]/45 bg-black shadow-2xl">
                <div className="grid h-1.5 grid-cols-3" aria-hidden="true"><div className="bg-[#f2c230]" /><div className="bg-[#c62828]" /><div className="bg-[#16853b]" /></div>
                <img src="/images/brian-green-sweater-live.jpg" alt="Brian Keith Hill" className="aspect-video w-full object-cover object-center" />
                <div className="space-y-4 border-t border-white/10 p-5">
                  <p className="font-extrabold">Speak with Brian's Papa Life AI</p>
                  <p className="text-sm text-white/70">Press Start Call below and allow microphone access when your browser asks.</p>
                  {createElement("elevenlabs-convai", {
                    "agent-id": AGENT_ID,
                    variant: "expanded",
                    "avatar-image-url": "https://papa-life-digital-twin-preview-production.up.railway.app/images/brian-green-sweater-live.jpg",
                    "avatar-orb-color-1": "#f2c230",
                    "avatar-orb-color-2": "#16853b",
                    "start-call-text": "Talk with Brian's AI",
                    "markdown-link-allowed-hosts": "papalifecoach.com papa-life-digital-twin-preview-production.up.railway.app",
                  })}
                  <a href={AGENT_LINK} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-bold text-[#f2c230] underline hover:text-white">
                    Open Brian's AI conversation directly
                  </a>
                </div>
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
                  The conversation can guide a father toward a practical next step without pressure.
                </p>
                <a href="/assessment" className="mt-4 inline-block font-bold text-[#f2c230] hover:text-white">
                  Start the Check-In
                </a>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <CalendarCheck className="h-7 w-7 text-[#16853b]" />
                <h2 className="mt-4 text-xl font-extrabold">Human Connection</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  When a conversation needs Brian personally, the twin routes back to the human relationship.
                </p>
                <a href="/booking" className="mt-4 inline-block font-bold text-[#f2c230] hover:text-white">
                  Talk with Brian
                </a>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <ShieldCheck className="h-7 w-7 text-[#c62828]" />
                <h2 className="mt-4 text-xl font-extrabold">Built With Boundaries</h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  The twin does not invent memories, expose private information, or pretend to replace Brian.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/25 p-6">
              <h2 className="text-xl font-extrabold">Explore Papa Life together</h2>
              <p className="mt-2 text-sm text-white/65">Ask the AI to help you choose a next step, then open the resource that fits. Members sign in for course materials.</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-bold">
                <a href="/my-journey" className="text-[#f2c230] underline">Fatherhood Check-In</a>
                <a href="/papa-framework" className="text-[#f2c230] underline">PAPA Framework</a>
                <a href="/courses" className="text-[#f2c230] underline">Courses and lessons</a>
                <a href="/tuesday-live" className="text-[#f2c230] underline">Tuesday Live</a>
                <a href="/resources" className="text-[#f2c230] underline">Resources</a>
                <a href="/books" className="text-[#f2c230] underline">Books</a>
                <a href="/podcast" className="text-[#f2c230] underline">Audio and podcast</a>
                <a href="/membership" className="text-[#f2c230] underline">Membership</a>
                <a href="/booking" className="text-[#f2c230] underline">Talk with Brian</a>
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

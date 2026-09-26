import { useMemo, useState } from "react";
import { ArrowRight, Bot, CalendarDays, CheckCircle2, CircleDollarSign, Gauge, Lightbulb, MessageCircle, MousePointerClick, RefreshCw, Rocket, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type PathKey = "stop" | "decide" | "go" | "grow" | "followup" | "tech" | "ai" | "productivity" | "talk";

type Path = {
  title: string;
  subtitle: string;
  action: string;
  href: string;
  icon: typeof Rocket;
};

const paths: Record<PathKey, Path> = {
  stop: { title: "Something is stuck", subtitle: "Fix the blocker first. Tell the Digital Twin what stopped working and what you expected to happen.", action: "Ask the Digital Twin", href: "https://papalifecoach.com/ai-coach", icon: RefreshCw },
  decide: { title: "I need a decision", subtitle: "Get the choices simplified, the tradeoffs explained, and a next step you can actually take.", action: "Work through the decision", href: "https://papalifecoach.com/ai-coach", icon: Lightbulb },
  go: { title: "I am ready to move", subtitle: "Turn the goal into the next action, follow-up, booking, or implementation step.", action: "Start the next step", href: "https://papalifecoach.com/ai-coach", icon: Rocket },
  grow: { title: "Grow my business", subtitle: "Find the next practical way to create conversations, traffic, appointments, and revenue.", action: "Build my growth path", href: "https://papalifecoach.com/ai-coach", icon: CircleDollarSign },
  followup: { title: "Follow up with leads", subtitle: "Organize warm leads, unanswered conversations, and the next best follow-up without blasting people.", action: "Plan my follow-up", href: "https://papalifecoach.com/ai-coach", icon: Users },
  tech: { title: "Fix my technology", subtitle: "Describe what is failing. The Digital Twin will help narrow the issue and identify the safest next action.", action: "Troubleshoot with me", href: "https://papalifecoach.com/ai-coach", icon: Gauge },
  ai: { title: "Build an AI assistant", subtitle: "Start with the job you want AI to own, the decisions you want to keep, and the tools it should connect to.", action: "Design my AI operator", href: "https://papalifecoach.com/ai-coach", icon: Bot },
  productivity: { title: "Improve productivity", subtitle: "Turn repeat work into a simpler routine and decide what should be automated, delegated, or removed.", action: "Simplify my workflow", href: "https://papalifecoach.com/ai-coach", icon: Sparkles },
  talk: { title: "Talk with Brian's Digital Twin", subtitle: "Ask a real question. Get a direct response and move toward the next useful action instead of reading another page.", action: "Start the conversation", href: "https://papalifecoach.com/ai-coach", icon: MessageCircle },
};

export default function AiBossPublic() {
  const [selected, setSelected] = useState<PathKey>("talk");
  const current = useMemo(() => paths[selected], [selected]);
  const CurrentIcon = current.icon;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="border-b border-white/10 bg-black/90 px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#111]"><Bot className="h-5 w-5 text-brand-yellow" /></div>
          <div><p className="font-bold leading-tight">AI Boss Mobility</p><p className="text-xs text-gray-500">Point. Click. Ask. Move.</p></div>
          <a className="ml-auto hidden sm:block" href="https://papalifecoach.com/ai-coach"><Button variant="outline" className="border-brand-yellow/40 text-brand-yellow hover:bg-brand-yellow/10">Talk to the Digital Twin</Button></a>
        </div>
      </header>

      <main>
        <section className="border-b border-white/10 px-4 py-10 sm:py-14">
          <div className="mx-auto max-w-6xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-yellow">Start here</p>
            <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">What do you need help with today?</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-gray-400 sm:text-lg">Skip the long reading. Pick a light, choose a need, and let the Digital Twin help you move.</p>

            <div className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-3">
              <TrafficButton tone="red" label="RED LIGHT" title="Something is wrong" active={selected === "stop"} onClick={() => setSelected("stop")} />
              <TrafficButton tone="yellow" label="YELLOW LIGHT" title="I need help deciding" active={selected === "decide"} onClick={() => setSelected("decide")} />
              <TrafficButton tone="green" label="GREEN LIGHT" title="I'm ready to move" active={selected === "go"} onClick={() => setSelected("go")} />
            </div>
          </div>
        </section>

        <section className="px-4 py-8">
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <div>
              <div className="mb-4 flex items-center gap-2"><MousePointerClick className="h-5 w-5 text-brand-yellow" /><h2 className="text-xl font-bold">Choose what you want to do</h2></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <NeedCard icon={CircleDollarSign} title="Grow my business" selected={selected === "grow"} onClick={() => setSelected("grow")} />
                <NeedCard icon={Users} title="Follow up with leads" selected={selected === "followup"} onClick={() => setSelected("followup")} />
                <NeedCard icon={Gauge} title="Fix my technology" selected={selected === "tech"} onClick={() => setSelected("tech")} />
                <NeedCard icon={Bot} title="Build an AI assistant" selected={selected === "ai"} onClick={() => setSelected("ai")} />
                <NeedCard icon={Sparkles} title="Improve productivity" selected={selected === "productivity"} onClick={() => setSelected("productivity")} />
                <NeedCard icon={MessageCircle} title="Talk to the Digital Twin" selected={selected === "talk"} onClick={() => setSelected("talk")} />
              </div>
            </div>

            <aside className="rounded-2xl border border-brand-yellow/30 bg-[#101010] p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-yellow/10"><CurrentIcon className="h-6 w-6 text-brand-yellow" /></div>
                <div><p className="text-xs font-bold uppercase tracking-widest text-brand-yellow">Your next move</p><h2 className="mt-1 text-2xl font-black">{current.title}</h2></div>
              </div>
              <p className="mt-4 text-gray-400">{current.subtitle}</p>
              <div className="mt-5 space-y-2 text-sm text-gray-300">
                <Step text="Tell the Digital Twin what is happening." />
                <Step text="Get one clear recommendation instead of another wall of text." />
                <Step text="Take the next action, book, follow up, or keep working the problem." />
              </div>
              <a href={current.href}><Button className="mt-6 w-full bg-brand-yellow text-black hover:bg-brand-yellow/90">{current.action}<ArrowRight className="ml-2 h-4 w-4" /></Button></a>
              <p className="mt-3 text-center text-xs text-gray-600">Routine questions can move forward here. Financial commitments and major decisions stay with Brian.</p>
            </aside>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#0b0b0b] px-4 py-8">
          <div className="mx-auto max-w-6xl">
            <p className="text-center text-xs font-bold uppercase tracking-[0.22em] text-gray-500">One system • less friction</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniCard icon={MessageCircle} title="Ask" text="Get a direct answer from the Digital Twin." />
              <MiniCard icon={CalendarDays} title="Act" text="Move toward a booking, follow-up, or implementation step." />
              <MiniCard icon={CheckCircle2} title="Continue" text="Keep working the same goal instead of starting over." />
            </div>
          </div>
        </section>

        <section className="px-4 py-10 text-center">
          <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#111] p-6">
            <Bot className="mx-auto h-8 w-8 text-brand-yellow" />
            <h2 className="mt-3 text-2xl font-black">Don't just browse. Use the system.</h2>
            <p className="mt-2 text-gray-400">Ask the question you came with and let the Digital Twin help you find the next useful move.</p>
            <a href="https://papalifecoach.com/ai-coach"><Button className="mt-5 bg-brand-red text-white hover:bg-brand-red/90">Talk to Brian's Digital Twin<ArrowRight className="ml-2 h-4 w-4" /></Button></a>
          </div>
        </section>
      </main>
    </div>
  );
}

function TrafficButton({ tone, label, title, active, onClick }: { tone: "red" | "yellow" | "green"; label: string; title: string; active: boolean; onClick: () => void }) {
  const toneClass = tone === "red" ? "bg-red-600 shadow-red-600/30" : tone === "yellow" ? "bg-yellow-400 shadow-yellow-400/30" : "bg-green-600 shadow-green-600/30";
  return <button onClick={onClick} className={`rounded-2xl border p-5 text-left transition ${active ? "border-white/40 bg-white/10" : "border-white/10 bg-[#101010] hover:border-white/25"}`}><span className={`mb-4 block h-12 w-12 rounded-full ${toneClass} shadow-lg`} /><p className="text-xs font-black tracking-widest text-gray-400">{label}</p><p className="mt-1 text-lg font-bold">{title}</p></button>;
}

function NeedCard({ icon: Icon, title, selected, onClick }: { icon: typeof Bot; title: string; selected: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${selected ? "border-brand-yellow/60 bg-brand-yellow/10" : "border-white/10 bg-[#101010] hover:border-white/25 hover:bg-white/[0.04]"}`}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black/40"><Icon className="h-5 w-5 text-brand-yellow" /></div><span className="font-semibold">{title}</span><ArrowRight className="ml-auto h-4 w-4 text-gray-500" /></button>;
}

function Step({ text }: { text: string }) { return <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" /><span>{text}</span></div>; }
function MiniCard({ icon: Icon, title, text }: { icon: typeof Bot; title: string; text: string }) { return <div className="rounded-xl border border-white/10 bg-black/30 p-4"><Icon className="mx-auto h-5 w-5 text-brand-yellow" /><p className="mt-2 font-bold">{title}</p><p className="mt-1 text-sm text-gray-500">{text}</p></div>; }

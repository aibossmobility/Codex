import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const steps = [
  { n: 1, title: "Awareness", short: "See where you are and what needs attention.", action: "Take the 2-Minute Fatherhood Check-In", href: "/assessment", color: "#f6c515" },
  { n: 2, title: "Engage", short: "Start a conversation from the heart.", action: "Prepare My First Conversation", href: "/papa-first-lesson", color: "#e94141" },
  { n: 3, title: "Understand", short: "Listen more. Understand deeper.", action: "Learn to Listen Without Defending", href: "/courses", color: "#59a844" },
  { n: 4, title: "Take Action", short: "Choose the next right step and follow through.", action: "Choose My Next Step", href: "/ai-coach", color: "#f6c515" },
  { n: 5, title: "Reconnection", short: "Build trust, restore relationship, create legacy.", action: "Keep Building the Relationship", href: "/tuesday", color: "#2f7d32" },
] as const;

const STORAGE_KEY = "papa-life-wheel-step";
export default function TakeTheWheel() {
  const [current, setCurrent] = useState(1);
  const [turning, setTurning] = useState(false);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(STORAGE_KEY) || "1");
    if (saved >= 1 && saved <= 5) setCurrent(saved);
  }, []);

  const active = useMemo(() => steps[current - 1], [current]);

  function turnTo(step: number) {
    if (step > current + 1) return;
    setTurning(true);
    window.setTimeout(() => {
      setCurrent(step);
      window.localStorage.setItem(STORAGE_KEY, String(step));
      setTurning(false);
    }, 420);
  }

  function advance() {
    if (current < 5) turnTo(current + 1);
  }
  return (
    <div className="min-h-screen bg-[#fffdf7] text-[#17231c]">
      <PageMeta
        title="Take the Wheel | Papa Life"
        description="A guided Papa Life journey for fathers of adult children. Turn the wheel, take the next step, and keep moving toward reconnection."
        keywords="Papa Life journey, fathers of adult children, fatherhood check-in, reconnection"
      />

      <header className="border-b border-[#17231c]/10 bg-white/95 backdrop-blur">
        <div className="container flex min-h-20 items-center justify-between gap-4 py-3">
          <a href="/" aria-label="Papa Life home"><SiteLogo size="md" /></a>
          <a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#17231c]/70 hover:text-[#145b35]">
            <ArrowLeft className="h-4 w-4" /> Back to Papa Life
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-[#17231c]/10 bg-[linear-gradient(180deg,#fff8d6_0%,#fffdf7_72%)]">
          <div className="container grid gap-10 py-12 lg:grid-cols-[0.8fr_1.45fr_0.85fr] lg:items-center lg:py-16">
            <div>
              <h1 className="font-heading text-5xl font-black leading-[0.98] md:text-6xl">Life Is a Journey.<br /><span className="text-[#e5ad00]">You’re the Driver.</span></h1>
              <p className="mt-7 text-xl font-semibold leading-relaxed">Turn the wheel.<br />Take action.<br />Build a legacy.<br />Drive in the right direction <span className="text-[#26743a]">toward your children.</span></p>
              <div className="mt-8 rounded-2xl border border-[#e5ad00]/35 bg-white p-5 shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.15em] text-[#e5ad00]">Your mission</p>
                <p className="mt-3 leading-relaxed">Become the father your adult children can respect, trust, and love.</p>
              </div>
            </div>
            <div className="relative mx-auto aspect-square w-full max-w-[620px]">
              <div className={`absolute inset-0 rounded-full border-[28px] border-[#151515] bg-white shadow-2xl transition-transform duration-500 ${turning ? "rotate-[22deg]" : "rotate-0"}`}>
                <div className="absolute inset-[18px] rounded-full border-[8px] border-[#f6c515] bg-[#fffdf7]" />
              </div>

              <div className="absolute inset-[13%] grid grid-cols-2 gap-3 rounded-full p-[8%]">
                {steps.map((step) => {
                  const unlocked = step.n <= current + 1;
                  const selected = step.n === current;
                  return (
                    <button
                      key={step.n}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => turnTo(step.n)}
                      className={`relative rounded-[38%] border-2 p-4 text-left shadow-sm transition-all ${selected ? "scale-[1.04] border-black shadow-lg" : "border-white"} ${!unlocked ? "cursor-not-allowed opacity-45 grayscale" : "hover:-translate-y-1"}`}
                      style={{ backgroundColor: step.color }}
                      aria-label={`Step ${step.n}: ${step.title}`}
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg font-black text-black">{step.n}</span>
                      <span className="mt-2 block text-lg font-black uppercase leading-tight text-black">{step.title}</span>
                      <span className="mt-1 hidden text-xs font-semibold leading-snug text-black/75 sm:block">{step.short}</span>
                      {!unlocked && <LockKeyhole className="absolute right-3 top-3 h-4 w-4 text-black/55" />}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={advance}
                disabled={current === 5}
                className="absolute left-1/2 top-1/2 z-10 flex h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-8 border-[#151515] bg-[#1f1f1f] px-3 text-center text-white shadow-xl disabled:cursor-default"
                aria-label={current === 5 ? "Journey complete" : "Turn the wheel to the next step"}
              >
                <span className="text-lg font-black text-[#f6c515] sm:text-2xl">PAPA LIFE</span>
                <span className="mt-1 hidden text-[10px] font-bold uppercase leading-tight sm:block">Turn the wheel<br />toward your children</span>
              </button>

              <div className="absolute -bottom-5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#e5ad00]/35 bg-white px-5 py-3 text-center shadow-lg">
                <p className="text-sm font-black uppercase tracking-wide">Turn the wheel to continue</p>
                <p className="text-xs text-[#314239]">Complete each step to unlock the next.</p>
              </div>
            </div>

            <aside className="rounded-3xl border border-[#17231c]/10 bg-white p-5 shadow-lg">
              <p className="text-center text-sm font-black uppercase tracking-[0.15em] text-[#26743a]">Your Journey</p>
              <div className="mt-4 space-y-3">
                {steps.map((step) => {
                  const unlocked = step.n <= current + 1;
                  const selected = step.n === current;
                  return (
                    <button key={step.n} type="button" disabled={!unlocked} onClick={() => turnTo(step.n)} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${selected ? "border-[#f6c515] bg-[#fff5b9] shadow-sm" : "border-[#17231c]/10 bg-white"} ${!unlocked ? "opacity-50" : "hover:border-[#26743a]/40"}`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#17231c] font-black text-white">{step.n}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2 font-black uppercase"><span>{step.title}</span>{!unlocked && <LockKeyhole className="h-4 w-4" />}</span>
                        <span className="mt-1 block text-sm leading-snug text-[#314239]">{step.short}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        </section>
        <section className="bg-white py-12">
          <div className="container max-w-5xl">
            <div className="grid gap-6 rounded-3xl border border-[#17231c]/10 bg-[#fff9de] p-6 shadow-sm md:grid-cols-[1fr_auto] md:items-center md:p-8">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#26743a]">Your next turn</p>
                <h2 className="mt-2 text-3xl font-black">Step {active.n}: {active.title}</h2>
                <p className="mt-3 max-w-2xl text-lg leading-relaxed text-[#314239]">{active.short}</p>
              </div>
              <a href={active.href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f6c515] px-6 py-3 font-black text-[#17231c] shadow-sm hover:bg-[#ffdb3b]">
                {active.action}<ArrowRight className="h-5 w-5" />
              </a>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-5">
              {steps.map((step) => (
                <div key={step.n} className={`rounded-2xl border p-4 ${step.n <= current ? "border-[#26743a]/25 bg-[#f5fbf1]" : "border-[#17231c]/10 bg-[#fafafa]"}`}>
                  <div className="flex items-center gap-2">
                    {step.n < current ? <CheckCircle2 className="h-5 w-5 text-[#26743a]" /> : <span className="font-black">{step.n}</span>}
                    <span className="text-sm font-black uppercase">{step.title}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <button type="button" onClick={() => { setCurrent(1); window.localStorage.setItem(STORAGE_KEY, "1"); }} className="inline-flex items-center gap-2 text-sm font-bold text-[#17231c]/55 hover:text-[#b33a32]">
                <RotateCcw className="h-4 w-4" /> Restart my journey
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

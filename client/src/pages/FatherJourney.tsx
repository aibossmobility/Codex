import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, Lock, LogIn, Save } from "lucide-react";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type StepKey = "awareness" | "engage" | "understand" | "take_action" | "reconnection";
type SavedStep = { step_key: StepKey; response: string; status: "in_progress" | "completed" };

const steps: Array<{ key: StepKey; number: number; title: string; short: string; prompt: string; color: string; position: string }> = [
  { key: "awareness", number: 1, title: "Awareness", short: "See where you are and who needs you.", prompt: "What is true about your relationship with your child today—and what do you most hope can change?", color: "#f6c515", position: "left-1/2 top-[13%] -translate-x-1/2" },
  { key: "engage", number: 2, title: "Engage", short: "Reach out and start from the heart.", prompt: "What honest, pressure-free sentence could open the door to connection?", color: "#d51f26", position: "right-[15%] top-[35%]" },
  { key: "understand", number: 3, title: "Understand", short: "Listen more. Understand deeper.", prompt: "What might your child need you to understand before you explain your own position?", color: "#19883b", position: "right-[20%] bottom-[18%]" },
  { key: "take_action", number: 4, title: "Take Action", short: "Choose the next right step.", prompt: "What is one specific, faithful action you will take—and when will you take it?", color: "#f6c515", position: "left-[18%] bottom-[19%]" },
  { key: "reconnection", number: 5, title: "Reconnection", short: "Build trust, restore relationship, create a legacy.", prompt: "What evidence of safety, consistency, or trust will you continue building from here?", color: "#168c3c", position: "left-[14%] top-[34%]" },
];

const localKey = "papa-life-father-journey-v1";
const alignmentKey = "papa-life-pies-foes-v1";
const developmentKey = "papa-life-development-stage-v1";
const fatherSeasonKey = "papa-life-father-season-v1";

const developmentStages = [
  { key: "connection", ages: "0–5", title: "Emotional Connection", focus: "Build safety and bonding through touch, eye contact, affection, play, and dependable presence.", questions: ["Am I emotionally and physically present?", "Does my child experience warmth and safety from me?", "Am I building connection instead of leaving it to someone else?"] },
  { key: "learning", ages: "5–10", title: "Intellectual Development", focus: "Encourage curiosity, education, confidence, and patient learning as your child enters the wider world.", questions: ["Do I show interest in how my child learns?", "Do I encourage questions without embarrassment?", "Am I building confidence instead of only correcting mistakes?"] },
  { key: "guidance", ages: "10–15", title: "Maturing Guidance", focus: "Adjust your fathering as physical, intellectual, emotional, and spiritual needs become more complex.", questions: ["Am I changing my approach as my child matures?", "Can my child talk to me about difficult feelings?", "Do I guide character without controlling every choice?"] },
  { key: "identity", ages: "15–20", title: "Identity & Independence", focus: "Shift from control to communication while your child forms an identity and begins pulling toward independence.", questions: ["Can I listen without immediately correcting?", "Do I ask what my child thinks, sees, and feels?", "Can I allow growing independence without treating it as rejection?"] },
  { key: "adult", ages: "20–25+", title: "Adult-Child Transition", focus: "Move from authority over your child to wisdom, availability, respect, and relationship with your adult son or daughter.", questions: ["Have I changed from director to trusted advisor?", "Do I respect boundaries even when I disagree?", "Am I building character and connection instead of demanding compliance?"] },
] as const;

type DevelopmentStageKey = typeof developmentStages[number]["key"];

const fatherSeasons = [
  { key: "young", ages: "18–25", title: "Young Father", focus: "Build a foundation of presence, emotional steadiness, faith, and dependable love while you are still becoming." },
  { key: "growing", ages: "25–35", title: "Growing Father", focus: "Keep work, money, responsibility, and personal growth from crowding out connection with your child." },
  { key: "mature", ages: "36–50", title: "Mature Father", focus: "Let your leadership mature too—listen more deeply, adjust your approach, and guide without controlling." },
  { key: "legacy", ages: "50–65", title: "Legacy Father", focus: "Look honestly at old patterns, repair what is yours to repair, and build a safer relationship with your adult child." },
  { key: "sage", ages: "65+", title: "Sage Father", focus: "Offer wisdom without pressure, remain teachable, bless the next generation, and let humility shape your legacy." },
] as const;

type FatherSeasonKey = typeof fatherSeasons[number]["key"];

const lifeAreas = [
  { key: "physical", letter: "P", name: "Physical", question: "Do your health, energy, and rest help you stay patient and present with your child?" },
  { key: "intellectual", letter: "I", name: "Intellectual", question: "Are you willing to learn a new way of understanding and relating to your child?" },
  { key: "emotional", letter: "E", name: "Emotional", question: "Can you recognize and manage your emotions without placing them on your child?" },
  { key: "spiritual", letter: "S", name: "Spiritual", question: "Are faith, humility, prayer, and your values shaping how you respond to your child?" },
  { key: "financial", letter: "F", name: "Financial", question: "Does financial pressure affect your availability, patience, or expectations as a father?" },
  { key: "occupational", letter: "O", name: "Occupational", question: "Does work leave room for the attention and emotional presence your relationship needs?" },
  { key: "environmental", letter: "E", name: "Environmental", question: "Does your home environment make honest, peaceful conversation more possible?" },
  { key: "social", letter: "S", name: "Social", question: "Do your relationships and community help you become a safer, wiser father?" },
] as const;

const relationshipPractices = [
  "Listen without defending or correcting",
  "Offer an apology without an explanation",
  "Respect a boundary without withdrawing love",
  "Send one pressure-free message of care",
];

type LifeAreaKey = typeof lifeAreas[number]["key"];

export default function FatherJourney() {
  const [saved, setSaved] = useState<Record<string, SavedStep>>({});
  const [active, setActive] = useState<StepKey>("awareness");
  const [response, setResponse] = useState("");
  const [member, setMember] = useState<{ first_name?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [alignmentOpen, setAlignmentOpen] = useState(false);
  const [alignment, setAlignment] = useState<Partial<Record<LifeAreaKey, number>>>({});
  const [developmentStage, setDevelopmentStage] = useState<DevelopmentStageKey | null>(null);
  const [developmentAnswers, setDevelopmentAnswers] = useState<Record<string, number>>({});
  const [fatherSeason, setFatherSeason] = useState<FatherSeasonKey | null>(null);

  useEffect(() => {
    const local = JSON.parse(localStorage.getItem(localKey) || "{}");
    setSaved(local);
    setAlignment(JSON.parse(localStorage.getItem(alignmentKey) || "{}"));
    const development = JSON.parse(localStorage.getItem(developmentKey) || "{}");
    setDevelopmentStage(development.stage || null);
    setDevelopmentAnswers(development.answers || {});
    setFatherSeason((localStorage.getItem(fatherSeasonKey) as FatherSeasonKey | null) || null);
    fetch("/api/member/auth/me", { credentials: "include" }).then(async (res) => {
      if (!res.ok) return;
      const auth = await res.json();
      setMember(auth.user || auth);
      const journeyRes = await fetch("/api/member/journey", { credentials: "include" });
      if (!journeyRes.ok) return;
      const data = await journeyRes.json();
      const remote = Object.fromEntries((data.steps || []).map((step: SavedStep) => [step.step_key, step]));
      setSaved((current) => ({ ...current, ...remote }));
    }).catch(() => undefined);
  }, []);

  useEffect(() => setResponse(saved[active]?.response || ""), [active, saved]);

  const completedCount = steps.filter((step) => saved[step.key]?.status === "completed").length;
  const nextIndex = Math.min(completedCount, steps.length - 1);
  const activeStep = steps.find((step) => step.key === active)!;
  const isUnlocked = (index: number) => index <= completedCount;

  const persist = async (status: "in_progress" | "completed") => {
    const entry: SavedStep = { step_key: active, response: response.trim(), status };
    const next = { ...saved, [active]: entry };
    setSaved(next);
    localStorage.setItem(localKey, JSON.stringify(next));
    if (member) {
      await fetch(`/api/member/journey/${active}`, {
        method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: entry.response, status }),
      });
    }
    if (status === "completed") {
      const index = steps.findIndex((step) => step.key === active);
      if (index < steps.length - 1) setActive(steps[index + 1].key);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!response.trim()) return;
    setSaving(true);
    try { await persist("completed"); } finally { setSaving(false); }
  };

  const progress = useMemo(() => Math.round((completedCount / steps.length) * 100), [completedCount]);
  const scoredAreas = lifeAreas.filter((area) => alignment[area.key]);
  const lowestArea = scoredAreas.length ? [...scoredAreas].sort((a, b) => (alignment[a.key] || 0) - (alignment[b.key] || 0))[0] : null;

  const scoreArea = (key: LifeAreaKey, score: number) => {
    const next = { ...alignment, [key]: score };
    setAlignment(next);
    localStorage.setItem(alignmentKey, JSON.stringify(next));
  };

  const addAlignmentToReflection = () => {
    if (scoredAreas.length !== lifeAreas.length) return;
    const scores = lifeAreas.map((area) => `${area.name}: ${alignment[area.key]}/5`).join("; ");
    const insight = lowestArea ? `My area needing the most attention is ${lowestArea.name}.` : "";
    setResponse((current) => `${current.trim()}${current.trim() ? "\n\n" : ""}Whole-Life Check-In — ${scores}. ${insight}`);
  };

  const selectedDevelopment = developmentStages.find((stage) => stage.key === developmentStage);
  const selectedFatherSeason = fatherSeasons.find((season) => season.key === fatherSeason);
  const answerDevelopment = (questionIndex: number, value: number) => {
    if (!developmentStage) return;
    const next = { ...developmentAnswers, [`${developmentStage}-${questionIndex}`]: value };
    setDevelopmentAnswers(next);
    localStorage.setItem(developmentKey, JSON.stringify({ stage: developmentStage, answers: next }));
  };

  const selectDevelopmentStage = (stage: DevelopmentStageKey) => {
    setDevelopmentStage(stage);
    localStorage.setItem(developmentKey, JSON.stringify({ stage, answers: developmentAnswers }));
  };

  const addDevelopmentToReflection = () => {
    if (!selectedDevelopment) return;
    const values = selectedDevelopment.questions.map((_, index) => developmentAnswers[`${selectedDevelopment.key}-${index}`]);
    if (values.some((value) => !value)) return;
    const labels = ["Not yet", "Sometimes", "Consistently"];
    const answers = selectedDevelopment.questions.map((question, index) => `${question} ${labels[values[index] - 1]}.`).join(" ");
    setResponse((current) => `${current.trim()}${current.trim() ? "\n\n" : ""}My fatherhood development stage — Ages ${selectedDevelopment.ages}: ${selectedDevelopment.title}. ${answers}`);
  };

  const selectFatherSeason = (season: FatherSeasonKey) => {
    setFatherSeason(season);
    localStorage.setItem(fatherSeasonKey, season);
  };

  const addFatherSeasonToReflection = () => {
    if (!selectedFatherSeason) return;
    setResponse((current) => `${current.trim()}${current.trim() ? "\n\n" : ""}My season as a father — ${selectedFatherSeason.title}, age ${selectedFatherSeason.ages}. My relationship focus: ${selectedFatherSeason.focus}`);
  };

  const addRelationshipPractice = (practice: string) => {
    setResponse((current) => `${current.trim()}${current.trim() ? "\n\n" : ""}My relationship practice this week: ${practice}. I will pay attention to how my child experiences me, not only to what I intended.`);
  };

  return (
    <div className="min-h-screen bg-[#fff9e9] text-[#17231c]">
      <PageMeta title="My Fatherhood Journey | Papa Life" description="A private, guided relationship journey for fathers with children at every age and stage." />
      <header className="border-b border-[#e6c75d] bg-[#f6c62f]">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <a href="/"><SiteLogo size="md" /></a>
          <div className="flex items-center gap-3">
            {member ? <span className="hidden text-sm font-bold sm:block">Welcome, {member.first_name || "Dad"}</span> : <a href="/member-login?return=/my-journey" className="inline-flex items-center gap-2 text-sm font-bold"><LogIn className="h-4 w-4" /> Sign in to save</a>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <section>
            <div className="mb-6 max-w-xl">
              <h1 className="text-4xl font-black uppercase leading-none md:text-6xl">Life is a journey.<br/><span className="text-[#d51f26]">You're the driver.</span></h1>
              <p className="mt-4 text-lg">Turn the wheel. Do the heart work. Take the next faithful step toward your child—at any age or stage.</p>
              <p className="mt-3 text-sm font-bold text-[#168c3c]">For young fathers, growing fathers, mature fathers, legacy fathers, and sage fathers.</p>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-[720px]">
              <img src="/images/papa-life-journey-wheel.webp" alt="Papa Life five-destination fatherhood journey steering wheel" className="h-full w-full object-contain" />
              {steps.map((step, index) => {
                const unlocked = isUnlocked(index);
                const complete = saved[step.key]?.status === "completed";
                return <button key={step.key} disabled={!unlocked} onClick={() => setActive(step.key)} className={`absolute ${step.position} z-10 flex h-20 w-24 flex-col items-center justify-center rounded-2xl border-2 border-black/20 px-2 text-center shadow-lg transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/80 disabled:cursor-not-allowed disabled:grayscale ${active === step.key ? "scale-105 ring-4 ring-white" : ""}`} style={{ backgroundColor: step.color, color: step.key === "engage" || step.key === "understand" || step.key === "reconnection" ? "white" : "#111" }}>
                  <span className="text-xl font-black">{complete ? <Check className="inline h-5 w-5" /> : unlocked ? step.number : <Lock className="inline h-4 w-4" />}</span>
                  <span className="text-[11px] font-black uppercase leading-tight">{step.title}</span>
                </button>;
              })}
              <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-center text-lg font-black text-[#f6c515]">PAPA<br/>LIFE</div>
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-[#e4c669] bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between"><h2 className="text-xl font-black uppercase">Your Journey</h2><span className="text-sm font-black text-[#168c3c]">{completedCount} of {steps.length}</span></div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#efe8d4]"><div className="h-full bg-[#168c3c] transition-all" style={{ width: `${progress}%` }} /></div>
              <p className="mt-2 text-xs text-[#5b655e]">This measures reflection completed—not your worth as a father.</p>
              <ol className="mt-5 space-y-2">
                {steps.map((step, index) => <li key={step.key}><button disabled={!isUnlocked(index)} onClick={() => setActive(step.key)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${active === step.key ? "border-[#f6c515] bg-[#fff8d7]" : "border-[#eadfbd] bg-white"} disabled:opacity-50`}><span className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-black" style={{ backgroundColor: step.color }}>{saved[step.key]?.status === "completed" ? <Check className="h-4 w-4" /> : index + 1}</span><span><strong className="block uppercase">{step.title}</strong><small>{step.short}</small></span></button></li>)}
              </ol>
            </div>
          </aside>
        </div>

        <section className="mx-auto mt-8 max-w-4xl rounded-3xl border border-[#e1c15d] bg-white p-6 shadow-xl md:p-9">
          <p className="text-sm font-black uppercase tracking-widest" style={{ color: activeStep.color }}>Destination {activeStep.number}</p>
          <h2 className="mt-2 text-3xl font-black">{activeStep.title}</h2>
          <p className="mt-3 text-lg">{activeStep.prompt}</p>
          {active === "awareness" && <div className="mt-6 rounded-2xl border border-[#17231c] bg-[#17231c] p-5 text-white">
            <p className="text-xs font-black uppercase tracking-widest text-[#f6c515]">Start with your child’s season</p>
            <h3 className="mt-1 text-2xl font-black">Find Your Fatherhood Development Stage</h3>
            <p className="mt-2 text-sm text-white/75">Choose the age range that best fits the child you are thinking about today.</p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {developmentStages.map((stage) => <button type="button" key={stage.key} onClick={() => selectDevelopmentStage(stage.key)} className={`rounded-xl border p-3 text-left transition ${developmentStage === stage.key ? "border-[#f6c515] bg-[#f6c515] text-black" : "border-white/20 bg-white/5 hover:bg-white/10"}`}><strong className="block text-lg">{stage.ages}</strong><span className="text-xs font-bold leading-tight">{stage.title}</span></button>)}
            </div>
            {selectedDevelopment && <div className="mt-5 rounded-xl bg-white p-5 text-[#17231c]">
              <p className="font-black">Your focus now: {selectedDevelopment.title}</p>
              <p className="mt-1 text-sm text-[#5b655e]">{selectedDevelopment.focus}</p>
              <div className="mt-5 space-y-4">
                {selectedDevelopment.questions.map((question, index) => <div key={question} className="border-t border-[#eadfbd] pt-4 first:border-0 first:pt-0"><p className="font-bold">{question}</p><div className="mt-2 grid grid-cols-3 gap-2">{["Not yet", "Sometimes", "Consistently"].map((label, optionIndex) => <button type="button" key={label} onClick={() => answerDevelopment(index, optionIndex + 1)} className={`rounded-lg border px-2 py-2 text-xs font-black ${developmentAnswers[`${selectedDevelopment.key}-${index}`] === optionIndex + 1 ? "border-[#17231c] bg-[#f6c515]" : "border-[#d8c98f] bg-white hover:bg-[#fff4c2]"}`}>{label}</button>)}</div></div>)}
              </div>
              <Button type="button" disabled={selectedDevelopment.questions.some((_, index) => !developmentAnswers[`${selectedDevelopment.key}-${index}`])} onClick={addDevelopmentToReflection} className="mt-5 bg-[#d51f26] font-black text-white hover:bg-[#b71920]">Add my stage answers to my journey</Button>
            </div>}
            <div className="mt-5 border-t border-white/20 pt-5">
              <h3 className="text-xl font-black">Where are you in your own season of fatherhood?</h3>
              <p className="mt-1 text-sm text-white/70">Your age does not define your worth. It helps Papa Life offer guidance that fits the responsibilities and relationships of your present season.</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {fatherSeasons.map((season) => <button type="button" key={season.key} onClick={() => selectFatherSeason(season.key)} className={`rounded-xl border p-3 text-left transition ${fatherSeason === season.key ? "border-[#f6c515] bg-[#f6c515] text-black" : "border-white/20 bg-white/5 hover:bg-white/10"}`}><strong className="block text-sm">{season.title}</strong><span className="text-xs">{season.ages}</span></button>)}
              </div>
              {selectedFatherSeason && <div className="mt-4 rounded-xl bg-white p-4 text-[#17231c]"><p><strong>Your relationship focus:</strong> {selectedFatherSeason.focus}</p><Button type="button" onClick={addFatherSeasonToReflection} className="mt-3 bg-[#168c3c] font-black text-white hover:bg-[#117230]">Add my season to my journey</Button></div>}
            </div>
          </div>}
          {active === "awareness" && <div className="mt-6 overflow-hidden rounded-2xl border border-[#e1c15d] bg-[#fffaf0]">
            <button type="button" onClick={() => setAlignmentOpen((open) => !open)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
              <span><strong className="block text-lg">Whole-Life Check-In: PIES + FOES</strong><span className="text-sm text-[#5b655e]">See what may be strengthening—or straining—your fatherhood right now.</span></span>
              <ChevronDown className={`h-5 w-5 shrink-0 transition ${alignmentOpen ? "rotate-180" : ""}`} />
            </button>
            {alignmentOpen && <div className="border-t border-[#eadca9] p-5">
              <p className="mb-5 text-sm">Rate each part of your life from 1 (needs attention) to 5 (well supported). This is a mirror, not a grade.</p>
              <div className="grid gap-4 md:grid-cols-2">
                {lifeAreas.map((area, areaIndex) => <div key={area.key} className="rounded-xl border border-[#eadfbd] bg-white p-4">
                  <div className="flex items-start gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-black text-white ${areaIndex < 4 ? "bg-[#d6a800]" : "bg-[#168c3c]"}`}>{area.letter}</span><span><strong>{area.name}</strong><small className="mt-1 block leading-snug text-[#5b655e]">{area.question}</small></span></div>
                  <div className="mt-3 flex gap-2" aria-label={`${area.name} score`}>
                    {[1,2,3,4,5].map((score) => <button type="button" key={score} onClick={() => scoreArea(area.key, score)} aria-label={`${area.name}: ${score} out of 5`} className={`h-9 flex-1 rounded-lg border text-sm font-black ${alignment[area.key] === score ? "border-[#17231c] bg-[#f6c515]" : "border-[#d8c98f] bg-white hover:bg-[#fff4c2]"}`}>{score}</button>)}
                  </div>
                </div>)}
              </div>
              <div className="mt-5 rounded-xl bg-[#17231c] p-4 text-white">
                {scoredAreas.length === lifeAreas.length && lowestArea ? <p><strong>Your starting point:</strong> {lowestArea.name} is asking for attention. Choose one small adjustment that could make you steadier and more present as a father.</p> : <p>{scoredAreas.length} of {lifeAreas.length} areas rated. Complete all eight to reveal your starting point.</p>}
                <Button type="button" disabled={scoredAreas.length !== lifeAreas.length} onClick={addAlignmentToReflection} className="mt-3 bg-[#f6c515] font-black text-black hover:bg-[#e4b70e]">Add this insight to my journey</Button>
              </div>
            </div>}
          </div>}
          {active === "take_action" && <div className="mt-6 rounded-2xl border border-[#e1c15d] bg-[#fffaf0] p-5">
            <h3 className="text-xl font-black">Choose one relationship practice</h3>
            <p className="mt-1 text-sm text-[#5b655e]">The goal is not to finish a task. It is to interrupt an old pattern and let your child experience something different.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {relationshipPractices.map((practice) => <button type="button" key={practice} onClick={() => addRelationshipPractice(practice)} className="rounded-xl border border-[#d8c98f] bg-white p-3 text-left text-sm font-bold hover:border-[#17231c] hover:bg-[#fff4c2]">{practice}</button>)}
            </div>
            <p className="mt-4 text-sm font-bold text-[#168c3c]">Practice it in real life, then come back and reflect on what changed in you, what your child experienced, and what still needs patience.</p>
          </div>}
          {active === "reconnection" && <div className="mt-6 rounded-2xl bg-[#17231c] p-5 text-white">
            <h3 className="text-xl font-black text-[#f6c515]">Legacy is how the relationship feels</h3>
            <p className="mt-2">Your legacy is not a list of accomplishments. It is the pattern of presence, safety, humility, love, and trust your child experiences from you over time.</p>
            <p className="mt-3 text-sm text-white/75">Return here after real conversations. Record the small evidence: listening longer, honoring a boundary, taking responsibility, staying gentle, or showing up consistently.</p>
          </div>}
          <form onSubmit={submit} className="mt-6">
            <Textarea value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Write honestly. This is for clarity, not judgment." className="min-h-40 border-[#d8c98f] bg-[#fffdf5] text-base" />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="outline" onClick={() => persist("in_progress")}><Save className="mr-2 h-4 w-4" />Save for later</Button>
              <Button type="submit" disabled={!response.trim() || saving} className="bg-[#d51f26] font-black text-white hover:bg-[#b71920]">Carry this reflection forward <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </form>
          {!member && <p className="mt-5 text-sm text-[#5b655e]">Your work is saved on this device. Sign in to keep it available across devices and allow Papa Life to support you when you request help.</p>}
        </section>
      </main>
    </div>
  );
}

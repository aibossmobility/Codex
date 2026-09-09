import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ExternalLink, Mic2, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const LIVE_HOST_URL = "https://meetn.com/briankeithhill";
const SEASON_START = new Date("2026-07-07T12:00:00-07:00");

const TOPICS = [
  "Listening Without Defending",
  "Owning Impact Without Shame",
  "The First Repair Sentence",
  "Presence Over Pressure",
  "When Your Adult Child Pulls Away",
  "Authority Without Control",
  "Apology Without Explanation",
  "Consistency After the Conversation",
  "Rebuilding Trust in Small Deposits",
  "When Silence Feels Personal",
  "Leading With Purpose, Not Panic",
  "Becoming Safe to Talk To",
];

function topicForToday() {
  const now = new Date();
  const currentTuesday = new Date(now);
  currentTuesday.setDate(now.getDate() - ((now.getDay() + 5) % 7));
  const week = Math.floor((currentTuesday.getTime() - SEASON_START.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return TOPICS[Math.max(0, Math.min(TOPICS.length - 1, week))];
}

export default function TuesdayLiveFallback() {
  const [, navigate] = useLocation();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isNarrating, setIsNarrating] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const topic = useMemo(topicForToday, []);
  const slides = useMemo(() => [
    {
      label: "WELCOME",
      tone: "yellow",
      heading: topic,
      body: "Welcome, fathers. Today is a place for honest reflection, practical next steps, and hope. You are not here to defend yourself. You are here to become the father your adult child can experience as safe, steady, and present.",
    },
    {
      label: "THE PROBLEM",
      tone: "red",
      heading: "Silence can feel personal.",
      body: "When an adult child is quiet, a father can feel rejected, forgotten, or pushed aside. That hurt can lead us to demand an answer, explain ourselves, or press for a conversation before trust has room to breathe.",
    },
    {
      label: "PRESENCE",
      tone: "green",
      heading: "Be steady before you speak.",
      body: "Presence means staying emotionally available without chasing, controlling, or making every contact carry the weight of the whole relationship. A calm father creates more room for an honest conversation.",
    },
    {
      label: "PURPOSE",
      tone: "yellow",
      heading: "Choose faithfulness over panic.",
      body: "Your purpose is not to force a response today. Your purpose is to practice faithful love, humility, and patience. You can keep growing even while the relationship is quiet.",
    },
    {
      label: "AUTHORITY",
      tone: "red",
      heading: "Trustworthiness is real authority.",
      body: "Authority is not control. It is the character people can rely on. Keep small promises. Respect boundaries. Apologize without turning your impact into an argument.",
    },
    {
      label: "ALIGNMENT",
      tone: "green",
      heading: "Let your actions match your hope.",
      body: "Ask yourself: What is one way I have made their silence about me? Then choose one small action that makes your love easier to believe.",
    },
    {
      label: "THIS WEEK",
      tone: "yellow",
      heading: "One pressure-free action",
      body: "Send one simple message: I am thinking of you. No need to respond. I love you, and I am working on being a better listener. Do not ask for praise, proof, or an immediate answer.",
    },
    {
      label: "CLOSING PRAYER",
      tone: "green",
      heading: "A father can become safe again.",
      body: "Father, help us not to let silence make us fearful or controlling. Teach us to be humble, patient, and trustworthy in small things. As long as we are both alive, it is never too late. Amen.",
    },
  ], [topic]);

  const speakFrom = (index: number) => {
    window.speechSynthesis.cancel();
    const begin = Math.max(0, index);
    setActiveSlide(begin);
    setIsNarrating(true);

    const speakNext = (slideIndex: number) => {
      if (slideIndex >= slides.length) {
        setIsNarrating(false);
        return;
      }
      setActiveSlide(slideIndex);
      const utterance = new SpeechSynthesisUtterance(`${slides[slideIndex].heading}. ${slides[slideIndex].body}`);
      utterance.rate = 0.9;
      utterance.pitch = 0.9;
      utterance.onend = () => speakNext(slideIndex + 1);
      utterance.onerror = () => setIsNarrating(false);
      window.speechSynthesis.speak(utterance);
    };

    speakNext(begin);
  };

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return;
        if (!data.ok) navigate("/login");
        else if (!data.user?.researchLabAccess) navigate("/crm-console");
        else setAuthorized(true);
      })
      .catch(() => navigate("/login"));
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => () => window.speechSynthesis.cancel(), []);

  if (!authorized) {
    return <div className="flex min-h-screen items-center justify-center bg-[#090909] p-6 text-center text-sm text-gray-400">Checking private AI Boss access…</div>;
  }

  const current = slides[activeSlide];
  const panelClass = current.tone === "red"
    ? "border-brand-red bg-brand-red/15"
    : current.tone === "green"
      ? "border-primary bg-primary/15"
      : "border-brand-yellow bg-brand-yellow/15";

  return (
    <div className="min-h-screen bg-[#090909] pb-16 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate("/ai-boss")} aria-label="Back to AI Boss">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-bold">Tuesday Live Fallback</h1>
            <p className="text-xs text-gray-500">Narrated visual session</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <Card className="border-brand-yellow/40 bg-[#111]">
          <CardContent className="p-5">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-yellow">Papa Life Tuesday Live</p>
            <h2 className="mt-2 text-3xl font-black leading-tight">{topic}</h2>
            <p className="mt-3 text-sm text-gray-400">Use this screen as the visual and narration source when the Mac is unavailable. Start it, then share this phone screen inside Meetn.</p>
          </CardContent>
        </Card>

        <section className={`rounded-2xl border-2 p-6 transition-colors ${panelClass}`}>
          <p className="text-sm font-black uppercase tracking-[0.2em]">{current.label}</p>
          <p className="mt-5 text-3xl font-black leading-tight">{current.heading}</p>
          <p className="mt-6 text-lg leading-relaxed text-white">{current.body}</p>
          <p className="mt-8 text-sm font-semibold text-white/75">Slide {activeSlide + 1} of {slides.length}</p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Button className="h-14 bg-brand-yellow text-black hover:bg-brand-yellow/90" onClick={() => speakFrom(activeSlide)}>
            <Volume2 className="mr-2 h-5 w-5" />{isNarrating ? "Restart here" : "Start narration"}
          </Button>
          <Button className="h-14" variant="outline" onClick={() => { window.speechSynthesis.cancel(); setIsNarrating(false); }}>
            <Pause className="mr-2 h-5 w-5" />Pause narration
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button className="h-12" variant="outline" disabled={activeSlide === 0} onClick={() => { window.speechSynthesis.cancel(); setIsNarrating(false); setActiveSlide((value) => Math.max(0, value - 1)); }}>
            Previous
          </Button>
          <Button className="h-12" variant="outline" disabled={activeSlide === slides.length - 1} onClick={() => { window.speechSynthesis.cancel(); setIsNarrating(false); setActiveSlide((value) => Math.min(slides.length - 1, value + 1)); }}>
            Next
          </Button>
        </div>

        <Button className="h-14 w-full bg-brand-red text-white hover:bg-brand-red/90" onClick={() => window.open(LIVE_HOST_URL, "_blank", "noopener,noreferrer")}>
          <Mic2 className="mr-2 h-5 w-5" />Open Meetn host room
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>

        <Button className="w-full text-gray-400" variant="ghost" onClick={() => { window.speechSynthesis.cancel(); setIsNarrating(false); setActiveSlide(0); }}>
          <RotateCcw className="mr-2 h-4 w-4" />Reset session
        </Button>

        <p className="text-center text-xs leading-relaxed text-gray-500">Phone narration begins only after you tap Start narration. Meetn, YouTube, and Facebook publishing remain separate host-account actions; this page does not publish or send anything by itself.</p>
      </main>
    </div>
  );
}

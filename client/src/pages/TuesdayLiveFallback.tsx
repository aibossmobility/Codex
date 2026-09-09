import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ExternalLink, Mic2, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TUESDAY_LIVE_SESSION, TUESDAY_LIVE_SLIDES } from "@/lib/tuesday-live-session";

export default function TuesdayLiveFallback() {
  const [, navigate] = useLocation();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isNarrating, setIsNarrating] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const topic = TUESDAY_LIVE_SESSION.topic;
  const slides = TUESDAY_LIVE_SLIDES;

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) navigate("/login");
        else if (!data.user?.researchLabAccess) navigate("/crm-console");
        else setAuthorized(true);
      })
      .catch(() => navigate("/login"));
  }, [navigate]);

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

  useEffect(() => () => window.speechSynthesis.cancel(), []);

  if (!authorized) return <div className="min-h-screen bg-[#090909]" aria-label="Checking AI Boss access" />;

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

        <Button className="h-14 w-full bg-brand-red text-white hover:bg-brand-red/90" onClick={() => window.open(TUESDAY_LIVE_SESSION.liveHostUrl, "_blank", "noopener,noreferrer")}>
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

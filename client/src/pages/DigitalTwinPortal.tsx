import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Mic } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BrianLiveAvatar } from "@/components/BrianLiveAvatar";
import { DigitalBrianGuide } from "@/components/DigitalBrianGuide";

export default function DigitalTwinPortal() {
  const [, navigate] = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => { if (!data.ok) navigate("/login"); })
      .catch(() => navigate("/login"))
      .finally(() => setAuthChecked(true));
  }, [navigate]);

  if (!authChecked) return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <Loader2 className="h-8 w-8 animate-spin text-brand-yellow" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 bg-black px-3 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <img src="/images/papa-life-logo.png" alt="Papa Life" className="h-9 w-9 rounded-lg bg-white object-contain" />
          <div className="min-w-0 flex-1">
            <h1 className="font-bold">Digital Brian inside Papa Life OS</h1>
            <p className="text-xs text-gray-400">No-cost navigation first • voice only by choice</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/papa-life-os")}>
            <ArrowLeft className="mr-2 h-4 w-4" />Papa Life OS
          </Button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-7">
        <p className="text-sm text-gray-300">
          Digital Brian is your guide within Papa Life OS. Your Mac workers, assignment queue, and approvals work independently; no ElevenLabs conversation is needed for those tasks.
        </p>
        <DigitalBrianGuide mode="owner" />
        <section className="rounded-2xl border border-brand-yellow/30 bg-[#111] p-5">
          <h2 className="text-lg font-bold text-white">Optional live voice with Digital Brian</h2>
          <p className="mt-2 text-sm text-white/70">
            Use this only when you want a conversational voice experience. ElevenLabs may deduct voice credits or incur plan usage. Opening this OS page does not load the voice service.
          </p>
          {!voiceOpen ? (
            <Button type="button" className="mt-4 bg-brand-yellow font-bold text-black hover:bg-brand-yellow/90" onClick={() => setVoiceOpen(true)}>
              <Mic className="mr-2 h-4 w-4" /> Load optional ElevenLabs voice
            </Button>
          ) : (
            <div className="mt-4 space-y-3">
              <Button type="button" variant="outline" onClick={() => setVoiceOpen(false)}>Close voice panel</Button>
              <BrianLiveAvatar />
            </div>
          )}
          <p className="mt-3 text-xs text-white/50">Loading the panel does not approve purchases or assign workers. A voice session still requires you to start it in the voice widget.</p>
        </section>
      </main>
    </div>
  );
}

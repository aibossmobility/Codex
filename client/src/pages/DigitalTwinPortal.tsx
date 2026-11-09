import { useEffect, useState } from "react";
import { ArrowLeft, Database, Laptop, Loader2, Mic, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BrianLiveAvatar } from "@/components/BrianLiveAvatar";
import { DigitalBrianGuide } from "@/components/DigitalBrianGuide";

type MacVoiceStatus = {
  ok: boolean;
  primary: string;
  macHeartbeatOnline: boolean;
  macLastSeenAt: string | null;
  macRelayReady: boolean;
  voiceIdentity: string;
  selectedVoiceProvider: string;
  voiceIdConfigured: boolean;
  providerVoiceValidated: boolean;
};

export default function DigitalTwinPortal() {
  const [, navigate] = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [macVoice, setMacVoice] = useState<MacVoiceStatus | null>(null);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(response => response.json())
      .then(data => { if (!data.ok) navigate("/login"); })
      .catch(() => navigate("/login"))
      .finally(() => setAuthChecked(true));
  }, [navigate]);

  useEffect(() => {
    fetch("/api/admin/papa-outreach/voice-status", { credentials: "include", cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "Mac status unavailable.");
        setMacVoice(data as MacVoiceStatus);
      })
      .catch(e => setStatusError((e as Error).message));
  }, []);

  if (!authChecked) return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <Loader2 className="h-8 w-8 animate-spin text-brand-yellow" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 bg-black px-3 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <img src="/images/papa-life-approved-20261016.webp" alt="Papa Life" className="h-9 w-9 rounded-lg bg-white object-contain" />
          <div className="min-w-0 flex-1">
            <h1 className="font-bold">Digital Brian inside Papa Life OS</h1>
            <p className="text-xs text-gray-400">Mac mini + Desktop Commander first · Brian Keith Hill voice ID</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/papa-life-os")}>
            <ArrowLeft className="mr-1 h-4 w-4" />Papa Life OS
          </Button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-7">
        <section className="rounded-2xl border border-brand-yellow/40 bg-[#141414] p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Laptop className="h-5 w-5 text-brand-yellow" /> Primary voice connector: Brian's Mac mini</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            Desktop Commander and Papa Life OS handle your Mac-first work and authorized conversation recaps.
            Your selected Brian Keith Hill HeyGen voice ID is the identity for supported voice playback.
            The Mac connection handles the workflow; the voice ID does not authorize access or automatically synthesize speech.
          </p>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-white/15 bg-black/30 p-3">
              <p className="text-xs uppercase tracking-wider text-white/50">Mac connection</p>
              <p className="mt-1 font-bold">{macVoice?.macHeartbeatOnline ? "Mac heartbeat connected" : macVoice ? "Mac heartbeat offline" : "Mac status not verified"}</p>
              <p className="mt-1 text-xs text-white/60">A heartbeat alone cannot confirm that the microphone or Desktop Commander is ready.</p>
              {macVoice?.macLastSeenAt && <p className="mt-1 text-xs text-white/50">Last Mac heartbeat: {macVoice.macLastSeenAt} UTC</p>}
            </div>
            <div className="rounded-xl border border-white/15 bg-black/30 p-3">
              <p className="text-xs uppercase tracking-wider text-white/50">Private transcript relay</p>
              <p className="mt-1 font-bold">{macVoice?.macRelayReady ? "Server-side relay configured" : "Mac relay setup not complete"}</p>
              <p className="mt-1 text-xs text-white/60">Transcripts are accepted only through the authenticated Mac endpoint with explicit authorization to save.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="/admin/papa-life-outreach" className="inline-flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-3 text-sm font-bold text-black">
              <Database className="h-4 w-4" /> Open automated outreach dashboard
            </a>
            <a href="/papa-life-os" className="inline-flex items-center gap-2 rounded-lg border border-brand-yellow/50 px-4 py-3 text-sm font-bold text-brand-yellow">
              <Laptop className="h-4 w-4" /> Open Mac worker command center
            </a>
          </div>
          {statusError && <p className="mt-3 text-xs text-red-200">{statusError}</p>}
          <p className="mt-3 flex items-start gap-2 text-xs text-white/60"><ShieldCheck className="h-4 w-4 shrink-0"/> No ElevenLabs session or HeyGen generation starts automatically. This page does not pretend to connect to an offline Mac.</p>
        </section>

        <DigitalBrianGuide mode="owner" />

        <section className="rounded-2xl border border-white/15 bg-[#111] p-5">
          <h2 className="text-lg font-bold text-white">Optional secondary voice — manual only</h2>
          <p className="mt-2 text-sm text-white/70">
            ElevenLabs is not the primary voice, reporting, or Mac connector. It is available only when you explicitly choose it,
            and it may consume credits. It does not connect or approve the Mac worker.
          </p>
          {!voiceOpen ? (
            <Button type="button" variant="outline" className="mt-4 border-white/30 text-white" onClick={() => setVoiceOpen(true)}>
              <Mic className="mr-2 h-4 w-4" /> Open secondary voice option
            </Button>
          ) : (
            <div className="mt-4 space-y-3">
              <Button type="button" variant="outline" onClick={() => setVoiceOpen(false)}>Close secondary voice option</Button>
              <BrianLiveAvatar />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

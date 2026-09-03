import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Laptop,
  Loader2,
  Mail,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Mission = {
  mac_online: boolean;
  open_mobile_instructions: number;
  queue: {
    awaiting_approval: number;
    approved: number;
    executing: number;
    failed: number;
    waiting_for_mac: number;
  };
  nodes: Array<{
    node_id: string;
    display_name: string;
    online: boolean;
    capabilities: string[];
    last_seen_at: string;
  }>;
};

type CaptureMode = "father" | "boss" | null;

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export default function AiBossMobile() {
  const [, navigate] = useLocation();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [instruction, setInstruction] = useState("");
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ mission: Mission }>("/api/admin/ai-boss/mission-control");
      setMission(data.mission);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI Boss OS could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = "/ai-boss-manifest.webmanifest";
    document.head.appendChild(manifest);
    document.documentElement.style.backgroundColor = "#0a0a0a";

    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/ai-boss-sw.js");

    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) navigate("/login");
        else if (!data.user?.researchLabAccess) navigate("/crm-console");
        else void load();
      })
      .catch(() => navigate("/login"));

    return () => {
      recognitionRef.current?.abort?.();
      manifest.remove();
    };
  }, [load, navigate]);

  async function saveCapture(text: string, mode: Exclude<CaptureMode, null>) {
    const clean = text.trim();
    if (!clean) return;
    setSaving(true);
    try {
      const fatherPrefix = mode === "father" ? "I just met a father. " : "";
      const summary = `${fatherPrefix}${clean}`.trim();
      await apiJson("/api/admin/executive-conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_ref: `${mode}-mobile-${Date.now()}`,
          channel: "other",
          summary,
          user_intent: summary,
          next_action:
            mode === "father"
              ? "Create or update the relationship record, preserve the encounter notes, and identify the next appropriate Papa Life follow-up."
              : "Review and route through AI Boss OS authority controls; execute permitted work and queue anything requiring the Mac or approval.",
          status: "active",
        }),
      });
      setInstruction("");
      transcriptRef.current = "";
      toast.success(mode === "father" ? "Father encounter remembered." : "Sent to AI Boss OS.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That could not be saved.");
    } finally {
      setSaving(false);
      setCaptureMode(null);
    }
  }

  function startVoice(mode: Exclude<CaptureMode, null>) {
    if (listening || saving) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setCaptureMode(mode);
    transcriptRef.current = "";
    setInstruction("");

    if (!SpeechRecognition) {
      toast.message("Voice capture is not available in this browser. Type your note below and tap Send.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let interim = "";
      let finalText = transcriptRef.current;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const phrase = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) finalText += `${phrase} `;
        else interim += phrase;
      }
      transcriptRef.current = finalText;
      setInstruction(`${finalText}${interim}`.trim());
    };

    recognition.onerror = (event: any) => {
      setListening(false);
      if (event.error !== "aborted" && event.error !== "no-speech") {
        toast.error("I couldn't hear that clearly. Tap again and speak normally.");
      }
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      const finalText = transcriptRef.current.trim();
      if (finalText) void saveCapture(finalText, mode);
    };

    recognition.start();
    setListening(true);
  }

  function stopVoice() {
    recognitionRef.current?.stop?.();
  }

  async function submitTyped(event: FormEvent) {
    event.preventDefault();
    if (!instruction.trim()) return;
    await saveCapture(instruction, captureMode || "boss");
  }

  const pending =
    (mission?.open_mobile_instructions || 0) +
    (mission?.queue.awaiting_approval || 0) +
    (mission?.queue.approved || 0) +
    (mission?.queue.executing || 0) +
    (mission?.queue.waiting_for_mac || 0);

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-[#f5f1e8] pb-24 selection:bg-[#d9aa21]/30">
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-5 pt-[max(2rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[1.05rem] font-black tracking-[0.2em] text-[#817c72]">FIELD MODE</p>
            <p className="mt-1 text-xs text-[#5f5a52]">AI BOSS OS · PAPA LIFE</p>
          </div>
          <button onClick={() => load()} className="flex items-center gap-2 text-right" aria-label="Refresh AI Boss status">
            <span className="text-lg font-black text-[#d9aa21]">{pending} pending</span>
            <RefreshCw className={`h-4 w-4 text-[#817c72] ${loading ? "animate-spin" : ""}`} />
          </button>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center py-10">
          <button
            type="button"
            onClick={() => (listening && captureMode === "father" ? stopVoice() : startVoice("father"))}
            disabled={saving}
            className="relative flex aspect-square w-[min(82vw,390px)] max-w-full flex-col items-center justify-center rounded-full border-[12px] border-[#edc654] bg-[#d9aa21] px-8 text-center text-[#080808] shadow-[0_18px_80px_rgba(217,170,33,0.14)] transition active:scale-[0.98] disabled:opacity-70"
          >
            {saving && captureMode === "father" ? (
              <Loader2 className="mb-5 h-11 w-11 animate-spin" />
            ) : listening && captureMode === "father" ? (
              <Mic className="mb-5 h-12 w-12 animate-pulse" />
            ) : null}
            <span className="text-xl font-black tracking-[0.16em]">I JUST</span>
            <span className="mt-2 text-[clamp(2rem,8vw,3rem)] font-black leading-none">MET A FATHER</span>
            <span className="mt-5 text-lg font-bold">
              {listening && captureMode === "father" ? "Listening… tap when finished" : "Tap and tell me what happened"}
            </span>
          </button>

          {listening && (
            <div className="mt-7 w-full rounded-2xl border border-[#d9aa21]/30 bg-[#15130d] p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-[#d9aa21]"><Mic className="h-4 w-4" />Listening</p>
              <p className="mt-2 min-h-10 text-sm leading-6 text-[#e5dfd3]">{instruction || "Speak naturally. Names, what you talked about, contact details you want remembered, and any follow-up."}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => (listening && captureMode === "boss" ? stopVoice() : startVoice("boss"))}
            disabled={saving}
            className="mt-9 flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-[#121212] p-4 text-left transition hover:border-[#d9aa21]/40 active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#d9aa21] text-black">
              {listening && captureMode === "boss" ? <MicOff className="h-6 w-6" /> : <Brain className="h-6 w-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black tracking-wide text-white">TALK TO AI BOSS</p>
              <p className="mt-1 text-sm text-[#8f8a80]">Email, calendar, tasks, Papa Life, follow-ups, or Mac work</p>
            </div>
            <ChevronRight className="h-5 w-5 text-[#5f5a52]" />
          </button>

          {(captureMode || instruction) && !listening && (
            <form onSubmit={submitTyped} className="mt-4 w-full rounded-2xl border border-white/10 bg-[#121212] p-4">
              <Textarea
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                placeholder={captureMode === "father" ? "Tell me about the father you met…" : "Tell AI Boss what you want done…"}
                className="min-h-28 border-white/10 bg-black/40 text-base text-white"
              />
              <Button type="submit" disabled={saving || !instruction.trim()} className="mt-3 w-full bg-[#d9aa21] font-bold text-black hover:bg-[#edc654]">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {captureMode === "father" ? "Remember This Encounter" : "Send to AI Boss"}
              </Button>
            </form>
          )}
        </section>

        <section className="mb-5 grid grid-cols-3 gap-2">
          <QuickButton icon={Users} label="Relationships" onClick={() => navigate("/crm-console")} />
          <QuickButton icon={ShieldCheck} label="Approvals" onClick={() => navigate("/executive-memory")} />
          <QuickButton icon={Brain} label="Memory" onClick={() => navigate("/executive-memory")} />
        </section>

        <button onClick={() => navigate("/crm-console")} className="mb-5 text-center text-lg font-bold underline underline-offset-4">
          View relationships
        </button>

        <section className="mb-8 rounded-2xl border border-white/10 bg-[#101010] p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatusLine icon={Laptop} label="Mac" value={mission?.mac_online ? "Online" : "Offline"} active={Boolean(mission?.mac_online)} />
            <StatusLine icon={Activity} label="Running" value={String(mission?.queue.executing || 0)} active={Boolean(mission?.queue.executing)} />
            <StatusLine icon={CircleAlert} label="Approvals" value={String(mission?.queue.awaiting_approval || 0)} active={Boolean(mission?.queue.awaiting_approval)} />
            <StatusLine icon={Clock3} label="Waiting for Mac" value={String(mission?.queue.waiting_for_mac || 0)} active={Boolean(mission?.queue.waiting_for_mac)} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
            <SmallAction icon={Mail} label="Email" onClick={() => { setCaptureMode("boss"); setInstruction("Review my Gmail and tell me what needs my attention."); }} />
            <SmallAction icon={CalendarDays} label="Calendar" onClick={() => { setCaptureMode("boss"); setInstruction("Review my calendar and tell me what is next and what needs preparation."); }} />
            <SmallAction icon={Smartphone} label="Phone requests" onClick={() => navigate("/executive-memory")} />
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#6e6a62]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#d9aa21]" />Your phone can capture work while the Mac is off. Local-only work waits safely until the Mac comes back online.</p>
        </section>
      </main>
    </div>
  );
}

function QuickButton({ icon: Icon, label, onClick }: { icon: typeof Brain; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl border border-white/10 bg-[#111] p-3 text-center active:scale-[0.98]">
      <Icon className="mx-auto h-5 w-5 text-[#d9aa21]" />
      <p className="mt-2 text-xs font-bold text-[#d7d2c8]">{label}</p>
    </button>
  );
}

function StatusLine({ icon: Icon, label, value, active }: { icon: typeof Activity; label: string; value: string; active: boolean }) {
  return (
    <div className="rounded-xl bg-black/40 p-3">
      <div className="flex items-center gap-2 text-[#817c72]"><Icon className={`h-4 w-4 ${active ? "text-[#d9aa21]" : ""}`} /><span className="text-xs">{label}</span></div>
      <p className={`mt-2 text-base font-black ${active ? "text-[#d9aa21]" : "text-[#d7d2c8]"}`}>{value}</p>
    </div>
  );
}

function SmallAction({ icon: Icon, label, onClick }: { icon: typeof Brain; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-xl bg-black/40 px-2 py-3 text-center active:scale-[0.98]">
      <Icon className="mx-auto h-4 w-4 text-[#d9aa21]" />
      <span className="mt-2 block text-[11px] font-bold text-[#a7a198]">{label}</span>
    </button>
  );
}

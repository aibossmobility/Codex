import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Activity, BarChart3, Brain, CalendarDays, CheckCircle2, CircleAlert, Clock3, ExternalLink, Laptop, Loader2, Mail, Mic, Mic2, Play, RefreshCw, Send, ShieldCheck, Smartphone, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Mission = {
  mac_online: boolean;
  open_mobile_instructions: number;
  queue: { awaiting_approval: number; approved: number; executing: number; failed: number; waiting_for_mac: number };
  nodes: Array<{ node_id: string; display_name: string; node_kind: "mac" | "desktop" | "server" | "android"; online: boolean; capabilities: string[]; last_seen_at: string }>;
  campaigns: Array<{
    source: "zipshare" | "heycatch";
    campaign_key: string;
    display_name: string;
    tracking_url: string | null;
    status: "connected" | "tracking" | "attention";
    clicks: number;
    enrollments: number;
    posts_distributed: number;
    follow_ups_needed: number;
    latest_activity: string | null;
    last_synced_at: string;
  }>;
};

type CaptureMode = "father" | "boss" | null;

const liveUrl = "https://meetn.com/briankeithhill";
const youtubeStudioUrl = "https://studio.youtube.com/";
const todayTopic = "Rebuilding Trust in Small Deposits";
const androidCompanionStorageKey = "ai-boss-android-companion-id";

function androidCompanionId() {
  const existing = window.localStorage.getItem(androidCompanionStorageKey);
  if (existing) return existing;
  const suffix = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const nodeId = `brian-android-${suffix}`;
  window.localStorage.setItem(androidCompanionStorageKey, nodeId);
  return nodeId;
}

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
  const saveVoiceOnEndRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ mission: Mission }>("/api/admin/ai-boss/mission-control");
      setMission(data.mission);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mission Control could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = "/ai-boss-manifest.webmanifest";
    document.head.appendChild(manifest);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/ai-boss-sw.js");
    let companionTimer: number | undefined;
    fetch("/api/auth/me", { credentials: "include" }).then((response) => response.json()).then((data) => {
      if (!data.ok) navigate("/login");
      else if (!data.user?.researchLabAccess) navigate("/crm-console");
      else {
        void load();
        if (/Android/i.test(window.navigator.userAgent)) {
          const heartbeat = async () => {
            try {
              await apiJson("/api/admin/ai-boss/android-companion/heartbeat", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ node_id: androidCompanionId(), display_name: "Brian's Android phone" }),
              });
              await load();
            } catch {
              // The companion remains a user-controlled interface if it cannot report status.
            }
          };
          void heartbeat();
          companionTimer = window.setInterval(() => void heartbeat(), 45_000);
        }
      }
    }).catch(() => navigate("/login"));
    return () => {
      if (companionTimer) window.clearInterval(companionTimer);
      saveVoiceOnEndRef.current = false;
      recognitionRef.current?.abort?.();
      manifest.remove();
    };
  }, [load, navigate]);

  async function saveCapture(text: string, mode: Exclude<CaptureMode, null>) {
    const clean = text.trim();
    if (!clean) return;
    setSaving(true);
    try {
      const summary = mode === "father" ? `I just met a father. ${clean}` : clean;
      await apiJson("/api/admin/executive-conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_ref: `${mode}-mobile-${Date.now()}`,
          channel: "other",
          summary,
          user_intent: summary,
          next_action: mode === "father"
            ? "Create or update the relationship record, preserve the encounter notes, and identify the next appropriate Papa Life follow-up."
            : "Review and route through AI Boss OS authority controls; execute permitted work and queue anything requiring the Mac or approval.",
          status: "active",
        }),
      });
      setInstruction("");
      transcriptRef.current = "";
      setCaptureMode(null);
      toast.success(mode === "father" ? "Father encounter remembered by AI Boss OS." : "Instruction captured by AI Boss OS.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Instruction could not be captured.");
    } finally {
      setSaving(false);
    }
  }

  function startVoice(mode: Exclude<CaptureMode, null>) {
    if (listening || saving) return;
    setCaptureMode(mode);
    setInstruction("");
    transcriptRef.current = "";
    saveVoiceOnEndRef.current = false;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.message("Voice capture is not available here. Type below and send it to AI Boss.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
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
      saveVoiceOnEndRef.current = false;
      setListening(false);
      if (event.error !== "aborted" && event.error !== "no-speech") toast.error("I couldn't hear that clearly. Tap again and speak normally.");
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      const finalText = transcriptRef.current.trim();
      const shouldSave = saveVoiceOnEndRef.current;
      saveVoiceOnEndRef.current = false;
      if (shouldSave && finalText) void saveCapture(finalText, mode);
    };
    recognition.start();
    setListening(true);
  }

  function stopVoice() {
    saveVoiceOnEndRef.current = true;
    recognitionRef.current?.stop?.();
  }

  async function captureInstruction(event: FormEvent) {
    event.preventDefault();
    if (!instruction.trim()) return;
    await saveCapture(instruction, captureMode || "boss");
  }

  return (
    <div className="min-h-screen bg-[#090909] text-white pb-24">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Brain className="w-7 h-7 text-primary" />
          <div><h1 className="font-bold leading-tight">AI Boss OS</h1><p className="text-xs text-gray-500">Mobile Mission Control</p></div>
          <Button size="icon" variant="ghost" className="ml-auto" onClick={() => load()} aria-label="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-5">
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatusCard icon={Laptop} label="Mac" value={mission?.mac_online ? "Online" : "Offline"} tone={mission?.mac_online ? "good" : "waiting"} />
          <StatusCard icon={Smartphone} label="Android" value={mission?.nodes.some((node) => node.node_kind === "android" && node.online) ? "Online" : "Offline"} tone={mission?.nodes.some((node) => node.node_kind === "android" && node.online) ? "good" : "waiting"} />
          <StatusCard icon={CircleAlert} label="Approvals" value={String(mission?.queue.awaiting_approval || 0)} tone={(mission?.queue.awaiting_approval || 0) ? "waiting" : "good"} />
          <StatusCard icon={Activity} label="Running" value={String(mission?.queue.executing || 0)} tone="neutral" />
          <StatusCard icon={Clock3} label="Waiting for Mac" value={String(mission?.queue.waiting_for_mac || 0)} tone={(mission?.queue.waiting_for_mac || 0) ? "waiting" : "neutral"} />
          <StatusCard icon={Smartphone} label="Phone requests" value={String(mission?.open_mobile_instructions || 0)} tone="neutral" />
        </section>

        <Card className="bg-[#111] border-brand-yellow/30 overflow-hidden">
          <CardContent className="p-5 sm:p-7">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-yellow font-bold">Papa Life Field Action</p>
            <button
              type="button"
              onClick={() => (listening && captureMode === "father" ? stopVoice() : startVoice("father"))}
              disabled={saving}
              className="mx-auto mt-5 flex aspect-square w-[min(72vw,360px)] max-w-full flex-col items-center justify-center rounded-full border-[10px] border-[#f2cb58] bg-[#d9aa21] px-8 text-center text-black transition active:scale-[0.98] disabled:opacity-70"
            >
              {saving && captureMode === "father" ? <Loader2 className="mb-4 h-9 w-9 animate-spin" /> : listening && captureMode === "father" ? <Mic className="mb-4 h-9 w-9 animate-pulse" /> : null}
              <span className="text-lg font-black tracking-[0.14em]">I JUST</span>
              <span className="mt-2 text-[clamp(1.9rem,7vw,2.8rem)] font-black leading-none">MET A FATHER</span>
              <span className="mt-4 text-base font-bold">{listening && captureMode === "father" ? "Listening… tap when finished" : "Tap to remember what happened"}</span>
            </button>
            <div className="mt-5 flex justify-center">
              <Button variant="ghost" className="text-white underline underline-offset-4" onClick={() => navigate("/crm-console")}><Users className="mr-2 h-4 w-4" />View relationships</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Talk to AI Boss</CardTitle>
            <p className="text-sm text-gray-500">Tell AI Boss what you want done from your Android phone. It can store the instruction immediately and route it through the operating system.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={captureInstruction} className="space-y-3">
              <Textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Check my Gmail, review my calendar, prepare a follow-up, remember something, or queue work for my Mac…" className="min-h-28 bg-black/50 border-white/10 text-base" />
              <div className="grid sm:grid-cols-2 gap-3">
                <Button type="button" variant="outline" disabled={saving} onClick={() => (listening && captureMode === "boss" ? stopVoice() : startVoice("boss"))} className="border-brand-yellow/40 text-brand-yellow hover:bg-brand-yellow/10">
                  <Mic2 className="w-4 h-4 mr-2" />{listening && captureMode === "boss" ? "Finish speaking" : "Speak to AI Boss"}
                </Button>
                <Button type="submit" disabled={saving || !instruction.trim()}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}Send to AI Boss</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs uppercase tracking-widest text-primary">Campaigns & Analytics</p><CardTitle className="mt-1 text-white">Managed by AI Boss OS</CardTitle></div>
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(mission?.campaigns || []).map((campaign) => (
              <div key={`${campaign.source}-${campaign.campaign_key}`} className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">{campaign.display_name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${campaign.status === "connected" ? "bg-primary/15 text-primary" : campaign.status === "attention" ? "bg-brand-red/15 text-brand-red" : "bg-brand-yellow/15 text-brand-yellow"}`}>{campaign.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{campaign.campaign_key} · Last sync {campaign.last_synced_at}</p>
                  </div>
                  {campaign.tracking_url ? <a href={campaign.tracking_url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${campaign.display_name}`}><ExternalLink className="h-4 w-4 text-gray-400" /></a> : null}
                </div>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Metric label="Clicks" value={campaign.clicks} />
                  <Metric label="Enrollments" value={campaign.enrollments} />
                  <Metric label="Posts" value={campaign.posts_distributed} />
                  <Metric label="Follow-ups" value={campaign.follow_ups_needed} />
                </div>
                {campaign.latest_activity ? <p className="mt-3 text-sm text-gray-400">{campaign.latest_activity}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-brand-yellow/30">
          <CardHeader><div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-brand-yellow">Tuesday Live</p><CardTitle className="mt-1 text-white">{todayTopic}</CardTitle></div><Mic2 className="w-8 h-8 text-brand-yellow" /></div></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm"><Checklist items={["Open Meetn and confirm camera/microphone", "Confirm YouTube is connected in Meetn Stream Manager", "Start the Meetn multistream so YouTube goes live with the session", "Keep Scripture and the main question visible", "Start recording before the teaching", "End with one practical trust-building action"]} /><div className="rounded-lg bg-black/40 p-4"><p className="font-semibold">45-minute cue</p><ol className="mt-2 space-y-1 text-gray-400"><li>0–5: Welcome and prayer</li><li>5–15: Why small deposits rebuild trust</li><li>15–30: Coaching and reflection</li><li>30–40: Questions and practical action</li><li>40–45: Commitment and closing prayer</li></ol></div></div>
            <div className="grid sm:grid-cols-2 gap-3"><a href={liveUrl} target="_blank" rel="noopener noreferrer"><Button className="w-full bg-brand-red hover:bg-brand-red/90 text-white"><Play className="w-4 h-4 mr-2" />Open Tuesday Live</Button></a><a href={youtubeStudioUrl} target="_blank" rel="noopener noreferrer"><Button variant="outline" className="w-full border-brand-yellow/40 text-brand-yellow hover:bg-brand-yellow/10"><Play className="w-4 h-4 mr-2" />Open YouTube Studio</Button></a></div>
          </CardContent>
        </Card>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickLink icon={Brain} label="Executive Memory" onClick={() => navigate("/executive-memory")} />
          <QuickLink icon={ShieldCheck} label="Approvals & Queue" onClick={() => navigate("/executive-memory")} />
          <QuickLink icon={Mail} label="Gmail Operations" onClick={() => navigate("/executive-memory")} />
          <QuickLink icon={CalendarDays} label="Human Impact" onClick={() => navigate("/research-lab")} />
        </section>

        <p className="text-center text-xs text-gray-600">Cloud/direct work can continue while the Mac is off. Local work waits safely for the Mac node to return.</p>
      </main>
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, tone }: { icon: typeof Activity; label: string; value: string; tone: "good" | "waiting" | "neutral" }) { const color = tone === "good" ? "text-primary" : tone === "waiting" ? "text-brand-yellow" : "text-gray-300"; return <div className="rounded-xl border border-white/10 bg-[#111] p-3"><Icon className={`w-4 h-4 ${color}`} /><p className="mt-3 text-xs text-gray-500">{label}</p><p className={`text-lg font-bold ${color}`}>{value}</p></div>; }
function QuickLink({ icon: Icon, label, onClick }: { icon: typeof Brain; label: string; onClick: () => void }) { return <button onClick={onClick} className="rounded-xl border border-white/10 bg-[#111] p-4 text-left hover:border-primary/40"><Icon className="w-5 h-5 text-primary" /><p className="mt-3 text-sm font-medium">{label}</p></button>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-white/10 bg-[#111] p-3"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-lg font-bold text-white">{value}</p></div>; }
function Checklist({ items }: { items: string[] }) { return <div className="rounded-lg bg-black/40 p-4"><p className="font-semibold">Go-live checklist</p><ul className="mt-2 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-gray-400"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{item}</li>)}</ul></div>; }

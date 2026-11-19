import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Activity, BarChart3, Brain, CalendarDays, CheckCircle2, ClipboardList, CircleAlert, Clock3, ExternalLink, Laptop, Loader2, Mail, Mic, Mic2, RefreshCw, Send, ShieldCheck, Smartphone, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import PapaReadAloud from "@/components/PapaReadAloud";

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

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

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
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const assignmentProject = "papa-life" as const;
  const [assignmentRole, setAssignmentRole] = useState("seo-website");
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [assignmentText, setAssignmentText] = useState("");
  const [assignmentRequestId, setAssignmentRequestId] = useState(() => window.crypto.randomUUID());
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentListening, setAssignmentListening] = useState(false);
  const assignmentRecognitionRef = useRef<any>(null);
  const [lastAssignmentId, setLastAssignmentId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const isAppleMobile = /iPad|iPhone|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const saveVoiceOnEndRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ mission: Mission }>("/api/admin/ai-boss/mission-control?project=papa-life");
      setMission(data.mission);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mission Control could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      toast.success("Papa Life OS is installed on this device.");
    };
    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || (window.navigator as any).standalone === true;
    setIsInstalled(Boolean(standalone));
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = "/papa-life-os-manifest.webmanifest";
    document.head.appendChild(manifest);
    let companionTimer: number | undefined;
    fetch("/api/auth/me", { credentials: "include" }).then((response) => response.json()).then((data) => {
      if (!data.ok) navigate("/login");
      else {
        if ("serviceWorker" in navigator) {
          // Papa Life OS never installs the AI Boss Mobility service worker.
          // Remove any obsolete root-scoped AI Boss worker from older shared dashboard installs.
          void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
            await Promise.all(registrations.filter((registration) => {
              const scriptUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL;
              return Boolean(scriptUrl && new URL(scriptUrl).pathname === "/ai-boss-sw.js" && new URL(registration.scope).pathname === "/");
            }).map((registration) => registration.unregister()));
          }).catch(() => {});
        }
        void load();
        if (/Android/i.test(window.navigator.userAgent)) {
          const isTablet = /Tablet|Nexus 7|Nexus 9|SM-T|Pixel C/i.test(window.navigator.userAgent);
          const heartbeat = async () => {
            try {
              await apiJson("/api/admin/ai-boss/android-companion/heartbeat", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  node_id: androidCompanionId(),
                  display_name: isTablet ? "Brian's Android tablet" : "Brian's Android phone",
                  capabilities: ["google_messages_surface", isTablet ? "tablet" : "phone"],
                }),
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
      assignmentRecognitionRef.current?.abort?.();
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      manifest.remove();
    };
  }, [load, navigate]);

  async function installAiBoss() {
    if (!installPrompt) {
      setInstallHelpOpen(true);
      toast.message("See the device-specific installation instructions below.");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  }

  async function saveCapture(text: string, mode: Exclude<CaptureMode, null>) {
    const clean = text.trim();
    if (!clean) return;
    setSaving(true);
    try {
      const summary = mode === "father" ? "Papa Life fatherhood note: " + clean : clean;
      const result = await apiJson<{ routing: "workspace_completed" | "deterministic_workspace" | "captured_for_review"; execution_error?: string | null }>("/api/admin/ai-boss/instructions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_ref: `${mode}-mobile-${Date.now()}`,
          instruction: summary,
        }),
      });
      setInstruction("");
      transcriptRef.current = "";
      setCaptureMode(null);
      toast.success(
        mode === "father"
          ? "Father encounter remembered by Papa Life OS."
          : result.routing === "workspace_completed"
            ? "Google Workspace request completed with no model credits."
            : result.routing === "deterministic_workspace"
              ? result.execution_error
                ? "Request saved. Google Workspace needs its hosted connection before it can run with the Mac off."
                : "Google Workspace request routed with no model credits."
            : "Instruction captured by Papa Life OS for review."
      );
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Instruction could not be captured.");
    } finally {
      setSaving(false);
    }
  }

  function dictateWorkerAssignment() {
    if (assignmentListening) {
      assignmentRecognitionRef.current?.stop?.();
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.message("Speech input isn't available in this browser. Please type the assignment.");
      return;
    }
    const recognizer = new SpeechRecognition();
    recognizer.lang = "en-US";
    recognizer.continuous = false;
    recognizer.interimResults = true;
    const prefix = assignmentText.trim();
    recognizer.onresult = (event: any) => {
      const spoken = Array.from(event.results as any[])
        .map((result: any) => result?.[0]?.transcript || "").join(" ").trim();
      setAssignmentText([prefix, spoken].filter(Boolean).join(" ").slice(0, 2000));
    };
    recognizer.onerror = () => {
      setAssignmentListening(false);
      toast.message("Voice capture stopped. You can review or type the assignment.");
    };
    recognizer.onend = () => {
      setAssignmentListening(false);
      assignmentRecognitionRef.current = null;
    };
    assignmentRecognitionRef.current = recognizer;
    try {
      recognizer.start();
      setAssignmentListening(true);
    } catch {
      toast.error("The microphone couldn't be started.");
    }
  }

  async function submitWorkerAssignment(event: FormEvent) {
    event.preventDefault();
    if (assignmentText.trim().length < 12 || assignmentSaving) return;
    setAssignmentSaving(true);
    try {
      const result = await apiJson<{ assignment: { id: number; status: string } }>("/api/admin/ai-boss/worker-assignments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project: assignmentProject,
          role: assignmentRole,
          instruction: assignmentText.trim(),
          request_id: assignmentRequestId,
        }),
      });
      setLastAssignmentId(result.assignment.id);
      setAssignmentText("");
      setAssignmentRequestId(window.crypto.randomUUID());
      toast.success("Assignment queued for your approval. No worker has started yet.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The worker assignment could not be queued.");
    } finally {
      setAssignmentSaving(false);
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
      toast.message("Voice capture is not available here. Type below and send it to Papa Life OS.");
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
    await saveCapture(instruction, captureMode || "father");
  }

  return (
    <div className="min-h-screen bg-[#090909] text-white pb-24">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-3">
          <img src="/images/papa-life-approved-20261016.webp" alt="Papa Life" className="h-9 w-9 rounded-lg bg-white object-contain ring-1 ring-brand-yellow/50" />
          <div><h1 className="font-bold leading-tight">Papa Life OS</h1><p className="text-xs text-gray-500">People · Fatherhood · Relationships</p></div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {!isInstalled && (
              <Button size="sm" className="bg-brand-yellow text-black hover:bg-brand-yellow/90" onClick={() => void installAiBoss()}>
                <Smartphone className="mr-2 h-4 w-4" />Install
              </Button>
            )}
            <Button size="sm" variant="outline" className="border-brand-yellow/40 text-brand-yellow hover:bg-brand-yellow/10" onClick={() => { window.location.href = "/papa-framework"; }}>PAPA Framework</Button>
            <Button size="icon" variant="ghost" onClick={() => load()} aria-label="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-5">
        <section aria-label="Papa Life brand banner" className="overflow-hidden rounded-2xl border border-brand-yellow/40 bg-[#111]">
          <div className="bg-white p-3 sm:p-5">
            <img src="/images/papa-life-approved-20261016.webp" alt="Papa Life — fathers, family and relationship restoration" className="mx-auto max-h-64 w-full object-contain" />
          </div>
          <div className="p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-yellow">People · Fathers · Family Connection</p>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Papa Life OS</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/75">Your private home for fatherhood conversations, relationship follow-ups, and the PAPA journey: Presence → Authority → Purpose → Alignment.</p>
            <a href="/ai-boss" className="mt-3 inline-block text-xs text-white/50 underline">Switch to AI Boss Mobility OS — separate technology dashboard</a>
          </div>
        </section>
        <Card className="border-brand-yellow/30 bg-[#111]">
          <CardContent className="space-y-3 p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-yellow">Start here</p>
            <h2 className="text-xl font-bold text-white">What do you need to do?</h2>
            <p className="text-sm text-white/70">You can open this dashboard and review work from your phone or tablet with your Mac off. Only Mac-based workers need it online to finish an assignment.</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button className="min-h-12 bg-brand-yellow text-black hover:bg-brand-yellow/90" onClick={() => document.getElementById("papa-capture")?.scrollIntoView({ behavior: "smooth", block: "start" })}><Users className="mr-2 h-4 w-4" />Remember a fatherhood moment</Button>
              <Button variant="outline" className="min-h-12 border-white/30" onClick={() => navigate("/papa-life-os/approvals")}><ShieldCheck className="mr-2 h-4 w-4" />Papa Life approvals</Button>
              <Button variant="outline" className="min-h-12 border-white/30" onClick={() => document.getElementById("papa-read-aloud")?.scrollIntoView({ behavior: "smooth", block: "start" })}><Mic className="mr-2 h-4 w-4" />Read text aloud</Button>
            </div>
          </CardContent>
        </Card>
        <div id="papa-read-aloud"><PapaReadAloud /></div>
        {installHelpOpen && !isInstalled && (
          <Card className="border-brand-yellow/30 bg-[#111]">
            <CardContent className="p-4 text-sm text-white/85">
              <p className="font-semibold text-brand-yellow">Add Papa Life OS to this device</p>
              {isAppleMobile ? (
                <p className="mt-2">On iPhone or iPad, open this page in Safari, tap Share, choose Add to Home Screen, then tap Add. If you use Chrome, open the same page in Safari first.</p>
              ) : /Android/i.test(navigator.userAgent) ? (
                <p className="mt-2">On Android Chrome, open the browser menu and choose Install app or Add to Home screen. Continue using the existing website if installation is unavailable.</p>
              ) : (
                <p className="mt-2">In your desktop browser, use the address bar Install app option or the browser menu. You can always use this page without installing it.</p>
              )}
              <Button type="button" size="sm" variant="outline" className="mt-3 border-white/30" onClick={() => setInstallHelpOpen(false)}>Close instructions</Button>
            </CardContent>
          </Card>
        )}
        <Card className="border-white/15 bg-[#111]">
          <CardContent className="p-4 text-sm text-white/80">
            <p className="font-semibold text-white">Your first assignment — three steps</p>
            <p className="mt-1">1. Capture a fatherhood conversation or relationship follow-up. 2. Review Papa Life assignments. 3. Use the PAPA framework for the next people-centered step. Website audits are optional.</p>
          </CardContent>
        </Card>

        <Card className="border-brand-yellow/30 bg-[#111]">
          <CardHeader><CardTitle className="text-white">Papa Life priorities</CardTitle><p className="text-sm text-gray-400">People and relationships first. The Google Hub remains authoritative.</p></CardHeader>
          <CardContent className="space-y-3 text-sm text-white/75">
            <p><strong className="text-brand-yellow">Fatherhood:</strong> Focus on presence, listening and practical follow-up with fathers of adult children. Nothing sends messages automatically.</p>
            <p><strong className="text-brand-yellow">Resources:</strong> Use existing Papa Life materials and the PAPA framework. No new courses or programs are launched here.</p>
            <p><strong className="text-brand-yellow">Access:</strong> The Papa Life website is live; HighLevel checkout-to-course delivery still requires independent verification.</p>
            <a className="inline-flex items-center gap-1 text-brand-yellow underline underline-offset-4" href="https://docs.google.com/document/d/1TXkHlLDd-DzrSwF9JbcnK3mdDZw6fFehwgi1xZwDin4/edit" target="_blank" rel="noopener noreferrer">Current canonical Google Hub <ExternalLink className="h-3.5 w-3.5" /></a>
          </CardContent>
        </Card>
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatusCard icon={Laptop} label="Mac" value={mission?.mac_online ? "Online" : "Offline"} tone={mission?.mac_online ? "good" : "waiting"} />
          <StatusCard icon={Smartphone} label="Android companion" value={mission?.nodes.some((node) => node.node_kind === "android" && node.online) ? "Online" : "Not reporting"} tone={mission?.nodes.some((node) => node.node_kind === "android" && node.online) ? "good" : "neutral"} />
          <StatusCard icon={CircleAlert} label="Approvals" value={String(mission?.queue.awaiting_approval || 0)} tone={(mission?.queue.awaiting_approval || 0) ? "waiting" : "good"} />
          <StatusCard icon={Activity} label="Running" value={String(mission?.queue.executing || 0)} tone="neutral" />
          <StatusCard icon={Clock3} label="Waiting for Mac" value={String(mission?.queue.waiting_for_mac || 0)} tone={(mission?.queue.waiting_for_mac || 0) ? "waiting" : "neutral"} />
          <StatusCard icon={Smartphone} label="Phone requests" value={String(mission?.open_mobile_instructions || 0)} tone="neutral" />
        </section>

        <Card className="border-brand-yellow/30 bg-[#111]">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-white">Digital Brian — inside Papa Life OS</p>
              <p className="mt-1 text-sm text-white/65">Get no-model-cost guided answers and navigate your tools. ElevenLabs voice is optional. Workers run independently.</p>
            </div>
            <Button type="button" className="shrink-0 bg-brand-yellow font-bold text-black hover:bg-brand-yellow/90" onClick={() => navigate("/papa-life-os/digital-twin")}>
              <Brain className="mr-2 h-4 w-4" />Open Digital Brian
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-[#111] border-brand-yellow/30">
          <CardContent className="p-5 sm:p-7">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-yellow font-bold">Papa Life — optional website maintenance</p>
            <Button type="button" variant="outline" className="mt-3 w-full border-brand-yellow/40 text-brand-yellow" aria-expanded={assignmentOpen} aria-controls="assign-worker-form" onClick={() => setAssignmentOpen(open => !open)}>
              <ClipboardList className="mr-2 h-4 w-4" />{assignmentOpen ? "Close optional website audit" : "Open optional website audit"}
            </Button>
            {assignmentOpen && (
              <form id="assign-worker-form" onSubmit={submitWorkerAssignment} className="mt-5 space-y-3 rounded-xl border border-brand-yellow/30 bg-black/40 p-4">
                <p className="text-sm text-brand-yellow">Business: Papa Life only. AI Boss Mobility has its own dashboard.</p>
                <label htmlFor="worker-role" className="block text-sm font-semibold text-white">Available worker</label>
                <select id="worker-role" value={assignmentRole} onChange={(event) => setAssignmentRole(event.target.value)} className="w-full rounded-lg border border-white/20 bg-[#181818] p-3 text-white">
                  <option value="seo-website">Website &amp; SEO audit — read-only</option>
                </select>
                <p className="text-xs text-gray-400">Other worker roles are not enabled for mobile assignment yet. They will appear only after their execution and evidence checks are supported.</p>
                <label htmlFor="worker-instruction" className="block text-sm font-semibold text-white">What should the worker review?</label>
                <Textarea id="worker-instruction" minLength={12} maxLength={2000} required value={assignmentText} onChange={(event) => setAssignmentText(event.target.value)} placeholder={assignmentProject === "papa-life" ? "Check website links on https://papalifecoach.com" : "Check website links on https://ai.bossmobilelifecoach.com"} className="min-h-28 border-white/20 bg-[#181818] text-base" />
                <Button type="button" size="sm" variant="outline" className="border-white/30" onClick={() => setAssignmentText(assignmentProject === "papa-life" ? "Check website links on https://papalifecoach.com" : "Check website links on https://ai.bossmobilelifecoach.com")}>Use safe example</Button>
                <Button type="button" variant="outline" disabled={assignmentSaving} onClick={dictateWorkerAssignment} className="w-full border-brand-yellow/40 text-brand-yellow">
                  <Mic2 className="mr-2 h-4 w-4" />{assignmentListening ? "Finish speaking" : "Speak assignment instead of typing"}
                </Button>
                <p className="text-xs text-gray-400">This worker can only check public website pages and links. Requests to change pages, contact people, process customers, spend credits, or publish are not supported in this mobile form.</p>
                <Button type="submit" disabled={assignmentSaving || assignmentText.trim().length < 12} className="w-full bg-brand-yellow text-black hover:bg-brand-yellow/90">
                  {assignmentSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />}
                  Queue Worker Assignment
                </Button>
                {lastAssignmentId !== null && <p className="text-sm text-brand-yellow">Assignment #{lastAssignmentId} saved for approval. This does not mean the Mac worker has started.</p>}
                <Button type="button" variant="outline" className="w-full border-white/30" onClick={() => navigate("/papa-life-os/approvals")}>
                  <ShieldCheck className="mr-2 h-4 w-4" />Review Approvals &amp; Queue
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card id="papa-capture" className="bg-[#111] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Remember a fatherhood conversation</CardTitle>
            <p className="text-sm text-gray-500">Capture a conversation, relationship insight, or personal follow-up. Type on any device, or dictate where the microphone is supported.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={captureInstruction} className="space-y-3">
              <Textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="I spoke with a father about listening to his adult child. I want to remember…" className="min-h-28 bg-black/50 border-white/10 text-base" />
              <div className="grid sm:grid-cols-2 gap-3">
                <Button type="button" variant="outline" disabled={saving} onClick={() => (listening && captureMode === "father" ? stopVoice() : startVoice("father"))} className="border-brand-yellow/40 text-brand-yellow hover:bg-brand-yellow/10">
                  <Mic2 className="w-4 h-4 mr-2" />{listening && captureMode === "father" ? "Finish speaking" : "Speak fatherhood note"}
                </Button>
                <Button type="submit" disabled={saving || !instruction.trim()}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}Send to Papa Life OS</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-brand-yellow/20 bg-[#111]">
          <CardHeader><CardTitle className="text-white">Fatherhood and relationship resources</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <a href="/papa-framework" className="rounded-lg border border-white/15 p-4 text-brand-yellow underline">PAPA framework</a>
            <a href="/adult-son-relationship" className="rounded-lg border border-white/15 p-4 text-brand-yellow underline">Adult son relationships</a>
            <a href="/adult-daughter-relationship" className="rounded-lg border border-white/15 p-4 text-brand-yellow underline">Adult daughter relationships</a>
            <a href="/courses" className="rounded-lg border border-white/15 p-4 text-brand-yellow underline">Existing Papa Life resources</a>
          </CardContent>
        </Card>
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickLink icon={Users} label="Fatherhood framework" onClick={() => { window.location.href = "/papa-framework"; }} />
          <QuickLink icon={Brain} label="Digital Brian" onClick={() => navigate("/papa-life-os/digital-twin")} />
          <QuickLink icon={ShieldCheck} label="Approvals & Queue" onClick={() => navigate("/papa-life-os/approvals")} />
          <QuickLink icon={Mail} label="Relationship notes" onClick={() => document.getElementById("papa-capture")?.scrollIntoView({ behavior: "smooth", block: "start" })} />
          <QuickLink icon={CalendarDays} label="Daily Work Reports" onClick={() => navigate("/papa-daily-work-report")} />
        </section>

        <p className="text-center text-xs text-gray-600">Cloud/direct work can continue while the Mac is off. Local work waits safely for the Mac node to return.</p>
      </main>
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, tone }: { icon: typeof Activity; label: string; value: string; tone: "good" | "waiting" | "neutral" }) { const color = tone === "good" ? "text-primary" : tone === "waiting" ? "text-brand-yellow" : "text-gray-300"; return <div className="rounded-xl border border-white/10 bg-[#111] p-3"><Icon className={`w-4 h-4 ${color}`} /><p className="mt-3 text-xs text-gray-500">{label}</p><p className={`text-lg font-bold ${color}`}>{value}</p></div>; }
function QuickLink({ icon: Icon, label, onClick }: { icon: typeof Brain; label: string; onClick: () => void }) { return <button onClick={onClick} className="rounded-xl border border-white/10 bg-[#111] p-4 text-left hover:border-primary/40"><Icon className="w-5 h-5 text-primary" /><p className="mt-3 text-sm font-medium">{label}</p></button>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-white/10 bg-[#111] p-3"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 text-lg font-bold text-white">{value}</p></div>; }

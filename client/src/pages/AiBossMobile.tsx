import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Activity, BarChart3, Brain, CalendarDays, CheckCircle2, ClipboardList, CircleAlert, Clock3, ExternalLink, Laptop, Loader2, Mail, Mic, Mic2, RefreshCw, Send, ShieldCheck, Smartphone, Users } from "lucide-react";
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
  const [assignmentProject, setAssignmentProject] = useState<"papa-life" | "ai-boss-mobility">("papa-life");
  const [assignmentRole, setAssignmentRole] = useState("seo-website");
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
    manifest.href = "/ai-boss-manifest.webmanifest";
    document.head.appendChild(manifest);
    let companionTimer: number | undefined;
    fetch("/api/auth/me", { credentials: "include" }).then((response) => response.json()).then((data) => {
      if (!data.ok) navigate("/login");
      else {
        if ("serviceWorker" in navigator) {
          void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
            const aiBossScriptPath = "/ai-boss-sw.js";
            await Promise.all(
              registrations
                .filter((registration) => {
                  const scriptUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL;
                  return Boolean(scriptUrl && new URL(scriptUrl).pathname === aiBossScriptPath && new URL(registration.scope).pathname === "/");
                })
                .map((registration) => registration.unregister())
            );
            await navigator.serviceWorker.register(aiBossScriptPath, { scope: "/ai-boss" });
          }).catch((error) => console.warn("Papa Life OS service worker registration failed", error));
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
      toast.message("Use Chrome's Add to Home screen / Install app option on this device.");
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
      const summary = mode === "father" ? `I just met a father. ${clean}` : clean;
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
    await saveCapture(instruction, captureMode || "boss");
  }

  return (
    <div className="min-h-screen bg-[#090909] text-white pb-24">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <img src="/images/papa-life-approved-20261016.webp" alt="Papa Life" className="h-9 w-9 rounded-lg bg-white object-contain ring-1 ring-brand-yellow/50" />
          <div><h1 className="font-bold leading-tight">Papa Life OS</h1><p className="text-xs text-gray-500">Mobile Mission Control</p></div>
          <div className="ml-auto flex items-center gap-2">
            {!isInstalled && (
              <Button size="sm" className="bg-brand-yellow text-black hover:bg-brand-yellow/90" onClick={() => void installAiBoss()}>
                <Smartphone className="mr-2 h-4 w-4" />Install
              </Button>
            )}
            <Button size="sm" variant="outline" className="border-brand-yellow/40 text-brand-yellow hover:bg-brand-yellow/10" onClick={() => navigate("/papa-life-os/all-pages")}>All Pages</Button>
            <Button size="icon" variant="ghost" onClick={() => load()} aria-label="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-5">
        <section className="relative overflow-hidden rounded-2xl border border-brand-yellow/30 bg-[#111]">
          <img src="/images/papa-life-approved-20261016.webp" alt="Papa Life logo" className="h-44 w-full bg-white object-contain p-4 opacity-95 sm:h-56" />
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/35 to-transparent p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-yellow">Powered by AI Boss Mobility</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">Papa Life OS</h2>
            <p className="mt-1 max-w-xl text-sm text-white/75">Your secure mobile command center for Papa Life, Google Workspace, approvals, and Android messaging.</p>
          </div>
        </section>
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatusCard icon={Laptop} label="Mac" value={mission?.mac_online ? "Online" : "Offline"} tone={mission?.mac_online ? "good" : "waiting"} />
          <StatusCard icon={Smartphone} label="Android" value={mission?.nodes.some((node) => node.node_kind === "android" && node.online) ? "Online" : "Offline"} tone={mission?.nodes.some((node) => node.node_kind === "android" && node.online) ? "good" : "waiting"} />
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
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickLink icon={Brain} label="Executive Memory" onClick={() => navigate("/executive-memory")} />
          <QuickLink icon={ShieldCheck} label="Approvals & Queue" onClick={() => navigate("/papa-life-os/approvals")} />
          <QuickLink icon={Mail} label="Gmail Operations" onClick={() => navigate("/executive-memory")} />
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

import PersonalAlbumPlayer from "@/components/PersonalAlbumPlayer";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Activity, BriefcaseBusiness, CheckCircle2, ClipboardCheck, ExternalLink, Globe2, Laptop, Loader2, Mic2, RefreshCw, Send, ShieldCheck, Smartphone, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Mission = {
  mac_online: boolean;
  android_online: boolean;
  queue: { awaiting_approval: number; approved: number; executing: number; failed: number; waiting_for_mac: number };
  worker_receipts: Array<{ id: number; role: string; status: string; delivery: string; summary: string; updated_at: string }>;
};

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

const businessSite = "https://ai.bossmobilelifecoach.com";
const example = "Check website links on https://ai.bossmobilelifecoach.com";
const companionKey = "ai-boss-android-companion-id";

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Error(data.error || "Request failed (" + res.status + ")");
  return data as T;
}

export default function AiBossBusinessOS() {
  const [, navigate] = useLocation();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditText, setAuditText] = useState("");
  const [requestId, setRequestId] = useState(() => window.crypto.randomUUID());
  const [savingAudit, setSavingAudit] = useState(false);
  const [lastAssignmentId, setLastAssignmentId] = useState<number | null>(null);
  const [instruction, setInstruction] = useState("");
  const [savingInstruction, setSavingInstruction] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallEvent | null>(null);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const isAppleMobile = /iPad|iPhone|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ mission: Mission }>("/api/admin/ai-boss/mission-control?project=ai-boss-mobility");
      setMission(data.mission);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI Boss operations are temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The public website defaults to Papa Life metadata. Override the title,
    // manifest and icons only while the separate AI Boss OS route is mounted.
    const priorTitle = document.title;
    document.title = "AI Boss Mobility OS | Technology & Business";
    const restores: Array<() => void> = [];
    const brandImage = businessSite + "/images/ai-boss-journey-logo.webp";
    const apply = (selector: string, attribute: string, value: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return;
      const previous = element.getAttribute(attribute);
      element.setAttribute(attribute, value);
      restores.push(() => {
        if (previous == null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, previous);
      });
    };
    apply('link[rel="manifest"]', "href", "/ai-boss-manifest.webmanifest");
    apply('link[rel="icon"]', "href", brandImage);
    apply('link[rel="apple-touch-icon"]', "href", brandImage);
    apply('meta[name="apple-mobile-web-app-title"]', "content", "AI Boss OS");
    apply('meta[name="theme-color"]', "content", "#0e7490");
    apply('meta[name="description"]', "content", "Private AI Boss Mobility technology and consulting operations.");
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallEvent);
    };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    setInstalled(Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches || (navigator as any).standalone));
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    let timer: number | undefined;
    fetch("/api/auth/me", { credentials: "include" }).then(r => r.json()).then(async data => {
      if (!data.ok) { navigate("/login"); return; }
      await load();
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.getRegistrations().then(async registrations => {
          await Promise.all(registrations.filter(reg => {
            const script = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL;
            return Boolean(script && new URL(script).pathname === "/ai-boss-sw.js" && new URL(reg.scope).pathname === "/");
          }).map(reg => reg.unregister()));
          await navigator.serviceWorker.register("/ai-boss-sw.js", { scope: "/ai-boss" });
        }).catch(() => {});
      }
      if (/Android/i.test(navigator.userAgent)) {
        const id = (() => {
          const existing = localStorage.getItem(companionKey);
          if (existing) return existing;
          const created = "brian-android-" + (crypto.randomUUID?.() || String(Date.now()));
          localStorage.setItem(companionKey, created);
          return created;
        })();
        const tablet = /Tablet|Nexus 7|Nexus 9|SM-T|Pixel C/i.test(navigator.userAgent);
        const heartbeat = async () => {
          try {
            await apiJson("/api/admin/ai-boss/android-companion/heartbeat", {
              method: "POST", headers: { "content-type": "application/json" },
              body: JSON.stringify({ node_id: id, display_name: tablet ? "Brian's Android tablet" : "Brian's Android phone", capabilities: ["google_messages_surface", tablet ? "tablet" : "phone"] }),
            });
          } catch { /* The UI remains usable if this optional companion is disconnected. */ }
        };
        void heartbeat();
        timer = window.setInterval(() => void heartbeat(), 45_000);
      }
    }).catch(() => navigate("/login"));
    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      recognitionRef.current?.abort?.();
      document.title = priorTitle;
      restores.reverse().forEach(restore => restore());
    };
  }, [load, navigate]);

  async function install() {
    if (!installPrompt) { setInstallHelpOpen(true); return; }
    await installPrompt.prompt();
    const outcome = await installPrompt.userChoice;
    if (outcome.outcome === "accepted") { setInstalled(true); setInstallPrompt(null); }
  }

  async function queueAudit(event: FormEvent) {
    event.preventDefault();
    if (savingAudit || auditText.trim().length < 12) return;
    setSavingAudit(true);
    try {
      const data = await apiJson<{ assignment: { id: number } }>("/api/admin/ai-boss/worker-assignments", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project: "ai-boss-mobility", role: "seo-website",
          instruction: auditText.trim(), request_id: requestId,
        }),
      });
      setLastAssignmentId(data.assignment.id);
      setRequestId(crypto.randomUUID());
      setAuditText("");
      toast.success("AI Boss website check saved. It requires your approval before execution.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The assignment could not be saved.");
    } finally { setSavingAudit(false); }
  }

  async function capture(event: FormEvent) {
    event.preventDefault();
    if (!instruction.trim() || savingInstruction) return;
    setSavingInstruction(true);
    try {
      await apiJson("/api/admin/ai-boss/instructions", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ session_ref: "boss-mobile-" + Date.now(), instruction: instruction.trim() }),
      });
      setInstruction("");
      toast.success("AI Boss business instruction captured for review or authorized routing.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The instruction was not saved.");
    } finally { setSavingInstruction(false); }
  }

  function dictate() {
    if (listening) { recognitionRef.current?.stop?.(); return; }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { toast.message("Speech input is unavailable here. You can type instead."); return; }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    const before = instruction.trim();
    recognition.onresult = (event: any) => {
      const spoken = Array.from(event.results as any[]).map((result: any) => result?.[0]?.transcript || "").join(" ").trim();
      setInstruction([before, spoken].filter(Boolean).join(" ").slice(0, 2000));
    };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognition.onerror = () => { setListening(false); toast.message("Speech capture ended. You can finish typing."); };
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); }
    catch { toast.message("The microphone could not start."); }
  }

  return (
    <div className="min-h-screen bg-[#07121f] pb-20 text-white">
      <main className="mx-auto max-w-5xl space-y-5 p-4">
        <header className="overflow-hidden rounded-2xl border border-sky-500/40 bg-[#101e2d]">
          <div className="bg-[#fff8eb] px-4 py-3 sm:px-8 sm:py-5">
            <img src={businessSite + "/images/ai-boss-journey-logo.webp"} alt="AI Boss Mobility — Dream, Plan, Build, Grow" className="mx-auto max-h-64 w-full object-contain" />
          </div>
          <div className="p-5 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Technology · Strategy · Business Solutions</p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">AI Boss Mobility OS</h1>
            <p className="mt-2 text-sm text-slate-300">Your private command center for AI consulting, business systems, website checks, and client delivery reviews. Papa Life work is kept in its own dashboard.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={() => navigate("/ai-boss/approvals")} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"><ShieldCheck className="mr-2 h-4 w-4" />Business approvals</Button>
              <Button variant="outline" onClick={() => void load()} className="border-sky-400/50 text-cyan-100"><RefreshCw className={"mr-2 h-4 w-4 " + (loading ? "animate-spin" : "")} />Refresh</Button>
              {!installed && <Button variant="outline" onClick={() => void install()} className="border-sky-400/50 text-cyan-100"><Smartphone className="mr-2 h-4 w-4" />Install AI Boss OS</Button>}
            </div>
          </div>
        </header>

        <PersonalAlbumPlayer brand="ai" />
        {installHelpOpen && !installed && (
          <Card className="border-cyan-400/30 bg-[#101e2d]">
            <CardContent className="p-4 text-sm text-slate-200">
              <p className="font-semibold text-cyan-300">Install AI Boss Mobility OS</p>
              <p className="mt-2">{isAppleMobile ? "On iPhone or iPad, open this page in Safari, tap Share, choose Add to Home Screen, then Add." : /Android/i.test(navigator.userAgent) ? "On Android Chrome, choose Install app or Add to Home screen from the browser menu." : "In your desktop browser, use Install app in the address bar or browser menu. Installation is optional."}</p>
              <Button className="mt-3" variant="outline" onClick={() => setInstallHelpOpen(false)}>Close</Button>
            </CardContent>
          </Card>
        )}

        <section aria-label="AI Boss business status" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Status icon={Laptop} label="Mac worker" value={mission?.mac_online ? "Online" : "Not connected"} />
          <Status icon={ShieldCheck} label="Approvals needed" value={String(mission?.queue.awaiting_approval ?? 0)} />
          <Status icon={Activity} label="Executing" value={String(mission?.queue.executing ?? 0)} />
          <Status icon={ClipboardCheck} label="Waiting for Mac" value={String(mission?.queue.waiting_for_mac ?? 0)} />
        </section>

        <Card className="border-cyan-400/25 bg-[#101e2d]">
          <CardHeader><CardTitle className="text-white">Run your business from here</CardTitle><p className="text-sm text-slate-300">These are AI Boss Mobility tools—not fatherhood or Papa Life work.</p></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button className="min-h-12 justify-start bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={() => setAuditOpen(v => !v)}><Globe2 className="mr-2 h-4 w-4" />Check the AI Boss website</Button>
            <Button variant="outline" className="min-h-12 justify-start border-sky-400/40 text-cyan-100" onClick={() => navigate("/ai-boss/approvals")}><ShieldCheck className="mr-2 h-4 w-4" />Review business assignments</Button>
            <Button variant="outline" className="min-h-12 justify-start border-sky-400/40 text-cyan-100" onClick={() => { window.location.href = "/ai-boss-delivery-review"; }}><BriefcaseBusiness className="mr-2 h-4 w-4" />Review client deliverables</Button>
            <a href={businessSite} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center rounded-md border border-sky-400/40 px-4 text-sm font-medium text-cyan-100 hover:bg-sky-400/10"><ExternalLink className="mr-2 h-4 w-4" />Open AI Boss Mobility website</a>
          </CardContent>
        </Card>

        {auditOpen && <Card className="border-cyan-400/25 bg-[#101e2d]"><CardHeader><CardTitle className="text-white">Safe AI Boss website audit</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={queueAudit} className="space-y-3">
              <p className="text-sm text-slate-300">The website worker can only check public pages and links. No edits, sales outreach, purchases, or model charges.</p>
              <label htmlFor="boss-audit-instruction" className="text-sm font-semibold">What should the website worker check?</label>
              <Textarea id="boss-audit-instruction" minLength={12} maxLength={2000} required value={auditText} onChange={event => setAuditText(event.target.value)} className="min-h-24 border-sky-400/30 bg-[#07121f]" placeholder={example} />
              <Button type="button" variant="outline" className="border-sky-400/40 text-cyan-200" onClick={() => setAuditText(example)}>Use safe example</Button>
              <Button type="submit" disabled={savingAudit || auditText.trim().length < 12} className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300">{savingAudit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}Queue AI Boss website check</Button>
              {lastAssignmentId != null && <p className="text-sm text-cyan-200">Assignment #{lastAssignmentId} saved. Approve it on the AI Boss approvals screen to start the worker.</p>}
            </form>
          </CardContent>
        </Card>}

        <Card className="border-sky-400/20 bg-[#101e2d]">
          <CardHeader><CardTitle className="text-white">Capture a business instruction</CardTitle><p className="text-sm text-slate-300">Record a consulting, system, or client-service task. Instructions use the existing protected owner review process.</p></CardHeader>
          <CardContent><form onSubmit={capture} className="space-y-3">
            <Textarea maxLength={2000} value={instruction} onChange={event => setInstruction(event.target.value)} placeholder="Review my AI Boss consulting follow-ups, website technology, or client delivery tasks…" className="min-h-28 border-sky-400/30 bg-[#07121f]" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={dictate} className="border-sky-400/40 text-cyan-200"><Mic2 className="mr-2 h-4 w-4" />{listening ? "Finish dictation" : "Speak instruction"}</Button>
              <Button type="submit" disabled={savingInstruction || !instruction.trim()} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"><Send className="mr-2 h-4 w-4" />Save business instruction</Button>
            </div>
          </form></CardContent>
        </Card>

        <Card className="border-sky-400/20 bg-[#101e2d]">
          <CardHeader><CardTitle className="text-white">Recent AI Boss worker results</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(mission?.worker_receipts || []).length === 0 ? <p className="text-sm text-slate-300">No AI Boss worker results in the recent history.</p> : (mission?.worker_receipts || []).slice(0, 5).map(item => (
              <div key={item.id} className="rounded-xl border border-white/15 p-3 text-sm">
                <div className="flex items-center justify-between gap-2"><strong>Assignment #{item.id}</strong><span className="text-cyan-300">{item.delivery === "verified" ? "Verified complete" : item.status.replace(/_/g, " ")}</span></div>
                {item.summary && <p className="mt-2 text-slate-300">{item.summary}</p>}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-4 text-sm">
          <p className="text-slate-400">Cloud dashboard access works when your Mac is off. Local website audits wait for the Mac.</p>
          <a href="/papa-life-os" className="text-slate-400 underline hover:text-white">Switch to Papa Life OS — separate people-focused dashboard</a>
        </div>
      </main>
    </div>
  );
}

function Status({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return <div className="rounded-xl border border-sky-400/25 bg-[#101e2d] p-3"><Icon className="h-5 w-5 text-cyan-300" /><p className="mt-2 text-xs text-slate-400">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>;
}

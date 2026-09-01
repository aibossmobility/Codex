import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Activity, Brain, CalendarDays, CheckCircle2, CircleAlert, Clock3, Laptop, Loader2, Mail, Mic2, Play, RefreshCw, Send, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Mission = {
  mac_online: boolean;
  open_mobile_instructions: number;
  queue: { awaiting_approval: number; approved: number; executing: number; failed: number; waiting_for_mac: number };
  nodes: Array<{ node_id: string; display_name: string; online: boolean; capabilities: string[]; last_seen_at: string }>;
};

const liveUrl = "https://meetn.com/briankeithhill";
const youtubeStudioUrl = "https://studio.youtube.com/";
const todayTopic = "Rebuilding Trust in Small Deposits";

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
    fetch("/api/auth/me", { credentials: "include" }).then((response) => response.json()).then((data) => {
      if (!data.ok) navigate("/login");
      else if (!data.user?.researchLabAccess) navigate("/crm-console");
      else void load();
    }).catch(() => navigate("/login"));
    return () => manifest.remove();
  }, [load, navigate]);

  async function captureInstruction(event: FormEvent) {
    event.preventDefault();
    if (!instruction.trim()) return;
    setSaving(true);
    try {
      await apiJson("/api/admin/executive-conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_ref: `mobile-${Date.now()}`,
          channel: "other",
          summary: instruction.trim(),
          user_intent: instruction.trim(),
          next_action: "Review and route through AI Boss OS authority controls.",
          status: "active",
        }),
      });
      setInstruction("");
      toast.success("Instruction captured. It will not be lost if the Mac goes offline.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Instruction could not be captured.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#090909] text-white pb-24">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3"><Brain className="w-7 h-7 text-primary" /><div><h1 className="font-bold leading-tight">AI Boss OS</h1><p className="text-xs text-gray-500">Papa Life Mission Control</p></div><Button size="icon" variant="ghost" className="ml-auto" onClick={() => load()} aria-label="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button></div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-5">
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatusCard icon={Laptop} label="Mac" value={mission?.mac_online ? "Online" : "Offline"} tone={mission?.mac_online ? "good" : "waiting"} />
          <StatusCard icon={CircleAlert} label="Approvals" value={String(mission?.queue.awaiting_approval || 0)} tone={(mission?.queue.awaiting_approval || 0) ? "waiting" : "good"} />
          <StatusCard icon={Activity} label="Running" value={String(mission?.queue.executing || 0)} tone="neutral" />
          <StatusCard icon={Clock3} label="Waiting for Mac" value={String(mission?.queue.waiting_for_mac || 0)} tone={(mission?.queue.waiting_for_mac || 0) ? "waiting" : "neutral"} />
          <StatusCard icon={Smartphone} label="Phone requests" value={String(mission?.open_mobile_instructions || 0)} tone="neutral" />
        </section>

        <Card className="bg-[#111] border-white/10">
          <CardHeader><CardTitle className="text-white">What do you want done?</CardTitle><p className="text-sm text-gray-500">Capture an instruction from your phone. AI Boss OS stores it now and routes it later without requiring a paid model call.</p></CardHeader>
          <CardContent><form onSubmit={captureInstruction} className="space-y-3"><Textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Check Papa Life, review my Gmail, prepare a follow-up, or queue work for my Mac…" className="min-h-28 bg-black/50 border-white/10 text-base" /><Button type="submit" disabled={saving || !instruction.trim()} className="w-full sm:w-auto">{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}Send to AI Boss</Button></form></CardContent>
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
function Checklist({ items }: { items: string[] }) { return <div className="rounded-lg bg-black/40 p-4"><p className="font-semibold">Go-live checklist</p><ul className="mt-2 space-y-2">{items.map((item) => <li key={item} className="flex gap-2 text-gray-400"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{item}</li>)}</ul></div>; }

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Activity, ArrowLeft, CheckCircle2, Clock3, Laptop, Loader2, RefreshCw, Send, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ANDROID_COMPANION_STORAGE_KEY, ANDROID_HEARTBEAT_INTERVAL_MS, isAndroidUserAgent, mobileTakeoverSessionRef, phoneIsInControl } from "@/lib/ai-boss-companion";

type Mission = {
  mac_online: boolean;
  android_online: boolean;
  active_companion: "android" | "mac" | null;
  open_mobile_instructions: number;
  queue: { awaiting_approval: number; executing: number; waiting_for_mac: number };
};

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export default function AiBossTakeover() {
  const [, navigate] = useLocation();
  const [mission, setMission] = useState<Mission | null>(null);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ mission: Mission }>("/api/admin/ai-boss/mission-control");
      setMission(data.mission);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI Boss status could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let companionTimer: number | undefined;
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) navigate("/login");
        else if (!data.user?.researchLabAccess) navigate("/crm-console");
        else {
          setAuthorized(true);
          void load();
          if (isAndroidUserAgent(window.navigator.userAgent)) {
            const heartbeat = async () => {
              const existing = window.localStorage.getItem(ANDROID_COMPANION_STORAGE_KEY);
              const suffix = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
              const nodeId = existing || `brian-android-${suffix}`;
              if (!existing) window.localStorage.setItem(ANDROID_COMPANION_STORAGE_KEY, nodeId);
              try {
                await apiJson("/api/admin/ai-boss/android-companion/heartbeat", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ node_id: nodeId, display_name: "Brian's Android phone" }),
                });
                await load();
              } catch {
                // Keep the user-controlled page available if status reporting fails.
              }
            };
            void heartbeat();
            companionTimer = window.setInterval(() => void heartbeat(), ANDROID_HEARTBEAT_INTERVAL_MS);
          }
        }
      })
      .catch(() => navigate("/login"));
    return () => { if (companionTimer) window.clearInterval(companionTimer); };
  }, [load, navigate]);

  async function sendInstruction(event: FormEvent) {
    event.preventDefault();
    const clean = instruction.trim();
    if (!clean) return;
    setSaving(true);
    try {
      await apiJson("/api/admin/executive-conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          session_ref: mobileTakeoverSessionRef(),
          channel: "other",
          summary: clean,
          user_intent: clean,
          next_action: "Route through AI Boss OS authority controls. Execute cloud/direct work now, require explicit approval for consequential work, and hold Mac-local work safely until the Mac returns.",
          status: "active",
        }),
      });
      setInstruction("");
      toast.success("Instruction sent to AI Boss OS.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Instruction could not be sent.");
    } finally {
      setSaving(false);
    }
  }

  const phoneInControl = phoneIsInControl(mission);

  if (!authorized) return <div className="min-h-screen bg-[#090909]" aria-label="Checking AI Boss access" />;

  return (
    <div className="min-h-screen bg-[#090909] text-white pb-24">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate("/ai-boss")} aria-label="Back to AI Boss"><ArrowLeft className="h-4 w-4" /></Button>
          <Smartphone className="h-6 w-6 text-brand-yellow" />
          <div><h1 className="font-bold">Phone Takeover</h1><p className="text-xs text-gray-500">AI Boss OS companion control</p></div>
          <Button size="icon" variant="ghost" className="ml-auto" onClick={() => void load()} aria-label="Refresh"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <Card className={`border-2 ${phoneInControl ? "border-primary/70 bg-primary/10" : "border-brand-yellow/50 bg-[#111]"}`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              {phoneInControl ? <CheckCircle2 className="h-8 w-8 text-primary" /> : <Clock3 className="h-8 w-8 text-brand-yellow" />}
              <div>
                <p className="text-xl font-black">{phoneInControl ? "PHONE IS IN CONTROL" : "PHONE READY"}</p>
                <p className="mt-1 text-sm text-gray-400">{phoneInControl ? "Cloud and direct work can continue from Android while the Mac is offline." : "Android will become the active companion automatically when the Mac goes offline."}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="grid grid-cols-2 gap-3">
          <Status icon={Laptop} label="Mac" value={mission?.mac_online ? "Online" : "Offline"} />
          <Status icon={Smartphone} label="Android" value={mission?.android_online ? "Online" : "Offline"} />
          <Status icon={ShieldCheck} label="Approvals" value={String(mission?.queue.awaiting_approval || 0)} />
          <Status icon={Activity} label="Running" value={String(mission?.queue.executing || 0)} />
        </section>

        <Button className="h-14 w-full text-base font-bold" onClick={() => navigate("/ai-boss/approvals")}>
          <ShieldCheck className="mr-2 h-5 w-5" />Approve / Decline Actions
        </Button>

        <Card className="border-white/10 bg-[#111]">
          <CardHeader><CardTitle className="text-white">Tell AI Boss what to do</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={sendInstruction} className="space-y-3">
              <Textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Check email, prepare a response, review status, continue a workflow, or queue Mac-local work…" className="min-h-32 border-white/10 bg-black/50 text-base" />
              <Button type="submit" disabled={saving || !instruction.trim()} className="w-full">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send to AI Boss
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500">Mac-only work never bypasses local credentials. It waits safely for the Mac to return.</p>
      </main>
    </div>
  );
}

function Status({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-[#111] p-4"><Icon className="h-5 w-5 text-brand-yellow" /><p className="mt-3 text-xs text-gray-500">{label}</p><p className="text-lg font-bold text-white">{value}</p></div>;
}

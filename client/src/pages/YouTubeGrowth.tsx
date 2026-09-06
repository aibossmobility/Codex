import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, CheckCircle2, Eye, Loader2, PlayCircle, Search, Sparkles, Target } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const modules = [
  ["Channel Scanner", "Pull performance baselines and rank opportunity.", BarChart3],
  ["Keyword Intelligence", "Find father/adult-child search themes and content gaps.", Search],
  ["Packaging Lab", "Generate stronger titles, descriptions, and thumbnail concepts.", Sparkles],
  ["Retention Coach", "Identify weak openings, pacing problems, and watch-time leaks.", PlayCircle],
  ["Audience Quality", "Track whether traffic is reaching the fathers Papa Life actually serves.", Target],
  ["Approval Gate", "No YouTube change publishes until Brian approves it.", CheckCircle2],
] as const;

type PilotItem = { recommendation: { videoId: string; priorityScore: number; diagnosis: string[]; recommendedActions: string[] }; metrics?: { title: string; impressions: number; clickThroughRate: number; views: number; watchTimeMinutes: number; averageViewDurationSeconds: number; averageViewPercentage: number; subscribersGained: number } };

async function apiJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export default function YouTubeGrowth() {
  const [, navigate] = useLocation();
  const [authorized, setAuthorized] = useState(false);
  const [connected, setConnected] = useState(false);
  const [channelTitle, setChannelTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [pilot, setPilot] = useState<PilotItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const auth = await apiJson<any>("/api/auth/me");
        if (!auth.ok) return navigate("/login");
        if (!auth.user?.researchLabAccess) return navigate("/crm-console");
        if (cancelled) return;
        setAuthorized(true);
        const status = await apiJson<any>("/api/admin/ai-boss/youtube/status");
        if (cancelled) return;
        setConnected(Boolean(status.connected));
        setChannelTitle(String(status.channel?.title || ""));
        if (status.connected) {
          const result = await apiJson<any>("/api/admin/ai-boss/youtube/pilot");
          if (!cancelled) setPilot(result.selected || []);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  async function connectYouTube() {
    setConnecting(true); setError("");
    try {
      const result = await apiJson<{ url: string }>("/api/admin/ai-boss/youtube/authorization-url");
      window.location.assign(result.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConnecting(false);
    }
  }

  if (loading || !authorized) return <main className="min-h-screen bg-zinc-950 text-white grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-yellow-300" /></main>;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/ai-boss" className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white"><ArrowLeft className="h-4 w-4" /> AI Boss OS</Link>
          <span className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-300">YouTube Growth Engine v1</span>
        </div>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 md:p-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-yellow-300">Papa Life pilot</p>
          <h1 className="max-w-3xl text-3xl font-black tracking-tight md:text-5xl">Turn YouTube performance into a weekly operating system.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300 md:text-lg">Analyze → recommend → approve → change → measure → learn. Routine scoring stays local and low-cost; AI is reserved for creative work and deeper diagnosis.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4"><div className="text-xs uppercase tracking-wider text-zinc-500">Connection</div><div className="mt-1 font-semibold">{connected ? `Connected${channelTitle ? ` · ${channelTitle}` : ""}` : "YouTube authorization required"}</div></div>
            <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4"><div className="text-xs uppercase tracking-wider text-zinc-500">Pilot size</div><div className="mt-1 font-semibold">3 videos</div></div>
            <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4"><div className="text-xs uppercase tracking-wider text-zinc-500">Publishing rule</div><div className="mt-1 font-semibold">Approval required</div></div>
          </div>
          {!connected ? <Button onClick={connectYouTube} disabled={connecting} className="mt-6">{connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Connect Papa Life YouTube</Button> : null}
          {error ? <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2"><Eye className="h-5 w-5 text-yellow-300" /><h2 className="text-xl font-bold">First 3-video experiment</h2></div>
          {!connected ? <p className="text-zinc-400">Connect YouTube above. AI Boss OS will then select the three strongest optimization opportunities from the last 28 days of real channel data.</p> : null}
          {connected && !pilot.length && !error ? <p className="text-zinc-400">Connected. No qualifying pilot data was returned yet.</p> : null}
          <div className="grid gap-4 lg:grid-cols-3">
            {pilot.map(({ recommendation, metrics }) => <article key={recommendation.videoId} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Opportunity score {recommendation.priorityScore}</div>
              <h3 className="mt-2 text-lg font-bold">{metrics?.title || recommendation.videoId}</h3>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm"><span>Impressions {metrics?.impressions ?? 0}</span><span>CTR {Number(metrics?.clickThroughRate || 0).toFixed(1)}%</span><span>Views {metrics?.views ?? 0}</span><span>Viewed {Number(metrics?.averageViewPercentage || 0).toFixed(1)}%</span></div>
              <div className="mt-4 rounded-xl bg-zinc-950 p-3 text-sm text-zinc-300"><p>{recommendation.diagnosis[0]}</p><p className="mt-2 text-yellow-300">Next: {recommendation.recommendedActions.join(", ") || "observe"}</p></div>
            </article>)}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{modules.map(([name, description, Icon]) => <div key={name} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5"><Icon className="h-5 w-5 text-yellow-300" /><h3 className="mt-3 font-bold">{name}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p></div>)}</section>
      </div>
    </main>
  );
}

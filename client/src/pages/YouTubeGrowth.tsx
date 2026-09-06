import { useMemo, useState } from "react";
import { ArrowLeft, BarChart3, CheckCircle2, Eye, PlayCircle, Search, Sparkles, Target } from "lucide-react";
import { Link } from "wouter";

const pilotVideos = [
  {
    id: "pilot-1",
    title: "When Your Adult Child Pulls Away",
    role: "High-potential live video",
    status: "Ready for baseline",
    next: "Capture impressions, CTR, watch time, retention, and subscriber gain.",
  },
  {
    id: "pilot-2",
    title: "Listening Without Defending",
    role: "Relationship repair topic",
    status: "Ready for baseline",
    next: "Compare title/thumbnail strength against viewer retention.",
  },
  {
    id: "pilot-3",
    title: "Apology Without Explanation",
    role: "Search-intent topic",
    status: "Ready for baseline",
    next: "Test discoverability and qualified fatherhood traffic.",
  },
];

const modules = [
  ["Channel Scanner", "Pull performance baselines and rank opportunity.", BarChart3],
  ["Keyword Intelligence", "Find father/adult-child search themes and content gaps.", Search],
  ["Packaging Lab", "Generate stronger titles, descriptions, and thumbnail concepts.", Sparkles],
  ["Retention Coach", "Identify weak openings, pacing problems, and watch-time leaks.", PlayCircle],
  ["Audience Quality", "Track whether traffic is reaching the fathers Papa Life actually serves.", Target],
  ["Approval Gate", "No YouTube change publishes until Brian approves it.", CheckCircle2],
] as const;

export default function YouTubeGrowth() {
  const [connected] = useState(false);
  const readiness = useMemo(() => (connected ? "Connected" : "YouTube authorization required"), [connected]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/ai-boss" className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> AI Boss OS
          </Link>
          <span className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-300">
            YouTube Growth Engine v1
          </span>
        </div>

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 md:p-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-yellow-300">Papa Life pilot</p>
          <h1 className="max-w-3xl text-3xl font-black tracking-tight md:text-5xl">Turn YouTube performance into a weekly operating system.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300 md:text-lg">
            Analyze → recommend → approve → change → measure → learn. Routine scoring stays local and low-cost; AI is reserved for creative work and deeper diagnosis.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
              <div className="text-xs uppercase tracking-wider text-zinc-500">Connection</div>
              <div className="mt-1 font-semibold">{readiness}</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
              <div className="text-xs uppercase tracking-wider text-zinc-500">Pilot size</div>
              <div className="mt-1 font-semibold">3 videos</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
              <div className="text-xs uppercase tracking-wider text-zinc-500">Publishing rule</div>
              <div className="mt-1 font-semibold">Approval required</div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-yellow-300" />
            <h2 className="text-xl font-bold">First 3-video experiment</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {pilotVideos.map((video) => (
              <article key={video.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{video.role}</div>
                <h3 className="mt-2 text-lg font-bold">{video.title}</h3>
                <div className="mt-4 rounded-xl bg-zinc-950 p-3 text-sm text-zinc-300">
                  <div className="font-semibold text-yellow-300">{video.status}</div>
                  <p className="mt-1 leading-6">{video.next}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map(([name, description, Icon]) => (
            <div key={name} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
              <Icon className="h-5 w-5 text-yellow-300" />
              <h3 className="mt-3 font-bold">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <h2 className="font-bold text-emerald-200">What v1 will measure</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-50/80">
            Impressions, click-through rate, views, average view duration, total watch time, subscriber gain, and qualified Papa Life traffic. The system will compare before/after results before recommending broader rollout.
          </p>
        </section>
      </div>
    </main>
  );
}

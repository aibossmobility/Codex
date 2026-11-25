import { useRef, useState } from "react";
import { tracksByTitle } from "@/content/music-room-tracks";

export default function PersonalAlbumPlayer({ brand }: { brand: "papa" | "ai" }) {
  const audio = useRef<HTMLAudioElement>(null);
  const index = useRef(0);
  const [selected, setSelected] = useState(0);
  const [message, setMessage] = useState("");
  const [repeat, setRepeat] = useState(false);
  const [title, , credit] = tracksByTitle[selected];
  const url = (name: string) => "/music-room/album-2026/" + name;
  const papa = brand === "papa";
  function playTrack(i: number) {
    const player = audio.current;
    if (!player || i < 0 || i >= tracksByTitle.length) return;
    index.current = i;
    setSelected(i);
    setMessage("");
    player.src = url(tracksByTitle[i][1]);
    player.load();
    void player.play().catch((error: unknown) => {
      if (index.current === i && !(error instanceof DOMException && error.name === "AbortError")) setMessage("Press play to continue listening.");
    });
  }
  function next() {
    if (index.current < tracksByTitle.length - 1) playTrack(index.current + 1);
    else if (repeat) playTrack(0);
    else setMessage("Album complete. Choose Listen Free to start again.");
  }
  return (
    <section aria-label="Personal album player" className={"rounded-2xl border p-4 text-white sm:p-5 " + (papa ? "border-brand-yellow/40 bg-[#111]" : "border-sky-500/40 bg-[#101e2d]")}>
      <p className={"text-xs font-bold uppercase tracking-widest " + (papa ? "text-brand-yellow" : "text-cyan-300")}>{papa ? "Faith · Fatherhood · Purpose" : "Keep Your Humanity. Think Critically. Use AI Wisely."}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold">Brian Keith Hill’s AI Album of 2026</h2><p className="text-sm text-white/70">16 songs · Free continuous listening</p></div>
        <button type="button" className={"rounded-full px-5 py-2 font-bold " + (papa ? "bg-brand-yellow text-black" : "bg-cyan-400 text-slate-950")} onClick={() => playTrack(0)}>▶ Listen Free</button>
      </div>
      <label className="mt-3 block text-sm text-white/80" htmlFor={brand + "-album-track"}>Choose a song</label>
      <select id={brand + "-album-track"} value={selected} onChange={e => playTrack(Number(e.target.value))} className="mt-1 w-full rounded-md border border-white/30 bg-[#111827] p-2 text-white">
        {tracksByTitle.map(([name, f], i) => <option key={f} value={i}>{i + 1}. {name}</option>)}
      </select>
      <p className="mt-2 text-sm font-medium">{selected + 1} / {tracksByTitle.length} · {title}</p>
      <p className="text-xs text-white/70">{credit}</p>
      <audio ref={audio} controls preload="none" src={url(tracksByTitle[0][1])} aria-label="Personal music playback" className="mt-2 w-full" onEnded={next} onPlay={() => setMessage("")} onError={() => setMessage("Unable to load this recording. Choose another song or try again.")}/>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <button type="button" disabled={selected === 0} onClick={() => playTrack(index.current - 1)} className="rounded border border-white/30 px-3 py-2 disabled:opacity-40">← Previous</button>
        <button type="button" disabled={selected === tracksByTitle.length - 1 && !repeat} onClick={next} className="rounded border border-white/30 px-3 py-2 disabled:opacity-40">Next →</button>
        <label className="flex items-center gap-2"><input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)}/>Repeat album</label>
        <a href="https://papalifecoach.com/music-room#lyrics" target="_blank" rel="noopener noreferrer" className="underline">Full lyrics</a>
      </div>
      {message && <p role="status" className="mt-2 text-sm text-white/80">{message}</p>}
    </section>
  );
}

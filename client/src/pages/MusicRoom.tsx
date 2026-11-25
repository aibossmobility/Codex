import { useRef, useState } from "react";
import albumLyrics from "@/content/music-room-lyrics.json";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { HouseTrail } from "./PapaHouse";

const tracks: ReadonlyArray<readonly [string, keyof typeof albumLyrics, string]> = [
  ["Believe, Encourage, and Live", "believe-encourage-live.m4a", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Black Men Speak", "black-men-speak.mp3", "Lyrics: Brian Hill · Music / arrangement: William Whitley"],
  ["Dad’s Love (Slow Ballad)", "dads-love.m4a", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Do You Want to Find Your GPS? 1", "find-your-gps.m4a", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Do You Want to Find Your GPS? 2", "gps-suno.mp3", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Dream and Pray 1", "dream-first-suno.mp3", "Lyrics: Brian Hill · Music / arrangement: William Whitley"],
  ["Dream and Pray 2", "dream-and-pray.m4a", "Lyrics: Brian Hill · Music / arrangement: William Whitley"],
  ["Fathers of Adult Children 1", "foadc-ballad.m4a", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Fathers of Adult Children 2", "foadc-da7743c6.m4a", "Lyrics: Brian Hill · Music / arrangement: William Whitley"],
  ["God Above 1", "god-above-60e62206.m4a", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["God Above 2", "god-above-f75554a5.m4a", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["More Than You Know", "more-than-you-know-20fac5a1.m4a", "Lyrics: Brian Hill · Music / arrangement: William Whitley"],
  ["You Are God Above 3", "you-are-god-above-b370237f.mp3", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Your Purpose Lives On 1", "your-purpose.m4a", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Your Purpose Lives On 2", "purpose-suno.mp3", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
  ["Your Purpose Lives On 3", "purpose-e27fed7f.mp3", "Lyrics: Brian Hill · Music / arrangement: Brian Hill & Suno AI"],
];

const tracksByTitle = [...tracks].sort(([first], [second]) => first.localeCompare(second, "en", { numeric: true, sensitivity: "base" }));

export default function MusicRoom() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeIndex = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatAlbum, setRepeatAlbum] = useState(false);
  const [status, setStatus] = useState("");
  const [openLyric, setOpenLyric] = useState<number | null>(null);
  const [currentTitle, , currentCredit] = tracksByTitle[currentIndex];
  const trackNumber = (index: number) => String(index + 1).padStart(2, "0");
  const audioPath = (file: string) => "/music-room/album-2026/" + file;

  function playTrack(index: number) {
    const player = audioRef.current;
    if (!player || index < 0 || index >= tracksByTitle.length) return;
    activeIndex.current = index;
    setCurrentIndex(index);
    setStatus("");
    player.src = audioPath(tracksByTitle[index][1]);
    player.load();
    void player.play().catch((error: unknown) => {
      if (activeIndex.current === index && !(error instanceof DOMException && error.name === "AbortError")) {
        setStatus("Press play on the album player to continue listening.");
      }
    });
  }

  function nextTrack() {
    const next = activeIndex.current + 1;
    if (next < tracksByTitle.length) playTrack(next);
    else if (repeatAlbum) playTrack(0);
    else {
      setIsPlaying(false);
      setStatus("Album complete. Choose Play All to listen again.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f4e8] text-[#16251b]">
      <PageMeta title="Brian Keith Hill’s AI Album of 2026 | Papa Life Music Room" description="Listen to Brian Keith Hill’s original music and selected AI-assisted recordings in the Papa Life Music Room." />
      <nav aria-label="Music Room navigation" className="container flex items-center justify-between gap-4 py-4">
        <a href="/" aria-label="Papa Life home"><SiteLogo size="md" /></a>
        <a href="/house" className="font-semibold underline underline-offset-4">Explore the House</a>
      </nav>
      <header className="border-b-8 border-[#af352d] bg-[#10291e] text-white">
        <div className="container max-w-4xl py-7 sm:py-10">
          <p className="mb-5 text-sm font-bold uppercase tracking-widest text-[#f3d16d]">Papa Life Music Room</p>
          <h1 className="max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">Brian Keith Hill’s AI Album of 2026</h1>
          <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-base text-white">
            <span><strong>Music &amp; arrangements</strong> — William Whitley or Brian Hill with Suno AI, as credited per track</span>
            <span><strong>Brian Hill</strong> — Lyrics on all 16 recordings</span>
          </p>
          <p className="mt-4 max-w-prose leading-relaxed text-white">
            William (Bill) Whitley and Brian Hill share a friendship rooted in music and faith.
            We’re brothers in Christ and fathers of adult children, and we love helping,
            encouraging, and supporting people. This album includes our collaborations
            alongside Brian’s recordings arranged with Suno AI.
          </p>
          <p className="mt-5 text-lg text-[#f3d16d]">To my family, whom I love deeply.</p>
        </div>
      </header>
      <section id="listen" aria-labelledby="album-heading" className="container max-w-4xl py-6">
        <div className="overflow-hidden rounded-2xl border border-[#c6cbbf] bg-white shadow-sm">
          <div className="bg-[#10291e] p-4 text-white sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="album-heading" className="font-serif text-2xl">Listen to the album</h2>
                <p className="mt-1 text-sm text-[#f3d16d]">{tracksByTitle.length} tracks · Continuous playback</p>
              </div>
              <button type="button" onClick={() => playTrack(0)} className="rounded-full bg-[#f3d16d] px-5 py-2.5 font-bold text-[#10291e] hover:bg-[#ffe59d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                ▶ Play All
              </button>
            </div>
            <div className="mt-4 rounded-xl bg-white/10 p-3">
              <p aria-live="polite" className="text-xs font-semibold uppercase tracking-wider text-[#f3d16d]">
                {isPlaying ? "Now playing" : "Selected track"} · {trackNumber(currentIndex)} / {tracksByTitle.length}
              </p>
              <p className="mt-1 text-lg font-semibold">{currentTitle}</p>
              <p className="mt-1 text-sm text-white/80">{currentCredit}</p>
              <audio ref={audioRef} controls preload="none" aria-label="Album audio player" className="mt-3 w-full"
                src={audioPath(tracksByTitle[0][1])}
                onPlay={() => { setIsPlaying(true); setStatus(""); }}
                onPause={() => setIsPlaying(false)}
                onEnded={nextTrack}
                onError={() => { setIsPlaying(false); setStatus("This recording could not load. Try Play again or choose another track."); }} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex gap-2">
                  <button type="button" disabled={currentIndex === 0} onClick={() => playTrack(activeIndex.current - 1)} className="rounded-lg border border-white/40 px-3 py-2 disabled:opacity-40">← Previous</button>
                  <button type="button" disabled={currentIndex === tracksByTitle.length - 1 && !repeatAlbum} onClick={nextTrack} className="rounded-lg border border-white/40 px-3 py-2 disabled:opacity-40">Next →</button>
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={repeatAlbum} onChange={event => setRepeatAlbum(event.target.checked)} />
                  Repeat album
                </label>
              </div>
              {status && <p role="status" className="mt-2 text-sm text-[#f3d16d]">{status}</p>}
            </div>
          </div>
          <ol aria-label="Album tracklist" className="divide-y divide-[#e4e8df] sm:grid sm:grid-cols-2 sm:divide-y-0">
            {tracksByTitle.map(([title, file, credit], index) => (
              <li key={file} className="min-w-0 sm:border-b sm:border-[#e4e8df]">
                <button type="button" aria-label={`Play track ${index + 1}: ${title}`} aria-current={currentIndex === index ? "true" : undefined}
                  onClick={() => playTrack(index)}
                  className={`flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[#f3f5ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#21472a] ${currentIndex === index ? "bg-[#e4eddf] font-semibold" : ""}`}>
                  <span className="w-6 shrink-0 font-mono text-[#556353]">{trackNumber(index)}</span>
                  <span className="min-w-0 flex-1"><span className="block">{title}</span><span className="mt-0.5 block text-xs font-normal text-[#556353]">{credit}</span></span>
                  <span aria-hidden="true" className="shrink-0 text-[#21472a]">{currentIndex === index && isPlaying ? "♫" : "▶"}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section id="lyrics" aria-labelledby="lyrics-heading" className="container max-w-4xl pb-8">
        <details className="rounded-2xl border border-[#c6cbbf] bg-white shadow-sm">
          <summary className="cursor-pointer px-5 py-4 text-[#21472a]">
            <span id="lyrics-heading" className="font-serif text-xl font-bold">Lyrics index</span>
            <span className="ml-2 text-sm font-normal text-[#556353]">· {tracksByTitle.length} songs</span>
          </summary>
          <div className="border-t border-[#e4e8df] px-3 pb-3 sm:px-5">
            <p className="py-3 text-sm text-[#556353]">Choose a song to read its lyrics or play it in the album player.</p>
            <ol aria-label="Song lyrics index" className="divide-y divide-[#e4e8df]">
              {tracksByTitle.map(([title, file, credit], index) => (
                <li key={file}>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-expanded={openLyric === index} aria-controls={`lyric-${index}`}
                      onClick={() => setOpenLyric(openLyric === index ? null : index)}
                      className="flex min-h-11 min-w-0 flex-1 items-center gap-3 py-2 text-left text-sm font-semibold text-[#21472a]">
                      <span className="font-mono text-[#556353]">{trackNumber(index)}</span>
                      <span className="min-w-0 flex-1">{title}</span>
                      <span aria-hidden="true">{openLyric === index ? "▾" : "▸"}</span>
                    </button>
                    <button type="button" aria-label={`Play ${title} from lyrics index`} onClick={() => playTrack(index)}
                      className="shrink-0 rounded-full border border-[#c6cbbf] px-3 py-2 text-xs font-semibold text-[#21472a] hover:bg-[#e4eddf]">▶ Play</button>
                  </div>
                  <div id={`lyric-${index}`} hidden={openLyric !== index} className="mb-4 ml-2 max-w-prose border-l-2 border-[#c6cbbf] pl-4 leading-relaxed">
                    {openLyric === index && <>
                      <p className="mb-3 text-sm text-[#556353]">{credit}</p>
                      {file === "more-than-you-know-20fac5a1.m4a" && <a href="https://suno.com/s/F3KLsacmWiM20NEs" className="text-sm underline">Original Suno recording</a>}
                      {albumLyrics[file].split("\n").map((line, lineIndex) => {
                        const section = line.match(/^\[(.*)\]$|^\*\*(.*)\*\*$/);
                        return section
                          ? <p key={lineIndex} className="mb-1 mt-4 font-semibold">{section[1] ?? section[2]}</p>
                          : <p key={lineIndex} className="min-h-[0.6em]">{line}</p>;
                      })}
                    </>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </details>
      </section>
      <HouseTrail current="Music Room" />
    </main>
  );
}

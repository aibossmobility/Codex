import albumLyrics from "@/content/music-room-lyrics.json";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { HouseTrail } from "./PapaHouse";

const tracks: ReadonlyArray<readonly [string, keyof typeof albumLyrics, string?]> = [
  ["Your Purpose Lives On In Us", "your-purpose.m4a"],
  ["Believe, Encourage, and Live", "believe-encourage-live.m4a"],
  ["Fathers of Adult Children (Very Slow Ballad)", "foadc-ballad.m4a"],
  ["Dad’s Love (Slow Ballad)", "dads-love.m4a"],
  ["Do You Want to Find Your GPS? (AI Mix)", "find-your-gps.m4a"],
  ["Dream and Pray (Second AI Mix)", "dream-and-pray.m4a", "Lyrics by Brian Keith Hill · Music by William (Bill) Whitley"],
  ["Your Purpose Lives On (Suno version)", "purpose-suno.mp3"],
  ["Dream and Pray (First Mix)", "dream-first-suno.mp3", "Lyrics by Brian Keith Hill · Music by William (Bill) Whitley"],
  ["Do You Want to Find Your GPS? (Suno version)", "gps-suno.mp3"],
  ["More Than You Know", "more-than-you-know-20fac5a1.m4a"],
  ["Black Men Speak", "black-men-speak.mp3", "Brian Keith Hill & Bill Whitley"],
];

export default function MusicRoom() {
  return (
    <main className="min-h-screen bg-[#f8f4e8] text-[#16251b]">
      <PageMeta title="Brian Keith Hill’s AI Album of 2026 | Papa Life Music Room" description="Listen to Brian Keith Hill’s original music and selected AI-assisted recordings in the Papa Life Music Room." />
      <nav aria-label="Music Room navigation" className="container flex items-center justify-between gap-4 py-4">
        <a href="/" aria-label="Papa Life home"><SiteLogo size="md" /></a>
        <a href="/house" className="font-semibold underline underline-offset-4">Explore the House</a>
      </nav>
      <header className="border-b-8 border-[#af352d] bg-[#10291e] text-white">
        <div className="container max-w-4xl py-12 sm:py-20">
          <p className="mb-5 text-sm font-bold uppercase tracking-widest text-[#f3d16d]">Papa Life Music Room</p>
          <h1 className="max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">Brian Keith Hill’s AI Album of 2026</h1>
          <p className="mt-5 text-lg text-[#f3d16d]">To my family, whom I love deeply.</p>
        </div>
      </header>
      <section id="listen" aria-label="Album tracks" className="container max-w-4xl py-8">
        <ol className="divide-y divide-[#c6cbbf]">
          {tracks.map(([title, file, credit], index) => (
            <li key={file} className="grid gap-3 py-6 sm:grid-cols-[2rem_1fr]">
              <span aria-hidden="true" className="font-mono text-sm text-[#556353]">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <h2 className="font-serif text-2xl">{file === "more-than-you-know-20fac5a1.m4a" ? <a href="https://suno.com/s/F3KLsacmWiM20NEs" className="underline underline-offset-4">{title}</a> : title}</h2>
                <p className="mb-3 mt-1 text-sm">{credit ?? "Brian Keith Hill"}</p>
                <audio className="w-full" controls preload="none" aria-label={title} src={"/music-room/album-2026/" + file}
                  onPlay={event => document.querySelectorAll("main audio").forEach(player => {
                    if (player instanceof HTMLAudioElement && player !== event.currentTarget) player.pause();
                  })} />
                <details className="mt-3">
                  <summary className="w-fit cursor-pointer py-2 font-semibold text-[#21472a]">
                    Lyrics<span className="sr-only"> for {title}</span>
                  </summary>
                  <div className="mt-2 max-w-prose border-l-2 border-[#c6cbbf] pl-4 leading-relaxed">
                    {albumLyrics[file].split("\n").map((line, lineIndex) => {
                      const section = line.match(/^\[(.*)\]$|^\*\*(.*)\*\*$/);
                      return section
                        ? <p key={lineIndex} className="mb-1 mt-4 font-semibold">{section[1] ?? section[2]}</p>
                        : <p key={lineIndex} className="min-h-[0.6em]">{line}</p>;
                    })}
                  </div>
                </details>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <HouseTrail current="Music Room" />
    </main>
  );
}

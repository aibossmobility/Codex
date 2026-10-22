import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import { HouseTrail } from "./PapaHouse";
import { ArrowLeft, BookOpen, Headphones, Music2, HeartHandshake } from "lucide-react";

const lyricSections = [
  {
    "time": "0:00 – 0:28",
    "name": "Intro (music only → spoken)",
    "lines": [
      "Yeah…",
      "This one’s for the fathers",
      "Still loving… still learning",
      "Even when the kids are grown"
    ]
  },
  {
    "time": "0:28 – 1:20",
    "name": "Verse 1 — UNCOVER",
    "lines": [
      "I been quiet for a long time",
      "Smiles hiding what’s inside",
      "Conversations in my own head",
      "Words I never let collide",
      "Thirty, forty, fifty years old",
      "They got lives, they got their own",
      "But I’m still here asking questions",
      "In the spaces left alone"
    ]
  },
  {
    "time": "1:20 – 1:50",
    "name": "Chorus",
    "lines": [
      "I’m a father of adult children",
      "Still trying to find my voice",
      "Not telling them what to do now",
      "Just learning how to make the choice"
    ]
  },
  {
    "time": "1:50 – 2:40",
    "name": "Verse 2 — RECOVER",
    "lines": [
      "I confused strength with silence",
      "Thought emotions made me weak",
      "But distance grows in the quiet",
      "When you never really speak",
      "So I’m recovering my language",
      "Finding tone, finding time",
      "Learning how to say “I feel this”",
      "Without crossing any lines"
    ]
  },
  {
    "time": "2:40 – 3:05",
    "name": "Chorus (short repeat)",
    "lines": [
      "I’m a father of adult children",
      "Trying not to disappear",
      "Still got love, still got presence",
      "Still got something they can hear"
    ]
  },
  {
    "time": "3:05 – 3:35",
    "name": "Bridge (spoken word)",
    "lines": [
      "This ain’t about control",
      "This ain’t about blame",
      "It’s about emotional truth",
      "Learning how to say my name",
      "Because love don’t grow in silence",
      "It grows in honesty"
    ]
  },
  {
    "time": "3:35 – 4:20",
    "name": "Verse 3 — DISCOVER",
    "lines": [
      "Now I’m discovering freedom",
      "In saying what I mean",
      "Discovering peace",
      "In letting grown kids be",
      "I’m present, not perfect",
      "I’m open, not afraid",
      "Discovering that connection",
      "Is a skill you can learn at any age"
    ]
  },
  {
    "time": "4:20 – 4:54",
    "name": "Final Chorus / Outro",
    "lines": [
      "I’m a father of adult children",
      "Still becoming who I am",
      "Not their savior, not their answer",
      "Just a present, grounded man",
      "Fathers of adult children",
      "Finally coming home…"
    ]
  }
] as const;

const recovering = [
  { title: "Dream and Pray", detail: "Original lyrics by Brian Keith Hill · Music by William (Bill) Whitley", note: "The original studio master and lyric sheet are being recovered. This recording is not yet available to stream." },
  { title: "Black Men Speak", detail: "From the Black Men Speak community and concert years", note: "Archival performances and collaborator credits are being verified before public listening." },
  { title: "More Than You Know", detail: "Written and performed by Brian Keith Hill · Recorded live in Ohio", note: "The shared live MP3 has been identified; its verified lyrics and publishing copy are still being prepared." },
  { title: "Do You Want to Find Your GPS?", detail: "Original song by Brian Keith Hill · Includes the words “Let Him In”", note: "The original lyric sheet and master are being matched; “Let Him In” is not a separate song." },
] as const;

export default function MusicRoom() {
  return (
    <div className="min-h-screen bg-[#f8eddb] text-[#201e19]">
      <PageMeta
        title="The Music Room | Original Songs, Lyrics & Stories | Papa Life"
        description="Enter the Papa Life Music Room. Listen free to original fatherhood music and spoken word by Brian Keith Hill, read the words alongside the recordings, and discover the roots of Black Men Speak."
        keywords="Papa Life music room, Brian Keith Hill songs, Fathers of Adult Children song, Dream and Pray, Black Men Speak, music and lyrics"
      />
      <header className="border-b-[5px] border-[#a32929] bg-[#f8e8b8]">
        <nav className="container flex min-h-[80px] flex-wrap items-center justify-between gap-3 py-2" aria-label="Music Room navigation">
          <a href="/" aria-label="Return to Papa Life home"><SiteLogo size="md" /></a>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm font-bold">
            <a href="/house" className="rounded-md border border-[#65452b]/30 px-3 py-2 hover:bg-white/60">Explore the House</a>
            <a href="/shop" className="rounded-md border border-[#65452b]/30 px-3 py-2 hover:bg-white/60">Books & Courses</a>
            <a href="/" className="rounded-md bg-[#21472a] px-4 py-2 text-white hover:bg-[#16361e]">Papa Life Home</a>
          </div>
        </nav>
      </header>
      <HouseTrail current="Music Room" />
      <main>
        <section className="relative overflow-hidden border-y-8 border-[#1e1e1a] bg-[#f7e5c8]">
          <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-3 bg-[#a5242a] sm:w-6" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-0 left-3 top-0 z-10 w-1 bg-[#f6b81c] sm:left-6 sm:w-3" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-3 bg-[#a5242a] sm:w-6" aria-hidden="true" />
          <div className="pointer-events-none absolute bottom-0 right-3 top-0 z-10 w-1 bg-[#f6b81c] sm:right-6 sm:w-3" aria-hidden="true" />
          <div className="container grid items-center gap-7 py-8 md:grid-cols-[1fr_0.82fr] md:py-12">
            <div className="relative overflow-hidden rounded-lg border-[6px] border-[#292117] bg-[#dfbf82] shadow-2xl">
              <img
                src="/images/papa-life-music-room-approved.png?v=20261022-hq"
                alt="Approved Papa Life Music Room artwork: a smiling man in a bright, welcoming musical lounge, with a black, red and yellow doorway and the Papa Life tree and name on the wall"
                className="aspect-[4/3] w-full object-cover"
                width={1448}
                height={1086}
                fetchPriority="high"
              />
            </div>
            <div className="px-1 py-5 text-center md:text-left">
              <p className="text-xs font-black uppercase tracking-[0.20em] text-[#a22d28]">Papa Life · Music & spoken word</p>
              <h1 className="mt-4 font-serif text-5xl font-black leading-[1.04] text-[#192b1b] sm:text-6xl">Welcome to the <span className="text-[#a52c27]">Music Room.</span></h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#34463a]">Come in, take a seat, and listen. These songs and stories grew out of a life of writing, fatherhood, faith, community work, and learning to reconnect.</p>
              <p className="mt-4 text-lg font-semibold text-[#23462c]">Listening is free. No checkout, membership, or appointment required.</p>
              <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
                <a className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#195d35] px-6 py-3 font-bold text-white hover:bg-[#104326]" href="#listen"><Headphones size={20}/> Start Listening</a>
                <a className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-[#195d35] px-6 py-3 font-bold text-[#195d35] hover:bg-white" href="#our-roots"><BookOpen size={20}/> My Community Contributions</a>
              </div>
            </div>
          </div>
        </section>

        <section id="listen" className="container py-12 sm:py-16" aria-labelledby="listen-heading">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#a32826]">Original recordings</p>
            <h2 id="listen-heading" className="mt-3 font-serif text-4xl font-bold text-[#1f3928] sm:text-5xl">Listen and read along</h2>
            <p className="mt-4 text-lg text-[#445347]">The recording and its words belong together. The lyric guide below comes from the author’s working arrangement document; the precise words and timing of the finished performance are still being checked.</p>
          </div>

          <div className="mt-10 grid gap-6 xl:grid-cols-2">
            <article className="rounded-2xl border border-[#d1b98b] bg-white p-6 shadow-lg sm:p-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#fae9be] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#70451c]"><Music2 size={15}/> Full original recording · 4:54</span>
              <h3 className="mt-4 font-serif text-3xl font-bold text-[#213c29]">Fathers of Adult Children</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5b5e51]">Original words: Brian Keith Hill · Archived January 2026</p>
              <p className="mt-5 text-[#38493c]">A father reflects on silence, self-awareness, and finding a voice without trying to control his grown children.</p>
              <audio className="mt-6 w-full" controls preload="metadata" aria-label="Listen to Fathers of Adult Children, full recording">
                <source src="/music-room/audio/fathers-of-adult-children-original.m4a" type="audio/mp4" />
                Your browser does not support audio playback.
              </audio>
              <p className="mt-3 text-xs text-[#696a5b]">Press play to listen free. The recording stays on this page.</p>
            </article>

            <article className="rounded-2xl border border-[#d1b98b] bg-white p-6 shadow-lg sm:p-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#fae9be] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-[#70451c]"><Headphones size={15}/> Alternate arrangement · 3:19</span>
              <h3 className="mt-4 font-serif text-3xl font-bold text-[#213c29]">Fathers of Adult Children — Shorted</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5b5e51]">Archived January 2026 · Different version of the fatherhood theme</p>
              <p className="mt-5 text-[#38493c]">A separate shorter recording from the original archive. The final arrangement and differences in sung words have not yet been independently transcribed.</p>
              <audio className="mt-6 w-full" controls preload="metadata" aria-label="Listen to Fathers of Adult Children, alternate recording">
                <source src="/music-room/audio/fathers-of-adult-children-alternate.m4a" type="audio/mp4" />
                Your browser does not support audio playback.
              </audio>
              <p className="mt-3 text-xs text-[#696a5b]">This is a 3:19 alternate—not the separate 30–60 second clips still being recovered.</p>
            </article>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border-2 border-[#ad863f] bg-[#193e2c] text-white shadow-xl">
            <div className="border-b border-white/15 px-6 py-7 sm:px-9">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#f1cd73]">Words alongside the music</p>
              <h3 className="mt-2 font-serif text-3xl font-bold">Fathers of Adult Children — Lyric Guide</h3>
              <p className="mt-3 max-w-3xl text-[#e2e9da]">This draft lyric-and-melody sheet was prepared for the 4:54 original arrangement. Read the sections as you listen; any differences in the final audio will be corrected against the performance.</p>
              <p className="mt-3 text-sm"><a className="font-semibold text-[#ffe197] underline underline-offset-4 hover:text-white" href="https://docs.google.com/document/d/1YgARknKGaabdjtAgHeVMtjzbchhttUBfA4HMn3b70Jk/edit" target="_blank" rel="noopener noreferrer">View the working lyric document</a></p>
            </div>
            <div className="grid gap-0 md:grid-cols-2">
              {lyricSections.map((section) => (
                <div key={section.time} className="border-b border-r border-white/15 p-6 sm:p-8">
                  <p className="text-xs font-black uppercase tracking-[0.13em] text-[#f3c96d]">{section.time}</p>
                  <h4 className="mt-2 font-serif text-xl font-bold text-white">{section.name}</h4>
                  <div className="mt-4 space-y-1 text-base leading-relaxed text-[#f0efe6]">
                    {section.lines.map((line, index) => <p key={index}>{line}</p>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#dcc399] bg-[#fff6e5] py-14" aria-labelledby="archive-heading">
          <div className="container">
            <div className="mx-auto max-w-3xl text-center">
              <h2 id="archive-heading" className="font-serif text-4xl font-bold text-[#213c29]">More songs from the journey</h2>
              <p className="mt-4 text-lg text-[#546155]">These original works belong in the Music Room. Their recordings and verified lyrics are being prepared before free public playback is activated.</p>
            </div>
            <div className="mt-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {recovering.map((song) => <article key={song.title} className="rounded-xl border-t-[5px] border-[#b4372f] bg-white p-6 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#8d512f]">Archive entry</span>
                <h3 className="mt-3 font-serif text-2xl font-bold text-[#1a3b25]">{song.title}</h3>
                <p className="mt-3 text-sm font-semibold text-[#53624f]">{song.detail}</p>
                <p className="mt-4 text-sm leading-relaxed text-[#65665c]">{song.note}</p>
                <span className="mt-5 inline-flex rounded-full bg-[#f4ecdf] px-3 py-2 text-xs font-semibold text-[#675947]">Recording / lyrics in restoration</span>
              </article>)}
            </div>
          </div>
        </section>

        <section id="our-roots" className="bg-[#183d29] py-14 text-[#fff6e5]" aria-labelledby="roots-heading">
          <div className="container max-w-5xl">
            <div className="flex items-center gap-3 text-[#eec568]"><HeartHandshake size={26} aria-hidden="true" /><p className="text-xs font-extrabold uppercase tracking-[0.2em]">A lifetime of service and creative work</p></div>
            <h2 id="roots-heading" className="mt-4 font-serif text-4xl font-bold sm:text-5xl">My Community Contributions</h2>
            <p className="mt-5 max-w-4xl text-lg leading-relaxed text-[#e9eee3]">My journey of community contribution spans decades: teaching and early online courses at California State University, East Bay; work connected with Merritt College; listening, writing, singing, and making space for people to tell their stories. These experiences shaped the way I support fathers, families, and community connection through Papa Life today.</p>
            <p className="mt-4 max-w-4xl text-[#e9eee3]">Black Men Speak is an important chapter in that wider story. Beginning as a community initiative in 2009, it brought men together through advocacy, music, and speaking engagements. I later helped lead the nonprofit and developed its online presence, learning website building and community outreach along the way.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a className="rounded-full border border-[#f3c968] px-5 py-3 font-bold text-[#f9dc8d] hover:bg-white/10" href="https://web.archive.org/web/20140516235001/http://blackmenspeak.net/" target="_blank" rel="noopener noreferrer">Explore Black Men Speak archives</a>
              <a className="rounded-full border border-white/50 px-5 py-3 font-bold hover:bg-white/10" href="https://web.archive.org/web/20130107023548/http://blackmenspeak.net/bms-decisions-made-2011-2012" target="_blank" rel="noopener noreferrer">Read the community mission</a>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t-8 border-[#b6372e] bg-[#111f16] py-9 text-center text-sm text-[#e8dbbc]">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-4 font-bold"><a href="/" className="hover:underline">Papa Life Home</a><a href="/house" className="hover:underline">Explore the House</a><a href="/shop" className="hover:underline">Courses and Books</a><a href="/privacy-policy" className="hover:underline">Privacy</a></div>
          <p className="mt-4">© 2026 Papa Life · Original writing and recordings by Brian Keith Hill and credited collaborators.</p>
          <p className="mt-2 text-xs text-[#b9b4a2]">No third-party song rewrites or uncleared commercial downloads are offered here.</p>
        </div>
      </footer>
    </div>
  );
}

import { Link, useRoute } from "wouter";
import { ArrowLeft, ArrowRight, BookOpen, Headphones, Home, MessageCircleHeart, Play, Sun, Compass, ShoppingBag } from "lucide-react";
import { SiteLogo } from "@/components/SiteLogo";
import { PageMeta } from "@/components/PageMeta";
import readingCopy from "@/content/papa-page-reading-copy.json";
import auditSEO from "@/content/papa-seo-audit-overrides.json";
import "./PapaHouse.css";

type Room = {
  slug: string;
  name: string;
  eyebrow: string;
  title: string;
  intro: string;
  image: string;
  alt: string;
  action: string;
  href: string;
  additional: string;
  additionalHref: string;
  tone: string;
  objectPosition?: string;
};

export const papaRooms: Room[] = [
  {
    slug: "living-room",
    name: "The Living Room",
    eyebrow: "A place to feel welcome",
    title: "You belong here, just as you are.",
    intro: readingCopy.rooms["living-room"],
    image: "/images/papa-house-entry.webp",
    alt: "A welcoming home with men speaking together in a comfortably furnished living room",
    action: "Begin with the Awareness Wheel", href: "/#fatherhood-wheel",
    additional: "Explore the next room", additionalHref: "/house/library",
    tone: "living", objectPosition: "12% center",
  },
  {
    slug: "library",
    name: "The Reading Nook",
    eyebrow: "Books & written wisdom",
    title: "Take a seat. Find a new perspective.",
    intro: readingCopy.rooms["library"],
    image: "/images/papa-forest-book.webp",
    alt: "Brian Keith Hill's Run Your Own Race book cover with green forest and African-inspired motifs",
    action: "Browse written resources", href: "/shop",
    additional: "Go to the Listening Room", additionalHref: "/house/listening-room",
    tone: "library", objectPosition: "center 40%",
  },
  {
    slug: "listening-room",
    name: "The Listening Room",
    eyebrow: "Slow down & listen",
    title: "Sometimes hearing is the beginning of healing.",
    intro: readingCopy.rooms["listening-room"],
    image: "/images/papa-life-music-room-approved.png?v=20261022-hq",
    alt: "The approved Papa Life Music Room with the tree logo, smiling visitor and warm doorway",
    action: "Enter the Music Room", href: "/music-room",
    additional: "Go to the Theater", additionalHref: "/house/theater",
    tone: "listening",
  },
  {
    slug: "theater",
    name: "The Theater",
    eyebrow: "Watch & learn",
    title: "Pull up a chair. There's something worth learning.",
    intro: readingCopy.rooms["theater"],
    image: "/images/papa-house-entry.webp",
    alt: "Fathers gathered in a warmly lit home with inviting rooms to learn and connect",
    action: "Explore video lessons", href: "/shop",
    additional: "Visit the Dad Cave", additionalHref: "/house/dad-cave",
    tone: "theater", objectPosition: "85% center",
  },
  {
    slug: "dad-cave",
    name: "The Dad Cave",
    eyebrow: "Real questions. Honest reflection.",
    title: "A place where fathers can be real.",
    intro: readingCopy.rooms["dad-cave"],
    image: "/images/papa-house-entry.webp",
    alt: "Two men enjoying an honest conversation in an inviting African-inspired home",
    action: "Explore your fatherhood journey", href: "/my-journey",
    additional: "Ask the Papa Life AI guide", additionalHref: "/digital-twin",
    tone: "dad", objectPosition: "70% center",
  },
  {
    slug: "resources",
    name: "The Resource Room",
    eyebrow: "Make your next step easier",
    title: "Take home something useful.",
    intro: readingCopy.rooms["resources"],
    image: "/images/papa-life-father-adult-son-afternoon.png",
    alt: "A father and an adult son spending time together in a gentle afternoon setting",
    action: "Browse resources", href: "/shop",
    additional: "Visit the Sky Room", additionalHref: "/house/sky-room",
    tone: "resources",
  },
  {
    slug: "sky-room",
    name: "The Sky Room",
    eyebrow: "Room to see beyond today",
    title: "There is a path ahead that belongs to you.",
    intro: readingCopy.rooms["sky-room"],
    image: "/images/papa-sky-book.webp",
    alt: "Run Your Own Race book cover with Brian Keith Hill, a blue sky, mountains, and an African savanna landscape",
    action: "Explore original works", href: "/shop",
    additional: "Return to the Living Room", additionalHref: "/house/living-room",
    tone: "sky", objectPosition: "center 30%",
  },
];

export function HouseTrail({ current }: { current?: string }) {
  return (
    <nav className="papa-house-trail" aria-label="Explore the Papa Life home">
      <div className="papa-house-trail-inner">
        <a href="/" className="papa-house-trail-link"><Sun aria-hidden="true" size={16}/> Outside</a>
        <span aria-hidden="true" className="papa-house-trail-separator">/</span>
        <a href="/house" className="papa-house-trail-link"><Home aria-hidden="true" size={16}/> Explore the House</a>
        {current && <span className="papa-house-trail-current" aria-current="page">/ {current}</span>}
      </div>
    </nav>
  );
}

function HouseHeader() {
  return <header className="papa-house-header">
    <div className="papa-house-header-inner">
      <a href="/" aria-label="Papa Life home"><SiteLogo size="md" /></a>
      <nav aria-label="Papa Life house navigation" className="papa-house-header-links">
        <a href="/">Outside</a>
        <a href="/house">The Hallway</a>
        <a href="/shop">Shop Resources</a>
        <a href="/digital-twin">AI Guide</a>
      </nav>
      <a href="/shop" className="papa-house-header-cta">Explore Resources <ArrowRight aria-hidden="true" size={17}/></a>
    </div>
  </header>;
}

function RoomCard({ room, index }: { room: Room; index: number }) {
  return (
    <a href={"/house/" + room.slug} className={"papa-house-room-card papa-house-room-card-" + room.tone}>
      <div className="papa-house-room-photo">
        <img src={room.image} alt={room.alt} loading={index < 2 ? "eager" : "lazy"} style={{objectPosition:room.objectPosition || "center"}}/>
      </div>
      <div className="papa-house-room-copy">
        <span className="papa-house-room-eyebrow">{room.eyebrow}</span>
        <h3>{room.name}</h3>
        <span className="papa-house-room-link">Step inside <ArrowRight size={16} aria-hidden="true"/></span>
      </div>
    </a>
  );
}

function HouseHall() {
  return (
    <div className="papa-house-page">
      <PageMeta title="Step Inside Papa Life | Rooms for Fathers of Adult Children" description="Explore the warm Papa Life home. Wander through the Living Room, Reading Nook, Listening Room, Theater, Dad Cave, Resource Room, and Sky Room."/>
      <HouseHeader/>
      <HouseTrail/>
      <main>
        <section className="papa-house-hall-hero" aria-labelledby="papa-house-hall-title">
          <img src="/images/papa-house-entry.webp" alt="Warm African-inspired home with inviting doorways, comfortable seats, and men enjoying conversations and reading" className="papa-house-hall-image"/>
          <div className="papa-house-hall-shade" aria-hidden="true"/>
          <div className="papa-house-hall-content">
            <span className="papa-house-kicker">Papa Life · Welcome inside</span>
            <h1 id="papa-house-hall-title">{auditSEO.headlines["/house"]}</h1>
            <p>{auditSEO.definitions["/house"]} {readingCopy.rooms.house}</p>
            <a href="#choose-room" className="papa-house-button">Choose a room <ArrowRight size={20} aria-hidden="true"/></a>
          </div>
        </section>
        <section id="choose-room" className="papa-house-room-selection" aria-label="Choose a room to explore">
          <div className="papa-house-room-intro">
            <span className="papa-house-kicker">No rush · There is more to discover</span>
            <h2>Every doorway leads somewhere different.</h2>
            <p>Each room offers a different place to explore. Find courses, videos, audio lessons, writing, and fatherhood guidance.</p>
          </div>
          <div className="papa-house-room-grid">{papaRooms.map((room,i)=><RoomCard key={room.slug} room={room} index={i}/>)}</div>
        </section>
        <section className="papa-house-ethos">
          <p><strong>Presence</strong> · <strong>Authority</strong> · <strong>Purpose</strong> · <strong>Alignment</strong></p>
          <h2>The rooms are different. The welcome is the same.</h2>
          <p>Explore freely. Purchase only what you choose. Human connection remains at the heart of Papa Life.</p>
          <a href="/#fatherhood-wheel" className="papa-house-text-link">Find your next step <ArrowRight size={18} aria-hidden="true"/></a>
        </section>
      </main>
      <footer className="papa-house-footer"><a href="/">Outside</a><a href="/house">The Hallway</a><a href="/shop">Shop Resources</a><a href="/refund-policy">Refund & Cancellation Policy</a></footer>
    </div>
  );
}

function RoomDetail({ room }: { room: Room }) {
  return (
    <div className={"papa-house-page papa-house-detail papa-house-detail-" + room.tone}>
      <PageMeta title={room.name+" | Papa Life"} description={room.intro}/>
      <HouseHeader/>
      <HouseTrail current={room.name}/>
      <main>
        <section className="papa-house-detail-hero">
          <div className="papa-house-detail-photo">
            <img src={room.image} alt={room.alt} style={{objectPosition:room.objectPosition || "center"}}/>
          </div>
          <div className="papa-house-detail-content">
            <span className="papa-house-kicker">{room.eyebrow}</span>
            <h1>{room.slug === "theater" ? auditSEO.headlines["/house/theater"] : room.title}</h1>
            {Object.prototype.hasOwnProperty.call(auditSEO.definitions, "/house/" + room.slug) && (
              <p className="mb-3 font-medium">{(auditSEO.definitions as Record<string, string>)["/house/" + room.slug]}</p>
            )}
            <p>{room.intro}</p>
            <div className="papa-house-detail-actions">
              <a className="papa-house-button" href={room.href}>{room.action} <ArrowRight size={19} aria-hidden="true"/></a>
              <a className="papa-house-button-outline" href={room.additionalHref}>{room.additional} <ArrowRight size={18} aria-hidden="true"/></a>
            </div>
          </div>
        </section>
        {room.slug === "library" && (
          <section aria-labelledby="library-research-title" className="mx-auto my-10 max-w-5xl rounded-2xl border border-[#d8c69e] bg-[#fff8e9] px-6 py-8 shadow-sm md:px-10">
            <span className="text-sm font-bold uppercase tracking-wider text-[#145b35]">Library Room · Read & Reflect</span>
            <h2 id="library-research-title" className="mt-3 text-2xl font-black text-[#17231c] md:text-3xl">The research behind why Papa Life matters</h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-[#17231c]">Explore the independent scholarship on fathers of adult children, human connection, and family estrangement. Read thoughtfully, consider your own experience, and see how these research areas inform Papa Life's educational mission.</p>
            <p className="mt-3 text-sm text-[#52604f]">These studies document and explore the field. They do not evaluate or endorse Papa Life's original PAPA framework.</p>
            <a href="/research-foundation" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#145b35] px-5 py-3 font-bold text-white hover:bg-[#0c472a]">Read the Research Foundation <ArrowRight size={18} aria-hidden="true" /></a>
          </section>
        )}
        <section className="papa-house-room-doors">
          <div>
            <span className="papa-house-kicker">Walk a little farther</span>
            <h2>Other rooms are waiting.</h2>
          </div>
          <div className="papa-house-nearby">
            {papaRooms.filter(r=>r.slug!==room.slug).slice(0,3).map((r,i)=><RoomCard room={r} index={i} key={r.slug}/>)}
          </div>
          <a href="/house" className="papa-house-text-link"><ArrowLeft size={18} aria-hidden="true"/> Back to the hallway</a>
        </section>
      </main>
      <footer className="papa-house-footer"><a href="/">Outside</a><a href="/house">Explore the House</a><a href="/shop">Available Resources</a></footer>
    </div>
  );
}

export default function PapaHouse(){
  const [, params] = useRoute("/house/:room");
  const room = papaRooms.find(r=>r.slug===params?.room);
  return room ? <RoomDetail room={room}/> : <HouseHall/>;
}

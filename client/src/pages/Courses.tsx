import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Heart,
  Headphones,
  HandHeart,
  Loader2,
  Sprout,
  Sun,
  MessageCircleHeart,
} from "lucide-react";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogoStacked } from "@/components/SiteLogo";
import { HouseTrail } from "./PapaHouse";

type CatalogCourse = {
  id: number;
  title: string;
  description: string | null;
  pillar: string;
  sort_order: number;
  lesson_count: number;
};

const pillarStyles: Record<string, string> = {
  Purpose: "bg-[#f0dcaf] text-[#66450c]",
  Authority: "bg-[#d8e9d2] text-[#23563f]",
  Presence: "bg-[#f7d8cf] text-[#8d4434]",
  Alignment: "bg-[#ece0bc] text-[#6e4b13]",
  General: "bg-[#e2e5d6] text-[#3f523d]",
};

const values = [
  {
    label: "Trust",
    description: "Build stronger bonds",
    icon: Heart,
    color: "text-[#b7463c]",
  },
  {
    label: "Listening",
    description: "Hear and be heard",
    icon: Headphones,
    color: "text-[#356f4a]",
  },
  {
    label: "Reconnection",
    description: "Bridge the distance",
    icon: Sprout,
    color: "text-[#30724a]",
  },
  {
    label: "Hope",
    description: "A brighter tomorrow",
    icon: Sun,
    color: "text-[#bd7c08]",
  },
  {
    label: "Compassion",
    description: "Lead with love",
    icon: HandHeart,
    color: "text-[#b7463c]",
  },
];

export default function Courses() {
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/public/courses");
        if (!res.ok) throw new Error("Failed to load courses");
        setCourses(await res.json());
      } catch {
        setError("We could not load courses right now. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#f2e5cf] text-[#24382b]">
      <PageMeta
        title="Papa Life Courses | Trust, Listening & Reconnection"
        description="Warm, self-guided courses for fathers of adult children. Explore trust, listening, repair, and reconnection with compassion and hope."
      />

      <header className="relative z-10 border-b border-[#9b7848]/20 bg-[#fff3dc]">
        <div className="container mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <Link href="/">
            <a aria-label="Papa Life home" className="inline-flex items-center">
              <SiteLogoStacked size="sm" />
            </a>
          </Link>
          <nav
            aria-label="Main navigation"
            className="flex flex-wrap items-center gap-4 text-sm font-bold text-[#325039] sm:gap-7"
          >
            <Link href="/">
              <a className="hover:text-[#a34235]">Home</a>
            </Link>
            <a
              href="/courses"
              aria-current="page"
              className="border-b-2 border-[#2b684b] pb-1 text-[#215f43]"
            >
              Courses
            </a>
            <Link href="/shop">
              <a className="hover:text-[#a34235]">Shop</a>
            </Link>
            <Link href="/resources">
              <a className="hover:text-[#a34235]">Resources</a>
            </Link>
          </nav>
        </div>
      </header>
      <HouseTrail current="Theater & Courses" />

      <main>
        <section
          aria-labelledby="courses-hero-title"
          className="relative overflow-hidden bg-[#dec49b]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#f4dcaf]/85 via-[#dbc296]/25 to-[#9f734b]/25"
          />
          <div className="container relative mx-auto grid max-w-6xl gap-0 px-5 pb-6 pt-7 sm:px-6 md:grid-cols-[0.95fr_1.05fr] md:items-center md:gap-8 md:py-10">
            <div className="relative z-10 py-5 md:py-8">
              <a
                href="/"
                className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#336148] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Home
              </a>
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.24em] text-[#9b4935]">
                For fathers of adult children
              </p>
              <h1
                id="courses-hero-title"
                className="font-heading text-[clamp(2.75rem,5.3vw,5rem)] font-black leading-[1.02] tracking-tight text-[#194d38]"
              >
                Real Change{" "}
                <span className="mt-1 block text-[#91621e]">Starts Today.</span>
              </h1>
              <div
                className="mt-4 h-1.5 w-36 rounded-full bg-[#f3b914]"
                aria-hidden="true"
              />
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-[#354235]">
                Brian's Digital AI can help you explore these resources and find
                a thoughtful next step toward better listening and connection.
              </p>
              <a
                href="/start"
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#edb721] px-7 py-3 text-base font-extrabold text-[#243322] shadow-[0_6px_20px_rgba(104,76,20,0.17)] transition hover:bg-[#ffd34a] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#236247]"
              >
                Start Here — Explore Your Options{" "}
                <ArrowRight className="h-5 w-5" />
              </a>
            </div>
            <div className="relative isolate mt-5 min-h-[245px] overflow-hidden rounded-[1.75rem] border-[5px] border-[#fff2d6]/75 shadow-[0_20px_42px_rgba(69,48,21,0.24)] sm:min-h-[350px] md:mt-0 md:min-h-[415px]">
              <img
                src="/images/papa-life-father-adult-son-afternoon.png"
                alt="An older African American father in an unhurried, caring afternoon conversation with an adult son"
                className="absolute inset-0 h-full w-full object-cover object-center"
                loading="eager"
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#4e3b25]/40 to-transparent"
                aria-hidden="true"
              />
            </div>
          </div>
          <div className="relative border-t border-[#9e7b4a]/20 bg-[#fff1d6]/90">
            <div className="container mx-auto grid max-w-6xl grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-3 sm:px-6 lg:grid-cols-5">
              {values.map(value => {
                const Icon = value.icon;
                return (
                  <div
                    key={value.label}
                    className="flex items-center gap-3 rounded-xl bg-white/45 px-2 py-2"
                  >
                    <Icon
                      aria-hidden="true"
                      className={"h-7 w-7 shrink-0 " + value.color}
                    />
                    <div>
                      <p className="text-sm font-extrabold text-[#284132]">
                        {value.label}
                      </p>
                      <p className="text-xs text-[#5b6451]">
                        {value.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="courses-heading"
          className="bg-[#f5ead7] px-5 pb-8 pt-12 sm:px-6 md:pt-16"
        >
          <div className="container mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#315d3e] text-[#fff1cc] shadow-md">
                <GraduationCap className="h-8 w-8" aria-hidden="true" />
              </div>
              <h2
                id="courses-heading"
                className="mt-5 font-heading text-4xl font-black text-[#194d38] sm:text-5xl"
              >
                Courses
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[#566052]">
                Courses for fathers navigating relationships with adult
                children. Choose the lessons that fit your needs, then enroll
                through the secure GoHighLevel course portal.
              </p>
              <a
                href="/shop#audio-lessons"
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#edb721] px-7 py-3 text-center font-extrabold text-[#243322] shadow-[0_5px_16px_rgba(122,85,17,0.15)] hover:bg-[#ffd34a] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#236247]"
              >
                Browse and Enroll in Audio Lessons — $14.99 each{" "}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2">
              <article className="flex flex-col justify-between rounded-[1.5rem] border border-[#d0b994] bg-[#fffbf2] p-6 shadow-[0_8px_24px_rgba(80,64,29,0.09)]">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#a64d3d]">
                    Featured video series
                  </p>
                  <h3 className="mt-3 font-heading text-2xl font-extrabold text-[#214931]">
                    Wrestling the Silence Away
                  </h3>
                  <p className="mt-3 leading-relaxed text-[#566052]">
                    Ten original video reflections on emotional distance,
                    accountability, listening, and the possibility of
                    reconnection.
                  </p>
                </div>
                <a
                  href="/shop#video-collection"
                  className="mt-5 inline-flex items-center gap-2 font-extrabold text-[#286446] underline-offset-4 hover:underline"
                >
                  Explore the $19.99 video series{" "}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </article>
              <article className="flex flex-col justify-between rounded-[1.5rem] border border-[#d0b994] bg-[#fffaf0] p-6 shadow-[0_8px_24px_rgba(80,64,29,0.09)]">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#a64d3d]">
                    Begin at your pace
                  </p>
                  <h3 className="mt-3 font-heading text-2xl font-extrabold text-[#214931]">
                    Individual Audio Lessons
                  </h3>
                  <p className="mt-3 leading-relaxed text-[#566052]">
                    Twelve self-guided lessons for real moments in relationships
                    with adult children. Each is available as a separate $14.99
                    purchase.
                  </p>
                </div>
                <a
                  href="/shop#audio-lessons"
                  className="mt-5 inline-flex items-center gap-2 font-extrabold text-[#286446] underline-offset-4 hover:underline"
                >
                  Browse audio lessons{" "}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </article>
            </div>
          </div>
        </section>

        <section
          aria-label="Course catalog"
          className="bg-[#f5ead7] px-5 pb-16 sm:px-6"
        >
          <div className="container mx-auto max-w-6xl">
            {loading && (
              <div className="flex justify-center py-20">
                <Loader2
                  className="h-9 w-9 animate-spin text-[#286446]"
                  aria-label="Loading courses"
                />
              </div>
            )}
            {error && !loading && (
              <div
                role="alert"
                className="mx-auto max-w-lg rounded-2xl border border-[#e1bcb1] bg-[#fff6ee] p-7 text-center text-[#8a4335]"
              >
                {error}
              </div>
            )}
            {!loading && !error && courses.length === 0 && (
              <div className="mx-auto max-w-2xl rounded-2xl border border-[#d7bf99] bg-[#fffaf0] p-8 text-center text-[#566052]">
                We're preparing more courses. You can explore the available
                audio lessons and video series in the Papa Life shop.
              </div>
            )}
            {!loading && !error && courses.length > 0 && (
              <div className="grid gap-5 md:grid-cols-2">
                {courses.map(c => (
                  <Link key={c.id} href={"/courses/" + c.id}>
                    <a className="group block rounded-2xl border border-[#d0b994] bg-[#fffaf0] p-6 shadow-[0_5px_18px_rgba(80,64,29,0.07)] transition hover:-translate-y-1 hover:border-[#49865e] hover:shadow-[0_10px_25px_rgba(80,64,29,0.13)]">
                      <span
                        className={
                          "mb-3 inline-block rounded-full px-3 py-1 text-xs font-bold " +
                          (pillarStyles[c.pillar] || pillarStyles.General)
                        }
                      >
                        {c.pillar}
                      </span>
                      <h3 className="font-heading text-xl font-extrabold text-[#214931] group-hover:text-[#a34c34]">
                        {c.title}
                      </h3>
                      {c.description && (
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[#5b6459]">
                          {c.description}
                        </p>
                      )}
                      <p className="mt-4 text-xs font-bold text-[#61705e]">
                        {c.lesson_count} lesson{c.lesson_count !== 1 ? "s" : ""}
                      </p>
                    </a>
                  </Link>
                ))}
              </div>
            )}
            <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-[#bfa67a] bg-[#eaddbf] p-7 text-center">
              <MessageCircleHeart
                aria-hidden="true"
                className="mx-auto h-7 w-7 text-[#307252]"
              />
              <p className="mt-2 font-heading text-xl font-bold text-[#214931]">
                Not sure where to begin?
              </p>
              <p className="mt-2 text-[#5c624f]">
                Take a moment to notice what matters most in your relationship
                before choosing a resource.
              </p>
              <a
                href="/my-journey"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#315d3e] px-6 py-2 font-bold text-white hover:bg-[#214b36]"
              >
                Start with the Awareness Wheel
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

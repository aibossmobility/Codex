import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteLogoStacked } from "@/components/SiteLogo";
import { LessonMediaPlayer } from "@/components/LessonMediaPlayer";
import { Loader2 } from "lucide-react";
import { CALENDLY_BOOK_URL } from "@/lib/papa-funnel";

const PAPA_RECONNECTION_INFOGRAPHIC = "/media/papa-life-distance-reconnection-infographic.png";

const RECONNECTION_MOVES = [
  "Self-reflection before correction",
  "Emotional ownership",
  "The repair conversation framework",
  "From authority to advisor",
  "Value-based reconnection",
  "Sustained trust building",
];

type FirstLessonPayload = {
  course: { id: number; title: string; pillar: string } | null;
  lesson: {
    id: number;
    title: string;
    description: string | null;
    content_url: string | null;
    content_type: string;
    duration_minutes: number | null;
  } | null;
};

export default function PapaFirstLesson() {
  const [data, setData] = useState<FirstLessonPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/public/first-lesson");
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const lesson = data?.lesson;
  const course = data?.course;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="container max-w-3xl mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link href="/papa-journal">
            <a className="text-sm text-gray-400 hover:text-brand-yellow transition-colors">← Journal</a>
          </Link>
          <SiteLogoStacked size="sm" className="sm:ml-auto" />
        </div>
      </header>

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-10 md:py-14 space-y-10">
        <div className="space-y-4 text-gray-200 leading-relaxed border border-primary/25 bg-primary/5 rounded-2xl p-6 md:p-8">
          <p className="text-brand-yellow text-xs uppercase tracking-widest font-bold">Start here</p>
          <h1 className="text-white font-heading font-bold text-3xl md:text-4xl leading-tight">
            From Distance to Reconnection
          </h1>
          <p>
            Do not try to solve everything at once. Sit with the map first: name the distance, understand the turning point, and begin with one steady move.
          </p>
          <p className="text-brand-yellow font-medium">Start here. Stay honest. Keep moving.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6 items-start">
          <a
            href={PAPA_RECONNECTION_INFOGRAPHIC}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl transition-opacity hover:opacity-95"
          >
            <img
              src={PAPA_RECONNECTION_INFOGRAPHIC}
              alt="Papa Life From Distance to Reconnection infographic"
              className="w-full h-auto"
              loading="lazy"
            />
          </a>

          <div className="space-y-5">
            <Card className="border-white/10 bg-[#111]">
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">The turning point</p>
                  <p className="text-white text-xl font-heading font-bold">The father changes first.</p>
                </div>
                <p className="text-gray-400 leading-relaxed">
                  Not because he was the only one hurt. Not because the adult child has no responsibility. But because the father is willing to go first with purpose, authority, presence, and alignment.
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#111]">
              <CardContent className="p-6">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-4">Six moves to sit with</p>
                <div className="space-y-3">
                  {RECONNECTION_MOVES.map((move, index) => (
                    <div key={move} className="flex gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
                      <span className="text-brand-yellow font-black text-sm pt-0.5">{index + 1}</span>
                      <p className="text-gray-200 text-sm font-medium leading-snug">{move}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 text-accent animate-spin" />
          </div>
        )}

        {!loading && course && lesson && (
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">{course.pillar}</p>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-white">{lesson.title}</h1>
              {lesson.description && <p className="text-gray-400 mt-3 whitespace-pre-wrap">{lesson.description}</p>}
            </div>

            {lesson.content_url ? (
              <LessonMediaPlayer url={lesson.content_url} contentType={lesson.content_type || "video"} />
            ) : (
              <Card className="border-white/10 bg-[#111]">
                <CardContent className="py-8 text-center text-gray-400 text-sm">
                  Lesson media is not published yet. Sign in to the member portal when your access is ready, or continue below to book a conversation.
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!loading && (!course || !lesson) && (
          <p className="text-gray-400 text-center py-8">
            Your first course lesson will appear here when it is available in the catalog. You can still book a conversation below.
          </p>
        )}

        <div className="border border-white/10 rounded-2xl p-6 md:p-8 space-y-4 bg-white/[0.02]">
          <p className="text-gray-200 leading-relaxed">
            You do not have to carry this alone. If this is hitting home, the next step is simple. Book a conversation and we will look at what is really
            happening in your relationship with your adult child and what to do next.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 text-lg rounded-full"
            >
              <a href="/go/join">Continue Into PAPA Life</a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto border-white/15 bg-transparent text-gray-100 hover:bg-white/10 hover:text-white font-bold px-8 py-6 text-lg rounded-full"
            >
              <a href={CALENDLY_BOOK_URL} target="_blank" rel="noopener noreferrer">
                Book a Conversation
              </a>
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 pb-8">
          Questions?{" "}
          <a href="mailto:brian@bossmobility.net" className="text-gray-400 hover:text-brand-yellow underline-offset-2 hover:underline">
            brian@bossmobility.net
          </a>
        </p>
      </main>
    </div>
  );
}

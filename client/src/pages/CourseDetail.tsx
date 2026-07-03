import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Clock, GraduationCap, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteLogoStacked } from "@/components/SiteLogo";

type LessonPreview = {
  id: number;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  sort_order: number;
  content_type: string;
};

type CourseDetailData = {
  id: number;
  title: string;
  description: string | null;
  pillar: string;
  sort_order: number;
  lessons: LessonPreview[];
};

const pillarStyles: Record<string, { badge: string; border: string }> = {
  Purpose: { badge: "bg-brand-yellow/15 text-brand-yellow border-brand-yellow/30", border: "border-brand-yellow/20" },
  Authority: { badge: "bg-primary/15 text-primary border-primary/30", border: "border-primary/20" },
  Presence: { badge: "bg-accent/15 text-accent border-accent/30", border: "border-accent/20" },
  Alignment: { badge: "bg-brand-yellow/15 text-brand-yellow border-brand-yellow/30", border: "border-brand-yellow/20" },
  General: { badge: "bg-white/10 text-gray-300 border-white/20", border: "border-white/10" },
};

export default function CourseDetail() {
  const params = useParams();
  const id = params.id;
  const [course, setCourse] = useState<CourseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/public/courses/${id}`);
        if (res.status === 404) {
          setError("Course not found.");
          setCourse(null);
          return;
        }
        if (!res.ok) throw new Error("Failed");
        setCourse(await res.json());
      } catch {
        setError("We could not load this course.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const colors = course ? pillarStyles[course.pillar] || pillarStyles.General : pillarStyles.General;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-3xl mx-auto px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link href="/courses">
            <a className="inline-flex items-center gap-2 text-gray-400 hover:text-brand-yellow text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> All courses
            </a>
          </Link>
          <SiteLogoStacked size="sm" className="sm:ml-auto" />
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-6 py-16">
        {loading && (
          <div className="flex justify-center py-24">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        )}

        {error && !loading && (
          <Card className="bg-[#111] border-accent/30">
            <CardContent className="py-8 text-center text-accent">{error}</CardContent>
          </Card>
        )}

        {course && !loading && (
          <>
            <div className="mb-10">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border inline-block mb-4 ${colors.badge}`}>{course.pillar}</span>
              <h1 className="font-heading text-3xl md:text-4xl font-extrabold text-white mb-4">{course.title}</h1>
              {course.description && <p className="text-gray-400 text-lg leading-relaxed">{course.description}</p>}
            </div>

            <div className="rounded-2xl border border-brand-yellow/20 bg-brand-yellow/5 px-5 py-4 mb-10 text-sm text-brand-yellow">
              Lesson videos and materials are available after you sign in to the member portal. This page is a preview of the curriculum.
            </div>

            <h2 className="font-heading text-lg font-bold text-white mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Lessons ({course.lessons?.length ?? 0})
            </h2>

            <ul className="space-y-3">
              {(course.lessons ?? []).map((lesson, idx) => (
                <li
                  key={lesson.id}
                  className="flex gap-4 items-start rounded-xl border border-white/10 bg-[#111] px-4 py-4"
                >
                  <span className="text-gray-600 font-mono text-sm w-8 shrink-0 pt-0.5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium">{lesson.title}</p>
                    {lesson.description && <p className="text-gray-500 text-sm mt-1 whitespace-pre-wrap">{lesson.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-600">
                      {lesson.duration_minutes != null && lesson.duration_minutes > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {lesson.duration_minutes} min
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 capitalize">
                        <Play className="w-3.5 h-3.5" />
                        {lesson.content_type || "video"}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 mt-12">
              <Button asChild className="bg-primary text-primary-foreground font-bold rounded-full px-8">
                <a href="/member-login">Sign in to watch</a>
              </Button>
              <Button variant="outline" asChild className="border-white/20 text-white rounded-full">
                <Link href="/courses">
                  <a>Back to catalog</a>
                </Link>
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

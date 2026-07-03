import { useEffect, useState } from "react";
import { Link } from "wouter";
import { GraduationCap, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteLogoStacked } from "@/components/SiteLogo";

type CatalogCourse = {
  id: number;
  title: string;
  description: string | null;
  pillar: string;
  sort_order: number;
  lesson_count: number;
};

const pillarStyles: Record<string, { badge: string; border: string }> = {
  Purpose: { badge: "bg-brand-yellow/15 text-brand-yellow border-brand-yellow/30", border: "border-brand-yellow/20" },
  Authority: { badge: "bg-primary/15 text-primary border-primary/30", border: "border-primary/20" },
  Presence: { badge: "bg-accent/15 text-accent border-accent/30", border: "border-accent/20" },
  Alignment: { badge: "bg-brand-yellow/15 text-brand-yellow border-brand-yellow/30", border: "border-brand-yellow/20" },
  General: { badge: "bg-white/10 text-gray-300 border-white/20", border: "border-white/10" },
};

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
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link href="/">
            <a className="inline-flex items-center gap-2 text-gray-400 hover:text-brand-yellow text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </a>
          </Link>
          <SiteLogoStacked size="sm" className="sm:ml-auto" />
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 mb-6">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold text-white mb-4">Courses</h1>
          <p className="text-gray-400 text-lg">
            Programs built for fathers navigating relationships with adult children. Sign in to the member portal to watch lessons and track progress.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-24">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        )}

        {error && !loading && (
          <Card className="bg-[#111] border-red-500/30 max-w-lg mx-auto">
            <CardContent className="py-8 text-center text-red-300">{error}</CardContent>
          </Card>
        )}

        {!loading && !error && courses.length === 0 && (
          <Card className="bg-[#111] border-white/10 max-w-lg mx-auto">
            <CardContent className="py-12 text-center text-gray-500">
              No courses are listed yet. Check back soon, or contact your coach.
            </CardContent>
          </Card>
        )}

        {!loading && courses.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {courses.map((c) => {
              const colors = pillarStyles[c.pillar] || pillarStyles.General;
              return (
                <Link key={c.id} href={`/courses/${c.id}`}>
                  <a className={`block rounded-2xl border bg-[#111] p-6 transition-all hover:bg-white/[0.04] hover:border-primary/30 ${colors.border}`}>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border inline-block mb-3 ${colors.badge}`}>{c.pillar}</span>
                    <h2 className="font-heading text-xl font-bold text-white mb-2">{c.title}</h2>
                    {c.description && <p className="text-gray-500 text-sm line-clamp-3 mb-4">{c.description}</p>}
                    <p className="text-gray-600 text-xs">
                      {c.lesson_count} lesson{c.lesson_count !== 1 ? "s" : ""}
                    </p>
                  </a>
                </Link>
              );
            })}
          </div>
        )}

        <div className="text-center mt-16">
          <p className="text-gray-500 text-sm mb-4">Already a member?</p>
          <Button asChild className="bg-primary text-primary-foreground font-bold rounded-full px-8">
            <a href="/member-login">Member Portal</a>
          </Button>
        </div>
      </main>
    </div>
  );
}

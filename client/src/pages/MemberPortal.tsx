import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  GraduationCap,
  BookMarked,
  LogOut,
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Video,
  User,
  Users2,
  CalendarDays,
  Library,
  Flame,
  Zap,
  Target,
  TrendingUp,
  Moon,
  Star,
  MessageSquare,
  ArrowRight,
  BookOpen,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LessonMediaPlayer } from "@/components/LessonMediaPlayer";
import { SiteCtaBlocks } from "@/components/SiteCtaBlocks";
import { SiteLogo } from "@/components/SiteLogo";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  payment_status?: string;
  onboarding_completed: number;
  primary_pillar?: string;
  streak_days?: number;
}

interface Course {
  id: number;
  title: string;
  description: string | null;
  pillar: string;
  lesson_count: number;
}

interface Lesson {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  content_url: string | null;
  content_type: string;
  duration_minutes: number | null;
}

interface JournalPrompt {
  id: number;
  pillar: string;
  prompt_text: string;
}

interface JournalEntry {
  id: number;
  pillar: string;
  prompt: string;
  body: string;
  created_at: string;
}

interface Circle {
  id: number;
  name: string;
  description: string | null;
  category: string;
  member_count: number;
  is_member: number;
}

interface CirclePost {
  id: number;
  member_id: number;
  body: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

interface PlatformEvent {
  id: number;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  format: string;
  location: string | null;
  zoom_link: string | null;
  is_free: number;
  is_members_only: number;
  rsvp_count: number;
  is_rsvped: number;
}

interface Resource {
  id: number;
  title: string;
  description: string | null;
  pillar: string;
  file_url: string | null;
  type: string;
  is_free: number;
}

interface DailyReflection {
  id: number;
  prompt_text: string;
  pillar: string;
  completed: boolean;
}

interface MemberStats {
  completedLessons: number;
  journalEntries: number;
  circlesJoined: number;
  eventsAttending: number;
  streak_days: number;
  primary_pillar: string;
}

interface StrategyInsight {
  type: string;
  title: string;
  body: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

type PortalView = "home" | "courses" | "journal" | "brotherhood" | "events" | "library" | "profile";

const pillarColors: Record<string, { badge: string; bar: string; text: string; bg: string }> = {
  Purpose: { badge: "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/30", bar: "bg-brand-yellow", text: "text-brand-yellow", bg: "bg-brand-yellow/5" },
  Authority: { badge: "bg-primary/10 text-primary border-primary/30", bar: "bg-primary", text: "text-primary", bg: "bg-primary/5" },
  Presence: { badge: "bg-accent/10 text-accent border-accent/30", bar: "bg-accent", text: "text-accent", bg: "bg-accent/5" },
  Alignment: { badge: "bg-brand-yellow/10 text-brand-yellow border-brand-yellow/30", bar: "bg-brand-yellow", text: "text-brand-yellow", bg: "bg-brand-yellow/5" },
  General: { badge: "bg-white/5 text-gray-400 border-white/10", bar: "bg-gray-400", text: "text-gray-400", bg: "bg-white/5" },
};

// ─── Onboarding Wizard ────────────────────────────────────────────────────────

function OnboardingWizard({ user, onComplete }: { user: MemberUser; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    adult_children_count: 1,
    emotional_state: "",
    primary_pillar: "Purpose",
    faith_tradition: "",
    daily_reminder: false,
    brotherhood_notifications: true,
  });
  const [saving, setSaving] = useState(false);

  const emotionalOptions = [
    "Disconnected from my kids",
    "Struggling with authority balance",
    "Searching for deeper purpose",
    "Life feels out of alignment",
    "Ready to level up",
  ];

  const pillars = ["Purpose", "Authority", "Presence", "Alignment"];

  const steps = [
    {
      title: "Welcome to PAPA Life",
      subtitle: `Let's personalize your journey, ${user.first_name}.`,
      content: (
        <div className="space-y-6">
          <p className="text-gray-400 leading-relaxed">This quick setup helps us tailor your coaching, journal prompts, and circle recommendations to where you are right now as a father.</p>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">How many adult children do you have?</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setForm((f) => ({ ...f, adult_children_count: Math.max(1, f.adult_children_count - 1) }))} className="w-10 h-10 rounded-full bg-white/10 text-white font-bold text-lg hover:bg-white/20 transition-colors">-</button>
              <span className="text-white font-bold text-2xl w-8 text-center">{form.adult_children_count}</span>
              <button onClick={() => setForm((f) => ({ ...f, adult_children_count: f.adult_children_count + 1 }))} className="w-10 h-10 rounded-full bg-white/10 text-white font-bold text-lg hover:bg-white/20 transition-colors">+</button>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Where Are You Right Now?",
      subtitle: "Be honest — this is your safe space.",
      content: (
        <div className="space-y-3">
          {emotionalOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => setForm((f) => ({ ...f, emotional_state: opt }))}
              className={`w-full text-left px-5 py-4 rounded-xl border text-sm transition-colors ${form.emotional_state === opt ? "bg-primary/10 border-primary/40 text-primary/90" : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"}`}
            >
              {opt}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Your Primary Growth Pillar",
      subtitle: "Which pillar needs the most work right now?",
      content: (
        <div className="grid grid-cols-2 gap-3">
          {pillars.map((p) => {
            const c = pillarColors[p];
            return (
              <button
                key={p}
                onClick={() => setForm((f) => ({ ...f, primary_pillar: p }))}
                className={`px-5 py-5 rounded-xl border text-left transition-all ${form.primary_pillar === p ? `${c.badge} border` : "bg-white/5 border-white/10 text-gray-400 hover:text-white"}`}
              >
                <p className="font-bold text-sm">{p}</p>
                <p className="text-[11px] mt-1 opacity-60">
                  {p === "Purpose" ? "Know your why" : p === "Authority" ? "Lead with grace" : p === "Presence" ? "Show up fully" : "Live aligned"}
                </p>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Faith & Notifications",
      subtitle: "Personalize your experience.",
      content: (
        <div className="space-y-5">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">Faith tradition (optional)</label>
            <input
              value={form.faith_tradition}
              onChange={(e) => setForm((f) => ({ ...f, faith_tradition: e.target.value }))}
              placeholder="e.g. Christian, Muslim, Non-denominational..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/50"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setForm((f) => ({ ...f, daily_reminder: !f.daily_reminder }))} className={`w-11 h-6 rounded-full transition-colors ${form.daily_reminder ? "bg-primary" : "bg-white/10"} relative`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.daily_reminder ? "left-5" : "left-0.5"}`} />
            </div>
            <span className="text-sm text-gray-300">Daily reflection reminders</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setForm((f) => ({ ...f, brotherhood_notifications: !f.brotherhood_notifications }))} className={`w-11 h-6 rounded-full transition-colors ${form.brotherhood_notifications ? "bg-primary" : "bg-white/10"} relative`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.brotherhood_notifications ? "left-5" : "left-0.5"}`} />
            </div>
            <span className="text-sm text-gray-300">Brotherhood circle updates</span>
          </label>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = async () => {
    if (isLast) {
      setSaving(true);
      await fetch("/api/member/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaving(false);
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="w-full flex justify-center items-start py-8 md:py-12 px-4 md:px-6">
      <div className="w-full max-w-lg">
        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-white/10"}`} />
          ))}
        </div>
        <div className="bg-[#111] border border-white/10 rounded-2xl p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-white">{current.title}</h2>
            <p className="text-gray-500 text-sm mt-1">{current.subtitle}</p>
          </div>
          {current.content}
          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-400 hover:text-white text-sm font-medium transition-colors">Back</button>
            )}
            <Button onClick={handleNext} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl">
              {saving ? "Saving..." : isLast ? "Enter PAPA Life" : "Continue"} {!saving && <ArrowRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function PortalSidebar({
  view,
  setView,
  user,
  onLogout,
}: {
  view: PortalView;
  setView: (v: PortalView) => void;
  user: MemberUser | null;
  onLogout: () => void;
}) {
  const items: { id: PortalView; label: string; Icon: typeof LayoutDashboard }[] = [
    { id: "home", label: "My Journey", Icon: LayoutDashboard },
    { id: "courses", label: "Courses", Icon: GraduationCap },
    { id: "journal", label: "Journal", Icon: BookMarked },
    { id: "brotherhood", label: "Brotherhood", Icon: Users2 },
    { id: "events", label: "Events", Icon: CalendarDays },
    { id: "library", label: "Resources", Icon: Library },
    { id: "profile", label: "Profile", Icon: User },
  ];

  return (
    <aside className="w-56 min-h-screen bg-[#0d0d0d] border-r border-white/10 flex flex-col">
      <div className="flex items-center gap-2 px-3 py-4 border-b border-white/10">
        <SiteLogo size="sm" compact className="min-w-0" />
      </div>

      {user?.streak_days ? (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2">
          <Flame className="w-4 h-4 text-primary" />
          <span className="text-primary/90 text-xs font-bold">{user.streak_days} day streak</span>
        </div>
      ) : null}

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              view === id ? "bg-white/10 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 space-y-3">
        {user && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
              {user.first_name[0]}{user.last_name?.[0] || ""}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user.first_name} {user.last_name}</p>
              <p className="text-gray-500 text-[10px] truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </aside>
  );
}

// ─── My Journey (Home) ────────────────────────────────────────────────────────

function MyJourney({
  user,
  onNavigate,
}: {
  user: MemberUser | null;
  onNavigate: (v: PortalView) => void;
}) {
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [reflection, setReflection] = useState<DailyReflection | null>(null);
  const [scanInsights, setScanInsights] = useState<StrategyInsight[]>([]);
  const [scanLoaded, setScanLoaded] = useState(false);
  const [reflectionDone, setReflectionDone] = useState(false);

  useEffect(() => {
    fetch("/api/member/stats").then((r) => r.json()).then(setStats);
    fetch("/api/member/daily-reflection").then((r) => r.json()).then((d) => {
      if (d) { setReflection(d); setReflectionDone(d.completed); }
    });
    fetch("/api/member/strategy-scan").then((r) => r.json()).then((d) => {
      setScanInsights(d.insights || []);
      setScanLoaded(true);
    });
  }, []);

  const markReflectionDone = async () => {
    if (!reflection || reflectionDone) return;
    await fetch(`/api/member/daily-reflection/${reflection.id}/complete`, { method: "POST" });
    setReflectionDone(true);
  };

  const insightIcons: Record<string, typeof Flame> = { strength: Star, growth: Target, streak: Flame, action: Zap };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-white/10 p-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <h1 className="text-3xl font-extrabold text-white leading-tight">
          Welcome back, <span className="text-primary">{user?.first_name}</span>.
        </h1>
        <p className="text-gray-400 mt-2 text-sm">Your PAPA Life journey continues. Keep building your legacy.</p>
        {user?.primary_pillar && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-gray-500">Primary Focus:</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${pillarColors[user.primary_pillar]?.badge}`}>{user.primary_pillar}</span>
          </div>
        )}
      </div>

      <SiteCtaBlocks placement="member_home" className="max-w-3xl" />

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Lessons Done", value: stats.completedLessons, Icon: GraduationCap, color: "text-green-400" },
            { label: "Journal Entries", value: stats.journalEntries, Icon: BookMarked, color: "text-primary" },
            { label: "Circles Joined", value: stats.circlesJoined, Icon: Users2, color: "text-brand-yellow" },
            { label: "Day Streak", value: stats.streak_days, Icon: Flame, color: "text-brand-yellow" },
          ].map(({ label, value, Icon, color }) => (
            <Card key={label} className="bg-[#111] border-white/10">
              <CardContent className="p-4">
                <Icon className={`w-5 h-5 ${color} mb-2`} />
                <p className="text-2xl font-extrabold text-white">{value}</p>
                <p className="text-gray-500 text-[11px] mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-5 gap-6">
        {/* Daily reflection */}
        <div className="col-span-3 space-y-4">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold flex items-center gap-2">
            <Moon className="w-3.5 h-3.5" /> Today's Reflection
          </h3>
          {reflection ? (
            <div className={`bg-[#111] border rounded-xl p-6 ${reflectionDone ? "border-green-400/30" : "border-white/10"}`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${pillarColors[reflection.pillar]?.badge || pillarColors.General.badge}`}>{reflection.pillar}</span>
                {reflectionDone && <span className="text-xs text-green-400 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>}
              </div>
              <p className="text-gray-200 text-base leading-relaxed font-medium">{reflection.prompt_text}</p>
              {!reflectionDone && (
                <Button onClick={markReflectionDone} className="mt-4 bg-white/10 hover:bg-white/15 text-white text-sm">
                  Mark Reflected
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-[#111] border border-white/10 rounded-xl p-6 text-gray-500 text-sm">Loading today's reflection...</div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Write in Journal", icon: BookMarked, view: "journal" as PortalView, color: "from-primary/10 to-primary/5 border-primary/20 text-primary" },
              { label: "Join Brotherhood", icon: Users2, view: "brotherhood" as PortalView, color: "from-brand-yellow/10 to-brand-yellow/5 border-brand-yellow/20 text-brand-yellow" },
              { label: "Next Lesson", icon: GraduationCap, view: "courses" as PortalView, color: "from-green-400/10 to-green-400/5 border-green-400/20 text-green-400" },
            ].map(({ label, icon: Icon, view, color }) => (
              <button
                key={label}
                onClick={() => onNavigate(view)}
                className={`bg-gradient-to-br ${color} border rounded-xl p-4 text-left hover:opacity-80 transition-opacity`}
              >
                <Icon className="w-5 h-5 mb-2" />
                <p className="text-xs font-semibold text-gray-200">{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Strategy scan */}
        <div className="col-span-2 space-y-4">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Strategy Scan
          </h3>
          {!scanLoaded ? (
            <div className="bg-[#111] border border-white/10 rounded-xl p-6 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-600 text-xs mt-2">Analyzing your journey...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scanInsights.map((insight) => {
                const Icon = insightIcons[insight.type] || Zap;
                return (
                  <div key={insight.type} className="bg-[#111] border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-primary" />
                      <p className="text-white text-xs font-bold">{insight.title}</p>
                    </div>
                    <p className="text-gray-500 text-[11px] leading-relaxed">{insight.body}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Courses View ─────────────────────────────────────────────────────────────

function CoursesView({
  courses,
  completedIds,
  onToggleComplete,
}: {
  courses: Course[];
  completedIds: number[];
  onToggleComplete: (lessonId: number, completed: boolean) => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [lessons, setLessons] = useState<Record<number, Lesson[]>>({});
  const [filterPillar, setFilterPillar] = useState("All");

  const fetchLessons = async (courseId: number) => {
    if (lessons[courseId]) return;
    const res = await fetch(`/api/member/courses/${courseId}`);
    const data = await res.json();
    setLessons((prev) => ({ ...prev, [courseId]: data.lessons || [] }));
  };

  const toggleCourse = (id: number) => {
    if (expanded === id) { setExpanded(null); }
    else { setExpanded(id); fetchLessons(id); }
  };

  const filtered = filterPillar === "All" ? courses : courses.filter((c) => c.pillar === filterPillar);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Courses</h2>
        <p className="text-sm text-gray-500 mt-1">Your PAPA framework curriculum</p>
      </div>
      <SiteCtaBlocks placement="member_courses" />
      <div className="flex gap-1.5 flex-wrap">
        {["All", "Purpose", "Authority", "Presence", "Alignment", "General"].map((p) => (
          <button key={p} onClick={() => setFilterPillar(p)} className={`text-xs px-2.5 py-1 rounded-full transition-colors ${filterPillar === p ? "bg-brand-yellow text-black font-bold" : "bg-white/5 text-gray-400 hover:text-brand-yellow"}`}>{p}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <Card className="bg-[#111] border-white/10"><CardContent className="py-16 text-center text-gray-500">No courses available yet. Check back soon.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((course) => {
            const courseLessons = lessons[course.id] || [];
            const completedInCourse = courseLessons.filter((l) => completedIds.includes(l.id)).length;
            const colors = pillarColors[course.pillar] || pillarColors.General;
            const progress = courseLessons.length > 0 ? Math.round((completedInCourse / courseLessons.length) * 100) : 0;
            return (
              <div key={course.id} className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => toggleCourse(course.id)}>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border shrink-0 ${colors.badge}`}>{course.pillar}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold">{course.title}</p>
                    {course.description && <p className="text-gray-500 text-xs mt-0.5 truncate">{course.description}</p>}
                    {expanded === course.id && courseLessons.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full ${colors.bar} rounded-full transition-all`} style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500">{completedInCourse}/{courseLessons.length}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-gray-500 text-xs shrink-0">{course.lesson_count} lesson{course.lesson_count !== 1 ? "s" : ""}</span>
                  {expanded === course.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
                {expanded === course.id && (
                  <div className="border-t border-white/10 px-5 py-4 space-y-2">
                    {courseLessons.length === 0 ? (
                      <p className="text-gray-600 text-sm text-center py-4">No lessons in this course yet.</p>
                    ) : (
                      courseLessons.map((lesson) => {
                        const done = completedIds.includes(lesson.id);
                        return (
                          <div key={lesson.id} className="bg-white/5 rounded-xl px-4 py-3 space-y-3 border border-white/5">
                            <div className="flex items-center gap-3">
                              <button type="button" onClick={() => onToggleComplete(lesson.id, done)} className="shrink-0">
                                <CheckCircle2 className={`w-5 h-5 transition-colors ${done ? "text-green-400" : "text-gray-600 hover:text-gray-400"}`} />
                              </button>
                              <Video className="w-4 h-4 text-gray-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${done ? "line-through text-gray-600" : "text-gray-200"}`}>{lesson.title}</p>
                                {lesson.description && <p className="text-gray-600 text-xs mt-0.5 whitespace-pre-wrap">{lesson.description}</p>}
                                {lesson.duration_minutes != null && lesson.duration_minutes > 0 && (
                                  <p className="text-gray-600 text-[10px] mt-0.5">{lesson.duration_minutes} min</p>
                                )}
                              </div>
                              {lesson.content_url && (
                                <a
                                  href={lesson.content_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 flex items-center gap-1.5 text-xs text-brand-yellow hover:text-brand-yellow/80 font-medium px-3 py-1.5 rounded-lg bg-brand-yellow/10"
                                >
                                  <Play className="w-3 h-3" /> Open
                                </a>
                              )}
                            </div>
                            {lesson.content_url && (
                              <div className="pl-0 sm:pl-0 space-y-4">
                                <LessonMediaPlayer url={lesson.content_url} contentType={lesson.content_type} />
                                <SiteCtaBlocks placement="member_lesson" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Journal View ─────────────────────────────────────────────────────────────

function JournalView() {
  const [activePillar, setActivePillar] = useState("Purpose");
  const [prompts, setPrompts] = useState<JournalPrompt[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const pillars = ["Purpose", "Authority", "Presence", "Alignment"];

  const fetchPrompts = async () => {
    const res = await fetch("/api/journal-prompts");
    setPrompts(await res.json());
  };

  const fetchEntries = async (pillar: string) => {
    const res = await fetch(`/api/member/journal?pillar=${encodeURIComponent(pillar)}`);
    setEntries(await res.json());
  };

  useEffect(() => { fetchPrompts(); }, []);
  useEffect(() => { fetchEntries(activePillar); }, [activePillar]);

  const pillarPrompts = prompts.filter((p) => p.pillar === activePillar);
  const colors = pillarColors[activePillar] || pillarColors.General;

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setSaving(true);
    await fetch("/api/member/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pillar: activePillar, prompt: selectedPrompt, body }),
    });
    setBody(""); setSelectedPrompt("");
    await fetchEntries(activePillar);
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this journal entry?")) return;
    await fetch(`/api/member/journal/${id}`, { method: "DELETE" });
    fetchEntries(activePillar);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Journal</h2>
        <p className="text-sm text-gray-500 mt-1">Reflect on your PAPA journey</p>
      </div>
      <SiteCtaBlocks placement="member_journal" />
      <div className="flex gap-1.5">
        {pillars.map((p) => {
          const c = pillarColors[p];
          return (
            <button key={p} onClick={() => { setActivePillar(p); setSelectedPrompt(""); setBody(""); }}
              className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${activePillar === p ? `${c.badge} border` : "bg-white/5 text-gray-400 hover:text-white"}`}>
              {p}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-2 space-y-4">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Prompts</h3>
          {pillarPrompts.length === 0 ? <p className="text-gray-600 text-sm">No prompts for this pillar yet.</p> : (
            <div className="space-y-2">
              {pillarPrompts.map((p) => (
                <button key={p.id} onClick={() => setSelectedPrompt(p.prompt_text)}
                  className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-colors leading-relaxed ${selectedPrompt === p.prompt_text ? `${colors.badge} border` : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"}`}>
                  {p.prompt_text}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Write</h3>
            {selectedPrompt && <p className={`text-xs ${colors.text} leading-relaxed`}>"{selectedPrompt}"</p>}
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your reflection here..." rows={6}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-yellow/50 resize-none" />
            <Button onClick={handleSubmit} disabled={saving || !body.trim()} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm">
              {saving ? "Saving..." : "Save Entry"}
            </Button>
          </div>
        </div>
        <div className="col-span-3 space-y-4">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Past Entries — {activePillar}</h3>
          {entries.length === 0 ? (
            <div className="bg-[#111] border border-white/10 rounded-xl p-8 text-center text-gray-600 text-sm">No entries yet. Write your first reflection.</div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {entries.map((entry) => (
                <div key={entry.id} className="bg-[#111] border border-white/10 rounded-xl px-5 py-4 group">
                  {entry.prompt && <p className={`text-xs ${colors.text} mb-2 leading-relaxed`}>"{entry.prompt}"</p>}
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{entry.body}</p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-gray-600 text-[10px]">{new Date(entry.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                    <button onClick={() => handleDelete(entry.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Brotherhood View ─────────────────────────────────────────────────────────

function BrotherhoodView({ currentMemberId }: { currentMemberId: number }) {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [activeCircle, setActiveCircle] = useState<Circle | null>(null);
  const [posts, setPosts] = useState<CirclePost[]>([]);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  const fetchCircles = async () => {
    const res = await fetch("/api/member/circles");
    const data = await res.json();
    setCircles(data);
    if (!activeCircle && data.length > 0) setActiveCircle(data[0]);
  };

  const fetchPosts = async (circleId: number) => {
    const res = await fetch(`/api/member/circles/${circleId}/posts`);
    setPosts(await res.json());
  };

  useEffect(() => { fetchCircles(); }, []);
  useEffect(() => { if (activeCircle) fetchPosts(activeCircle.id); }, [activeCircle]);

  const handleJoinLeave = async (circle: Circle) => {
    if (circle.is_member) {
      await fetch(`/api/member/circles/${circle.id}/leave`, { method: "DELETE" });
    } else {
      await fetch(`/api/member/circles/${circle.id}/join`, { method: "POST" });
    }
    fetchCircles();
  };

  const handlePost = async () => {
    if (!activeCircle || !newPost.trim()) return;
    setPosting(true);
    await fetch(`/api/member/circles/${activeCircle.id}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: newPost.trim() }),
    });
    setNewPost("");
    fetchPosts(activeCircle.id);
    setPosting(false);
  };

  const handleDeletePost = async (postId: number) => {
    if (!activeCircle) return;
    await fetch(`/api/member/posts/${postId}`, { method: "DELETE" });
    fetchPosts(activeCircle.id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Brotherhood Circles</h2>
        <p className="text-sm text-gray-500 mt-1">Join a circle, share your wins, and grow together</p>
      </div>
      <SiteCtaBlocks placement="member_brotherhood" />
      <div className="grid grid-cols-4 gap-4">
        {circles.map((circle) => {
          const colors = pillarColors[circle.category] || pillarColors.General;
          return (
            <button
              key={circle.id}
              onClick={() => setActiveCircle(circle)}
              className={`rounded-xl border p-4 text-left transition-all ${activeCircle?.id === circle.id ? `${colors.bg} border-current ${colors.text}` : "bg-[#111] border-white/10 hover:border-white/20"}`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-widest ${circle.is_member ? colors.text : "text-gray-500"}`}>{circle.category}</span>
              <p className="text-white text-sm font-semibold mt-1 leading-tight">{circle.name}</p>
              <p className="text-gray-500 text-[10px] mt-2">{circle.member_count} member{circle.member_count !== 1 ? "s" : ""}</p>
              {circle.is_member ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-green-400 mt-2"><CheckCircle2 className="w-3 h-3" /> Joined</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {activeCircle && (
        <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold">{activeCircle.name}</h3>
              {activeCircle.description && <p className="text-gray-500 text-xs mt-0.5">{activeCircle.description}</p>}
            </div>
            <Button
              onClick={() => handleJoinLeave(activeCircle)}
              variant={activeCircle.is_member ? "outline" : "default"}
              className={activeCircle.is_member ? "border-white/20 text-gray-400 hover:text-accent hover:border-accent/40 text-xs" : "bg-primary hover:bg-primary/90 text-primary-foreground text-xs"}
            >
              {activeCircle.is_member ? "Leave Circle" : "Join Circle"}
            </Button>
          </div>

          {activeCircle.is_member ? (
            <div className="p-6 space-y-4">
              <div className="flex gap-3">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share a win, insight, or prayer request..."
                  rows={2}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-yellow/50 resize-none"
                />
                <Button onClick={handlePost} disabled={posting || !newPost.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 self-end">
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {posts.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-8">No posts yet. Be the first to share!</p>
                ) : (
                  posts.map((post) => (
                    <div key={post.id} className="flex gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        {post.first_name[0]}{post.last_name?.[0] || ""}
                      </div>
                      <div className="flex-1 bg-white/5 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-xs font-semibold">{post.first_name} {post.last_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-[10px]">{new Date(post.created_at).toLocaleDateString()}</span>
                            {post.member_id === currentMemberId && (
                              <button onClick={() => handleDeletePost(post.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-600 hover:text-red-400 transition-all">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{post.body}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Users2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Join this circle to read and post messages.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Events View ──────────────────────────────────────────────────────────────

function EventsView() {
  const [events, setEvents] = useState<PlatformEvent[]>([]);

  const fetchEvents = async () => {
    const res = await fetch("/api/member/events");
    setEvents(await res.json());
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleRSVP = async (event: PlatformEvent) => {
    if (event.is_rsvped) {
      await fetch(`/api/member/events/${event.id}/rsvp`, { method: "DELETE" });
    } else {
      await fetch(`/api/member/events/${event.id}/rsvp`, { method: "POST" });
    }
    fetchEvents();
  };

  const formatIcons: Record<string, string> = { zoom: "🎥", "in-person": "📍", "phone": "📞" };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Upcoming Events</h2>
        <p className="text-sm text-gray-500 mt-1">Live calls, workshops, and gatherings for PAPA Life members</p>
      </div>
      <SiteCtaBlocks placement="member_events" />
      {events.length === 0 ? (
        <Card className="bg-[#111] border-white/10"><CardContent className="py-16 text-center text-gray-500">No upcoming events at this time. Check back soon.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="bg-[#111] border border-white/10 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-lg">{formatIcons[event.format] || "📅"}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${event.is_free ? "bg-green-400/10 text-green-400 border border-green-400/20" : "bg-primary/10 text-primary border border-primary/20"}`}>
                      {event.is_free ? "Free" : "Members Only"}
                    </span>
                    {event.is_members_only ? <span className="text-xs px-2 py-0.5 rounded-full bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20">Members Only</span> : null}
                  </div>
                  <h3 className="text-white font-bold text-base">{event.title}</h3>
                  {event.description && <p className="text-gray-400 text-sm mt-1 leading-relaxed">{event.description}</p>}
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    <span className="text-gray-500 text-xs">📅 {new Date(event.event_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
                    {event.event_time && <span className="text-gray-500 text-xs">🕐 {event.event_time}</span>}
                    <span className="text-gray-500 text-xs">👥 {event.rsvp_count} attending</span>
                  </div>
                </div>
                <div className="shrink-0 text-right space-y-2">
                  <Button
                    onClick={() => handleRSVP(event)}
                    variant={event.is_rsvped ? "outline" : "default"}
                    className={event.is_rsvped ? "border-white/20 text-primary border-primary/30 text-xs" : "bg-primary hover:bg-primary/90 text-primary-foreground text-xs"}
                  >
                    {event.is_rsvped ? "✓ RSVP'd" : "RSVP"}
                  </Button>
                  {event.zoom_link && event.is_rsvped && (
                    <a href={event.zoom_link} target="_blank" rel="noopener noreferrer" className="block text-xs text-brand-yellow hover:text-brand-yellow/80">
                      Join Link →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Library View ─────────────────────────────────────────────────────────────

function LibraryView({ user }: { user: MemberUser | null }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filterPillar, setFilterPillar] = useState("All");
  const isPaidMember = user?.payment_status === "paid";

  useEffect(() => {
    fetch("/api/member/library").then((r) => r.json()).then(setResources);
  }, []);

  const filtered = filterPillar === "All" ? resources : resources.filter((r) => r.pillar === filterPillar);
  const typeIcons: Record<string, string> = { pdf: "📄", video: "🎥", audio: "🎧", worksheet: "📝", guide: "📚" };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Resource Library</h2>
        <p className="text-sm text-gray-500 mt-1">Guides, worksheets, and tools to accelerate your journey</p>
      </div>
      <SiteCtaBlocks placement="member_library" />
      <div className="flex gap-1.5 flex-wrap">
        {["All", "Purpose", "Authority", "Presence", "Alignment", "General"].map((p) => (
          <button key={p} onClick={() => setFilterPillar(p)} className={`text-xs px-2.5 py-1 rounded-full transition-colors ${filterPillar === p ? "bg-primary text-primary-foreground font-bold" : "bg-white/5 text-gray-400 hover:text-white"}`}>{p}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <Card className="bg-[#111] border-white/10"><CardContent className="py-16 text-center text-gray-500">No resources yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((resource) => {
            const colors = pillarColors[resource.pillar] || pillarColors.General;
            return (
              <div key={resource.id} className="bg-[#111] border border-white/10 rounded-xl p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-xl">{typeIcons[resource.type] || "📄"}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${colors.badge}`}>{resource.pillar}</span>
                    {!resource.is_free && <Lock className="w-3.5 h-3.5 text-gray-500" />}
                  </div>
                </div>
                <h3 className="text-white font-semibold text-sm leading-snug">{resource.title}</h3>
                {resource.description && <p className="text-gray-500 text-xs mt-1.5 leading-relaxed flex-1">{resource.description}</p>}
                <div className="mt-4">
                  {resource.file_url && (resource.is_free || isPaidMember) ? (
                    <a href={resource.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/90 font-medium">
                      <BookOpen className="w-3.5 h-3.5" /> Access Resource
                    </a>
                  ) : !resource.is_free ? (
                    <span className="text-xs text-gray-600 flex items-center gap-1"><Lock className="w-3 h-3" /> Upgrade to access</span>
                  ) : (
                    <span className="text-xs text-gray-600">Coming soon</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Profile View ─────────────────────────────────────────────────────────────

function ProfileView({ user }: { user: MemberUser | null }) {
  const [prefs, setPrefs] = useState({ daily_reminder: false, brotherhood_notifications: true, primary_pillar: "Purpose" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) setPrefs({ daily_reminder: !!user.streak_days, brotherhood_notifications: true, primary_pillar: user.primary_pillar || "Purpose" });
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/member/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-xl font-bold text-white">Profile</h2>
      <div className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-yellow/20 flex items-center justify-center text-brand-yellow font-bold text-xl">
            {user.first_name[0]}{user.last_name?.[0] || ""}
          </div>
          <div>
            <p className="text-white font-bold text-lg">{user.first_name} {user.last_name}</p>
            <p className="text-gray-500 text-sm">{user.email}</p>
          </div>
        </div>
        {user.streak_days !== undefined && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-primary/90 text-sm font-bold">{user.streak_days} day active streak</span>
          </div>
        )}
      </div>
      <div className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-4">
        <h3 className="text-white font-semibold text-sm">Preferences</h3>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-widest mb-2 block">Primary Growth Pillar</label>
          <div className="grid grid-cols-2 gap-2">
            {["Purpose", "Authority", "Presence", "Alignment"].map((p) => (
              <button key={p} onClick={() => setPrefs((f) => ({ ...f, primary_pillar: p }))}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${prefs.primary_pillar === p ? `${pillarColors[p].badge} border` : "bg-white/5 text-gray-400 hover:text-white"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setPrefs((f) => ({ ...f, daily_reminder: !f.daily_reminder }))} className={`w-11 h-6 rounded-full transition-colors ${prefs.daily_reminder ? "bg-primary" : "bg-white/10"} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${prefs.daily_reminder ? "left-5" : "left-0.5"}`} />
          </div>
          <span className="text-sm text-gray-300">Daily reflection reminders</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setPrefs((f) => ({ ...f, brotherhood_notifications: !f.brotherhood_notifications }))} className={`w-11 h-6 rounded-full transition-colors ${prefs.brotherhood_notifications ? "bg-primary" : "bg-white/10"} relative`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${prefs.brotherhood_notifications ? "left-5" : "left-0.5"}`} />
          </div>
          <span className="text-sm text-gray-300">Brotherhood notifications</span>
        </label>
        <Button onClick={handleSave} disabled={saving} className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold text-sm">
          {saving ? "Saving..." : saved ? "Saved!" : "Save Preferences"}
        </Button>
      </div>
      <div className="bg-[#111] border border-white/10 rounded-xl p-5">
        <p className="text-gray-500 text-xs">To reset your password or get billing support, contact your PAPA Life coach or email admin@bossmobilelifecoach.com</p>
      </div>
    </div>
  );
}

// ─── Main Portal ──────────────────────────────────────────────────────────────

export default function MemberPortal() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<PortalView>("home");
  const [user, setUser] = useState<MemberUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [completedIds, setCompletedIds] = useState<number[]>([]);

  useEffect(() => {
    fetch("/api/member/auth/me")
      .then(async (r) => ({ status: r.status, data: await r.json() }))
      .then((data) => {
        if (data.status === 402 || data.data?.billing_required) {
          navigate("/member-billing");
          return;
        }
        if (data.data?.ok) {
          setUser(data.data.user);
          fetchData();
        } else {
          navigate("/member-login");
        }
      })
      .catch(() => navigate("/member-login"))
      .finally(() => setAuthChecked(true));
  }, []);

  const fetchData = async () => {
    const [coursesRes, progressRes] = await Promise.all([
      fetch("/api/member/courses"),
      fetch("/api/member/progress"),
    ]);
    if (coursesRes.status === 402) { navigate("/member-billing"); return; }
    if (coursesRes.status === 401) { navigate("/member-login"); return; }
    setCourses(await coursesRes.json());
    const progress = await progressRes.json();
    setCompletedIds(progress.map((p: { lesson_id: number }) => p.lesson_id));
  };

  const handleToggleComplete = async (lessonId: number, currentlyDone: boolean) => {
    if (currentlyDone) {
      await fetch(`/api/member/progress/${lessonId}`, { method: "DELETE" });
      setCompletedIds((prev) => prev.filter((id) => id !== lessonId));
    } else {
      await fetch("/api/member/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lessonId }),
      });
      setCompletedIds((prev) => [...prev, lessonId]);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/member/auth/logout", { method: "POST" });
    navigate("/member-login");
  };

  const handleOnboardingComplete = () => {
    // Reload user to get updated onboarding_completed flag
    fetch("/api/member/me").then((r) => r.json()).then((data) => setUser(data));
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const showOnboarding = !user.onboarding_completed && view === "home";

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      <PortalSidebar view={view} setView={setView} user={user} onLogout={handleLogout} />
      <main className="flex-1 p-8 overflow-y-auto max-w-5xl">
        {showOnboarding ? (
          <OnboardingWizard user={user} onComplete={handleOnboardingComplete} />
        ) : (
          <>
            {view === "home" && <MyJourney user={user} onNavigate={setView} />}
            {view === "courses" && <CoursesView courses={courses} completedIds={completedIds} onToggleComplete={handleToggleComplete} />}
            {view === "journal" && <JournalView />}
            {view === "brotherhood" && <BrotherhoodView currentMemberId={user?.id || 0} />}
            {view === "events" && <EventsView />}
            {view === "library" && <LibraryView user={user} />}
            {view === "profile" && <ProfileView user={user} />}
          </>
        )}
      </main>
    </div>
  );
}

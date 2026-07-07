import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";
import {
  papaAiCurrentPromo,
  papaAiGraphicsLibrary,
  type PapaAiPromoWeek,
  type PapaPillar,
} from "@/content/papa-ai-graphics";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  Heart,
  Library,
  Mail,
  MessageCircle,
  Mic,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Mode = "coach" | "assessment" | "resource" | "tuesday" | "membership" | "prayer" | "bible-study";

type ResourceItem = {
  title: string;
  type: string;
  pillar: string;
  description: string;
  path: string;
};

type AiMessage = {
  role: "user" | "assistant";
  content: string;
};

type LeadContact = {
  first_name: string;
  email: string;
  phone: string;
  sms_consent: boolean;
};

const PAPA_LIFE_VOICE_AGENT_URL = "/papa-agent.html";
const papaPillars: PapaPillar[] = ["Purpose", "Authority", "Presence", "Alignment"];
const SMS_CONSENT_TEXT =
  "By submitting this form, you agree to receive text messages from Papa Life regarding coaching appointments, educational resources, reminders, and account notifications. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe or HELP for assistance. SMS consent is not shared with third parties.";

type AssessmentQuestion = {
  id: string;
  label: string;
  pillar: string;
};

type PapaAiManifestWeek = Partial<Omit<PapaAiPromoWeek, "imagePath" | "pillar">> & {
  pillar?: string;
  websiteHero?: string;
  websiteImage?: string;
};

function promoFromManifestWeek(currentWeek?: PapaAiManifestWeek | null): PapaAiPromoWeek | null {
  if (!currentWeek?.isoWeek || !currentWeek.pillar) return null;

  const pillar = papaPillars.find((item) => item.toLowerCase() === currentWeek.pillar?.toLowerCase());
  const imagePath = currentWeek.websiteImage || currentWeek.websiteHero;
  if (!pillar || !imagePath) return null;

  return {
    weekNumber: currentWeek.weekNumber || papaAiCurrentPromo.weekNumber,
    isoWeek: currentWeek.isoWeek,
    startsOn: currentWeek.startsOn || papaAiCurrentPromo.startsOn,
    pillar,
    topic: currentWeek.topic || papaAiCurrentPromo.topic,
    themeLine: currentWeek.themeLine || papaAiCurrentPromo.themeLine,
    imagePath,
    platform: currentWeek.platform || papaAiCurrentPromo.platform,
  };
}

const localResources: ResourceItem[] = [
  {
    title: "The PAPA Framework Guide",
    type: "Worksheet",
    pillar: "General",
    description: "Start with Purpose, Authority, Presence, and Alignment.",
    path: "/papa-framework",
  },
  {
    title: "Fatherhood Didn't End. It Changed.",
    type: "Course",
    pillar: "Presence",
    description: "A free first lesson for fathers learning the new role with adult children.",
    path: "/papa-first-lesson",
  },
  {
    title: "Give. Listen. Love. Serve.",
    type: "Email Series",
    pillar: "Presence",
    description: "Brian's focused pathway for fathers learning to give presence, listen first, love well, and serve without control.",
    path: "https://givlistenlove-7uppzn73.manus.space/",
  },
  {
    title: "Adult Daughter Relationship Path",
    type: "Article",
    pillar: "Presence",
    description: "A careful starting point for reconnecting with an adult daughter without pressure.",
    path: "/adult-daughter-relationship",
  },
  {
    title: "Adult Son Relationship Path",
    type: "Article",
    pillar: "Authority",
    description: "A practical path for humility, respect, and repaired trust with an adult son.",
    path: "/adult-son-relationship",
  },
  {
    title: "Free PAPA Self-Assessment",
    type: "Assessment",
    pillar: "General",
    description: "Score the relationship across the PAPA pillars and find the first place to focus.",
    path: "/assessment",
  },
  {
    title: "Papa Life Tuesday Live",
    type: "Live Show",
    pillar: "General",
    description: "Bring a question into Tuesday Live and receive follow-up resources.",
    path: "/tuesday",
  },
];

const fallbackQuestions: AssessmentQuestion[] = [
  { id: "purpose_1", label: "I know what kind of father I am becoming in this season.", pillar: "Purpose" },
  { id: "purpose_2", label: "I can name a clear hope for my relationship with my adult child.", pillar: "Purpose" },
  { id: "authority_1", label: "I lead through humility and consistency instead of pressure.", pillar: "Authority" },
  { id: "authority_2", label: "I can take responsibility for my part without becoming defensive.", pillar: "Authority" },
  { id: "presence_1", label: "I listen before correcting, teaching, or fixing.", pillar: "Presence" },
  { id: "presence_2", label: "I initiate connection without demanding a response.", pillar: "Presence" },
  { id: "alignment_1", label: "My actions match the faith and values I say matter.", pillar: "Alignment" },
  { id: "alignment_2", label: "I have made, or am willing to make, needed apologies.", pillar: "Alignment" },
  { id: "communication_1", label: "My adult child would likely experience my tone as safe.", pillar: "Communication" },
  { id: "communication_2", label: "I ask questions that invite honesty instead of control.", pillar: "Communication" },
  { id: "forgiveness_1", label: "I am willing to forgive without pretending nothing happened.", pillar: "Forgiveness" },
  { id: "forgiveness_2", label: "I can seek forgiveness without rushing the other person's healing.", pillar: "Forgiveness" },
  { id: "trust_1", label: "I understand trust is rebuilt through repeated small actions.", pillar: "Trust" },
  { id: "trust_2", label: "I keep my word in ways my family can see.", pillar: "Trust" },
  { id: "humility_1", label: "I can admit where age, authority, or pride made me hard to reach.", pillar: "Humility" },
  { id: "humility_2", label: "I am willing to change first even if my child is not ready.", pillar: "Humility" },
  { id: "listening_1", label: "I can hear pain without immediately defending myself.", pillar: "Listening" },
  { id: "listening_2", label: "I can reflect back what I heard before offering my view.", pillar: "Listening" },
  { id: "connection_1", label: "I make room for simple connection, not only serious talks.", pillar: "Connection" },
  { id: "connection_2", label: "I know one small, respectful next step I can take this week.", pillar: "Connection" },
];

const relatedLinks: Array<{ title: string; copy: string; Icon: LucideIcon; href: string }> = [
  {
    title: "Books",
    copy: "Papa Life books and chapters will connect through the resource finder.",
    Icon: Library,
    href: "/books",
  },
  {
    title: "Podcast",
    copy: "Show notes, questions, and follow-up resources connect here.",
    Icon: MessageCircle,
    href: "/podcast",
  },
  {
    title: "Tuesday Live",
    copy: "Ask before Tuesday or submit during the live show.",
    Icon: CalendarDays,
    href: "/tuesday",
  },
  {
    title: "Membership",
    copy: "Move from one answer into a guided Papa Life path.",
    Icon: Users,
    href: "/membership",
  },
];

const modeCopy: Record<Mode, { title: string; prompt: string; icon: typeof Bot }> = {
  coach: {
    title: "AI Coach",
    prompt: "Tell me what is happening with your adult child.",
    icon: Bot,
  },
  resource: {
    title: "Resource Finder",
    prompt: "What kind of help are you looking for?",
    icon: Search,
  },
  tuesday: {
    title: "Tuesday Live",
    prompt: "What question should Brian answer before or during Tuesday Live?",
    icon: CalendarDays,
  },
  membership: {
    title: "Membership",
    prompt: "Ask about membership, courses, community, pricing, or next steps.",
    icon: Users,
  },
  prayer: {
    title: "Prayer",
    prompt: "What would you like prayer for as a father?",
    icon: Heart,
  },
  "bible-study": {
    title: "Bible Study",
    prompt: "What passage, topic, or fatherhood issue should the study focus on?",
    icon: BookOpen,
  },
  assessment: {
    title: "Assessment",
    prompt: "Complete the guided assessment below.",
    icon: ShieldCheck,
  },
};

function currentModeFromPath(): Mode {
  const path = window.location.pathname;
  if (path.includes("resources")) return "resource";
  if (path.includes("membership")) return "membership";
  if (path.includes("contact")) return "coach";
  return "coach";
}

function localReply(mode: Mode, text: string) {
  const lower = text.toLowerCase();
  if (mode === "prayer" || lower.includes("pray") || lower.includes("prayer")) {
    return "Father God, give me humility before I speak, patience before I act, and love that does not try to control the outcome. Help me listen first, own what is mine, and become consistent enough that trust can breathe again. Amen.";
  }
  if (mode === "bible-study") {
    return "Bible Study: Read James 1:19. Observation: listening comes before speaking. Interpretation: mature fatherhood does not lose authority when it slows down. Application: before your next conversation, write what you heard, what you can own, and what you will do differently. Reflection: where have I been trying to be understood before helping my child feel heard? Prayer: Lord, make me quick to listen and slow to speak.";
  }
  if (mode === "membership") {
    return "Papa Life membership is for fathers who want more than one emotional moment. It gives you structure, lessons, reflection, and brotherhood around Purpose, Authority, Presence, and Alignment. Start with the free assessment, then move into membership when you are ready for steady practice.";
  }
  if (mode === "tuesday") {
    return "That is a strong Tuesday Live question. Bring it as one clear sentence: what should a father do when he wants repair, but his adult child is not ready? The teaching should start with humility, move through Presence, and end with one practical step.";
  }
  if (mode === "resource") {
    return "Start with one resource, not ten. If the issue is distance, begin with Presence. If the issue is control or respect, begin with Authority. If the issue is apology or values, begin with Alignment. A strong first step is Give. Listen. Love. Serve. or the PAPA Framework Guide.";
  }
  if (lower.includes("daughter")) {
    return "Father, with your daughter, start with safety and listening. Do not lead with a speech. Lead with humility. A simple next step is: \"I've been thinking about how I have shown up, and I want to listen better. No pressure to respond today. I love you, and I am working on my part.\"";
  }
  if (lower.includes("son")) {
    return "Father, with your son, respect cannot be forced into the room. It is rebuilt through consistency. Ask yourself: am I trying to be right, or am I trying to become trustworthy? Start with one honest sentence of ownership and one practical action you can repeat.";
  }
  return "Father, start here: do not try to fix the whole relationship in one move. Listen first. Own what is yours. Remove pressure from the next message. Presence is not weakness; it is mature fatherhood. Take one small step this week that your adult child can experience as safe and consistent.";
}

function buildLocalAssessmentReport(questions: AssessmentQuestion[], answers: Record<string, number>) {
  const grouped = questions.reduce<Record<string, { score: number; max: number }>>((acc, question) => {
    const current = acc[question.pillar] || { score: 0, max: 0 };
    current.score += answers[question.id] || 0;
    current.max += 5;
    acc[question.pillar] = current;
    return acc;
  }, {});
  const scores = Object.entries(grouped).map(([pillar, value]) => ({
    pillar,
    score: value.score,
    max: value.max,
    percent: Math.round((value.score / value.max) * 100),
  }));
  const focus = [...scores].sort((a, b) => a.percent - b.percent)[0]?.pillar || "Presence";
  const strength = [...scores].sort((a, b) => b.percent - a.percent)[0]?.pillar || "Purpose";
  return {
    focus_pillar: focus,
    strength_pillar: strength,
    scores,
    report:
      `Father, your report points first to ${focus}. This is not a judgment. It is a starting place. ` +
      "Do not try to repair everything in one conversation. Pray first, listen longer than feels natural, own your part without defending it, and take one small consistent action this week.",
    resources: localResources.slice(0, 4),
  };
}

function LeadFields({
  lead,
  setLead,
}: {
  lead: LeadContact;
  setLead: React.Dispatch<React.SetStateAction<LeadContact>>;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          value={lead.first_name}
          onChange={(event) => setLead((current) => ({ ...current, first_name: event.target.value }))}
          placeholder="First name"
          aria-label="First name"
          className="h-12 border-white/15 bg-black/35"
        />
        <Input
          value={lead.email}
          onChange={(event) => setLead((current) => ({ ...current, email: event.target.value }))}
          placeholder="Email"
          type="email"
          aria-label="Email"
          className="h-12 border-white/15 bg-black/35"
        />
        <Input
          value={lead.phone}
          onChange={(event) => setLead((current) => ({ ...current, phone: event.target.value }))}
          placeholder="Phone optional"
          type="tel"
          aria-label="Phone optional"
          className="h-12 border-white/15 bg-black/35"
        />
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-relaxed text-white/52">
        <input
          type="checkbox"
          checked={lead.sms_consent}
          required={Boolean(lead.phone.trim())}
          onChange={(event) => setLead((current) => ({ ...current, sms_consent: event.target.checked }))}
          className="mt-1 h-4 w-4 rounded border-white/30 bg-black accent-brand-yellow"
        />
        <span>{SMS_CONSENT_TEXT}</span>
      </label>
    </div>
  );
}

function ResourceList({ resources }: { resources: ResourceItem[] }) {
  if (resources.length === 0) return null;
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2">
      {resources.map((resource) => (
        <a
          key={`${resource.title}-${resource.path}`}
          href={resource.path}
          target={resource.path.startsWith("http") ? "_blank" : undefined}
          rel={resource.path.startsWith("http") ? "noreferrer" : undefined}
          className="rounded-xl border border-white/10 bg-black/30 p-4 transition-colors hover:border-brand-yellow/60"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-brand-yellow/35 text-brand-yellow">
              {resource.type}
            </Badge>
            <Badge variant="outline" className="border-primary/30 text-primary">
              {resource.pillar}
            </Badge>
          </div>
          <h3 className="mt-3 text-lg font-bold text-white">{resource.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/62">{resource.description}</p>
        </a>
      ))}
    </div>
  );
}

function ChatMode({
  mode,
  lead,
  setLead,
}: {
  mode: Exclude<Mode, "assessment">;
  lead: LeadContact;
  setLead: React.Dispatch<React.SetStateAction<LeadContact>>;
}) {
  const config = modeCopy[mode];
  const Icon = config.icon;
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      role: "assistant",
      content:
        mode === "resource"
          ? "Tell me what you are facing, and I will point you to the best Papa Life resources."
          : "Welcome to the Papa Life AI Coach. I help fathers of adult children rebuild connection, restore trust, and lead with Purpose, Authority, Presence, and Alignment. What's weighing on your heart today?",
    },
  ]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const phoneNeedsConsent = Boolean(lead.phone.trim() && !lead.sms_consent);

  async function send() {
    const clean = message.trim();
    if (!clean || loading || phoneNeedsConsent) return;
    setLoading(true);
    setMessage("");
    const nextMessages = [...messages, { role: "user" as const, content: clean }];
    setMessages(nextMessages);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, message: clean, history: nextMessages.slice(-8), lead }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Unable to respond");
      setMessages((current) => [...current, { role: "assistant", content: json.reply }]);
      setResources(Array.isArray(json.resources) ? json.resources : []);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: localReply(mode, clean),
        },
      ]);
      setResources(localResources.slice(0, 4));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[.92fr_1.08fr]">
      <section className="rounded-2xl border border-white/10 bg-card/70 p-5 md:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-yellow text-black">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold">{config.title}</h2>
            <p className="text-sm text-white/55">{config.prompt}</p>
          </div>
        </div>

        <div className="mt-6">
          <LeadFields lead={lead} setLead={setLead} />
        </div>

        <div className="mt-5">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={config.prompt}
            className="min-h-36 resize-none border-white/15 bg-black/35 text-base"
          />
          <Button
            type="button"
            onClick={send}
            disabled={!message.trim() || loading || phoneNeedsConsent}
            className="mt-4 min-h-12 rounded-full bg-primary px-6 font-extrabold text-black hover:bg-primary/90"
          >
            {loading ? "Thinking..." : "Ask Papa Life AI"}
            <Send className="ml-2 h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-7 rounded-xl border border-brand-yellow/25 bg-brand-yellow/8 p-4">
          <p className="text-sm font-semibold leading-relaxed text-white/74">
            The coach gives spiritual encouragement and practical fatherhood guidance. It does not replace
            professional counseling, medical care, legal advice, or emergency support.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/35">
        <div className="border-b border-white/10 p-5">
          <h2 className="text-xl font-bold">Conversation</h2>
        </div>
        <div className="max-h-[560px] space-y-4 overflow-y-auto p-5">
          {messages.map((item, index) => (
            <div
              key={`${item.role}-${index}`}
              className={
                item.role === "assistant"
                  ? "rounded-xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-relaxed text-white/78"
                  : "ml-auto max-w-[86%] rounded-xl bg-primary p-4 text-sm font-semibold leading-relaxed text-black"
              }
            >
              {item.content}
            </div>
          ))}
          {loading && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/65">
              <Sparkles className="h-4 w-4 text-brand-yellow" aria-hidden="true" />
              Preparing a Papa Life response...
            </div>
          )}
        </div>
        <div className="border-t border-white/10 p-5">
          <ResourceList resources={resources} />
        </div>
      </section>
    </div>
  );
}

function AssessmentMode({
  lead,
  setLead,
}: {
  lead: LeadContact;
  setLead: React.Dispatch<React.SetStateAction<LeadContact>>;
}) {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>(fallbackQuestions);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const answered = Object.keys(answers).length;
  const phoneNeedsConsent = Boolean(lead.phone.trim() && !lead.sms_consent);

  useEffect(() => {
    fetch("/api/ai/assessment/questions")
      .then((response) => response.json())
      .then((json) => {
        if (Array.isArray(json.questions) && json.questions.length > 0) setQuestions(json.questions);
      })
      .catch(() => undefined);
  }, []);

  async function submitAssessment() {
    if (answered !== questions.length || loading || phoneNeedsConsent) return;
    setLoading(true);
    try {
      const payload = questions.map((question) => ({
        ...question,
        score: answers[question.id],
      }));
      const response = await fetch("/api/ai/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead, answers: payload }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Assessment failed");
      setReport(json.report);
      window.setTimeout(() => document.getElementById("papa-ai-report")?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch {
      setReport(buildLocalAssessmentReport(questions, answers));
      window.setTimeout(() => document.getElementById("papa-ai-report")?.scrollIntoView({ behavior: "smooth" }), 50);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
      <section className="rounded-2xl border border-white/10 bg-card/70 p-5 md:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-yellow text-black">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold">AI Fatherhood Assessment</h2>
            <p className="text-sm text-white/55">Twenty questions across PAPA and relationship repair.</p>
          </div>
        </div>
        <div className="mt-6">
          <LeadFields lead={lead} setLead={setLead} />
        </div>
        <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4">
          <p className="font-semibold text-white">Rate each statement from 1 to 5.</p>
          <p className="mt-1 text-sm text-white/55">1 means rarely true. 5 means consistently true.</p>
        </div>
        <Button
          type="button"
          disabled={answered !== questions.length || loading || phoneNeedsConsent}
          onClick={submitAssessment}
          className="mt-5 min-h-12 w-full rounded-full bg-primary font-extrabold text-black hover:bg-primary/90"
        >
          {loading ? "Building report..." : `Generate My Report (${answered}/${questions.length})`}
          <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
        </Button>
      </section>

      <section className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.id} className="border-white/10 bg-card/70">
            <CardContent className="p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <Badge variant="outline" className="border-brand-yellow/30 text-brand-yellow">
                    {question.pillar}
                  </Badge>
                  <p className="mt-3 font-semibold leading-relaxed text-white">
                    {index + 1}. {question.label}
                  </p>
                </div>
                <div className="grid min-w-[220px] grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setAnswers((current) => ({ ...current, [question.id]: rating }))}
                      className={
                        answers[question.id] === rating
                          ? "flex h-11 items-center justify-center rounded-lg bg-primary text-sm font-black text-black"
                          : "flex h-11 items-center justify-center rounded-lg border border-white/15 bg-black/35 text-sm font-bold text-white hover:border-brand-yellow/60"
                      }
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {report && (
          <section id="papa-ai-report" className="scroll-mt-24 rounded-2xl border border-primary/35 bg-primary/8 p-5 md:p-7">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Personalized report</p>
                <h2 className="mt-2 text-3xl font-extrabold">Focus first on {report.focus_pillar}.</h2>
                <p className="mt-4 leading-relaxed text-white/74">{report.report}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {report.scores?.map((score: any) => (
                <div key={score.pillar} className="rounded-xl border border-white/10 bg-black/35 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">{score.pillar}</span>
                    <span className="text-brand-yellow">{score.percent}%</span>
                  </div>
                </div>
              ))}
            </div>
            <ResourceList resources={report.resources || []} />
          </section>
        )}
      </section>
    </div>
  );
}

function LeadOffer({ lead, setLead }: {
  lead: LeadContact;
  setLead: React.Dispatch<React.SetStateAction<LeadContact>>;
}) {
  const [offer, setOffer] = useState("Free Assessment");
  const [saved, setSaved] = useState(false);
  const phoneNeedsConsent = Boolean(lead.phone.trim() && !lead.sms_consent);

  async function saveLead() {
    if (phoneNeedsConsent) return;
    try {
      const response = await fetch("/api/ai/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, offer }),
      });
      if (!response.ok) throw new Error("Lead endpoint unavailable");
    } catch {
      try {
        const response = await fetch("/api/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: lead.first_name,
            email: lead.email,
            phone: lead.phone,
            situation: `Papa Life AI lead requested: ${offer}`,
            routed_pillar: "AI Coach",
            disconnected_pillar: null,
            vision: "Visitor requested follow-up from the Papa Life AI experience.",
          }),
        });
        if (!response.ok) throw new Error("Legacy intake unavailable");
      } catch {
        const savedLeads = JSON.parse(window.localStorage.getItem("papaLifeAiLeads") || "[]");
        savedLeads.push({ ...lead, offer, created_at: new Date().toISOString() });
        window.localStorage.setItem("papaLifeAiLeads", JSON.stringify(savedLeads.slice(-20)));
      }
    }
    setSaved(true);
  }

  return (
    <section className="rounded-2xl border border-brand-yellow/25 bg-brand-yellow/8 p-5 md:p-7">
      <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-yellow">Stay connected</p>
          <h2 className="mt-2 text-3xl font-extrabold">Receive the next Papa Life step.</h2>
          <p className="mt-3 text-white/65">Choose what you want, and the site will save the request for follow-up.</p>
        </div>
        <div className="space-y-3">
          <LeadFields lead={lead} setLead={setLead} />
          <p className="text-xs leading-relaxed text-white/48">
            By sending your next step request, you allow Papa Life to save your contact details and context
            so Brian's team can follow up. Do not submit private crisis, medical, legal, or emergency information here.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Free Assessment", "Give Listen Love Serve", "Tuesday Live Show", "Newsletter", "Membership", "Free Chapter"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setOffer(item)}
                className={
                  offer === item
                    ? "rounded-full bg-brand-yellow px-4 py-2 text-sm font-black text-black"
                    : "rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/70 hover:border-brand-yellow"
                }
              >
                {item}
              </button>
            ))}
          </div>
          <Button
            type="button"
            onClick={saveLead}
            disabled={phoneNeedsConsent}
            className="min-h-12 rounded-full bg-primary px-6 font-extrabold text-black hover:bg-primary/90"
          >
            {saved ? "Saved" : "Send My Next Step"}
            <Mail className="ml-2 h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function HeroPromoPanel({ statusLabel }: { statusLabel: string }) {
  const [hasGraphic, setHasGraphic] = useState(true);
  const [promo, setPromo] = useState<PapaAiPromoWeek>(papaAiCurrentPromo);

  useEffect(() => {
    let ignore = false;

    fetch(papaAiGraphicsLibrary.manifestPath, { cache: "no-cache" })
      .then((response) => (response.ok ? response.json() : null))
      .then((manifest: { currentWeek?: PapaAiManifestWeek } | null) => {
        const nextPromo = promoFromManifestWeek(manifest?.currentWeek);
        if (!ignore && nextPromo) {
          setPromo(nextPromo);
          setHasGraphic(true);
        }
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="space-y-4 lg:self-start">
      <div className="overflow-hidden rounded-xl border border-brand-yellow/30 bg-card shadow-[0_0_42px_rgba(255,214,10,0.12)]">
        {hasGraphic ? (
          <img
            src={promo.imagePath}
            alt={`${promo.topic} Papa Life AI Coach ${promo.pillar} weekly promo`}
            className="max-h-[500px] w-full bg-black object-contain"
            loading="eager"
            decoding="async"
            onError={() => setHasGraphic(false)}
          />
        ) : (
          <div className="relative flex aspect-[4/3] min-h-[260px] flex-col justify-between overflow-hidden bg-black p-6">
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-brand-red via-brand-yellow to-primary" />
            <div>
              <p className="text-sm font-black uppercase tracking-[0.22em] text-brand-yellow">Papa Life AI Coach</p>
              <h2 className="mt-5 max-w-[12ch] text-5xl font-extrabold leading-[0.95] text-white">
                {promo.pillar}
              </h2>
              <p className="mt-5 max-w-lg text-xl font-bold leading-snug text-white/78">
                {promo.themeLine}
              </p>
            </div>
            <SiteLogo size="sm" />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-card/70 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-black">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-bold text-white">AI Status</p>
            <p className="text-sm text-white/58">{statusLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PapaAiExperience() {
  const [activeMode, setActiveMode] = useState<Mode>(currentModeFromPath());
  const [status, setStatus] = useState<{ live_ai_enabled?: boolean; provider?: string; inactive_message?: string }>({});
  const [lead, setLead] = useState<LeadContact>({ first_name: "", email: "", phone: "", sms_consent: false });

  const statusLabel = useMemo(() => {
    if (status.live_ai_enabled) return `Live AI connected: ${status.provider}`;
    return status.inactive_message || "Papa Life guided coaching mode is active.";
  }, [status]);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((response) => response.json())
      .then(setStatus)
      .catch(() => setStatus({ live_ai_enabled: false, provider: "local" }));
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Papa Life AI Coach | Biblical Fatherhood Coaching"
        description="Ask the Papa Life AI Coach for practical, biblical guidance for fathers of adult children. Includes assessment, resources, prayer, Bible study, Tuesday Live support, and membership help."
        keywords="Papa Life AI Coach, fathers of adult children, biblical fatherhood coaching, PAPA Framework, fatherhood assessment"
      />

      <header className="border-b border-white/10 bg-black/95">
        <div className="container flex min-h-20 items-center justify-between gap-4 py-3">
          <a href="/" aria-label="Papa Life home">
            <SiteLogo size="md" />
          </a>
          <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-brand-yellow">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back Home
          </a>
        </div>
      </header>

      <main>
        <section className="border-b border-white/10 bg-gradient-to-b from-white/[0.04] to-black py-12 md:py-18">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-start">
              <div>
                <Badge className="bg-brand-yellow text-black">Papa Life AI Experience</Badge>
                <h1 className="mt-5 max-w-4xl text-4xl font-extrabold md:text-6xl">
                  Coaching, assessment, prayer, and resources in Brian Keith Hill's Papa Life voice.
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/68 md:text-xl">
                  Fathers can ask real questions, find the next resource, prepare for Tuesday Live, receive
                  biblical encouragement, and take the PAPA assessment without getting lost.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={PAPA_LIFE_VOICE_AGENT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-yellow px-6 text-sm font-extrabold text-black transition-colors hover:bg-white"
                  >
                    <Mic className="mr-2 h-5 w-5" aria-hidden="true" />
                    Talk by Voice
                  </a>
                  <a
                    href="#papa-ai-chat"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-bold text-white/78 transition-colors hover:border-brand-yellow hover:text-brand-yellow"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" />
                    Use Text Chat
                  </a>
                </div>
              </div>
              <HeroPromoPanel statusLabel={statusLabel} />
            </div>
          </div>
        </section>

        <section id="papa-ai-chat" className="container scroll-mt-24 py-8 md:py-12">
          <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as Mode)} className="gap-6">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 md:grid-cols-4 lg:grid-cols-7">
              {(["coach", "assessment", "resource", "tuesday", "membership", "prayer", "bible-study"] as Mode[]).map((mode) => {
                const Icon = modeCopy[mode].icon;
                return (
                  <TabsTrigger
                    key={mode}
                    value={mode}
                    className="min-h-12 rounded-xl border border-white/10 bg-card/70 px-3 py-3 text-white data-[state=active]:border-brand-yellow data-[state=active]:bg-brand-yellow data-[state=active]:text-black"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {modeCopy[mode].title}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="coach">
              <ChatMode mode="coach" lead={lead} setLead={setLead} />
            </TabsContent>
            <TabsContent value="assessment">
              <AssessmentMode lead={lead} setLead={setLead} />
            </TabsContent>
            <TabsContent value="resource">
              <ChatMode mode="resource" lead={lead} setLead={setLead} />
            </TabsContent>
            <TabsContent value="tuesday">
              <ChatMode mode="tuesday" lead={lead} setLead={setLead} />
            </TabsContent>
            <TabsContent value="membership">
              <ChatMode mode="membership" lead={lead} setLead={setLead} />
            </TabsContent>
            <TabsContent value="prayer">
              <ChatMode mode="prayer" lead={lead} setLead={setLead} />
            </TabsContent>
            <TabsContent value="bible-study">
              <ChatMode mode="bible-study" lead={lead} setLead={setLead} />
            </TabsContent>
          </Tabs>
        </section>

        <section className="container pb-14">
          <LeadOffer lead={lead} setLead={setLead} />
        </section>

        <section className="border-t border-white/10 py-12">
          <div className="container grid gap-4 md:grid-cols-4">
            {relatedLinks.map(({ title, copy, Icon, href }) => {
              return (
                <a key={title} href={href} className="rounded-xl border border-white/10 bg-card/60 p-5 hover:border-brand-yellow/50">
                  <Icon className="h-7 w-7 text-brand-yellow" aria-hidden="true" />
                  <h2 className="mt-4 text-xl font-bold">{title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/58">{copy}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
                    Open
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

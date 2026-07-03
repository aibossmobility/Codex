import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  Save,
  Trophy,
} from "lucide-react";

type ReportFields = {
  outreach: string;
  contentCreation: string;
  scheduling: string;
  automation: string;
  coaching: string;
  pipeline: string;
  revenue: string;
  research: string;
  win: string;
};

type SavedReport = {
  id: number;
  report_date: string;
  title: string;
  win: string | null;
  outcomes: string;
  created_at: string;
  ventures_saved: number;
};

const localReportsKey = "papa-daily-work-reports";

const blankFields: ReportFields = {
  outreach: "",
  contentCreation: "",
  scheduling: "",
  automation: "",
  coaching: "",
  pipeline: "",
  revenue: "",
  research: "",
  win: "",
};

const sections = [
  {
    key: "outreach",
    number: "01",
    title: "Outreach & Engagement",
    accent: "bg-[#e53935]",
    label: "Who did you reach out to today? What platform?",
    placeholder:
      "Sent 5 connection requests on LinkedIn, replied to 3 DMs on Facebook, engaged with 2 comments on Papa Life post...",
  },
  {
    key: "contentCreation",
    number: "02",
    title: "Content Creation",
    accent: "bg-[#f9a825]",
    label: "What content did you write, record, or produce?",
    placeholder:
      "Wrote script for Episode 11, drafted blog post on Stage 4 fatherhood, recorded HeyGen video for Module 3...",
  },
  {
    key: "scheduling",
    number: "03",
    title: "Content Scheduling & Publishing",
    accent: "bg-[#388e3c]",
    label: "What did you schedule or publish today?",
    placeholder:
      "Scheduled 3 Facebook posts, published YouTube video, posted on LinkedIn and Instagram...",
  },
  {
    key: "automation",
    number: "04",
    title: "Automation & System Work",
    accent: "bg-[#e53935]",
    label: "What did you build, fix, or configure in your tech stack?",
    placeholder:
      "Fixed Make.com scenario, updated GHL pipeline stage, configured ElevenLabs agent with the latest knowledge base...",
  },
  {
    key: "coaching",
    number: "05",
    title: "Coaching & Curriculum Work",
    accent: "bg-[#f9a825]",
    label: "What coaching sessions, curriculum, or course work happened?",
    placeholder:
      "Led Tuesday Digital Dojo session, updated Lesson 4, created new journal prompts...",
  },
  {
    key: "research",
    number: "07",
    title: "Research & Strategy",
    accent: "bg-[#e53935]",
    label: "What did you learn, plan, or strategize today?",
    placeholder:
      "Reviewed knowledge base, planned next week's content calendar, researched fatherhood audience on LinkedIn...",
  },
] as const;

const outcomeLabels = [
  "Digital Dojo session held",
  "New subscriber / member added",
  "GHL pipeline stage moved",
  "Social post published",
  "Clarity Session booked",
  "Make.com scenario updated",
  "Video / audio content created",
  "Course lesson updated",
  "Master KB updated",
  "ORACLE / ElevenLabs agent updated",
  "Outreach emails / SMS sent",
  "Journal entry saved to Ventures",
];

function todayInputValue() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function textOrNone(value: string) {
  return value.trim() || "(none logged)";
}

function buildReportMarkdown(date: string, fields: ReportFields, outcomes: string[]) {
  return `## Papa Life Daily Work Report - ${date}

### 01. Outreach & Engagement
${textOrNone(fields.outreach)}

### 02. Content Creation
${textOrNone(fields.contentCreation)}

### 03. Content Scheduling & Publishing
${textOrNone(fields.scheduling)}

### 04. Automation & System Work
${textOrNone(fields.automation)}

### 05. Coaching & Curriculum Work
${textOrNone(fields.coaching)}

### 06. Pipeline & Revenue Activity
**Leads/Prospects:** ${textOrNone(fields.pipeline)}
**Revenue/Conversions:** ${textOrNone(fields.revenue)}

### 07. Research & Strategy
${textOrNone(fields.research)}

### Outcomes Completed
${outcomes.length > 0 ? outcomes.map((item) => `- ${item}`).join("\n") : "(none checked)"}

### Win of the Day
${textOrNone(fields.win)}`;
}

function readLocalReports() {
  try {
    const raw = window.localStorage.getItem(localReportsKey);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? (parsed as SavedReport[]) : [];
  } catch {
    return [];
  }
}

function writeLocalReport(date: string, fields: ReportFields, outcomes: string[]) {
  const current = readLocalReports();
  const nextReport: SavedReport = {
    id: Date.now(),
    report_date: date,
    title: `Papa Life Daily Work Report - ${date}`,
    win: fields.win || null,
    outcomes: JSON.stringify(outcomes),
    created_at: new Date().toISOString(),
    ventures_saved: 0,
  };
  const next = [nextReport, ...current].slice(0, 30);
  window.localStorage.setItem(localReportsKey, JSON.stringify(next));
  return next;
}

export default function PapaDailyWorkReport() {
  const [date, setDate] = useState(todayInputValue());
  const [fields, setFields] = useState<ReportFields>(blankFields);
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const reportMarkdown = useMemo(
    () => buildReportMarkdown(date, fields, outcomes),
    [date, fields, outcomes]
  );

async function loadReports() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/papa-daily-work-reports");
      if (res.status === 401) {
        setError("Please log in first, then return to this report page.");
        setReports([]);
        return;
      }
      const text = await res.text();
      const json = JSON.parse(text);
      if (!res.ok || !json.ok) throw new Error(json.error || "Unable to load reports.");
      setReports(json.reports || []);
      setError("");
    } catch (e: any) {
      setReports(readLocalReports());
      setError("");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveThroughEngagementBridge() {
    const res = await fetch("/api/engagement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "brian@bossmobility.net",
        event_type: "papa_daily_work_report",
        event_detail: reportMarkdown,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      throw new Error(json.error || "Unable to save through website activity log.");
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  function updateField(key: keyof ReportFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function toggleOutcome(label: string) {
    setOutcomes((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label]
    );
  }

  function clearForm() {
    setDate(todayInputValue());
    setFields(blankFields);
    setOutcomes([]);
    setMessage("");
    setError("");
  }

  async function saveReport() {
    setIsSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/papa-daily-work-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportDate: date,
          fields,
          outcomes,
          markdown: reportMarkdown,
        }),
      });
      const text = await res.text();
      const json = JSON.parse(text);
      if (res.status === 401) {
        throw new Error("Please log in first, then return to save this report.");
      }
      if (!res.ok || !json.ok) throw new Error(json.error || "Unable to save report.");
      setMessage(
        json.venturesSaved
          ? "Saved to your website and copied to Ventures Journal."
          : "Saved to your website. The Ventures Journal copy did not confirm, so the website record is safe."
      );
      await loadReports();
    } catch (e: any) {
      if (String(e?.message || "").toLowerCase().includes("log in")) {
        setError(e.message);
      } else {
        const localReports = writeLocalReport(date, fields, outcomes);
        setReports(localReports);
        try {
          await saveThroughEngagementBridge();
          setMessage(
            "Saved to the website activity log and saved in this browser. The dedicated report table and Ventures copy will turn on after the server restart."
          );
        } catch {
          setMessage(
            "Saved in this browser. The dedicated report table and Ventures copy will turn on after the server restart."
          );
        }
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-8 text-[#0a0a0a]">
      <div className="mx-auto max-w-5xl">
        <header className="border-l-[6px] border-[#e53935] bg-[#0a0a0a] px-5 py-6 sm:px-7">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-[#e53935] font-sans text-xl font-black tracking-wide text-white">
              PL
            </div>
            <div>
              <h1 className="font-sans text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
                Papa Life Daily Work Report
              </h1>
              <p className="mt-1 text-sm font-semibold tracking-wide text-[#f9a825]">
                Brian Keith Hill - Papa Life Coach
              </p>
            </div>
          </div>
          <p className="mt-4 border-t border-white/15 pt-4 text-sm italic text-white/70">
            "As long as you're both alive, it's never too late."
          </p>
        </header>

        <div className="mb-6 h-1 rounded bg-gradient-to-r from-[#e53935] via-[#f9a825] to-[#388e3c]" />

        <section className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-[#f9a825] px-5 py-3">
          <label
            className="flex items-center gap-2 text-sm font-black uppercase tracking-wide"
            htmlFor="report-date"
          >
            <CalendarDays className="h-4 w-4" />
            Report Date
          </label>
          <input
            id="report-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="border-2 border-black bg-white px-3 py-1.5 text-sm font-bold text-black"
          />
        </section>

        {error && (
          <div className="mb-4 border border-[#e53935] bg-[#2a0f0f] px-4 py-3 text-sm font-semibold text-white">
            {error}{" "}
            {error.toLowerCase().includes("log in") && (
              <a className="underline" href="/login">
                Open login
              </a>
            )}
          </div>
        )}

        {message && (
          <div className="mb-4 flex items-center gap-2 border border-[#388e3c] bg-[#12351c] px-4 py-3 text-sm font-semibold text-white">
            <CheckCircle2 className="h-4 w-4 text-[#82d488]" />
            {message}
          </div>
        )}

        <div className="space-y-4">
          {sections.slice(0, 5).map((section) => (
            <ReportSection
              key={section.key}
              section={section}
              value={fields[section.key]}
              onChange={(value) => updateField(section.key, value)}
            />
          ))}

          <section className="overflow-hidden rounded-sm bg-white shadow-lg shadow-black/30">
            <div className="flex items-center gap-3 bg-black px-5 py-3">
              <span className="rounded-sm bg-[#1a1a1a] px-2 py-1 text-xs font-black tracking-widest text-[#f9a825]">
                06
              </span>
              <h2 className="text-sm font-black uppercase tracking-wide text-white">
                Pipeline & Revenue Activity
              </h2>
              <span className="ml-auto h-2 w-2 rounded-full bg-[#388e3c]" />
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <TextAreaField
                label="Leads / Prospects"
                value={fields.pipeline}
                onChange={(value) => updateField("pipeline", value)}
                placeholder="Moved 2 contacts to warm intro stage in GHL, followed up with John S..."
                minHeight="min-h-[92px]"
              />
              <TextAreaField
                label="Revenue / Conversions"
                value={fields.revenue}
                onChange={(value) => updateField("revenue", value)}
                placeholder="1 new $4.99/mo subscriber, 1 Clarity Session booked..."
                minHeight="min-h-[92px]"
              />
            </div>
          </section>

          <ReportSection
            section={sections[5]}
            value={fields.research}
            onChange={(value) => updateField("research", value)}
          />

          <section className="overflow-hidden rounded-sm bg-white shadow-lg shadow-black/30">
            <div className="flex items-center gap-3 bg-black px-5 py-3">
              <span className="rounded-sm bg-[#1a1a1a] px-2 py-1 text-xs font-black tracking-widest text-[#f9a825]">
                OK
              </span>
              <h2 className="text-sm font-black uppercase tracking-wide text-white">
                Daily Outcomes Checklist
              </h2>
              <span className="ml-auto h-2 w-2 rounded-full bg-[#f9a825]" />
            </div>
            <div className="p-5">
              <p className="mb-4 text-xs font-bold uppercase tracking-wide text-[#444]">
                Check everything you completed today
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {outcomeLabels.map((label) => (
                  <label
                    key={label}
                    className="flex cursor-pointer items-start gap-3 rounded-sm border border-transparent bg-[#f5f5f5] px-3 py-3 text-sm text-[#444] transition hover:border-[#388e3c] hover:bg-[#e8f5e9]"
                  >
                    <input
                      type="checkbox"
                      checked={outcomes.includes(label)}
                      onChange={() => toggleOutcome(label)}
                      className="mt-1 h-4 w-4 accent-[#388e3c]"
                    />
                    <span className={outcomes.includes(label) ? "font-bold text-[#388e3c]" : ""}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-sm bg-[#388e3c] p-5 shadow-lg shadow-black/30">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-white">
              <Trophy className="h-4 w-4" />
              Win of the Day
            </h2>
            <textarea
              value={fields.win}
              onChange={(event) => updateField("win", event.target.value)}
              placeholder="What's the one thing that moved the needle today? Big or small - write it down."
              className="min-h-[76px] w-full resize-y rounded-sm border border-white/40 bg-white/15 px-3 py-3 text-sm leading-6 text-white placeholder:text-white/60 focus:border-white focus:outline-none"
            />
          </section>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={clearForm}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#2a2a2a] px-6 py-3 text-sm font-black uppercase tracking-wide text-[#ccc] transition hover:opacity-90"
          >
            <RefreshCcw className="h-4 w-4" />
            Clear Form
          </button>
          <button
            type="button"
            onClick={saveReport}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#e53935] px-6 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Report
          </button>
        </div>

        <section className="mt-8 rounded-sm bg-white p-5 shadow-lg shadow-black/30">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#e53935]">
                Owner View
              </p>
              <h2 className="text-xl font-black text-black">Recent Saved Reports</h2>
            </div>
            <button
              type="button"
              onClick={loadReports}
              className="inline-flex items-center gap-2 rounded-sm border border-black px-3 py-2 text-xs font-black uppercase tracking-wide"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p className="text-sm text-[#444]">Loading recent reports...</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-[#444]">No reports saved yet.</p>
          ) : (
            <div className="divide-y divide-[#ddd]">
              {reports.map((report) => {
                const reportOutcomes = safeParseOutcomes(report.outcomes);
                return (
                  <article key={report.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-black text-black">{report.title}</h3>
                      <span
                        className={`rounded-sm px-2 py-1 text-xs font-bold ${
                          report.ventures_saved
                            ? "bg-[#e8f5e9] text-[#1b5e20]"
                            : "bg-[#fff3cd] text-[#795500]"
                        }`}
                      >
                        {report.ventures_saved ? "Ventures copied" : "Saved record"}
                      </span>
                    </div>
                    {report.win && <p className="mt-2 text-sm text-[#444]">Win: {report.win}</p>}
                    {reportOutcomes.length > 0 && (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#777]">
                        {reportOutcomes.length} outcome{reportOutcomes.length === 1 ? "" : "s"} checked
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ReportSection({
  section,
  value,
  onChange,
}: {
  section: (typeof sections)[number];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-sm bg-white shadow-lg shadow-black/30">
      <div className="flex items-center gap-3 bg-black px-5 py-3">
        <span className="rounded-sm bg-[#1a1a1a] px-2 py-1 text-xs font-black tracking-widest text-[#f9a825]">
          {section.number}
        </span>
        <h2 className="text-sm font-black uppercase tracking-wide text-white">{section.title}</h2>
        <span className={`ml-auto h-2 w-2 rounded-full ${section.accent}`} />
      </div>
      <div className="p-5">
        <TextAreaField
          label={section.label}
          value={value}
          onChange={onChange}
          placeholder={section.placeholder}
        />
      </div>
    </section>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  minHeight = "min-h-[104px]",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minHeight?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#444]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${minHeight} w-full resize-y rounded-sm border border-[#ccc] px-3 py-3 text-sm leading-6 text-black placeholder:italic placeholder:text-[#aaa] focus:border-[#e53935] focus:outline-none`}
      />
    </label>
  );
}

function safeParseOutcomes(raw: string) {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

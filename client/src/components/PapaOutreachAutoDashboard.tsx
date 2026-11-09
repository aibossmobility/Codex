import { useEffect, useState } from "react";
import { CalendarDays, Database, Loader2, Mic2, RefreshCw, ShieldCheck } from "lucide-react";
import { pacificToday } from "../../../shared/papa-conversations";

type Report = {
  ok: boolean; date: string; updatedAt: string;
  summary: {
    websiteAiSessions: number; websiteAiMessages: number; twinRelatedMessages: number;
    submittedContactDetails: number; completedOwnerReflections: number;
    scheduledOwnerRecords: number; ownerDictationNotes: number; macVoiceNotes: number; pendingReviewItems: number;
  };
  sources: Record<string, string>;
  websiteActivity: Array<{ page: string; messages: number }>;
  submittedContacts: Array<{ name: string; source: string; date: string }>;
  ownerConversations: Array<{ person: string; kind: string; completed: boolean; useful: string; purpose: string }>;
  nextStepsForReview: Array<{ person: string; steps: string; date: string }>;
  dictatedNotes: Array<{ id: string; note: string; created_at: string }>;
  note: string;
};

type VoiceStatus = { ok: boolean; primary: string; macHeartbeatOnline: boolean; macRelayReady: boolean; voiceIdentity: string; selectedVoiceProvider: string; voiceIdConfigured: boolean; };

const metricLabels: Array<[keyof Report["summary"], string]> = [
  ["websiteAiSessions", "AI conversation sessions"],
  ["websiteAiMessages", "Website AI messages"],
  ["submittedContactDetails", "Contact details submitted"],
  ["completedOwnerReflections", "Completed owner reflections"],
  ["scheduledOwnerRecords", "Owner records dated today"],
  ["ownerDictationNotes", "Private dictated notes"],
  ["macVoiceNotes", "Mac voice recaps"],
];

export default function PapaOutreachAutoDashboard() {
  const [date, setDate] = useState(pacificToday());
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    fetch("/api/admin/papa-outreach/voice-status", { credentials: "include", cache: "no-store" })
      .then(async response => { const info = await response.json(); if (response.ok && info.ok) setVoiceStatus(info as VoiceStatus); })
      .catch(() => { /* Do not infer that a disconnected Mac is online. */ });
  }, [refreshIndex]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetch("/api/admin/papa-outreach/daily?date=" + encodeURIComponent(date), {
      credentials: "include", cache: "no-store", signal: controller.signal
    }).then(async r => {
      const result = await r.json();
      if (!r.ok || !result.ok) throw new Error(result.error || "Report unavailable.");
      setReport(result as Report);
    }).catch(e => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, refreshIndex]);

  async function recordNote() {
    if (saving || !note.trim()) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/papa-outreach/quick-note", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not save note.");
      setNote(""); setShowNote(false);
      setMessage("Private dictation saved. No messages or reminders sent.");
      setRefreshIndex(i => i + 1);
    } catch (e) { setMessage((e as Error).message); }
    finally { setSaving(false); }
  }

  return <section className="no-print rounded-xl border border-[#145b35]/20 bg-white p-5 shadow-sm sm:p-7" aria-label="Automated Papa Life daily outreach dashboard">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#997626]">Owner-only · Automatically updated from saved website activity</p>
        <h2 className="mt-2 text-2xl font-extrabold text-[#145b35]">Digital Brian's Daily Outreach Picture</h2>
        <p className="mt-2 text-sm text-[#37443c]">Your saved AI conversations and private records are counted automatically. Unknown activity stays unknown.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-2 rounded border px-3 py-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4" />
          <span className="sr-only">Report date</span>
          <input aria-label="Report date" type="date" value={date} onChange={e => setDate(e.target.value)}
            className="min-w-0 bg-white text-[#17231c]" />
        </label>
        <button type="button" className="flex items-center gap-2 rounded border border-[#145b35] px-3 py-2 text-sm font-semibold text-[#145b35]"
          onClick={() => setRefreshIndex(i => i + 1)}><RefreshCw className="h-4 w-4"/> Refresh</button>
      </div>
    </div>
    <div className="mt-4 rounded-lg border border-[#145b35]/25 bg-[#f8f0db] p-4 text-sm">
      <strong>Primary voice and data path: Mac mini + Desktop Commander</strong>
      <p className="mt-1">Brian Keith Hill voice ID: HeyGen voice identity selected for supported playback. ElevenLabs is not the first responder.</p>
      <p className="mt-1 font-semibold">{voiceStatus ? (voiceStatus.macHeartbeatOnline ? "Mac heartbeat online" : "Mac heartbeat offline") : "Mac connection not yet verified"} · {voiceStatus?.macRelayReady ? "Private Mac transcript relay configured" : "Mac transcript relay not fully configured"}</p>
      <p className="mt-1 text-xs text-gray-600">A Mac heartbeat does not establish live microphone capture. Unconnected sources are never reported as collected.</p>
      <a href="/papa-life-os/digital-twin" className="mt-2 inline-block font-bold text-[#145b35] underline">Open Mac-first Digital Brian control</a>
    </div>
    {loading && <p className="mt-5 flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin"/> Reading saved activity…</p>}
    {error && <p role="alert" className="mt-4 text-sm font-semibold text-[#ac3030]">{error}</p>}
    {report && !loading && <>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
        {metricLabels.map(([key,label]) => <div key={key} className="rounded-lg bg-[#f8f0db] px-4 py-4">
          <div className="text-3xl font-extrabold text-[#145b35] tabular-nums">{report.summary[key]}</div>
          <div className="mt-1 text-xs font-semibold text-[#37443c]">{label}</div>
        </div>)}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-[#145b35]"><Database className="h-5 w-5"/> Website activity by page</h3>
          {report.websiteActivity.length ? <ul className="mt-2 space-y-2 text-sm">
            {report.websiteActivity.map(item => <li key={item.page} className="flex justify-between gap-2 border-b pb-2">
              <span className="min-w-0 break-all">{item.page}</span><strong className="tabular-nums">{item.messages} messages</strong>
            </li>)}
          </ul> : <p className="mt-2 text-sm text-gray-600">No saved AI messages for this date.</p>}
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-lg font-bold text-[#145b35]">People and follow-ups to review</h3>
          {report.nextStepsForReview.length ? <ul className="mt-2 space-y-3 text-sm">
            {report.nextStepsForReview.map((item,i) => <li key={i}><strong>{item.person}</strong><p className="whitespace-pre-wrap">{item.steps}</p></li>)}
          </ul> : <p className="mt-2 text-sm text-gray-600">No outstanding next steps found in your private saved conversation records.</p>}
          <p className="mt-3 text-xs text-gray-600">These are proposed steps from your notes, not messages or calendar reminders already sent.</p>
        </div>
      </div>
      {!!report.ownerConversations.length && <div className="mt-4 rounded-lg border p-4">
        <h3 className="font-bold text-[#145b35]">Owner conversations for {date}</h3>
        <ul className="mt-2 space-y-2 text-sm">{report.ownerConversations.map((item,i) =>
          <li key={i}><strong>{item.person}</strong> · {item.kind} · {item.completed ? "Reflection completed" : "Not marked complete"}
            {(item.useful || item.purpose) && <p className="text-gray-600">{item.useful || item.purpose}</p>}</li>)}</ul>
      </div>}
      {!!report.dictatedNotes.length && <div className="mt-4 rounded-lg border p-4">
        <h3 className="font-bold text-[#145b35]">Your dictated recap notes</h3>
        <ul className="mt-2 space-y-2 text-sm">{report.dictatedNotes.map(item =>
          <li className="whitespace-pre-wrap border-b pb-2" key={item.id}>{item.note}</li>)}</ul>
      </div>}
      <div className="mt-5 rounded-lg bg-[#f7f7f2] p-4 text-sm">
        <h3 className="flex items-center gap-2 font-bold text-[#145b35]"><ShieldCheck className="h-4 w-4"/> Coverage and privacy</h3>
        <p className="mt-1">{report.note}</p>
        <p className="mt-2 text-xs text-gray-600">Connected: site AI interactions, private conversation records, and dictated notes. Authenticated Mac voice recaps will appear when the Mac relay is connected. Gmail, Calendar, phone calls, social media, and GoHighLevel need their own verified data feeds. Nothing is sent to contacts by this dashboard.</p>
      </div>
    </>}
    <div className="mt-5 border-t pt-4">
      <button className="inline-flex items-center gap-2 rounded-lg bg-[#145b35] px-4 py-3 font-bold text-white" type="button" onClick={() => setShowNote(v => !v)}>
        <Mic2 className="h-4 w-4"/> {showNote ? "Close voice recap" : "Dictate an offline conversation recap"}
      </button>
      {showNote && <div className="mt-3 max-w-2xl">
        <p className="text-sm text-gray-700">For conversations away from the website, use your phone keyboard microphone to speak a short recap. No checklist or worksheet is needed.</p>
        <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={6000}
          placeholder="I spoke with a pastor today about Papa Life. He asked about..."
          className="mt-2 min-h-24 w-full rounded border border-gray-400 p-3 text-sm"
          aria-label="Dictated private conversation note" />
        <button type="button" onClick={() => void recordNote()} disabled={saving || note.trim().length < 2}
          className="rounded bg-[#f2c230] px-4 py-2 font-bold text-[#17231c] disabled:opacity-50">{saving ? "Saving…" : "Save private recap"}</button>
      </div>}
      {message && <p className="mt-2 text-sm" role="status">{message}</p>}
    </div>
  </section>;
}

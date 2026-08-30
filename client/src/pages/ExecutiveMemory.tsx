import { FormEvent, useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Archive, ArrowLeft, Brain, Clock3, History, Loader2, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ExecutiveActionQueue } from "@/components/ExecutiveActionQueue";

type MemoryItem = {
  id: number;
  canonical_key: string;
  version: number;
  category: string;
  value: string;
  context: string | null;
  source_ref: string | null;
  sensitivity: string;
  confidence: number;
  status: string;
  effective_at: string;
};

type ConversationBrief = {
  id: number;
  session_ref: string;
  channel: string;
  summary: string;
  user_intent: string | null;
  next_action: string | null;
  status: string;
  occurred_at: string;
};

const categories = ["identity", "preference", "relationship", "commitment", "project", "decision", "fact"];

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

const titleCase = (value: string) =>
  value.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

export default function ExecutiveMemory() {
  const [, navigate] = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [briefs, setBriefs] = useState<ConversationBrief[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    canonical_key: "",
    category: "decision",
    value: "",
    context: "",
    source_ref: "",
    sensitivity: "standard",
    confidence: 1,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      const [memoryData, briefData] = await Promise.all([
        apiJson<{ memories: MemoryItem[] }>(`/api/admin/executive-memory?${params}`),
        apiJson<{ conversations: ConversationBrief[] }>("/api/admin/executive-conversations?limit=20"),
      ]);
      setMemories(memoryData.memories || []);
      setBriefs(briefData.conversations || []);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Executive memory could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [query, categoryFilter]);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) navigate("/login");
        else if (!data.user?.researchLabAccess) navigate("/crm-console");
        else void load();
      })
      .catch(() => navigate("/login"))
      .finally(() => setAuthChecked(true));
  }, []);

  const saveMemory = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiJson("/api/admin/executive-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          canonical_key: form.canonical_key.trim(),
          value: form.value.trim(),
          context: form.context.trim() || null,
          source_ref: form.source_ref.trim() || null,
        }),
      });
      toast.success("Executive memory saved. An older value was preserved as history if one existed.");
      setForm((current) => ({ ...current, canonical_key: "", value: "", context: "", source_ref: "" }));
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Memory could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (id: number) => {
    try {
      await apiJson(`/api/admin/executive-memory/${id}/archive`, { method: "POST" });
      toast.success("Memory archived; its history remains available.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Memory could not be archived.");
    }
  };

  if (!authChecked) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => navigate("/research-lab")}><ArrowLeft className="w-4 h-4 mr-2" />Research Lab</Button>
        <div className="flex items-center gap-2"><Brain className="w-6 h-6 text-primary" /><h1 className="text-xl font-bold">Executive Memory</h1></div>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-400"><ShieldCheck className="w-4 h-4 text-primary" />Brian-only · versioned · reviewable</div>
      </header>

      <main className="max-w-[1500px] mx-auto p-6 space-y-6">
        <div className="max-w-3xl"><h2 className="text-3xl font-bold">Remember what matters without losing history.</h2><p className="mt-2 text-gray-400 leading-relaxed">Store decisions, preferences, commitments, project facts, and relationship context as structured records. Saving the same key creates a new version and preserves the old one.</p></div>

        <div className="grid xl:grid-cols-[0.85fr_1.15fr] gap-6 items-start">
          <Card className="bg-[#111] border-white/10">
            <CardHeader><CardTitle className="text-white">Save a memory</CardTitle><p className="text-sm text-gray-500">Do not place passwords, tokens, or private keys here.</p></CardHeader>
            <CardContent>
              <form onSubmit={saveMemory} className="space-y-4">
                <Field label="Canonical key"><Input required value={form.canonical_key} onChange={(e) => setForm({ ...form, canonical_key: e.target.value.toLowerCase().replace(/\s+/g, "_") })} placeholder="papa_life.primary_domain" className="bg-black/40 border-white/10" /></Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <SelectField label="Category" value={form.category} options={categories} onChange={(category) => setForm({ ...form, category })} />
                  <SelectField label="Sensitivity" value={form.sensitivity} options={["standard", "sensitive", "restricted"]} onChange={(sensitivity) => setForm({ ...form, sensitivity })} />
                </div>
                <Field label="Current value"><Textarea required value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="The decision or fact to remember" className="min-h-28 bg-black/40 border-white/10" /></Field>
                <Field label="Why it matters"><Textarea value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} placeholder="Context for future decisions" className="min-h-20 bg-black/40 border-white/10" /></Field>
                <Field label="Source reference"><Input value={form.source_ref} onChange={(e) => setForm({ ...form, source_ref: e.target.value })} placeholder="conversation, email, issue, or file reference" className="bg-black/40 border-white/10" /></Field>
                <Button type="submit" disabled={saving || !form.canonical_key.trim() || !form.value.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save version</Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-[#111] border-white/10">
              <CardHeader className="gap-3"><CardTitle className="text-white">Active memory</CardTitle><div className="flex flex-col sm:flex-row gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-600" /><Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void load()} placeholder="Search keys and values" className="pl-9 bg-black/40 border-white/10" /></div><Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="sm:w-44 bg-black/40 border-white/10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{categories.map((category) => <SelectItem key={category} value={category}>{titleCase(category)}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={() => load()}>Apply</Button></div></CardHeader>
              <CardContent>
                {loading ? <Loading label="Loading memory" /> : memories.length === 0 ? <Empty text="No active memories match this view." /> : <div className="divide-y divide-white/10">{memories.map((memory) => <div key={memory.id} className="py-4 first:pt-0 last:pb-0"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-sm text-primary break-all">{memory.canonical_key}</p><span className="text-xs text-gray-600">v{memory.version} · {titleCase(memory.category)}</span></div><p className="mt-2 text-sm text-gray-200 whitespace-pre-wrap">{memory.value}</p>{memory.context && <p className="mt-2 text-xs text-gray-500">{memory.context}</p>}<p className="mt-2 text-xs text-gray-600"><Clock3 className="inline w-3 h-3 mr-1" />{new Date(memory.effective_at).toLocaleString()} · {titleCase(memory.sensitivity)}</p></div><Button size="icon" variant="ghost" aria-label={`Archive ${memory.canonical_key}`} onClick={() => archive(memory.id)}><Archive className="w-4 h-4" /></Button></div></div>)}</div>}
              </CardContent>
            </Card>

            <Card className="bg-[#111] border-white/10">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><History className="w-5 h-5 text-primary" />Conversation briefs</CardTitle><p className="text-sm text-gray-500">Structured continuity from ChatGPT, Gmail, Calendar, web, files, Desktop Commander, GitHub, and GHL.</p></CardHeader>
              <CardContent>{loading ? <Loading label="Loading conversations" /> : briefs.length === 0 ? <Empty text="No conversation briefs have been stored yet." /> : <div className="divide-y divide-white/10">{briefs.slice(0, 10).map((brief) => <div key={brief.id} className="py-3 first:pt-0"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{brief.session_ref}</p><span className="text-xs text-primary">{titleCase(brief.channel)} · {titleCase(brief.status)}</span></div><p className="mt-2 text-sm text-gray-300">{brief.summary}</p>{brief.next_action && <p className="mt-2 text-xs text-brand-yellow">Next: {brief.next_action}</p>}</div>)}</div>}</CardContent>
            </Card>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8">
          <ExecutiveActionQueue />
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label className="text-gray-300">{label}</Label>{children}</div>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <Field label={label}><Select value={value} onValueChange={onChange}><SelectTrigger className="bg-black/40 border-white/10"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{titleCase(option)}</SelectItem>)}</SelectContent></Select></Field>; }
function Loading({ label }: { label: string }) { return <div className="py-10 flex items-center justify-center text-sm text-gray-500"><Loader2 className="w-4 h-4 mr-2 animate-spin" />{label}</div>; }
function Empty({ text }: { text: string }) { return <div className="py-10 text-center text-sm text-gray-500">{text}</div>; }

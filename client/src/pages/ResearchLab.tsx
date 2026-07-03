import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, FileStack, Loader2, CheckCircle2 } from "lucide-react";

type DumpList = {
  id: number;
  title: string;
  char_count: number;
  word_count: number;
  analysis_status: string;
  analyzed_at: string | null;
  created_at: string;
};

type Suggestion = {
  id: number;
  platform: string;
  headline: string | null;
  body: string;
  hashtags: string | null;
  cta: string | null;
  status: string;
};

export default function ResearchLab() {
  const [, navigate] = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [dumps, setDumps] = useState<DumpList[]>([]);
  const [title, setTitle] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{ dump: Record<string, unknown>; suggestions: Suggestion[] } | null>(null);

  const loadList = async () => {
    const r = await fetch("/api/admin/research-dumps", { credentials: "include" });
    if (r.status === 401) {
      navigate("/login");
      return;
    }
    if (r.status === 403) {
      navigate("/crm-console");
      return;
    }
    const j = await r.json();
    setDumps(j.dumps || []);
  };

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) navigate("/login");
        else if (!data.user?.researchLabAccess) navigate("/crm-console");
        else loadList();
      })
      .catch(() => navigate("/login"))
      .finally(() => setAuthChecked(true));
  }, []);

  const createDump = async () => {
    if (!rawNotes.trim()) return;
    setBusy("create");
    try {
      const r = await fetch("/api/admin/research-dumps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title || "Research capture", raw_notes: rawNotes }),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setRawNotes("");
      setTitle("");
      await loadList();
      setSelectedId(j.id);
      await openDetail(j.id);
    } finally {
      setBusy(null);
    }
  };

  const openDetail = async (id: number) => {
    setSelectedId(id);
    setBusy("load");
    try {
      const r = await fetch(`/api/admin/research-dumps/${id}?raw=1`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setDetail({ dump: j.dump, suggestions: j.suggestions || [] });
    } finally {
      setBusy(null);
    }
  };

  const analyze = async () => {
    if (!selectedId) return;
    setBusy("analyze");
    try {
      const r = await fetch(`/api/admin/research-dumps/${selectedId}/analyze`, {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) throw new Error(await r.text());
      await openDetail(selectedId);
      await loadList();
    } finally {
      setBusy(null);
    }
  };

  const socialPack = async () => {
    if (!selectedId) return;
    setBusy("social");
    try {
      const r = await fetch(`/api/admin/research-dumps/${selectedId}/social-pack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ replace: true }),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setDetail((d) => (d ? { ...d, suggestions: j.suggestions || [] } : d));
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (sid: number, status: string) => {
    const r = await fetch(`/api/admin/social-suggestions/${sid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    if (r.ok && selectedId) await openDetail(selectedId);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const d = detail?.dump;
  const summary = (d?.executive_summary as string | undefined) || "";
  const themesJson = (d?.themes_json as string | undefined) || "";
  let themes: string[] = [];
  try {
    themes = themesJson ? (JSON.parse(themesJson) as string[]) : [];
  } catch {
    themes = [];
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => navigate("/crm-console")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> CRM
        </Button>
        <div className="flex items-center gap-2">
          <FileStack className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Research Lab</h1>
        </div>
        <p className="text-gray-500 text-sm ml-auto max-w-xl text-right hidden md:block">
          Private marketing notes — Brian only. Claude summarizes; then draft social posts.
        </p>
      </header>

      <div className="p-6 grid lg:grid-cols-2 gap-6 max-w-[1600px] mx-auto">
        <Card className="bg-[#111] border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> New capture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Title (e.g. Q2 platform plan)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-black/40 border-white/10"
            />
            <Textarea
              placeholder="Paste full research notes (large text is OK)"
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              className="min-h-[280px] bg-black/40 border-white/10 font-mono text-sm"
            />
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!!busy || !rawNotes.trim()}
              onClick={createDump}
            >
              {busy === "create" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save capture"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Recent captures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
            {dumps.length === 0 && <p className="text-gray-500 text-sm">No captures yet.</p>}
            {dumps.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => openDetail(x.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedId === x.id ? "border-primary/50 bg-primary/5" : "border-white/10 hover:bg-white/5"
                }`}
              >
                <div className="font-medium text-white truncate">{x.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {x.word_count.toLocaleString()} words - {x.analysis_status}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {selectedId && d && (
          <>
            <Card className="bg-[#111] border-white/10 lg:col-span-2">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-white">Analysis</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="border-white/20" disabled={!!busy} onClick={analyze}>
                    {busy === "analyze" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Run AI summary"}
                  </Button>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={!!busy || !summary.trim()}
                    onClick={socialPack}
                  >
                    {busy === "social" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate social pack"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {summary ? (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Executive summary</h4>
                    <p className="text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">{summary}</p>
                  </div>
                ) : (
                  <p className="text-primary/90 text-sm">Run AI summary to unlock themes and social generation.</p>
                )}
                {themes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Themes</h4>
                    <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
                      {themes.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#111] border-white/10 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">Social drafts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!detail?.suggestions?.length && (
                  <p className="text-gray-500 text-sm">Generate social pack after analysis.</p>
                )}
                {detail?.suggestions?.map((s) => (
                  <div key={s.id} className="border border-white/10 rounded-lg p-4 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-primary border-primary/40">
                        {s.platform}
                      </Badge>
                      {s.status === "approved" && (
                        <Badge className="bg-primary text-primary-foreground">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> approved
                        </Badge>
                      )}
                    </div>
                    {s.headline && <p className="font-semibold text-white">{s.headline}</p>}
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{s.body}</p>
                    {s.hashtags && <p className="text-xs text-brand-yellow">{s.hashtags}</p>}
                    {s.cta && <p className="text-xs text-gray-500">CTA: {s.cta}</p>}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="secondary" onClick={() => setStatus(s.id, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setStatus(s.id, "rejected")}>
                        Reject
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "posted")}>
                        Mark posted
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

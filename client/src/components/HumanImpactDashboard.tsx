import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowRight, Check, Loader2, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const dimensions = ["reflection", "decision", "communication", "action", "relationship"] as const;
type Dimension = (typeof dimensions)[number];

type Summary = {
  program: string;
  observation_count: number;
  paired_participant_count: number;
  dimensions: Record<Dimension, { average_delta: number | null; improved: number }>;
  interpretation: string;
};

type Observation = {
  id: number;
  participant_ref: string;
  interaction_ref: string | null;
  program: string;
  guidance_channel: string;
  phase: "baseline" | "follow_up";
  reflection_score: number;
  decision_score: number;
  communication_score: number;
  action_score: number;
  relationship_score: number;
  outcome: string;
  consent_scope: string;
  observed_at: string;
};

type FormState = {
  participant_ref: string;
  interaction_ref: string;
  program: string;
  guidance_channel: string;
  phase: "baseline" | "follow_up";
  outcome: string;
  consent_scope: string;
  evidence_note: string;
  observed_at: string;
} & Record<`${Dimension}_score`, number>;

const initialForm: FormState = {
  participant_ref: "",
  interaction_ref: "",
  program: "papa_life",
  guidance_channel: "ai_coach",
  phase: "baseline",
  reflection_score: 3,
  decision_score: 3,
  communication_score: 3,
  action_score: 3,
  relationship_score: 3,
  outcome: "not_yet_observed",
  consent_scope: "program_improvement",
  evidence_note: "",
  observed_at: "",
};

const titleCase = (value: string) =>
  value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export function HumanImpactDashboard() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [participantFilter, setParticipantFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (filter = participantFilter) => {
    setLoading(true);
    setError(null);
    try {
      const query = filter.trim() ? `?participant_ref=${encodeURIComponent(filter.trim())}&limit=50` : "?limit=50";
      const [summaryData, observationData] = await Promise.all([
        apiJson<{ summary: Summary }>(`/api/admin/human-impact/summary?program=${encodeURIComponent(form.program)}`),
        apiJson<{ observations: Observation[] }>(`/api/admin/human-impact/observations${query}`),
      ]);
      setSummary(summaryData.summary);
      setObservations(observationData.observations || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [form.program, participantFilter]);

  useEffect(() => {
    void loadDashboard("");
  }, [form.program]);

  const submitObservation = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.participant_ref.trim()) {
      toast.error("Add a pseudonymous participant reference.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        participant_ref: form.participant_ref.trim(),
        interaction_ref: form.interaction_ref.trim() || null,
        evidence_note: form.evidence_note.trim() || null,
        observed_at: form.observed_at ? new Date(form.observed_at).toISOString() : undefined,
      };
      await apiJson("/api/admin/human-impact/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast.success(`${titleCase(form.phase)} saved. The summary has been refreshed.`);
      setForm((current) => ({
        ...initialForm,
        participant_ref: current.participant_ref,
        interaction_ref: current.interaction_ref,
        program: current.program,
        phase: current.phase === "baseline" ? "follow_up" : "baseline",
      }));
      await loadDashboard("");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "The observation could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const averageMovement = useMemo(() => {
    if (!summary) return null;
    const values = dimensions
      .map((dimension) => summary.dimensions[dimension]?.average_delta)
      .filter((value): value is number => typeof value === "number");
    if (!values.length) return null;
    return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 100) / 100;
  }, [summary]);

  return (
    <section className="border-b border-white/10 bg-[#0d0d0d]">
      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold text-white">Human-impact dashboard</h2>
            <p className="mt-2 text-sm md:text-base text-gray-400 leading-relaxed">
              Track whether AI-supported guidance is followed by movement toward reflection, better decisions,
              healthier communication, action, and relationship repair.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 border border-white/10 rounded-lg px-3 py-2 bg-black/30">
            <ShieldCheck className="w-4 h-4 text-primary" /> Brian-only · pseudonymous data · human review
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-brand-red/40 bg-brand-red/10 p-4 text-sm">
            <span className="flex items-center gap-2 text-red-100"><AlertCircle className="w-4 h-4" />{error}</span>
            <Button size="sm" variant="outline" onClick={() => loadDashboard()}><RefreshCw className="w-4 h-4 mr-2" />Retry</Button>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-3">
          <Metric label="Observations" value={loading ? "—" : String(summary?.observation_count ?? 0)} icon={<Activity className="w-5 h-5" />} />
          <Metric label="Paired participants" value={loading ? "—" : String(summary?.paired_participant_count ?? 0)} icon={<Users className="w-5 h-5" />} />
          <Metric label="Average movement" value={loading ? "—" : averageMovement === null ? "Not paired" : `${averageMovement > 0 ? "+" : ""}${averageMovement}`} icon={<ArrowRight className="w-5 h-5" />} />
        </div>

        <div className="grid xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6 items-start">
          <Card className="bg-[#111] border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Record an observation</CardTitle>
              <p className="text-sm text-gray-500">Use the same participant and interaction references for a matched baseline and follow-up.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitObservation} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Participant reference" required><Input value={form.participant_ref} onChange={(e) => setForm({ ...form, participant_ref: e.target.value })} placeholder="e.g. pilot-014" className="bg-black/40 border-white/10" /></Field>
                  <Field label="Interaction reference"><Input value={form.interaction_ref} onChange={(e) => setForm({ ...form, interaction_ref: e.target.value })} placeholder="e.g. call-2026-08-29" className="bg-black/40 border-white/10" /></Field>
                  <SelectField label="Phase" value={form.phase} onChange={(value) => setForm({ ...form, phase: value as FormState["phase"] })} options={["baseline", "follow_up"]} />
                  <SelectField label="Guidance channel" value={form.guidance_channel} onChange={(value) => setForm({ ...form, guidance_channel: value })} options={["ai_coach", "human_coaching", "tuesday_live", "fatherhood_check_in", "email", "other"]} />
                  <SelectField label="Outcome" value={form.outcome} onChange={(value) => setForm({ ...form, outcome: value })} options={["not_yet_observed", "reflection_only", "decision_made", "communication_attempted", "human_contact_made", "relationship_improved", "relationship_unchanged", "relationship_worsened"]} />
                  <SelectField label="Consent scope" value={form.consent_scope} onChange={(value) => setForm({ ...form, consent_scope: value })} options={["program_improvement", "research_opt_in"]} />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-200 mb-3">Human-impact scores</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {dimensions.map((dimension) => (
                      <div key={dimension} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                        <Label className="text-gray-300">{titleCase(dimension)}</Label>
                        <Select value={String(form[`${dimension}_score`])} onValueChange={(value) => setForm({ ...form, [`${dimension}_score`]: Number(value) })}>
                          <SelectTrigger className="w-28 bg-black/40 border-white/10"><SelectValue /></SelectTrigger>
                          <SelectContent>{[1, 2, 3, 4, 5].map((score) => <SelectItem key={score} value={String(score)}>{score} / 5</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Observed at"><Input type="datetime-local" value={form.observed_at} onChange={(e) => setForm({ ...form, observed_at: e.target.value })} className="bg-black/40 border-white/10" /></Field>
                  <Field label="Evidence note"><Textarea value={form.evidence_note} onChange={(e) => setForm({ ...form, evidence_note: e.target.value })} placeholder="Short, non-identifying evidence only" className="min-h-20 bg-black/40 border-white/10" /></Field>
                </div>

                <Button type="submit" disabled={saving} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Save {titleCase(form.phase)}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-[#111] border-white/10">
              <CardHeader><CardTitle className="text-white">Directional movement</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {dimensions.map((dimension) => {
                  const metric = summary?.dimensions[dimension];
                  const delta = metric?.average_delta ?? null;
                  const width = delta === null ? 0 : Math.min(Math.abs(delta) / 4, 1) * 50;
                  return (
                    <div key={dimension}>
                      <div className="flex items-center justify-between gap-3 text-sm mb-2">
                        <span className="text-gray-200 font-medium">{titleCase(dimension)}</span>
                        <span className={delta === null ? "text-gray-500" : delta >= 0 ? "text-primary" : "text-brand-red"}>{delta === null ? "No pair" : `${delta > 0 ? "+" : ""}${delta} · ${metric?.improved ?? 0} improved`}</span>
                      </div>
                      <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
                        {delta !== null && delta !== 0 && <div className={`absolute top-0 bottom-0 ${delta > 0 ? "left-1/2 bg-primary" : "right-1/2 bg-brand-red"}`} style={{ width: `${width}%` }} />}
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-500 pt-2 border-t border-white/10">{summary?.interpretation || "Directional program-learning signals only; no causal or clinical claim is made."}</p>
              </CardContent>
            </Card>

            <Card className="bg-[#111] border-white/10">
              <CardHeader className="gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-white">Recent observations</CardTitle>
                  <div className="flex gap-2">
                    <Input value={participantFilter} onChange={(e) => setParticipantFilter(e.target.value)} placeholder="Participant reference" className="h-9 bg-black/40 border-white/10" />
                    <Button size="sm" variant="outline" onClick={() => loadDashboard(participantFilter)}>Filter</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-12 flex items-center justify-center text-gray-500"><Loader2 className="w-5 h-5 mr-2 animate-spin" />Loading observations</div>
                ) : observations.length === 0 ? (
                  <div className="py-12 text-center"><Users className="w-8 h-8 text-gray-700 mx-auto mb-3" /><p className="text-sm text-gray-400">No observations found.</p><p className="text-xs text-gray-600 mt-1">Record a baseline to begin measuring movement.</p></div>
                ) : (
                  <div className="divide-y divide-white/10">
                    {observations.slice(0, 8).map((observation) => (
                      <div key={observation.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div><p className="text-sm font-medium text-white">{observation.participant_ref}</p><p className="text-xs text-gray-500">{observation.interaction_ref || "No interaction reference"} · {new Date(observation.observed_at).toLocaleString()}</p></div>
                        <div className="flex items-center gap-3 text-xs"><span className={observation.phase === "follow_up" ? "text-primary" : "text-brand-yellow"}>{titleCase(observation.phase)}</span><span className="text-gray-500">{titleCase(observation.outcome)}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-lg border border-white/10 bg-[#111] p-4 flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div><div><p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p><p className="text-xl font-bold text-white mt-0.5">{value}</p></div></div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="space-y-2"><Label className="text-gray-300">{label}{required && <span className="text-brand-yellow"> *</span>}</Label>{children}</div>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <Field label={label}><Select value={value} onValueChange={onChange}><SelectTrigger className="w-full bg-black/40 border-white/10"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{titleCase(option)}</SelectItem>)}</SelectContent></Select></Field>;
}

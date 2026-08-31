import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Cloud, Cpu, Gauge, Loader2, Play, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ActionItem = {
  id: number;
  action_type: string;
  target_system: string;
  target_ref: string | null;
  requested_outcome: string;
  authority_level: string;
  execution_route: string;
  approval_required: number;
  provider_id: string | null;
  estimated_external_ai_cost_micros: number;
  status: string;
  result_summary: string | null;
  result_json: string | null;
  created_at: string;
};

const titleCase = (value: string) => value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export function ExecutiveActionQueue() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({
    action_type: "read",
    target_system: "github",
    target_ref: "",
    requested_outcome: "",
    authority_level: "observe",
    execution_route: "automatic",
    provider_id: "",
    estimated_external_ai_cost_micros: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = statusFilter === "all" ? "" : `?status=${encodeURIComponent(statusFilter)}`;
      const data = await apiJson<{ actions: ActionItem[] }>(`/api/admin/action-queue${query}`);
      setActions(data.actions || []);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Action queue could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiJson("/api/admin/action-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          target_ref: form.target_ref.trim() || null,
          requested_outcome: form.requested_outcome.trim(),
          execution_route: form.execution_route === "automatic" ? undefined : form.execution_route,
          provider_id: form.execution_route === "cloud_model" ? form.provider_id.trim() || null : null,
          estimated_external_ai_cost_micros:
            form.execution_route === "cloud_model"
              ? form.estimated_external_ai_cost_micros
              : 0,
        }),
      });
      toast.success("Action added using the local/direct-first policy.");
      setForm((current) => ({ ...current, target_ref: "", requested_outcome: "" }));
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Action could not be queued.");
    } finally {
      setSaving(false);
    }
  };

  const decide = async (id: number, decision: "approve" | "decline") => {
    try {
      await apiJson(`/api/admin/action-queue/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      toast.success(decision === "approve" ? "Action approved and ready for manual execution." : "Action declined.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Decision could not be recorded.");
    }
  };

  const executeAction = async (id: number) => {
    setExecutingId(id);
    try {
      await apiJson(`/api/admin/action-queue/${id}/execute`, { method: "POST" });
      toast.success("Read-only action completed.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Action could not be executed.");
      await load();
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div><h2 className="text-2xl font-bold">Authority-controlled action queue</h2><p className="mt-2 text-sm text-gray-400 max-w-3xl">Direct connector and local Mac routes are preferred. Every modifying, external, sensitive, destructive, publishing, and cloud-model action waits for your approval.</p></div>
        <div className="flex items-center gap-2 text-xs text-gray-400 border border-white/10 rounded-lg px-3 py-2 bg-black/30"><Gauge className="w-4 h-4 text-primary" />Read-only executors available when configured</div>
      </div>

      <div className="grid xl:grid-cols-[0.85fr_1.15fr] gap-6 items-start">
        <Card className="bg-[#111] border-white/10">
          <CardHeader><CardTitle className="text-white">Propose an action</CardTitle><p className="text-sm text-gray-500">The system chooses direct, local, or local-model execution unless cloud use is explicitly selected.</p></CardHeader>
          <CardContent><form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <SelectField label="Action" value={form.action_type} options={["read", "search", "create", "update", "send", "publish", "delete", "execute", "analyze"]} onChange={(action_type) => setForm({ ...form, action_type })} />
              <SelectField label="System" value={form.target_system} options={["gmail", "calendar", "web", "files", "desktop_commander", "github", "ghl", "papa_life", "human_impact", "system"]} onChange={(target_system) => setForm({ ...form, target_system })} />
              <SelectField label="Authority" value={form.authority_level} options={["observe", "act_reversible", "act_external", "sensitive"]} onChange={(authority_level) => setForm({ ...form, authority_level })} />
              <SelectField label="Execution route" value={form.execution_route} options={["automatic", "direct", "local", "local_model", "cloud_model"]} onChange={(execution_route) => setForm({ ...form, execution_route })} />
            </div>
            <Field label="Requested outcome"><Textarea required value={form.requested_outcome} onChange={(e) => setForm({ ...form, requested_outcome: e.target.value })} placeholder="What should be true when this action is complete?" className="min-h-24 bg-black/40 border-white/10" /></Field>
            <Field label="Target reference"><Input value={form.target_ref} onChange={(e) => setForm({ ...form, target_ref: e.target.value })} placeholder="Optional thread, event, file, PR, contact, or device reference" className="bg-black/40 border-white/10" /></Field>
            {form.execution_route === "cloud_model" && <div className="grid sm:grid-cols-2 gap-4 rounded-lg border border-brand-yellow/30 bg-brand-yellow/5 p-4"><Field label="Cloud provider"><Input required value={form.provider_id} onChange={(e) => setForm({ ...form, provider_id: e.target.value })} placeholder="Provider must be visible" className="bg-black/40 border-white/10" /></Field><Field label="Estimated cost (micro-dollars)"><Input type="number" min="0" value={form.estimated_external_ai_cost_micros} onChange={(e) => setForm({ ...form, estimated_external_ai_cost_micros: Number(e.target.value) })} className="bg-black/40 border-white/10" /></Field></div>}
            <Button type="submit" disabled={saving || !form.requested_outcome.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add to queue</Button>
          </form></CardContent>
        </Card>

        <Card className="bg-[#111] border-white/10">
          <CardHeader className="gap-3"><div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="text-white">Queued actions</CardTitle><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-48 bg-black/40 border-white/10"><SelectValue /></SelectTrigger><SelectContent>{["all", "awaiting_approval", "approved", "executing", "completed", "failed", "declined"].map((status) => <SelectItem key={status} value={status}>{titleCase(status)}</SelectItem>)}</SelectContent></Select></div></CardHeader>
          <CardContent>{loading ? <div className="py-12 flex items-center justify-center text-gray-500"><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading queue</div> : actions.length === 0 ? <div className="py-12 text-center text-sm text-gray-500">No actions match this view.</div> : <div className="divide-y divide-white/10">{actions.map((action) => <div key={action.id} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-xs"><span className={action.status === "awaiting_approval" ? "text-brand-yellow" : action.status === "declined" || action.status === "failed" ? "text-brand-red" : "text-primary"}>{titleCase(action.status)}</span><span className="text-gray-600">{titleCase(action.target_system)} · {titleCase(action.action_type)}</span></div><p className="mt-2 text-sm text-white">{action.requested_outcome}</p>{action.target_ref && <p className="mt-1 text-xs text-gray-500 break-all">{action.target_ref}</p>}{action.result_summary && <p className="mt-2 text-xs text-primary">{action.result_summary}</p>}<div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500"><span className="flex items-center gap-1">{action.execution_route === "cloud_model" ? <Cloud className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}{titleCase(action.execution_route)}</span><span>{action.approval_required ? "Approval required" : "Policy-approved"}</span>{action.provider_id && <span>Provider: {action.provider_id}</span>}{action.estimated_external_ai_cost_micros > 0 && <span>Estimated cloud AI: ${(action.estimated_external_ai_cost_micros / 1_000_000).toFixed(4)}</span>}</div></div><div className="flex gap-2 shrink-0">{action.status === "awaiting_approval" && <><Button size="sm" onClick={() => decide(action.id, "approve")}><Check className="w-4 h-4 mr-1" />Approve</Button><Button size="sm" variant="outline" onClick={() => decide(action.id, "decline")}><X className="w-4 h-4 mr-1" />Decline</Button></>}{action.status === "approved" && isReadOnlyExecutable(action) && <Button size="sm" onClick={() => executeAction(action.id)} disabled={executingId === action.id}>{executingId === action.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}Run read-only</Button>}</div></div></div>)}</div>}</CardContent>
        </Card>
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-gray-400"><ShieldAlert className="w-5 h-5 text-primary shrink-0" /><p>Only read/search actions have executors, and they run only when you press Run read-only. Gmail requires its private connector; Mac/files require the loopback local bridge. Modifying actions have no executor.</p></div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label className="text-gray-300">{label}</Label>{children}</div>; }
function isReadOnlyExecutable(action: ActionItem) { return ["read", "search"].includes(action.action_type) && ((action.target_system === "gmail" && action.execution_route === "direct") || (["files", "desktop_commander"].includes(action.target_system) && action.execution_route === "local")); }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <Field label={label}><Select value={value} onValueChange={onChange}><SelectTrigger className="bg-black/40 border-white/10"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{titleCase(option)}</SelectItem>)}</SelectContent></Select></Field>; }

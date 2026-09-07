import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PendingApproval = {
  id: number;
  action_type: string;
  target_system: string;
  target_ref: string | null;
  requested_outcome: string;
  authority_level: string;
  execution_route: string;
  estimated_external_ai_cost_micros: number;
  created_at: string;
  waits_for_mac: boolean;
};

type Mission = {
  mac_online: boolean;
  android_online: boolean;
  active_companion: "android" | "mac" | null;
  pending_approvals: PendingApproval[];
};

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", ...init });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function formatCost(micros: number) {
  if (!micros) return "$0.00";
  return `$${(micros / 1_000_000).toFixed(2)}`;
}

export default function AiBossApprovals() {
  const [, navigate] = useLocation();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ mission: Mission }>("/api/admin/ai-boss/mission-control");
      setMission(data.mission);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approvals could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) navigate("/login");
        else if (!data.user?.researchLabAccess) navigate("/crm-console");
        else void load();
      })
      .catch(() => navigate("/login"));
  }, [load, navigate]);

  async function decide(id: number, decision: "approve" | "decline") {
    setDecidingId(id);
    try {
      await apiJson(`/api/admin/action-queue/${id}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decision,
          note: decision === "approve" ? "Approved from Brian's Android companion." : "Declined from Brian's Android companion.",
        }),
      });
      toast.success(decision === "approve" ? "Approved." : "Declined.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Decision could not be saved.");
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#090909] text-white pb-20">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate("/ai-boss")} aria-label="Back to AI Boss"><ArrowLeft className="w-4 h-4" /></Button>
          <ShieldCheck className="w-6 h-6 text-primary" />
          <div><h1 className="font-bold leading-tight">Approvals</h1><p className="text-xs text-gray-500">AI Boss Android Companion</p></div>
          <Button size="icon" variant="ghost" className="ml-auto" onClick={() => load()} aria-label="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        <Card className="bg-[#111] border-white/10">
          <CardContent className="p-4 flex flex-wrap gap-3 text-sm">
            <span className={mission?.android_online ? "text-green-400" : "text-yellow-300"}>Phone: {mission?.android_online ? "Online" : "Not reporting"}</span>
            <span className={mission?.mac_online ? "text-green-400" : "text-yellow-300"}>Mac: {mission?.mac_online ? "Online" : "Offline"}</span>
            <span className="text-gray-400">Active companion: {mission?.active_companion || "none"}</span>
          </CardContent>
        </Card>

        {!loading && (mission?.pending_approvals.length || 0) === 0 ? (
          <Card className="bg-[#111] border-white/10"><CardContent className="p-8 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-green-400" /><p className="mt-3 font-semibold">Nothing needs your approval right now.</p></CardContent></Card>
        ) : null}

        {(mission?.pending_approvals || []).map((action) => (
          <Card key={action.id} className="bg-[#111] border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs uppercase tracking-widest text-primary">{action.target_system} · {action.action_type}</p><CardTitle className="mt-1 text-white text-lg">{action.requested_outcome}</CardTitle></div>
                {action.waits_for_mac ? <span className="rounded-full bg-yellow-400/10 px-2 py-1 text-xs text-yellow-300"><Clock3 className="inline h-3 w-3 mr-1" />Mac needed</span> : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div>Authority: <span className="text-white">{action.authority_level}</span></div>
                <div>Route: <span className="text-white">{action.execution_route}</span></div>
                <div>External AI cost: <span className="text-white">{formatCost(action.estimated_external_ai_cost_micros)}</span></div>
                <div>Action #{action.id}</div>
              </div>
              {action.waits_for_mac ? <p className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-3 text-sm text-yellow-100">You can approve this now. AI Boss will keep it waiting until the Mac or required local resource is available.</p> : null}
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" disabled={decidingId === action.id} onClick={() => void decide(action.id, "decline")} className="border-red-400/30 text-red-300 hover:bg-red-400/10">{decidingId === action.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}Decline</Button>
                <Button disabled={decidingId === action.id} onClick={() => void decide(action.id, "approve")}>{decidingId === action.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Approve</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}

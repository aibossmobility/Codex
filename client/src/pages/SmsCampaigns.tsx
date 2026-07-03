import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Megaphone, RefreshCw, Trash2, Users, Send, AlertTriangle } from "lucide-react";

interface CampaignRow {
  id: number;
  name: string;
  body_template: string;
  status: string;
  created_at: string;
  updated_at: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  pending_count: number;
}

interface RecipientRow {
  id: number;
  lead_id: number;
  phone_e164: string;
  send_status: string;
  error: string | null;
  sent_at: string | null;
  first_name: string;
  last_name: string;
  business_email: string;
}

export default function SmsCampaigns() {
  const [twilioOk, setTwilioOk] = useState<boolean | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [name, setName] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState(
    "Hi {{first_name}} — quick note from Boss Mobile / PAPA Life. Reply STOP to opt out."
  );
  const [sending, setSending] = useState(false);

  const loadCampaigns = useCallback(async () => {
    const [tRes, cRes] = await Promise.all([
      fetch("/api/sms/twilio-status"),
      fetch("/api/sms/campaigns"),
    ]);
    if (tRes.ok) {
      const t = await tRes.json();
      setTwilioOk(!!t.configured);
    }
    if (cRes.ok) setCampaigns(await cRes.json());
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (!selectedId) {
      setRecipients([]);
      return;
    }
    void (async () => {
      const r = await fetch(`/api/sms/campaigns/${selectedId}/recipients?limit=200`);
      if (r.ok) setRecipients(await r.json());
    })();
  }, [selectedId]);

  const selected = campaigns.find((c) => c.id === selectedId) ?? null;

  const createCampaign = async () => {
    if (!name.trim() || !bodyTemplate.trim()) {
      toast.error("Name and message are required");
      return;
    }
    const r = await fetch("/api/sms/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), body_template: bodyTemplate.trim() }),
    });
    const j = await r.json();
    if (!r.ok) {
      toast.error(j.error || "Create failed");
      return;
    }
    toast.success("Campaign created");
    setName("");
    await loadCampaigns();
    setSelectedId(Number(j.id));
  };

  const buildAudience = async () => {
    if (!selectedId) return;
    const r = await fetch(`/api/sms/campaigns/${selectedId}/build-audience`, { method: "POST" });
    const j = await r.json();
    if (!r.ok) {
      toast.error(j.error || "Build failed");
      return;
    }
    toast.success(`Audience built: ${j.added} numbers, ${j.skipped} skipped (invalid phone)`);
    await loadCampaigns();
    const rr = await fetch(`/api/sms/campaigns/${selectedId}/recipients?limit=200`);
    if (rr.ok) setRecipients(await rr.json());
  };

  const sendBatch = async () => {
    if (!selectedId) return;
    setSending(true);
    try {
      const r = await fetch(`/api/sms/campaigns/${selectedId}/send-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 25 }),
      });
      const j = await r.json();
      if (!r.ok) {
        toast.error(j.error || "Send failed");
        return;
      }
      toast.success(`Sent ${j.sent}, failed ${j.failed}. ${j.remaining} pending.`);
      await loadCampaigns();
      const rr = await fetch(`/api/sms/campaigns/${selectedId}/recipients?limit=200`);
      if (rr.ok) setRecipients(await rr.json());
    } finally {
      setSending(false);
    }
  };

  const deleteCampaign = async (id: number) => {
    if (!confirm("Delete this campaign? Only allowed if nothing was sent yet.")) return;
    const r = await fetch(`/api/sms/campaigns/${id}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) {
      toast.error(j.error || "Delete failed");
      return;
    }
    toast.success("Deleted");
    if (selectedId === id) setSelectedId(null);
    await loadCampaigns();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            SMS campaigns
          </h2>
          <p className="text-gray-500 text-sm mt-1 max-w-xl">
            Boss Mobile-only tool: build lists from CRM leads who opted into{" "}
            <strong className="text-gray-400">marketing</strong> SMS, personalize with{" "}
            <code className="text-primary">{"{{first_name}}"}</code>, <code className="text-primary">{"{{last_name}}"}</code>,{" "}
            <code className="text-primary">{"{{business_name}}"}</code>, then send in batches via Twilio.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadCampaigns()} className="border-white/15 text-gray-300">
          <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
        </Button>
      </div>

      {twilioOk === false && (
        <Card className="bg-amber-950/30 border-amber-700/40">
          <CardContent className="py-4 flex gap-3 items-start text-amber-200/90 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold text-amber-100">Twilio not configured on the server</p>
              <p className="mt-1 text-amber-200/80">
                Set <code className="bg-black/30 px-1 rounded">TWILIO_ACCOUNT_SID</code>,{" "}
                <code className="bg-black/30 px-1 rounded">TWILIO_AUTH_TOKEN</code>, and either{" "}
                <code className="bg-black/30 px-1 rounded">TWILIO_MESSAGING_SERVICE_SID</code> (recommended) or{" "}
                <code className="bg-black/30 px-1 rounded">TWILIO_FROM_NUMBER</code>, then restart the app.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-[#111] border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-base">New campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Campaign name (internal)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-[#0a0a0a] border-white/10 text-white"
          />
          <Textarea
            placeholder="Message template…"
            value={bodyTemplate}
            onChange={(e) => setBodyTemplate(e.target.value)}
            rows={4}
            className="bg-[#0a0a0a] border-white/10 text-white"
          />
          <Button onClick={() => void createCampaign()} className="bg-primary text-primary-foreground">
            Create draft
          </Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-[#111] border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
            {campaigns.length === 0 ? (
              <p className="text-gray-500 text-sm">No campaigns yet.</p>
            ) : (
              campaigns.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                    selectedId === c.id ? "border-primary/50 bg-primary/10" : "border-white/10 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white text-sm font-medium truncate">{c.name}</span>
                    <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                      {c.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {c.recipient_count} recipients · {c.sent_count} sent · {c.failed_count} failed · {c.pending_count}{" "}
                    pending
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Run campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selected ? (
              <p className="text-gray-500 text-sm">Select a campaign.</p>
            ) : (
              <>
                <div className="text-sm text-gray-400 space-y-2">
                  <p>
                    <span className="text-gray-500">Template:</span>{" "}
                    <span className="text-gray-200 whitespace-pre-wrap">{selected.body_template}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={selected.status !== "draft" && selected.status !== "ready"}
                    onClick={() => void buildAudience()}
                    className="bg-white/10 text-white"
                  >
                    <Users className="w-4 h-4 mr-1.5" />
                    Build audience (marketing consent)
                  </Button>
                  <Button
                    size="sm"
                    disabled={
                      sending ||
                      twilioOk === false ||
                      (selected.status !== "ready" && selected.status !== "sending") ||
                      selected.pending_count === 0
                    }
                    onClick={() => void sendBatch()}
                    className="bg-primary text-primary-foreground"
                  >
                    <Send className="w-4 h-4 mr-1.5" />
                    {sending ? "Sending…" : "Send next 25"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => void deleteCampaign(selected.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Delete
                  </Button>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Recent recipients</p>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
                    {recipients.length === 0 ? (
                      <p className="p-3 text-gray-600 text-xs">No rows yet — build audience.</p>
                    ) : (
                      recipients.slice(0, 50).map((r) => (
                        <div key={r.id} className="px-3 py-2 text-xs flex justify-between gap-2">
                          <span className="text-gray-300 truncate">
                            {r.first_name} {r.last_name} · {r.phone_e164}
                          </span>
                          <span
                            className={
                              r.send_status === "sent"
                                ? "text-emerald-400 shrink-0"
                                : r.send_status === "failed"
                                  ? "text-red-400 shrink-0"
                                  : "text-amber-400 shrink-0"
                            }
                          >
                            {r.send_status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

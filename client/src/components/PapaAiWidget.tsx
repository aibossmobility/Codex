import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  ClipboardCheck,
  MessageCircle,
  Mic,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PapaAiWidgetProps = {
  autoOpen?: boolean;
  className?: string;
};

type ActionLink = {
  href: string;
  label: string;
  detail: string;
  interest: "Reconnection Assessment" | "Private Conversation" | "Tuesday Live" | "Membership";
  icon: typeof ClipboardCheck;
  primary: boolean;
};

type LeadState = {
  first_name: string;
  email: string;
  consent: boolean;
};

const quickPrompts = [
  "I need help reconnecting with my daughter.",
  "What should I say if my son is distant?",
  "Help me pray before I reach out.",
];

const actionLinks: ActionLink[] = [
  {
    href: "/assessment",
    label: "Take the 2-Minute Fatherhood Check-In",
    detail: "Find your next best step",
    interest: "Reconnection Assessment",
    icon: ClipboardCheck,
    primary: true,
  },
  {
    href: "/booking",
    label: "Book a Private Conversation",
    detail: "Talk directly with Brian",
    interest: "Private Conversation",
    icon: CalendarCheck,
    primary: false,
  },
  {
    href: "/tuesday-live",
    label: "Join Tuesday Live",
    detail: "Learn with other fathers",
    interest: "Tuesday Live",
    icon: Users,
    primary: false,
  },
  {
    href: "/membership",
    label: "Explore Papa Life Membership",
    detail: "Get immediate access",
    interest: "Membership",
    icon: ArrowRight,
    primary: false,
  },
];

const PAPA_LIFE_VOICE_AGENT_URL = "/papa-agent.html";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function buildConversationSummary(messages: ChatMessage[]) {
  const recent = messages
    .slice(-6)
    .map((item) => `${item.role === "user" ? "Visitor" : "Coach"}: ${item.content}`)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return recent.length > 900 ? `${recent.slice(0, 897)}...` : recent;
}

function localPapaReply(text: string) {
  const lower = text.toLowerCase();
  if (/(suicide|kill myself|hurt myself|harm myself|immediate danger|being abused|unsafe)/.test(lower)) {
    return "Father, your immediate safety and the safety of everyone involved come first. If someone may be in immediate danger, call 911 or your local emergency number now. In the U.S. or Canada, call or text 988 for immediate crisis support. Do not try to carry this moment alone. Papa Life can support a wise next step, but it is not an emergency or clinical service.";
  }
  if (lower.includes("pray") || lower.includes("prayer")) {
    return "Grace Principle: Father God, give me humility before I speak, patience before I act, and love that does not try to control the outcome. Assertive Strategy: Before you reach out, write one sentence that owns your part without asking for a response. Character Call: Let your adult child experience a father who is safe enough to listen. Next step: take the 2-Minute Fatherhood Check-In below when you are ready.";
  }
  if (lower.includes("daughter")) {
    return "Grace Principle: Your daughter does not need a perfect speech; she needs evidence that you are becoming safer to talk to. Assertive Strategy: Try, \"I've been thinking about how I have shown up, and I want to listen better. No pressure to respond today. I love you, and I am working on my part.\" Character Call: Choose Presence over pressure. Next step: take the 2-Minute Fatherhood Check-In below to identify one consistent action.";
  }
  if (lower.includes("son")) {
    return "Grace Principle: Respect cannot be forced into the room; it is rebuilt through consistency. Assertive Strategy: Offer one honest sentence of ownership, then give your son room to respond in his own time. Character Call: Lead with Authority that is earned through character, not control. Next step: take the 2-Minute Fatherhood Check-In below to identify your next action.";
  }
  return "Grace Principle: Do not try to fix the whole relationship in one move. Assertive Strategy: Listen first, own what is yours, and remove pressure from the next message. Character Call: Presence is not weakness; it is mature fatherhood. Next step: choose one action below that helps you move forward with patience, accountability, and faith.";
}

export function PapaAiWidget({ autoOpen = false, className }: PapaAiWidgetProps) {
  const [open, setOpen] = useState(autoOpen);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [lead, setLead] = useState<LeadState>({ first_name: "", email: "", consent: false });
  const [leadStatus, setLeadStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [selectedAction, setSelectedAction] = useState<ActionLink | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Welcome to the Papa Life Action Coach. I help fathers of adult children rebuild connection, restore trust, and choose a practical next step. What's weighing on your heart today?",
    },
  ]);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  useEffect(() => {
    const openCoach = () => setOpen(true);
    window.addEventListener("papa-ai:open", openCoach);
    return () => window.removeEventListener("papa-ai:open", openCoach);
  }, []);

  const canSend = useMemo(() => message.trim().length > 1 && !loading, [message, loading]);
  const canCaptureLead = useMemo(
    () => Boolean(lead.first_name.trim()) && isValidEmail(lead.email) && lead.consent && leadStatus !== "saving",
    [lead, leadStatus]
  );

  function sourcePage() {
    return typeof window === "undefined" ? "" : window.location.href;
  }

  async function send(text = message) {
    const clean = text.trim();
    if (!clean || loading) return;
    setLoading(true);
    setMessage("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: clean }];
    setMessages(nextMessages);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "coach",
          source: "Papa Life Action Coach",
          message: clean,
          history: nextMessages.slice(-8),
          lead: { first_name: lead.first_name, email: lead.email },
          source_page: sourcePage(),
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Coach unavailable");
      setMessages((current) => [...current, { role: "assistant", content: json.reply }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: localPapaReply(clean) }]);
    } finally {
      setLoading(false);
    }
  }

  async function captureLead() {
    if (!canCaptureLead) return;
    setLeadStatus("saving");
    const interest = selectedAction?.interest || "General Guidance";
    try {
      const response = await fetch("/api/ai/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: lead.first_name,
          email: lead.email,
          offer: selectedAction?.label || "Papa Life Action Coach — General Guidance",
          interest,
          cta_selected: selectedAction?.label || null,
          source: "Papa Life Action Coach",
          source_page: sourcePage(),
          conversation_summary: buildConversationSummary(messages),
          consent: { marketing: true, captured_at: new Date().toISOString() },
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Unable to save your details");
      setLeadStatus("saved");
    } catch {
      setLeadStatus("error");
    }
  }

  function trackCta(action: ActionLink) {
    setSelectedAction(action);
    const payload = JSON.stringify({
      cta: action.label,
      interest: action.interest,
      source: "Papa Life Action Coach",
      source_page: sourcePage(),
      conversation_summary: buildConversationSummary(messages),
      lead: lead.consent && isValidEmail(lead.email) ? { first_name: lead.first_name, email: lead.email } : undefined,
    });
    try {
      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        navigator.sendBeacon("/api/ai/cta", new Blob([payload], { type: "application/json" }));
      } else {
        void fetch("/api/ai/cta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    } catch {
      // CTA navigation remains available even if attribution cannot be recorded.
    }
  }

  return (
    <div className={cn("fixed bottom-4 right-4 z-[70] w-[calc(100vw-2rem)] max-w-[440px]", className)}>
      {open ? (
        <section
          aria-label="Papa Life Action Coach"
          className="overflow-hidden rounded-2xl border border-brand-yellow/35 bg-black shadow-[0_18px_80px_rgba(0,0,0,0.55)]"
        >
          <div className="border-b border-white/10 bg-gradient-to-r from-brand-yellow/18 via-black to-primary/18 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-yellow text-black">
                  <Bot className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white">Papa Life Action Coach</h2>
                  <p className="text-xs font-semibold text-white/62">Get guidance, choose a next step, and take action today.</p>
                </div>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/75 hover:border-brand-yellow hover:text-brand-yellow"
                onClick={() => setOpen(false)}
                aria-label="Close Papa Life Action Coach"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="max-h-[300px] space-y-3 overflow-y-auto p-4">
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={cn(
                  "rounded-xl px-4 py-3 text-sm leading-relaxed",
                  item.role === "assistant"
                    ? "border border-white/10 bg-white/[0.06] text-white/82"
                    : "ml-auto max-w-[86%] bg-primary text-black"
                )}
              >
                {item.content}
              </div>
            ))}
            {loading && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/65">
                <Sparkles className="h-4 w-4 text-brand-yellow" aria-hidden="true" />
                Thinking with the PAPA Framework...
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="mb-4 rounded-xl border border-brand-yellow/25 bg-brand-yellow/[0.06] p-3">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-brand-yellow">Choose your next step</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {actionLinks.map((action) => {
                  const Icon = action.icon;
                  return (
                    <a
                      key={action.href}
                      href={action.href}
                      onClick={() => trackCta(action)}
                      className={cn(
                        "flex items-start gap-2 rounded-lg border px-3 py-2.5 transition",
                        action.primary
                          ? "border-brand-yellow bg-brand-yellow text-black hover:bg-white"
                          : "border-white/12 bg-white/[0.04] text-white hover:border-brand-yellow hover:text-brand-yellow"
                      )}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>
                        <span className="block text-xs font-extrabold leading-tight">{action.label}</span>
                        <span className={cn("mt-0.5 block text-[11px]", action.primary ? "text-black/65" : "text-white/45")}>
                          {action.detail}
                        </span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <Input
                value={lead.first_name}
                onChange={(event) => {
                  setLeadStatus("idle");
                  setLead((current) => ({ ...current, first_name: event.target.value }));
                }}
                placeholder="First name"
                aria-label="First name"
                className="h-10 border-white/15 bg-white/[0.04]"
              />
              <Input
                value={lead.email}
                onChange={(event) => {
                  setLeadStatus("idle");
                  setLead((current) => ({ ...current, email: event.target.value }));
                }}
                placeholder="Email for follow-up"
                type="email"
                aria-label="Email for Papa Life follow-up"
                className="h-10 border-white/15 bg-white/[0.04]"
              />
            </div>
            <label className="mb-2 flex items-start gap-2 text-xs leading-relaxed text-white/58">
              <input
                type="checkbox"
                checked={lead.consent}
                onChange={(event) => {
                  setLeadStatus("idle");
                  setLead((current) => ({ ...current, consent: event.target.checked }));
                }}
                className="mt-0.5 h-3.5 w-3.5 accent-brand-yellow"
              />
              <span>I agree that Papa Life may use my details to follow up with resources and next steps.</span>
            </label>
            <Button
              type="button"
              onClick={() => void captureLead()}
              disabled={!canCaptureLead}
              variant="outline"
              className="mb-3 h-9 w-full border-brand-yellow/55 bg-transparent text-xs font-bold text-brand-yellow hover:bg-brand-yellow hover:text-black disabled:opacity-50"
            >
              {leadStatus === "saving" ? "Saving your next step..." : leadStatus === "saved" ? "Follow-up details saved" : "Get follow-up resources"}
            </Button>
            {leadStatus === "saved" && (
              <p className="mb-3 text-xs leading-relaxed text-green-300">Thank you, Father. Papa Life has your requested follow-up details and next step.</p>
            )}
            {leadStatus === "error" && (
              <p className="mb-3 text-xs leading-relaxed text-red-300">Your details could not be saved right now. You can still use any next-step option above.</p>
            )}

            <div className="mb-3 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-full border border-white/12 px-3 py-2 text-left text-xs font-semibold text-white/70 hover:border-brand-yellow hover:text-brand-yellow"
                  onClick={() => void send(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-2">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder="Tell me what is happening..."
                aria-label="Ask the Papa Life Action Coach"
                className="max-h-28 min-h-12 resize-none border-white/15 bg-white/[0.04]"
              />
              <Button
                type="button"
                onClick={() => void send()}
                disabled={!canSend}
                className="h-12 w-12 shrink-0 rounded-full bg-brand-yellow p-0 text-black hover:bg-white"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            <a href="/ai-coach" className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-brand-yellow hover:text-white">
              Open the full AI Coach experience
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <a
              href={PAPA_LIFE_VOICE_AGENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 mt-3 inline-flex items-center gap-2 text-xs font-bold text-white/70 hover:text-brand-yellow"
            >
              <Mic className="h-3.5 w-3.5" aria-hidden="true" />
              Talk by Voice
            </a>
          </div>
        </section>
      ) : (
        <button
          type="button"
          className="ml-auto flex min-h-14 items-center gap-3 rounded-full border border-brand-yellow/45 bg-black px-5 py-3 text-left shadow-2xl hover:bg-[#111]"
          onClick={() => setOpen(true)}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-yellow text-black">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-extrabold text-white">Papa Life Action Coach</span>
            <span className="block text-xs font-semibold text-white/55">Get your next step now</span>
          </span>
        </button>
      )}
    </div>
  );
}

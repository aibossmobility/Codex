import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowRight, Bot, MessageCircle, Mic, Send, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PapaAiWidgetProps = {
  autoOpen?: boolean;
  className?: string;
};

const quickPrompts = [
  "I need help reconnecting with my daughter.",
  "What should I say if my son is distant?",
  "Help me pray before I reach out.",
];

const PAPA_LIFE_VOICE_AGENT_URL = "/papa-agent.html";

function localPapaReply(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("pray") || lower.includes("prayer")) {
    return "Father God, give me humility before I speak, patience before I act, and love that does not try to control the outcome. Help me listen first, own what is mine, and become consistent enough that trust can breathe again. Amen.";
  }
  if (lower.includes("daughter")) {
    return "Father, with your daughter, start with safety and listening. Do not lead with a speech. Lead with humility. A simple next step is: \"I've been thinking about how I have shown up, and I want to listen better. No pressure to respond today. I love you, and I am working on my part.\"";
  }
  if (lower.includes("son")) {
    return "Father, with your son, respect cannot be forced into the room. It is rebuilt through consistency. Ask yourself: am I trying to be right, or am I trying to become trustworthy? Start with one honest sentence of ownership and one practical action you can repeat.";
  }
  return "Father, start here: do not try to fix the whole relationship in one move. Listen first. Own what is yours. Remove pressure from the next message. Presence is not weakness; it is mature fatherhood. Take one small step this week that your adult child can experience as safe and consistent.";
}

export function PapaAiWidget({ autoOpen = false, className }: PapaAiWidgetProps) {
  const [open, setOpen] = useState(autoOpen);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [lead, setLead] = useState({ first_name: "", email: "" });
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Welcome to the Papa Life AI Coach. I help fathers of adult children rebuild connection, restore trust, and lead with Purpose, Authority, Presence, and Alignment. What's weighing on your heart today?",
    },
  ]);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  const canSend = useMemo(() => message.trim().length > 1 && !loading, [message, loading]);

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
          message: clean,
          history: nextMessages.slice(-8),
          lead,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Coach unavailable");
      setMessages((current) => [...current, { role: "assistant", content: json.reply }]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: localPapaReply(clean),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("fixed bottom-4 right-4 z-[70] w-[calc(100vw-2rem)] max-w-[420px]", className)}>
      {open ? (
        <section
          aria-label="Papa Life AI Coach"
          className="overflow-hidden rounded-2xl border border-brand-yellow/35 bg-black shadow-[0_18px_80px_rgba(0,0,0,0.55)]"
        >
          <div className="border-b border-white/10 bg-gradient-to-r from-brand-yellow/18 via-black to-primary/18 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-yellow text-black">
                  <Bot className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white">Meet the Papa Life AI Coach</h2>
                  <p className="text-xs font-semibold text-white/62">
                    Helping fathers rebuild connection, restore trust, and lead with PAPA.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/75 hover:border-brand-yellow hover:text-brand-yellow"
                onClick={() => setOpen(false)}
                aria-label="Close Papa Life AI Coach"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="max-h-[360px] space-y-3 overflow-y-auto p-4">
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
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <Input
                value={lead.first_name}
                onChange={(event) => setLead((current) => ({ ...current, first_name: event.target.value }))}
                placeholder="First name"
                aria-label="First name"
                className="h-10 border-white/15 bg-white/[0.04]"
              />
              <Input
                value={lead.email}
                onChange={(event) => setLead((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email optional"
                type="email"
                aria-label="Email optional"
                className="h-10 border-white/15 bg-white/[0.04]"
              />
            </div>
            <p className="mb-3 text-xs leading-relaxed text-white/45">
              Contact information is optional and is used only for Papa Life follow-up when you provide it.
            </p>

            <div className="mb-3 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-full border border-white/12 px-3 py-2 text-left text-xs font-semibold text-white/70 hover:border-brand-yellow hover:text-brand-yellow"
                  onClick={() => send(prompt)}
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
                    send();
                  }
                }}
                placeholder="Ask me anything..."
                aria-label="Ask the Papa Life AI Coach"
                className="max-h-28 min-h-12 resize-none border-white/15 bg-white/[0.04]"
              />
              <Button
                type="button"
                onClick={() => send()}
                disabled={!canSend}
                className="h-12 w-12 shrink-0 rounded-full bg-brand-yellow p-0 text-black hover:bg-white"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            <a
              href="/ai-coach"
              className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-brand-yellow hover:text-white"
            >
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
            <span className="block text-sm font-extrabold text-white">Papa Life AI Coach</span>
            <span className="block text-xs font-semibold text-white/55">Ask me anything</span>
          </span>
        </button>
      )}
    </div>
  );
}

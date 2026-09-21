import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CalendarCheck, HeartHandshake, MessageCircle, Mic, Send, ShieldCheck, Sparkles, Square, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };
type RelationshipKey = "new" | "papa" | "friend" | "family" | "child" | "church" | "professional";

type RelationshipOption = {
  key: RelationshipKey;
  label: string;
  guidance: string;
  commercial: boolean;
};

const RELATIONSHIPS: RelationshipOption[] = [
  { key: "new", label: "I am new to Brian / Papa Life", guidance: "Warmly welcome the visitor. Learn what brought them here. Do not imply prior knowledge. Guide toward the Fatherhood Check-In or a conversation only when useful.", commercial: true },
  { key: "papa", label: "I am a Papa Life father / participant", guidance: "Treat this as an ongoing Papa Life relationship. Ask what has changed since their last step and help them continue rather than restarting the whole journey.", commercial: true },
  { key: "friend", label: "I am Brian's friend", guidance: "Speak warmly and personally without sales pressure. Do not treat the visitor as a lead first. Listen, preserve dignity, and invite Brian into the conversation when appropriate.", commercial: false },
  { key: "family", label: "I am family / extended family", guidance: "Use a close-family tone without assuming private facts. No marketing language. Never expose information about other family members. Encourage direct human connection with Brian when the subject is personal or consequential.", commercial: false },
  { key: "child", label: "I am Brian's child or grandchild", guidance: "Use a loving, careful family tone. Do not sell Papa Life. Do not claim Brian personally saw or said anything unless it is explicitly in the conversation. Protect privacy and route meaningful personal matters toward direct connection with Brian.", commercial: false },
  { key: "church", label: "I know Brian through church / community", guidance: "Use a relational, service-oriented tone. Faith language may be used naturally when the visitor introduces it. Do not commercialize church or spiritual relationships.", commercial: false },
  { key: "professional", label: "I know Brian professionally / through an organization", guidance: "Use a warm professional tone. Understand the relationship and organizational need before proposing a Papa Life program, partnership, workshop, or meeting.", commercial: true },
];

const MEMORY_KEY = "papa-life-brian-twin-relationship-v1";

function relationshipByKey(key: RelationshipKey) {
  return RELATIONSHIPS.find((item) => item.key === key) || RELATIONSHIPS[0];
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function safeLocalReply(text: string, relationship: RelationshipOption) {
  const lower = text.toLowerCase();
  if (/(suicide|kill myself|hurt myself|harm myself|immediate danger|being abused|unsafe)/.test(lower)) {
    return "Your immediate safety and the safety of everyone involved come first. If someone may be in immediate danger, call 911 or your local emergency number now. In the U.S. or Canada, call or text 988 for immediate crisis support. Papa Life can support a wise next step, but it is not an emergency or clinical service.";
  }
  if (!relationship.commercial) {
    return "I'm here to listen in a way that reflects Brian's care without pretending to replace him. Tell me a little more about what matters most right now. If this needs Brian personally, I'll help point you toward direct connection rather than turning it into a sales conversation.";
  }
  return "You do not have to solve everything in one move. Tell me what is happening, what you hope will be different, and what feels hardest right now. From there, I can help you choose one practical next step and, when useful, connect you with Brian or the right Papa Life resource.";
}

function summarize(messages: ChatMessage[], relationship: RelationshipOption, firstName: string) {
  const conversation = messages
    .slice(-8)
    .map((item) => `${item.role === "user" ? "Visitor" : "Twin"}: ${item.content}`)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return `Relationship to Brian: ${relationship.label}. Visitor name: ${firstName || "not supplied"}. ${conversation}`.slice(0, 1000);
}

export function BrianDigitalTwin({ autoOpen = false, className }: { autoOpen?: boolean; className?: string }) {
  const [open, setOpen] = useState(autoOpen);
  const [relationshipKey, setRelationshipKey] = useState<RelationshipKey>("new");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [identified, setIdentified] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [spokenReplies, setSpokenReplies] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi. I'm Brian Keith Hill's Papa Life digital twin. I can listen, help you think through a next step using Presence, Authority, Purpose, and Alignment, and connect you with Brian when the human relationship matters most. Before we begin, how do you know Brian?",
    },
  ]);

  const relationship = useMemo(() => relationshipByKey(relationshipKey), [relationshipKey]);
  const canSave = Boolean(firstName.trim()) && isValidEmail(email) && consent && saveState !== "saving";
  const canSend = identified && message.trim().length > 1 && !loading;

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  useEffect(() => {
    const browser = window as any;
    setVoiceSupported(Boolean(browser.SpeechRecognition || browser.webkitSpeechRecognition));
  }, []);

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    const current = activeAudioRef.current;
    if (current) {
      current.pause();
      current.currentTime = 0;
      activeAudioRef.current = null;
    }
    setIsSpeaking(false);
  }

  function speak(_text: string, voiceUrl?: string) {
    if (!spokenReplies || !voiceUrl) return;
    stopSpeaking();
    const audio = new Audio(voiceUrl);
    audio.preload = "auto";
    audio.playsInline = true;
    activeAudioRef.current = audio;
    setIsSpeaking(true);
    const finish = () => {
      if (activeAudioRef.current === audio) activeAudioRef.current = null;
      setIsSpeaking(false);
    };
    audio.onended = finish;
    audio.onerror = finish;
    void audio.play().catch(finish);
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(MEMORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { firstName?: string; relationshipKey?: RelationshipKey };
      if (parsed.firstName) setFirstName(parsed.firstName);
      if (parsed.relationshipKey && RELATIONSHIPS.some((item) => item.key === parsed.relationshipKey)) {
        setRelationshipKey(parsed.relationshipKey);
        setIdentified(true);
        const rememberedRelationship = relationshipByKey(parsed.relationshipKey);
        setMessages([
          {
            role: "assistant",
            content: `Welcome back${parsed.firstName ? `, ${parsed.firstName}` : ""}. I remember that you identified yourself as: ${rememberedRelationship.label}. I won't assume anything beyond what you choose to share. What's on your mind today?`,
          },
        ]);
      }
    } catch {
      // Relationship memory is optional; a corrupted browser value should never block the conversation.
    }
  }, []);

  useEffect(() => {
    const openTwin = () => setOpen(true);
    window.addEventListener("papa-ai:open", openTwin);
    return () => window.removeEventListener("papa-ai:open", openTwin);
  }, []);

  function beginRelationship() {
    const current = relationshipByKey(relationshipKey);
    setIdentified(true);
    try {
      window.localStorage.setItem(MEMORY_KEY, JSON.stringify({ firstName: firstName.trim(), relationshipKey }));
    } catch {
      // Device memory is helpful but never required.
    }
    setMessages((existing) => [
      ...existing,
      {
        role: "assistant",
        content: firstName.trim()
          ? `Thank you, ${firstName.trim()}. I understand that you know Brian as: ${current.label}. I'll use that only to make this conversation more appropriate and personal. What would you like to talk about?`
          : `Thank you. I understand that you know Brian as: ${current.label}. I'll use that only to make this conversation more appropriate. What would you like to talk about?`,
      },
    ]);
  }

  async function sendText(clean: string) {
    if (!identified || loading || clean.length < 2) return;
    setLoading(true);
    setMessage("");
    const visibleHistory = [...messages, { role: "user" as const, content: clean }];
    setMessages(visibleHistory);

    const relationshipContext = [
      "RELATIONSHIP CONTEXT SUPPLIED BY VISITOR:",
      relationship.label,
      relationship.guidance,
      `Visitor first name: ${firstName.trim() || "not supplied"}.`,
      "Papa Life framework order: Presence → Authority → Purpose → Alignment. Presence leads: listen and show up safely before trying to teach, fix, direct, or persuade.",
      "Integrity rules: Do not claim Brian personally saw this conversation. Do not invent memories. Do not reveal private information about Brian or anyone else. If the visitor is family, a friend, or a church/community relationship, do not turn the conversation into marketing. If a consequential personal matter needs Brian, encourage direct human connection.",
      `VISITOR MESSAGE: ${clean}`,
    ].join("\n");

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "coach",
          source: "Brian Digital Twin — Relationship Aware",
          message: relationshipContext,
          history: visibleHistory.slice(-8),
          lead: { first_name: firstName, email },
          source_page: window.location.href,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Twin unavailable");
      setMessages((current) => [...current, { role: "assistant", content: json.reply }]);
      speak(json.reply, json.voice_url);
    } catch {
      const reply = safeLocalReply(clean, relationship);
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      stopSpeaking();
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const clean = message.trim();
    if (!canSend || !clean) return;
    await sendText(clean);
  }

  function startListening() {
    if (!identified || loading) return;
    stopSpeaking();
    const browser = window as any;
    const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    setListening(true);

    recognition.onresult = (event: any) => {
      const transcript = String(event.results?.[0]?.[0]?.transcript || "").trim();
      setListening(false);
      if (transcript) void sendText(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  async function saveRelationship() {
    if (!canSave) return;
    setSaveState("saving");
    try {
      const response = await fetch("/api/ai/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          email: email.trim(),
          offer: relationship.commercial ? "Brian Digital Twin — Papa Life next step" : "Brian Digital Twin — relationship continuity",
          interest: `Relationship: ${relationship.label}`,
          cta_selected: relationship.commercial ? "Relationship-aware digital twin" : "Personal relationship continuity",
          source: "Brian Digital Twin — Relationship Aware",
          source_page: window.location.href,
          conversation_summary: summarize(messages, relationship, firstName),
          consent: { marketing: relationship.commercial, captured_at: new Date().toISOString() },
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Unable to save relationship context");
      setSaveState("saved");
      try {
        window.localStorage.setItem(MEMORY_KEY, JSON.stringify({ firstName: firstName.trim(), relationshipKey }));
      } catch {
        // Browser memory remains optional.
      }
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className={cn("fixed bottom-4 right-4 z-[75] w-[calc(100vw-2rem)] max-w-[460px]", className)}>
      {open ? (
        <section className="overflow-hidden rounded-2xl border border-brand-yellow/40 bg-black shadow-[0_18px_80px_rgba(0,0,0,0.58)]" aria-label="Brian Keith Hill digital twin">
          <div className="border-b border-white/10 bg-gradient-to-r from-brand-yellow/20 via-black to-primary/15 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src="/images/brian-keith-hill.png" alt="Brian Keith Hill" className="h-12 w-12 rounded-full border border-brand-yellow/50 object-cover" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-white">Talk with Brian's Digital Twin</h2>
                    <Sparkles className="h-4 w-4 text-brand-yellow" aria-hidden="true" />
                  </div>
                  <p className="text-xs font-semibold text-white/60">Relationship-aware Papa Life guidance — Brian stays human.</p>
                </div>
              </div>
              <button type="button" onClick={() => { stopSpeaking(); setOpen(false); }} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/75 hover:border-brand-yellow hover:text-brand-yellow" aria-label="Close Brian's digital twin">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!identified ? (
            <div className="space-y-3 p-4">
              <div className="rounded-xl border border-brand-yellow/20 bg-brand-yellow/[0.05] p-3 text-sm leading-relaxed text-white/80">
                I don't want to guess who you are to Brian. Tell me how you know him so I can respond in the right way.
              </div>
              <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Your first name (optional)" aria-label="Your first name" className="border-white/15 bg-white/[0.04]" />
              <label className="block text-xs font-bold uppercase tracking-[0.12em] text-brand-yellow" htmlFor="brian-relationship">How do you know Brian?</label>
              <select id="brian-relationship" value={relationshipKey} onChange={(event) => setRelationshipKey(event.target.value as RelationshipKey)} className="min-h-11 w-full rounded-md border border-white/15 bg-[#111] px-3 text-sm text-white">
                {RELATIONSHIPS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
              <Button type="button" onClick={beginRelationship} className="w-full bg-brand-yellow font-extrabold text-black hover:bg-white">Start our conversation</Button>
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/45"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />The twin never guesses a family or personal relationship and never treats family/church relationships as marketing inventory.</p>
            </div>
          ) : (
            <>
              <div className="border-b border-white/10 px-4 py-2 text-xs text-white/55">
                <span className="font-bold text-brand-yellow">Relationship:</span> {relationship.label}
                <button type="button" className="ml-2 underline hover:text-white" onClick={() => setIdentified(false)}>change</button>
              </div>
              <div className="max-h-[300px] space-y-3 overflow-y-auto p-4">
                {messages.map((item, index) => (
                  <div key={`${item.role}-${index}`} className={cn("rounded-xl px-4 py-3 text-sm leading-relaxed", item.role === "assistant" ? "border border-white/10 bg-white/[0.06] text-white/82" : "ml-auto max-w-[86%] bg-primary text-black")}>{item.content}</div>
                ))}
                {loading && <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/65"><Sparkles className="h-4 w-4 text-brand-yellow" />Listening with Brian's relationship context...</div>}
              </div>

              <div className="border-t border-white/10 p-4">
                <div className="mb-3 flex items-end gap-2">
                  <Textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="What's on your heart?" aria-label="Message Brian's digital twin" className="max-h-28 min-h-12 resize-none border-white/15 bg-white/[0.04]" />
                  {voiceSupported && (
                    <Button type="button" onClick={startListening} disabled={loading || listening} variant="outline" className="h-12 w-12 shrink-0 rounded-full border-brand-yellow/55 bg-transparent p-0 text-brand-yellow hover:bg-brand-yellow hover:text-black" aria-label="Speak to Brian's digital twin">
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}
                  <Button type="button" onClick={() => void send()} disabled={!canSend} className="h-12 w-12 shrink-0 rounded-full bg-brand-yellow p-0 text-black hover:bg-white" aria-label="Send message"><Send className="h-5 w-5" /></Button>
                </div>
                <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/55">
                  <span>{listening ? "Listening… speak naturally." : voiceSupported ? "Mic mode uses your browser; replies use Brian Keith Hill’s approved cloned voice." : "Text conversation is ready on this browser."}</span>
                  <div className="flex items-center gap-3">
                    {isSpeaking && (
                      <button type="button" onClick={stopSpeaking} className="inline-flex items-center gap-1 font-bold text-white hover:text-brand-yellow" aria-label="Stop Brian's voice">
                        <Square className="h-3.5 w-3.5" />
                        Stop
                      </button>
                    )}
                    <button type="button" onClick={() => { setSpokenReplies((value) => !value); stopSpeaking(); }} className="inline-flex items-center gap-1 font-bold text-brand-yellow hover:text-white">
                      {spokenReplies ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                      {spokenReplies ? "Brian voice on" : "Brian voice off"}
                    </button>
                  </div>
                </div>

                <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="mb-2 text-xs font-bold text-white/75">Help the twin remember this relationship across follow-up</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input value={firstName} onChange={(event) => { setFirstName(event.target.value); setSaveState("idle"); }} placeholder="First name" aria-label="First name" className="border-white/15 bg-white/[0.04]" />
                    <Input value={email} onChange={(event) => { setEmail(event.target.value); setSaveState("idle"); }} placeholder="Email" type="email" aria-label="Email" className="border-white/15 bg-white/[0.04]" />
                  </div>
                  <label className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-white/55">
                    <input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setSaveState("idle"); }} className="mt-0.5 h-3.5 w-3.5 accent-brand-yellow" />
                    <span>{relationship.commercial ? "I agree that Papa Life may save these details for relationship continuity and appropriate follow-up." : "I agree that Brian's twin may save these details for relationship continuity. This is not marketing consent."}</span>
                  </label>
                  <Button type="button" onClick={() => void saveRelationship()} disabled={!canSave} variant="outline" className="mt-2 h-9 w-full border-brand-yellow/55 bg-transparent text-xs font-bold text-brand-yellow hover:bg-brand-yellow hover:text-black disabled:opacity-50">
                    {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Relationship remembered" : "Remember me for next time"}
                  </Button>
                  {saveState === "error" && <p className="mt-2 text-xs text-red-300">The relationship could not be saved right now. You can keep talking.</p>}
                </div>

                {relationship.commercial ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <a href="/assessment" className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-yellow px-3 py-2 text-xs font-extrabold text-black hover:bg-white"><HeartHandshake className="h-4 w-4" />2-Minute Fatherhood Check-In</a>
                    <a href="/booking" className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-extrabold text-white hover:border-brand-yellow hover:text-brand-yellow"><CalendarCheck className="h-4 w-4" />Talk with Brian</a>
                  </div>
                ) : (
                  <a href="/booking" className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand-yellow/45 px-3 py-2 text-xs font-extrabold text-brand-yellow hover:bg-brand-yellow hover:text-black"><CalendarCheck className="h-4 w-4" />Connect with Brian personally</a>
                )}
                <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-white/45"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />This twin reflects Brian's approved values and knowledge. It does not pretend Brian personally read a message he has not seen.</p>
              </div>
            </>
          )}
        </section>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="ml-auto flex min-h-14 items-center gap-3 rounded-full border border-brand-yellow/45 bg-black px-5 py-3 text-left shadow-2xl hover:bg-[#111]">
          <img src="/images/brian-keith-hill.png" alt="" className="h-10 w-10 rounded-full border border-brand-yellow/45 object-cover" />
          <span><span className="block text-sm font-extrabold text-white">Talk with Brian's Twin</span><span className="block text-xs font-semibold text-white/55">I'll meet you where you know Brian</span></span>
          <MessageCircle className="h-4 w-4 text-brand-yellow" />
        </button>
      )}
    </div>
  );
}

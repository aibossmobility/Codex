import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CalendarCheck, HeartHandshake, MessageCircle, Mic, Send, ShieldCheck, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };
type RelationshipKey = "new" | "papa" | "friend" | "family" | "child" | "church" | "professional";
type MouthShape = "rest" | "closed" | "wide" | "round" | "open" | "teeth";

type RelationshipOption = {
  key: RelationshipKey;
  label: string;
  guidance: string;
  commercial: boolean;
};

const RELATIONSHIPS: RelationshipOption[] = [
  { key: "new", label: "I am new to Brian / Papa Life", guidance: "Meet the visitor at their pace. Do not perform a welcome, pitch, explain Papa Life, or move them toward an outcome before they ask. Listen first. If they are rushed, be concise without sounding rushed. If they slow down, stay with them patiently so they feel heard, seen, and understood.", commercial: true },
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
    return "I'm listening. Tell me what happened, and I'll respond to that.";
  }
  return "I'm listening. Tell me what happened, and I'll respond to that.";
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
  const [conversationActive, setConversationActive] = useState(false);
  const [voiceIssue, setVoiceIssue] = useState("");
  const [voiceBridgeReady, setVoiceBridgeReady] = useState(false);
  const [voiceBridgeProvider, setVoiceBridgeProvider] = useState("off");
  const [mouthOpen, setMouthOpen] = useState(0);
  const [mouthShape, setMouthShape] = useState<MouthShape>("rest");
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const mouthAnimationFrameRef = useRef<number | null>(null);
  const mouthSmoothRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const conversationActiveRef = useRef(false);
  const loadingRef = useRef(false);
  const spokenTextRef = useRef("");
  const committedTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const silenceTimerRef = useRef<number | null>(null);
  const recognitionRestartTimerRef = useRef<number | null>(null);
  const recognitionRestartAttemptsRef = useRef(0);
  const recognizedSpeechThisSessionRef = useRef(false);
  const recognitionPausedForPlaybackRef = useRef(false);
  const unlockedAudioRef = useRef<HTMLAudioElement | null>(null);
  const sendTextRef = useRef<(text: string) => void>(() => undefined);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "I'm here. What's on your mind?",
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
    fetch("/api/ai/voice/bridge-status")
      .then((response) => response.json())
      .then((status) => {
        setVoiceBridgeReady(Boolean(status?.enabled && status?.voice_name === "Brian Keith Hill"));
        setVoiceBridgeProvider(String(status?.provider || "off"));
      })
      .catch(() => {
        setVoiceBridgeReady(false);
        setVoiceBridgeProvider("off");
      });
  }, []);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  function normalizeVoiceWords(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 1);
  }

  function soundsLikeBrianPlayback(value: string) {
    if (!spokenTextRef.current) return false;
    const heard = normalizeVoiceWords(value);
    if (heard.length < 2) return false;
    const spoken = new Set(normalizeVoiceWords(spokenTextRef.current));
    const overlap = heard.filter((word) => spoken.has(word)).length / heard.length;
    return overlap >= 0.8;
  }

  function releasePlaybackEchoGuard(text: string) {
    window.setTimeout(() => {
      if (spokenTextRef.current === text) spokenTextRef.current = "";
    }, 1400);
  }

  function isMobileVoiceDevice() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1100);
  }

  function stopMouthAnimation() {
    if (mouthAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(mouthAnimationFrameRef.current);
      mouthAnimationFrameRef.current = null;
    }
    mouthSmoothRef.current = 0;
    setMouthOpen(0);
    setMouthShape("rest");
  }

  function ensureLipSyncAudio(audio: HTMLAudioElement) {
    try {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;
      let context = audioContextRef.current;
      if (!context) {
        context = new AudioContextCtor();
        audioContextRef.current = context;
      }
      if (!analyserSourceRef.current) {
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.7;
        const source = context.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(context.destination);
        analyserSourceRef.current = source;
        analyserRef.current = analyser;
      }
      if (context.state === "suspended") void context.resume();
    } catch {
      // The portrait animation is optional; audio playback must continue even
      // when a browser does not permit Web Audio analysis.
    }
  }

  function mouthShapeForText(text: string, progress: number): MouthShape {
    const spoken = text.toLowerCase().replace(/[^a-z0-9.,!?\s']/g, " ");
    if (!spoken.trim()) return "rest";
    const index = Math.max(0, Math.min(spoken.length - 1, Math.floor(progress * spoken.length)));
    let char = spoken[index] || " ";
    if (/\s/.test(char)) {
      for (let offset = 1; offset < 5; offset += 1) {
        const next = spoken[index + offset];
        const prev = spoken[index - offset];
        if (next && /[a-z]/.test(next)) { char = next; break; }
        if (prev && /[a-z]/.test(prev)) { char = prev; break; }
      }
    }
    if (/[bmp]/.test(char)) return "closed";
    if (/[fv]/.test(char)) return "teeth";
    if (/[ouqw]/.test(char)) return "round";
    if (/[eiy]/.test(char)) return "wide";
    if (/[a]/.test(char)) return "open";
    if (/[.,!?]/.test(char)) return "closed";
    return "open";
  }

  function startMouthAnimation(audio: HTMLAudioElement, text: string) {
    stopMouthAnimation();
    const analyser = analyserRef.current;
    const samples = analyser ? new Uint8Array(analyser.fftSize) : null;
    let frame = 0;
    let analyzerHasSignal = false;
    const estimatedDuration = Math.max(1.6, text.trim().split(/\s+/).length * 0.43);
    const tick = () => {
      if (audio.paused || audio.ended || activeAudioRef.current !== audio) {
        stopMouthAnimation();
        return;
      }

      let rms = 0;
      if (analyser && samples) {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i += 1) {
          const value = (samples[i] - 128) / 128;
          sum += value * value;
        }
        rms = Math.sqrt(sum / samples.length);
        if (rms > 0.018) analyzerHasSignal = true;
      }

      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : estimatedDuration;
      const progress = Math.max(0, Math.min(0.999, audio.currentTime / duration));
      const shape = mouthShapeForText(text, progress);

      const analyzerLevel = Math.max(0, Math.min(1, (rms - 0.012) * 11));
      // Chrome can allow HTMLAudio playback while keeping Web Audio suspended.
      // When that happens, keep the face alive using a restrained cadence tied
      // to playback time and the actual response text instead of freezing.
      const cadence = 0.34 + 0.66 * Math.abs(Math.sin(audio.currentTime * 10.5));
      const audible = analyzerHasSignal ? analyzerLevel : cadence;

      const shapeOpen =
        shape === "closed" ? 0.08 :
        shape === "teeth" ? 0.30 :
        shape === "wide" ? 0.52 :
        shape === "round" ? 0.72 :
        shape === "open" ? 0.90 :
        0;
      const target = audible * shapeOpen;
      mouthSmoothRef.current += (target - mouthSmoothRef.current) * 0.36;
      frame += 1;
      if (frame % 2 === 0) {
        setMouthOpen(mouthSmoothRef.current);
        setMouthShape(shape);
      }
      mouthAnimationFrameRef.current = window.requestAnimationFrame(tick);
    };
    mouthAnimationFrameRef.current = window.requestAnimationFrame(tick);
  }

  function unlockMobileAudio() {
    try {
      let audio = unlockedAudioRef.current;
      if (!audio) {
        audio = new Audio();
        audio.preload = "auto";
        audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
        unlockedAudioRef.current = audio;
      }
      ensureLipSyncAudio(audio);
      audio.volume = 0.01;
      void audio.play().then(() => {
        audio?.pause();
        if (audio) {
          audio.currentTime = 0;
          audio.volume = 1;
        }
      }).catch(() => undefined);
    } catch {
      // Audio unlocking is best-effort; browser voice remains the fallback.
    }
  }

  function pauseRecognitionForPlayback() {
    if (!conversationActiveRef.current) return;
    recognitionPausedForPlaybackRef.current = true;
    clearSilenceTimer();
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    try {
      recognition?.abort();
    } catch {
      // Recognition may already be ending.
    }
    setListening(false);
  }

  function resumeRecognitionAfterPlayback() {
    if (!recognitionPausedForPlaybackRef.current) return;
    recognitionPausedForPlaybackRef.current = false;
    if (!conversationActiveRef.current) return;
    window.setTimeout(() => {
      if (conversationActiveRef.current && !recognitionRef.current && !loadingRef.current && !activeAudioRef.current) {
        startRecognitionSession();
      }
    }, 500);
  }

  function stopSpeaking() {
    recognitionPausedForPlaybackRef.current = false;
    stopMouthAnimation();
    window.speechSynthesis?.cancel();
    const current = activeAudioRef.current;
    if (current) {
      current.pause();
      current.currentTime = 0;
      activeAudioRef.current = null;
    }
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
    const previousSpokenText = spokenTextRef.current;
    if (previousSpokenText) releasePlaybackEchoGuard(previousSpokenText);
    setIsSpeaking(false);
  }

  async function bridgedVoiceUrl(text: string) {
    if (!spokenReplies || !voiceBridgeReady || voiceBridgeProvider === "off") return "";
    try {
      const response = await fetch("/api/ai/voice/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) return "";
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch {
      return "";
    }
  }

  function speak(text: string, voiceUrl?: string) {
    if (!spokenReplies) return;
    stopSpeaking();
    pauseRecognitionForPlayback();
    spokenTextRef.current = text;

    if (!voiceUrl) {
      setVoiceIssue("Brian's cloned voice is not available for this reply yet.");
      resumeRecognitionAfterPlayback();
      return;
    }

    // The voice URL belongs to this reply. Store it only after stopSpeaking()
    // has cleaned up the previous reply, otherwise stopSpeaking() would revoke
    // the brand-new URL before the browser can play it.
    activeObjectUrlRef.current = voiceUrl;

    let audio = unlockedAudioRef.current;
    if (!audio) {
      audio = new Audio();
      audio.preload = "auto";
      unlockedAudioRef.current = audio;
    }
    ensureLipSyncAudio(audio);
    audio.pause();
    audio.src = voiceUrl;
    audio.preload = "auto";
    audio.volume = 0.9;
    audio.playbackRate = 1;
    audio.load();
    activeAudioRef.current = audio;
    setIsSpeaking(true);

    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      if (activeAudioRef.current === audio) activeAudioRef.current = null;
      releasePlaybackEchoGuard(text);
      setIsSpeaking(false);
      resumeRecognitionAfterPlayback();
    };
    const fallback = () => {
      if (completed) return;
      completed = true;
      if (activeAudioRef.current === audio) activeAudioRef.current = null;
      setIsSpeaking(false);
      setVoiceIssue("Brian's voice was generated, but this device blocked playback. Tap the mic once more and try again.");
      releasePlaybackEchoGuard(text);
      resumeRecognitionAfterPlayback();
    };

    audio.onended = finish;
    audio.onerror = fallback;
    void audio.play().then(() => startMouthAnimation(audio, text)).catch(fallback);
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
            content: `${parsed.firstName ? `${parsed.firstName}, ` : ""}I remember the context you chose to share before. What's on your mind today?`,
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

  useEffect(() => {
    if (!open && conversationActiveRef.current) stopConversation();
  }, [open]);

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
          ? `${firstName.trim()}, what's on your mind?`
          : "What's on your mind?",
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
      "Papa Life framework order: Presence → Authority → Purpose → Alignment. Presence leads: listen and show up safely before trying to teach, fix, direct, persuade, sell, or hurry the person.",
      "Pace rule: Never borrow the visitor's hurry. If they are rushed, answer briefly and clearly without sounding rushed. If they slow down, slow down with them. Leave room for silence and questions. The goal is for the person to feel heard, seen, and understood, not moved through a funnel.",
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
      const voiceUrl = json.voice_url || await bridgedVoiceUrl(json.reply);
      if (voiceUrl) speak(json.reply, voiceUrl);
      else {
        stopSpeaking();
        setVoiceIssue("");
      }
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
    unlockMobileAudio();
    await sendText(clean);
  }

  sendTextRef.current = (text: string) => {
    void sendText(text);
  };

  function clearSilenceTimer() {
    if (silenceTimerRef.current !== null) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }

  function finishNaturalTurn() {
    clearSilenceTimer();
    const transcript = `${committedTranscriptRef.current} ${interimTranscriptRef.current}`.replace(/\s+/g, " ").trim();
    if (transcript.length < 2) return;
    if (loadingRef.current) {
      silenceTimerRef.current = window.setTimeout(finishNaturalTurn, 350);
      return;
    }
    committedTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    setMessage("");
    sendTextRef.current(transcript);
  }

  function scheduleNaturalTurn(isFinal: boolean) {
    clearSilenceTimer();
    silenceTimerRef.current = window.setTimeout(finishNaturalTurn, isFinal ? 700 : 1050);
  }

  function startRecognitionSession() {
    if (!conversationActiveRef.current) return;
    const browser = window as any;
    const Recognition = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Recognition || recognitionRef.current) return;

    const recognition = new Recognition();
    recognition.lang = "en-US";
    const mobilePushToTalk = isMobileVoiceDevice();
    recognition.continuous = !mobilePushToTalk;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    recognizedSpeechThisSessionRef.current = false;

    recognition.onstart = () => {
      setListening(true);
      setVoiceIssue("");
    };
    recognition.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = String(result?.[0]?.transcript || "").trim();
        if (!transcript) continue;
        if (result.isFinal) finalChunk += ` ${transcript}`;
        else interimChunk += ` ${transcript}`;
      }

      const heard = `${finalChunk} ${interimChunk}`.replace(/\s+/g, " ").trim();
      if (!heard || soundsLikeBrianPlayback(heard)) return;
      recognizedSpeechThisSessionRef.current = true;
      recognitionRestartAttemptsRef.current = 0;

      if (activeAudioRef.current) stopSpeaking();

      if (finalChunk.trim()) {
        committedTranscriptRef.current = isMobileVoiceDevice()
          ? finalChunk.trim()
          : `${committedTranscriptRef.current} ${finalChunk}`.replace(/\s+/g, " ").trim();
        interimTranscriptRef.current = "";
      } else {
        interimTranscriptRef.current = interimChunk.trim();
      }

      const liveTranscript = `${committedTranscriptRef.current} ${interimTranscriptRef.current}`.replace(/\s+/g, " ").trim();
      if (liveTranscript) setMessage(liveTranscript);
      scheduleNaturalTurn(Boolean(finalChunk.trim()));
    };

    recognition.onerror = (event: any) => {
      const error = String(event?.error || "");
      if (error === "not-allowed" || error === "service-not-allowed" || error === "audio-capture") {
        conversationActiveRef.current = false;
        setConversationActive(false);
        setVoiceIssue(
          error === "audio-capture"
            ? "The microphone is busy. Pause Voice Access or other voice typing, then tap the Papa Life mic once to resume."
            : "Chrome does not currently have microphone access for this page. Allow the microphone, then tap the Papa Life mic once."
        );
      }
      setListening(false);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      if (recognitionPausedForPlaybackRef.current) return;

      if (isMobileVoiceDevice()) {
        conversationActiveRef.current = false;
        setConversationActive(false);
        return;
      }

      if (!conversationActiveRef.current) return;

      if (recognizedSpeechThisSessionRef.current) {
        recognitionRestartAttemptsRef.current = 0;
      } else {
        recognitionRestartAttemptsRef.current += 1;
      }

      if (recognitionRestartAttemptsRef.current >= 3) {
        conversationActiveRef.current = false;
        setConversationActive(false);
        setVoiceIssue("Voice paused because the microphone kept disconnecting. Pause Voice Access or other voice typing, then tap the Papa Life mic once to resume.");
        return;
      }

      const restartWhenReady = () => {
        recognitionRestartTimerRef.current = null;
        if (!conversationActiveRef.current) return;
        if (document.hidden || loadingRef.current || activeAudioRef.current) {
          recognitionRestartTimerRef.current = window.setTimeout(restartWhenReady, 500);
          return;
        }
        startRecognitionSession();
      };

      recognitionRestartTimerRef.current = window.setTimeout(restartWhenReady, 900);
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
    }
  }

  function stopConversation() {
    conversationActiveRef.current = false;
    setConversationActive(false);
    clearSilenceTimer();
    if (recognitionRestartTimerRef.current !== null) {
      window.clearTimeout(recognitionRestartTimerRef.current);
      recognitionRestartTimerRef.current = null;
    }
    recognitionRestartAttemptsRef.current = 0;
    recognizedSpeechThisSessionRef.current = false;
    recognitionPausedForPlaybackRef.current = false;
    committedTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    try {
      recognition?.abort();
    } catch {
      // Browser speech recognition may already be ending.
    }
    setListening(false);
  }

  function startListening() {
    if (!identified) return;
    if (isSpeaking || activeAudioRef.current || window.speechSynthesis?.speaking) {
      stopSpeaking();
    }
    if (conversationActiveRef.current) {
      stopConversation();
      return;
    }
    unlockMobileAudio();
    conversationActiveRef.current = true;
    setConversationActive(true);
    setVoiceIssue("");
    recognitionRestartAttemptsRef.current = 0;
    startRecognitionSession();
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
    <div className={cn("fixed bottom-4 right-4 z-[75] w-[calc(100vw-2rem)] max-w-[460px] md:max-w-[360px] xl:max-w-[460px]", className)}>
      {open ? (
        <section className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-brand-yellow/40 bg-black shadow-[0_18px_80px_rgba(0,0,0,0.58)]" aria-label="Brian Keith Hill digital twin">
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
                No rush. If you'd like, share your first name and how you know Brian. It just helps me respond with care.
              </div>
              <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Your first name (optional)" aria-label="Your first name" className="border-white/15 bg-white/[0.04]" />
              <label className="block text-xs font-bold uppercase tracking-[0.12em] text-brand-yellow" htmlFor="brian-relationship">How do you know Brian?</label>
              <select id="brian-relationship" value={relationshipKey} onChange={(event) => setRelationshipKey(event.target.value as RelationshipKey)} className="min-h-11 w-full rounded-md border border-white/15 bg-[#111] px-3 text-sm text-white">
                {RELATIONSHIPS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
              <Button type="button" onClick={beginRelationship} className="w-full bg-brand-yellow font-extrabold text-black hover:bg-white">Continue when you're ready</Button>
              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/45"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />The twin never guesses a family or personal relationship and never treats family/church relationships as marketing inventory.</p>
            </div>
          ) : (
            <>
              <div className="border-b border-white/10 px-4 py-2 text-xs text-white/55">
                <span className="font-bold text-brand-yellow">Relationship:</span> {relationship.label}
                <button type="button" className="ml-2 underline hover:text-white" onClick={() => setIdentified(false)}>change</button>
              </div>
              <div className="max-h-[300px] space-y-3 overflow-y-auto p-4">
                {voiceBridgeReady && spokenReplies ? (
                  <div className="rounded-2xl border border-brand-yellow/25 bg-brand-yellow/[0.06] px-5 py-5 text-center">
                    <div className="relative mx-auto mb-3 h-28 w-28 overflow-hidden rounded-full border-2 border-brand-yellow/55 bg-black shadow-[0_0_24px_rgba(250,204,21,0.16)]">
                      <img src="/images/brian-keith-hill.png" alt="Brian Keith Hill" className="absolute inset-0 h-full w-full object-cover" />

                    </div>
                    <p className="font-extrabold text-white">
                      {isSpeaking ? "Brian is speaking" : loading ? "Brian is thinking" : listening ? "Brian is listening" : "Voice conversation ready"}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-white/55">
                      {isSpeaking
                        ? "Brian is answering in his voice. Tap the microphone whenever you want to interrupt and speak."
                        : isMobileVoiceDevice()
                          ? "Tap the microphone, speak naturally, then wait for Brian to answer."
                          : "Speak naturally. Brian will answer in his voice."}
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((item, index) => (
                      <div key={`${item.role}-${index}`} className={cn("rounded-xl px-4 py-3 text-sm leading-relaxed", item.role === "assistant" ? "border border-white/10 bg-white/[0.06] text-white/82" : "ml-auto max-w-[86%] bg-primary text-black")}>{item.content}</div>
                    ))}
                    {loading && <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/65"><Sparkles className="h-4 w-4 text-brand-yellow" />Listening with Brian's relationship context...</div>}
                  </>
                )}
              </div>

              <div className="border-t border-white/10 p-4">
                <div className="mb-3 flex items-end gap-2">
                  <Textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="What's on your heart?" aria-label="Message Brian's digital twin" className="max-h-28 min-h-12 resize-none border-white/15 bg-white/[0.04]" />
                  {voiceSupported && (
                    <Button type="button" onClick={startListening} variant="outline" className={cn("h-12 w-12 shrink-0 rounded-full border-brand-yellow/55 p-0 text-brand-yellow hover:bg-brand-yellow hover:text-black", conversationActive ? "bg-brand-yellow/15" : "bg-transparent")} aria-label={isMobileVoiceDevice() ? (conversationActive ? "Stop listening" : "Tap to speak") : (conversationActive ? "Turn off hands-free conversation" : "Start hands-free conversation")}>
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}
                  <Button type="button" onClick={() => void send()} disabled={!canSend} className="h-12 w-12 shrink-0 rounded-full bg-brand-yellow p-0 text-black hover:bg-white" aria-label="Send message"><Send className="h-5 w-5" /></Button>
                </div>
                <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/55">
                  <span>{!voiceBridgeReady
                    ? "Mic input is ready. Brian's cloned speaking voice is not connected yet, so replies will appear in writing."
                    : voiceIssue || (isMobileVoiceDevice()
                      ? (isSpeaking ? "Brian is speaking." : listening ? "Listening — speak your turn, then wait for Brian's reply." : "On phones and tablets, tap the mic for each turn.")
                      : (conversationActive ? (isSpeaking ? "Brian is speaking — just start talking to interrupt naturally." : listening ? "Listening — speak naturally; a short pause completes your turn." : "Conversation is on.") : voiceSupported ? "Tap the mic once for hands-free conversation. Brian will yield when you speak." : "Text conversation is ready on this browser."))}</span>
                  <div className="flex items-center gap-3">
                    {voiceBridgeReady ? (
                      <button type="button" onClick={() => { setSpokenReplies((value) => !value); stopSpeaking(); }} className="inline-flex items-center gap-1 font-bold text-brand-yellow hover:text-white">
                        {spokenReplies ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                        {spokenReplies ? "Brian voice on" : "Brian voice off"}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                        <VolumeX className="h-3.5 w-3.5" />
                        Brian voice not connected
                      </span>
                    )}
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
          <span><span className="block text-sm font-extrabold text-white">Talk with Brian's Twin</span><span className="block text-xs font-semibold text-white/55">No rush. Speak when you're ready.</span></span>
          <MessageCircle className="h-4 w-4 text-brand-yellow" />
        </button>
      )}
    </div>
  );
}

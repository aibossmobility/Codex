import {
  AgentEventsEnum,
  ElevenLabsAgentSession,
  SessionEvent,
  SessionState,
} from "@heygen/liveavatar-web-sdk";
import { Mic, Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";


type LiveState = "idle" | "connecting" | "live" | "ended" | "error";

type BrianLiveAvatarProps = {
  posterSrc?: string;
  posterAlt?: string;
  fallbackVideoSrc?: string;
};

export function BrianLiveAvatar({
  posterSrc = "/images/brian-green-sweater-live.jpg",
  posterAlt = "Brian Keith Hill",
  fallbackVideoSrc = "/media/brian-green-sweater-web.m4v",
}: BrianLiveAvatarProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<ElevenLabsAgentSession | null>(null);
  const [state, setState] = useState<LiveState>("idle");
  const [statusText, setStatusText] = useState("Ready for a live conversation");
  const [error, setError] = useState("");
  const [userText, setUserText] = useState("");
  const [brianText, setBrianText] = useState("");
  const [typedMessage, setTypedMessage] = useState("");
  const [sandbox, setSandbox] = useState(false);

  useEffect(() => {
    return () => {
      void sessionRef.current?.stop().catch(() => undefined);
      sessionRef.current = null;
    };
  }, []);

  async function startConversation() {
    if (state === "connecting" || state === "live") return;
    setState("connecting");
    setStatusText("Connecting Brian's live video…");
    setError("");
    setUserText("");
    setBrianText("");

    try {
      const response = await fetch("/api/liveavatar/session-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok || !data?.session_token) {
        throw new Error(data?.error || "Could not start the live video session.");
      }

      setSandbox(Boolean(data.sandbox));
      const session = new ElevenLabsAgentSession(data.session_token, {
        autoKeepAlive: true,
        voiceChat: { defaultMuted: false },
      });
      sessionRef.current = session;

      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        if (videoRef.current) session.attach(videoRef.current);
        setState("live");
        setStatusText("Live — speak naturally with Brian");
      });

      session.on(SessionEvent.SESSION_STATE_CHANGED, (next) => {
        if (next === SessionState.CONNECTED) {
          setStatusText("Connected — preparing live video…");
        }
      });

      session.on(AgentEventsEnum.USER_TRANSCRIPTION, (event) => {
        setUserText(event.text || "");
      });
      session.on(AgentEventsEnum.AVATAR_TRANSCRIPTION, (event) => {
        setBrianText(event.text || "");
      });
      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        setStatusText("Brian is speaking");
      });
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        setStatusText("Live — speak naturally with Brian");
      });
      session.on(SessionEvent.SESSION_DISCONNECTED, () => {
        sessionRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setState("ended");
        setStatusText("Conversation ended");
      });

      await session.start();
    } catch (err) {
      sessionRef.current = null;
      setState("error");
      setStatusText("Live video is not connected yet");
      setError(err instanceof Error ? err.message : "Could not start Brian's live video.");
    }
  }

  async function stopConversation() {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) {
      try {
        await session.stop();
      } catch {
      }
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setState("ended");
    setStatusText("Conversation ended");
  }

  function sendTypedMessage() {
    const text = typedMessage.trim();
    const session = sessionRef.current;
    if (!text || !session || state !== "live") return;
    session.sendUserMessage(text);
    setUserText(text);
    setTypedMessage("");
  }

  const isLive = state === "live";
  const isBusy = state === "connecting";

  return (
    <div className="overflow-hidden rounded-3xl border border-[#f2c230]/35 bg-black shadow-2xl">
      <div className="relative aspect-video overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 h-full w-full bg-black object-cover transition-opacity duration-300 ${isLive && !sandbox ? "opacity-100" : "opacity-0"}`}
          aria-label="Live video of Brian Keith Hill's Papa Life Digital Twin"
        />

        {(!isLive || sandbox) && (
          <div className="absolute inset-0">
            <video
              src={fallbackVideoSrc}
              poster={posterSrc}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={posterAlt}
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-5 pb-6 text-center">
              <div>
                <p className="font-extrabold text-white">
                  {isLive ? "Talk with Brian’s Digital Twin" : "Brian Keith Hill — Papa Life"}
                </p>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-white/75">
                  {isLive
                    ? "Live voice conversation is connected. Speak naturally with Brian’s Papa Life Digital Twin."
                    : "Start a private voice conversation with Brian’s Papa Life Digital Twin."}
                </p>
              </div>
              {!isLive && (
                <button
                  type="button"
                  onClick={() => void startConversation()}
                  disabled={isBusy}
                  className="inline-flex min-h-12 items-center rounded-full bg-[#f2c230] px-6 font-extrabold text-black hover:bg-white disabled:opacity-60"
                >
                  <Mic className="mr-2 h-5 w-5" />
                  {isBusy ? "Connecting…" : state === "ended" ? "Talk Again" : "Talk with Brian"}
                </button>
              )}
            </div>
          </div>
        )}

        {isLive && (
          <button
            type="button"
            onClick={() => void stopConversation()}
            className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-2 rounded-full border border-[#f2c230]/60 bg-black/75 px-3 py-2 text-xs font-extrabold text-[#f2c230] backdrop-blur hover:bg-[#f2c230] hover:text-black"
          >
            <Square className="h-3.5 w-3.5" />
            End
          </button>
        )}
      </div>

      <div className="border-t border-white/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-extrabold">Brian Keith Hill — Papa Life Digital Twin</p>
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/65">
            {statusText}
          </span>
        </div>

        {sandbox && isLive && (
          <p className="mt-2 text-xs text-white/50">
            Live voice is active. Brian’s custom live-motion video is being finalized.
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-xl border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        )}

        {(userText || brianText) && (
          <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm">
            {userText && <p><span className="font-bold text-white/55">You:</span> {userText}</p>}
            {brianText && <p><span className="font-bold text-[#f2c230]">Brian:</span> {brianText}</p>}
          </div>
        )}

        {isLive && (
          <div className="mt-4 flex gap-2">
            <input
              value={typedMessage}
              onChange={(event) => setTypedMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendTypedMessage();
              }}
              placeholder="Or type a message to Brian"
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#f2c230]"
            />
            <button
              type="button"
              onClick={sendTypedMessage}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2c230] text-black hover:bg-white"
              aria-label="Send typed message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

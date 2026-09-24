import {
  AgentEventsEnum,
  ElevenLabsAgentSession,
  SessionEvent,
  SessionState,
} from "@heygen/liveavatar-web-sdk";
import { Mic, Send, Square, Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";


type LiveState = "idle" | "connecting" | "live" | "ended" | "error";

export function BrianLiveAvatar() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<ElevenLabsAgentSession | null>(null);
  const [state, setState] = useState<LiveState>("idle");
  const [statusText, setStatusText] = useState("Ready for a live conversation");
  const [error, setError] = useState("");
  const [userText, setUserText] = useState("");
  const [brianText, setBrianText] = useState("");
  const [typedMessage, setTypedMessage] = useState("");
  const [sandbox, setSandbox] = useState(false);
  const [avatarReady, setAvatarReady] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [renderReady, setRenderReady] = useState(false);
  const [renderState, setRenderState] = useState<"idle" | "submitting" | "rendering" | "ready" | "error">("idle");
  const [renderedVideoUrl, setRenderedVideoUrl] = useState("");
  const [renderedReply, setRenderedReply] = useState("");
  const [renderError, setRenderError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/papa-twin/render-status")
      .then(async (response) => {
        const data = await response.json();
        if (!cancelled) setRenderReady(Boolean(response.ok && data?.enabled && data?.heygen_configured));
      })
      .catch(() => {
        if (!cancelled) setRenderReady(false);
      });

    void fetch("/api/liveavatar/status")
      .then(async (response) => {
        const data = await response.json();
        if (cancelled) return;
        const isSandbox = Boolean(data?.sandbox);
        setSandbox(isSandbox);
        setAvatarReady(Boolean(response.ok && data?.configured && !isSandbox));
        setAvailabilityChecked(true);
        if (isSandbox) {
          setStatusText("Brian's custom green-sweater live video is being activated");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvatarReady(false);
          setAvailabilityChecked(true);
          setStatusText("Brian's custom live video is not available yet");
        }
      });
    return () => {
      cancelled = true;
      void sessionRef.current?.stop().catch(() => undefined);
      sessionRef.current = null;
    };
  }, []);

  async function startConversation() {
    if (!avatarReady || sandbox || state === "connecting" || state === "live") return;
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


  async function renderBrianTurn() {
    const message = typedMessage.trim();
    if (!message || !renderReady || renderState === "submitting" || renderState === "rendering") return;
    setRenderState("submitting");
    setRenderError("");
    setRenderedVideoUrl("");
    setRenderedReply("");
    setUserText(message);
    setTypedMessage("");

    try {
      const response = await fetch("/api/papa-twin/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      if (!response.ok || !data?.video_id) {
        throw new Error(data?.error || "Brian's video response could not start.");
      }

      setRenderedReply(String(data.reply || ""));
      setBrianText(String(data.reply || ""));
      setRenderState("rendering");
      setStatusText("Brian is preparing a lip-synced response…");

      const started = Date.now();
      while (Date.now() - started < 150_000) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const statusResponse = await fetch("/api/papa-twin/render/" + encodeURIComponent(String(data.video_id)));
        const status = await statusResponse.json();
        if (!statusResponse.ok) {
          throw new Error(status?.error || "Could not check Brian's video response.");
        }
        if (status.status === "completed" && status.video_url) {
          setRenderedVideoUrl(String(status.video_url));
          setRenderState("ready");
          setStatusText("Brian's video response is ready");
          return;
        }
        if (status.status === "failed" || status.status === "error") {
          throw new Error(status?.error || "Brian's video response failed to render.");
        }
      }
      throw new Error("Brian's video response is taking longer than expected. Please try again.");
    } catch (err) {
      setRenderState("error");
      const messageText = err instanceof Error ? err.message : "Brian's video response could not be created.";
      setRenderError(messageText);
      setStatusText("Brian's rendered response is unavailable");
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
      <div className="relative aspect-video bg-black">
        {renderedVideoUrl && !isLive ? (
          <video
            src={renderedVideoUrl}
            autoPlay
            playsInline
            controls
            className="h-full w-full bg-black object-cover"
            aria-label="Rendered video response from Brian Keith Hill's Papa Life Digital Twin"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="h-full w-full bg-black object-cover"
            aria-label="Live video of Brian Keith Hill's Papa Life Digital Twin"
          />
        )}
        {!isLive && !renderedVideoUrl && (
          <div className="absolute inset-0 bg-[#07100b]">
            <img
              data-nonlive-poster="brian-green-sweater"
              src="/images/brian-digital-twin-real.png"
              alt="Brian Keith Hill wearing his green Papa Life sweater"
              className="h-full w-full object-cover object-top opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 px-6 pb-6 text-center">
              <div>
              <p className="font-extrabold text-white">
                {avatarReady ? "Brian appears here as live video" : "Brian's green-sweater live twin"}
              </p>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-white/60">
                {!availabilityChecked
                  ? "Checking the live Brian avatar…"
                  : avatarReady
                    ? "Start the conversation to connect Brian's real-time avatar, microphone, and Brian Keith Hill voice."
                    : renderReady
                      ? "Ask Brian a question below. His Papa Life answer will be rendered with the Brian Keith Hill voice and green-sweater Digital Twin."
                      : "The stock test avatar is disabled. Brian's correct visual remains here while the video-response renderer is being activated."}
              </p>
              </div>
            {avatarReady && (
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
            className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full border border-[#f2c230]/60 bg-black/75 px-3 py-2 text-xs font-extrabold text-[#f2c230] backdrop-blur hover:bg-[#f2c230] hover:text-black"
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

        {sandbox && (
          <p className="mt-2 text-xs text-[#f2c230]/85">
            The stock LiveAvatar test character is disabled. Only Brian's custom green-sweater live twin will be shown publicly.
          </p>
        )}

        {(error || renderError) && (
          <p className="mt-3 rounded-xl border border-red-400/30 bg-red-950/30 px-3 py-2 text-sm text-red-100">
            {error || renderError}
          </p>
        )}

        {(userText || brianText) && (
          <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm">
            {userText && <p><span className="font-bold text-white/55">You:</span> {userText}</p>}
            {brianText && <p><span className="font-bold text-[#f2c230]">Brian:</span> {brianText}</p>}
          </div>
        )}

        {(isLive || renderReady) && (
          <div className="mt-4 flex gap-2">
            <input
              value={typedMessage}
              onChange={(event) => setTypedMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  if (isLive) sendTypedMessage();
                  else void renderBrianTurn();
                }
              }}
              placeholder={isLive ? "Or type a message to Brian" : "Ask Brian a question"}
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#f2c230]"
            />
            <button
              type="button"
              onClick={() => {
                if (isLive) sendTypedMessage();
                else void renderBrianTurn();
              }}
              disabled={!isLive && (renderState === "submitting" || renderState === "rendering")}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2c230] text-black hover:bg-white disabled:opacity-50"
              aria-label={isLive ? "Send typed message" : "Ask Brian for a video response"}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

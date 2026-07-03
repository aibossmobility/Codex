import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SiteMedia = {
  media_url: string;
  media_type: string;
  poster_url: string | null;
  alt_text: string | null;
  title: string | null;
};

function inferVideoPoster(videoUrl: string): string | null {
  const u = videoUrl.trim();
  if (!u) return null;
  if (u.startsWith("/media/") && /\.mp4$/i.test(u)) {
    return u.replace(/\.mp4$/i, "-poster.jpg");
  }
  if (/^https?:\/\//i.test(u) && /\.mp4(\?|$)/i.test(u)) {
    try {
      const path = new URL(u).pathname;
      if (path.startsWith("/media/") && /\.mp4$/i.test(path)) {
        return path.replace(/\.mp4$/i, "-poster.jpg");
      }
    } catch {
      return null;
    }
  }
  return null;
}

function isIframeEmbedUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com|heygen\.com/i.test(url);
}

function toEmbedSrc(url: string): string {
  const u = url.trim();
  const ytMatch = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/i);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`;
  }
  if (/heygen\.com/i.test(u) && !/\/embed/i.test(u)) {
    return u.replace(/\/share\//i, "/embed/");
  }
  return u;
}

type SiteMediaVideoProps = {
  placement: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  /** Keep a 16:9 frame visible before MCP sets media_url (Papa Journey slots). */
  reserveSpace?: boolean;
};

/**
 * Inline embed for MCP-managed site media (GET /api/site-media?placement=KEY).
 * Supports direct mp4/webm and iframe embeds (YouTube, Vimeo, HeyGen share URLs).
 * Renders nothing until media_url is set for the placement.
 */
const PAPA_JOURNEY_SLOTS: Record<string, string> = {
  papa_journey_video_top: "Top welcome video",
  papa_journey_video_assessment: "Assessment section video",
  papa_journey_video_membership: "Membership CTA video",
};

export function SiteMediaVideo({
  placement,
  className = "",
  autoPlay = true,
  muted = true,
  controls = true,
  reserveSpace = false,
}: SiteMediaVideoProps) {
  const [media, setMedia] = useState<SiteMedia | null>(null);
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoMuted, setVideoMuted] = useState(muted);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/site-media?placement=${encodeURIComponent(placement)}`)
      .then((r) => (r.ok ? r.json() : { media: null }))
      .then((data) => {
        if (!cancelled) {
          setMedia(data.media ?? null);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMedia(null);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [placement]);

  useEffect(() => {
    setVideoMuted(muted);
  }, [muted, media?.media_url]);

  const slotLabel = PAPA_JOURNEY_SLOTS[placement];

  if (!loaded) {
    if (!reserveSpace) return null;
    return (
      <div
        className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-[#111] shadow-2xl ${className}`}
        data-site-media-placement={placement}
        data-site-media-empty="true"
      >
        <div className="aspect-video w-full animate-pulse bg-gradient-to-br from-[#1a1817] to-black" />
      </div>
    );
  }

  const url = media?.media_url?.trim();
  if (!url) {
    if (!reserveSpace) return null;
    return (
      <EmptyMediaSlot className={className} placement={placement} label={slotLabel} />
    );
  }

  const poster = media?.poster_url?.trim() || inferVideoPoster(url) || undefined;
  const label = media?.alt_text?.trim() || media?.title?.trim() || "Video";
  const useIframe = media?.media_type === "embed" || isIframeEmbedUrl(url);

  if (useIframe) {
    return (
      <div
        className={"w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl " + className}
        data-site-media-placement={placement}
      >
        <div className="aspect-video w-full relative">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#141210] to-black px-6 text-center transition-colors hover:from-[#1a1817] hover:to-[#050505]"
            aria-label={label}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-6 w-6" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="text-base font-semibold text-white">{label}</span>
            <span className="text-sm text-white/55">Open video</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl ${className}`}
      data-site-media-placement={placement}
    >
      <div className="aspect-video w-full relative">
        <>
            <video
              ref={videoRef}
              key={url}
              className="absolute inset-0 h-full w-full object-cover"
              poster={poster}
              controls={controls}
              autoPlay={autoPlay}
              muted={videoMuted}
              playsInline
              preload="auto"
              onVolumeChange={(e) => setVideoMuted(e.currentTarget.muted)}
              aria-label={label}
            >
              <source
                src={url}
                type={media?.media_type === "video" || !media?.media_type ? "video/mp4" : undefined}
              />
            </video>
            {autoPlay && controls ? (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute top-4 right-4 z-10 h-11 w-11 rounded-full border border-white/25 bg-black/70 text-white shadow-lg backdrop-blur-sm hover:bg-black/85"
                onClick={() => {
                  const el = videoRef.current;
                  if (!el) return;
                  const next = !el.muted;
                  el.muted = next;
                  if (!next && el.volume === 0) el.volume = 1;
                  setVideoMuted(next);
                }}
                aria-pressed={videoMuted}
                aria-label={videoMuted ? "Unmute video" : "Mute video"}
              >
                {videoMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            ) : null}
          </>
      </div>
    </div>
  );
}

function EmptyMediaSlot({
  className = "",
  placement,
  label,
}: {
  className?: string;
  placement: string;
  label?: string;
}) {
  return (
    <div
      className={`w-full overflow-hidden rounded-2xl border border-dashed border-white/15 bg-[#0d0d0d] shadow-2xl ${className}`}
      data-site-media-placement={placement}
      data-site-media-empty="true"
    >
      <div className="aspect-video w-full flex flex-col items-center justify-center gap-2 px-6 text-center bg-gradient-to-br from-[#141210] to-black">
        <div className="h-12 w-12 rounded-full border border-white/10 flex items-center justify-center text-white/30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 ml-0.5" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        {label ? <p className="text-sm font-medium text-white/50">{label}</p> : null}
        <p className="text-[11px] text-white/25 font-mono tracking-wide">{placement}</p>
      </div>
    </div>
  );
}

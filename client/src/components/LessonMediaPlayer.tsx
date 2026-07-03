function getYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.replace(/^\//, "").split("/")[0] || null;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const embedMatch = u.pathname.match(/\/embed\/([^\/?&]+)/);
      if (embedMatch) return embedMatch[1];
    }
  } catch {
    return null;
  }
  return null;
}

function getDriveFileId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("drive.google.com")) return null;
    const fileMatch = u.pathname.match(/\/file\/d\/([^\/?#]+)/);
    if (fileMatch) return fileMatch[1];
    const idParam = u.searchParams.get("id");
    if (idParam) return idParam;
    return null;
  } catch {
    return null;
  }
}

function inferDirectPlayer(
  url: string,
  contentType: string,
): "video" | "audio" | null {
  const pathOnly = url.split("?")[0].toLowerCase();
  if (/\.(mp3|wav|m4a|aac|ogg|flac)$/.test(pathOnly)) return "audio";
  if (/\.(mp4|webm|mov|ogv)$/.test(pathOnly)) return "video";
  if (contentType === "video" && (url.startsWith("/media/") || url.includes("/media/"))) return "video";
  if (contentType === "audio" && (url.startsWith("/media/") || url.includes("/media/"))) return "audio";
  return null;
}

type Props = {
  url: string;
  contentType: string;
};

function ExternalMediaCard({
  url,
  label,
  kind = "video",
}: {
  url: string;
  label: string;
  kind?: "video" | "audio" | "media";
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex aspect-video w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-gradient-to-br from-[#141210] to-black px-6 text-center shadow-lg transition-colors hover:from-[#1a1817] hover:to-[#050505]"
      aria-label={label}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-6 w-6" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
      </span>
      <span className="text-base font-semibold text-white">{label}</span>
      <span className="text-sm text-white/55">Open {kind}</span>
    </a>
  );
}

export function LessonMediaPlayer({ url, contentType }: Props) {
  if (url.includes("heygen.com/embeds")) {
    return <ExternalMediaCard url={url} label="Lesson video" />;
  }

  const yt = getYoutubeId(url);
  if (yt) {
    return <ExternalMediaCard url={url} label="Lesson video" />;
  }

  const driveId = getDriveFileId(url);
  if (driveId) {
    const isAudio = contentType === "audio";
    return <ExternalMediaCard url={url} label={isAudio ? "Lesson audio" : "Lesson media"} kind={isAudio ? "audio" : "media"} />;
  }

  const direct = inferDirectPlayer(url, contentType);
  if (direct === "video") {
    return (
      <video
        controls
        playsInline
        className="w-full max-w-3xl rounded-xl border border-white/10 bg-black"
        src={url}
      />
    );
  }
  if (direct === "audio") {
    return <audio controls className="w-full max-w-3xl" src={url} />;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-brand-yellow/20 bg-brand-yellow/10 px-3 py-2 text-sm font-medium text-brand-yellow hover:text-brand-yellow/80"
    >
      Open media
    </a>
  );
}

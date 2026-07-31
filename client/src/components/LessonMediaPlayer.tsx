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

function inferDirectPlayer(url: string, contentType: string): "video" | "audio" | null {
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

function EmbeddedMedia({ src, title, originalUrl }: { src: string; title: string; originalUrl: string }) {
  return (
    <div className="w-full max-w-3xl space-y-3">
      <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
        <iframe
          src={src}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <a
        href={originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex text-sm font-medium text-brand-yellow hover:text-brand-yellow/80"
      >
        Open media in a new tab if the player does not load
      </a>
    </div>
  );
}

export function LessonMediaPlayer({ url, contentType }: Props) {
  if (url.includes("heygen.com/embeds")) {
    return <EmbeddedMedia src={url} originalUrl={url} title="Papa Life lesson video" />;
  }

  const yt = getYoutubeId(url);
  if (yt) {
    return (
      <EmbeddedMedia
        src={`https://www.youtube-nocookie.com/embed/${yt}`}
        originalUrl={url}
        title="Papa Life lesson video"
      />
    );
  }

  const driveId = getDriveFileId(url);
  if (driveId) {
    return (
      <EmbeddedMedia
        src={`https://drive.google.com/file/d/${driveId}/preview`}
        originalUrl={url}
        title={contentType === "audio" ? "Papa Life lesson audio" : "Papa Life lesson media"}
      />
    );
  }

  const direct = inferDirectPlayer(url, contentType);
  if (direct === "video") {
    return (
      <video controls playsInline preload="metadata" className="w-full max-w-3xl rounded-xl border border-white/10 bg-black">
        <source src={url} />
        Your browser does not support this video. Open the media link in a new tab.
      </video>
    );
  }
  if (direct === "audio") {
    return (
      <audio controls preload="metadata" className="w-full max-w-3xl">
        <source src={url} />
        Your browser does not support this audio file.
      </audio>
    );
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

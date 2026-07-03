export type NormalizedContent = {
  content_url: string;
  content_type: "video" | "audio" | "pdf" | "document";
  kind:
    | "youtube"
    | "heygen"
    | "drive"
    | "direct_video"
    | "direct_audio"
    | "direct_pdf"
    | "media_upload"
    | "passthrough";
  changed: boolean;
};

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return u.pathname.replace(/^\//, "").split("/")[0] || null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const embedMatch = u.pathname.match(/\/embed\/([^\/?&]+)/);
      if (embedMatch) return embedMatch[1];
      const shortsMatch = u.pathname.match(/\/shorts\/([^\/?&]+)/);
      if (shortsMatch) return shortsMatch[1];
    }
    return null;
  } catch {
    return null;
  }
}

function extractDriveFileId(url: string): string | null {
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

function coerceContentType(
  hint: string | null | undefined,
  fallback: "video" | "audio" | "pdf" | "document",
): "video" | "audio" | "pdf" | "document" {
  const h = (hint || "").trim().toLowerCase();
  if (h === "audio" || h === "video" || h === "pdf" || h === "document") {
    return h as "video" | "audio" | "pdf" | "document";
  }
  return fallback;
}

/**
 * Turn any lesson URL into the canonical form LessonMediaPlayer.tsx expects.
 *
 * Rules:
 *   - YouTube (any watch/short/embed/youtu.be form) → https://www.youtube.com/embed/{id}, type video
 *   - HeyGen embed (app.heygen.com/embeds/...) → pass through, type video
 *   - Google Drive (any share/view/uc form) → https://drive.google.com/file/d/{id}/preview, type = hint or video
 *   - Direct file (.mp4/.mp3/.pdf/etc) → pass through, type inferred from extension
 *   - /media/ uploads → pass through, type = hint or video
 *   - Anything else → pass through, type = hint or video
 */
export function normalizeLessonContent(
  rawUrl: string,
  previousContentUrl: string | null | undefined,
  contentTypeHint: string | null | undefined,
): NormalizedContent {
  const url = (rawUrl || "").trim();
  if (!url) throw new Error("url is required");

  const ytId = extractYoutubeId(url);
  if (ytId) {
    const content_url = `https://www.youtube.com/embed/${ytId}`;
    return {
      content_url,
      content_type: "video",
      kind: "youtube",
      changed: content_url !== previousContentUrl,
    };
  }

  if (url.toLowerCase().includes("heygen.com/embeds")) {
    return {
      content_url: url,
      content_type: "video",
      kind: "heygen",
      changed: url !== previousContentUrl,
    };
  }

  const driveId = extractDriveFileId(url);
  if (driveId) {
    const content_url = `https://drive.google.com/file/d/${driveId}/preview`;
    const content_type = coerceContentType(contentTypeHint, "video");
    return {
      content_url,
      content_type,
      kind: "drive",
      changed: content_url !== previousContentUrl,
    };
  }

  const pathOnly = url.split("?")[0].toLowerCase();
  if (/\.(mp3|wav|m4a|aac|ogg|flac)$/.test(pathOnly)) {
    return {
      content_url: url,
      content_type: "audio",
      kind: "direct_audio",
      changed: url !== previousContentUrl,
    };
  }
  if (/\.(mp4|webm|mov|ogv)$/.test(pathOnly)) {
    return {
      content_url: url,
      content_type: "video",
      kind: "direct_video",
      changed: url !== previousContentUrl,
    };
  }
  if (/\.pdf$/.test(pathOnly)) {
    return {
      content_url: url,
      content_type: "pdf",
      kind: "direct_pdf",
      changed: url !== previousContentUrl,
    };
  }

  if (url.includes("/media/")) {
    return {
      content_url: url,
      content_type: coerceContentType(contentTypeHint, "video"),
      kind: "media_upload",
      changed: url !== previousContentUrl,
    };
  }

  return {
    content_url: url,
    content_type: coerceContentType(contentTypeHint, "video"),
    kind: "passthrough",
    changed: url !== previousContentUrl,
  };
}

import type Database from "better-sqlite3";
import { bossmobileHeygenVideoStatus } from "./heygen-mcp";

type LessonRow = {
  id: number;
  title: string;
  description: string | null;
  content_url: string | null;
  content_type: string | null;
};

type PublishArgs = {
  heygen_video_id: string;
  lesson_id: number;
  title?: string;
  description?: string;
  privacy_status?: "public" | "unlisted" | "private";
  category_id?: string;
  tags?: string[];
};

function safeSlug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "lesson-video"
  );
}

function clamp(s: string, n: number): string {
  return s.length > n ? s.slice(0, n).trim() : s;
}

export async function bossmobilePublishVideoPlaybook(
  db: Database.Database,
  args: PublishArgs,
) {
  const heygenId = args.heygen_video_id?.trim();
  if (!heygenId) throw new Error("heygen_video_id is required");
  const lessonId = Number(args.lesson_id);
  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    throw new Error("lesson_id must be a positive integer");
  }

  const lesson = db
    .prepare(
      "SELECT id, title, description, content_url, content_type FROM lessons WHERE id = ?",
    )
    .get(lessonId) as LessonRow | undefined;
  if (!lesson) throw new Error(`lesson ${lessonId} not found`);

  const status = (await bossmobileHeygenVideoStatus(heygenId)) as Record<
    string,
    unknown
  >;
  const heygenStatus =
    typeof status.status === "string" ? status.status : "unknown";
  const videoUrl =
    typeof status.video_url === "string" ? status.video_url : null;
  const thumbnailUrl =
    typeof status.thumbnail_url === "string" ? status.thumbnail_url : null;
  const duration = typeof status.duration === "number" ? status.duration : null;

  const heygenSummary = {
    video_id: heygenId,
    status: heygenStatus,
    video_url: videoUrl,
    thumbnail_url: thumbnailUrl,
    duration_seconds: duration,
  };
  const lessonSummary = {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    current_content_url: lesson.content_url,
    current_content_type: lesson.content_type,
  };

  if (heygenStatus === "failed" || heygenStatus === "error") {
    return {
      state: "failed" as const,
      heygen: heygenSummary,
      lesson: lessonSummary,
      next_step:
        "HeyGen reports the render failed. Inspect the HeyGen job, regenerate with bossmobile_heygen_video_agent, then retry this tool with the new video_id.",
      markdown: `### Publish pipeline — HeyGen render failed\n\n- **HeyGen video:** \`${heygenId}\`\n- **Lesson:** #${lesson.id} — ${lesson.title}\n\nRegenerate with \`bossmobile_heygen_video_agent\` and retry.`,
    };
  }

  if (heygenStatus !== "completed" || !videoUrl) {
    return {
      state: "rendering" as const,
      heygen: heygenSummary,
      lesson: lessonSummary,
      next_step:
        "HeyGen is still rendering. Wait ~30s and call bossmobile_publish_video_playbook again with the same arguments. When status flips to 'completed', the response will include the upload + embed steps.",
      markdown: `### Publish pipeline — waiting on HeyGen\n\n- **HeyGen video:** \`${heygenId}\` — status **${heygenStatus}**\n- **Destination lesson:** #${lesson.id} — ${lesson.title}\n\nRe-run this tool in ~30s.`,
    };
  }

  const title = clamp(args.title?.trim() || lesson.title, 100);
  const description = clamp(
    args.description?.trim() || lesson.description || title,
    4500,
  );
  const privacyStatus = args.privacy_status || "unlisted";
  const categoryId = args.category_id || "27";
  const tags =
    args.tags && args.tags.length
      ? args.tags
      : ["Papa Life", "fatherhood coaching", "Boss Mobile Life Coach"];
  const suggestedFilename = `${safeSlug(lesson.title)}.mp4`;

  const playbook = [
    {
      step: 1,
      title: "Stage the HeyGen MP4 in the Composio workbench",
      composio_tool: "COMPOSIO_REMOTE_WORKBENCH",
      rationale:
        "YOUTUBE_MULTIPART_UPLOAD_VIDEO needs an s3key-backed FileUploadable. Download the HeyGen URL in the workbench and keep the returned s3key for step 2.",
      input_hint: {
        download_url: videoUrl,
        suggested_filename: suggestedFilename,
        mimetype: "video/mp4",
      },
    },
    {
      step: 2,
      title: "Upload to Brian's YouTube channel",
      composio_tool: "YOUTUBE_MULTIPART_UPLOAD_VIDEO",
      rationale:
        "Uploads the staged MP4 with course metadata. Store the returned YouTube video id for step 3.",
      input: {
        title,
        description,
        categoryId,
        privacyStatus,
        tags,
        videoFile: {
          _replace_with: "{ name, mimetype: 'video/mp4', s3key } from step 1",
          suggested_name: suggestedFilename,
        },
      },
    },
    {
      step: 3,
      title: "Embed the YouTube video into the lesson",
      papalife_tool: "bossmobile_lesson_set_content_url",
      rationale:
        "Smart setter — accepts any YouTube URL form (watch/short/embed/youtu.be) and normalizes to the canonical /embed/{id} format, then writes content_url + content_type onto the lesson row. Safer than update_lesson for attaching media because it guarantees the URL shape the LessonMediaPlayer expects.",
      input_template: {
        lesson_id: lesson.id,
        url: "https://www.youtube.com/watch?v={YOUTUBE_VIDEO_ID}",
      },
    },
  ];

  const markdown = [
    `### Publish pipeline — ready to upload`,
    ``,
    `- **HeyGen video:** \`${heygenId}\` (${duration ?? "?"}s, status: completed)`,
    `- **Source MP4:** ${videoUrl}`,
    `- **Destination lesson:** #${lesson.id} — ${lesson.title}`,
    `- **Privacy:** ${privacyStatus} · **Category:** ${categoryId} · **Tags:** ${tags.join(", ")}`,
    ``,
    `#### Step 1 — Stage the MP4 in Composio workbench`,
    `\`COMPOSIO_REMOTE_WORKBENCH\` — download \`${videoUrl}\` as \`${suggestedFilename}\` (mimetype \`video/mp4\`). Keep the returned \`s3key\`.`,
    ``,
    `#### Step 2 — Upload to YouTube`,
    `\`YOUTUBE_MULTIPART_UPLOAD_VIDEO\` with:`,
    `\`\`\`json`,
    JSON.stringify(
      {
        title,
        description,
        categoryId,
        privacyStatus,
        tags,
        videoFile: {
          name: suggestedFilename,
          mimetype: "video/mp4",
          s3key: "<s3key from step 1>",
        },
      },
      null,
      2,
    ),
    `\`\`\``,
    ``,
    `#### Step 3 — Embed into the lesson`,
    `Call \`bossmobile_lesson_set_content_url\` (this MCP) with:`,
    `\`\`\`json`,
    JSON.stringify(
      {
        lesson_id: lesson.id,
        url: "https://www.youtube.com/watch?v=<YOUTUBE_VIDEO_ID>",
      },
      null,
      2,
    ),
    `\`\`\``,
    ``,
    `The smart setter normalizes any YouTube/HeyGen/Drive URL to the canonical form the \`LessonMediaPlayer\` expects. You do not need to pre-format the URL.`,
  ].join("\n");

  return {
    state: "ready_to_upload" as const,
    heygen: heygenSummary,
    lesson: lessonSummary,
    youtube_upload: {
      composio_tool: "YOUTUBE_MULTIPART_UPLOAD_VIDEO",
      arguments: {
        title,
        description,
        categoryId,
        privacyStatus,
        tags,
        videoFile: {
          _instructions:
            "Replace with { name, mimetype: 'video/mp4', s3key } after staging via COMPOSIO_REMOTE_WORKBENCH.",
          source_url: videoUrl,
          suggested_name: suggestedFilename,
        },
      },
    },
    embed_step: {
      papalife_tool: "bossmobile_lesson_set_content_url",
      arguments_template: {
        lesson_id: lesson.id,
        url: "https://www.youtube.com/watch?v={YOUTUBE_VIDEO_ID}",
      },
      note: "The setter auto-normalizes any YouTube form to /embed/{id}. You can pass the watch URL, a youtu.be short link, or the /embed/ URL — all produce the same canonical result.",
    },
    playbook,
    next_step: `Execute the 3 steps in 'playbook'. 1) COMPOSIO_REMOTE_WORKBENCH to stage ${videoUrl}. 2) YOUTUBE_MULTIPART_UPLOAD_VIDEO with the args in 'youtube_upload.arguments' (replace videoFile with the staged s3key). 3) update_lesson with the returned YouTube video id as content_url.`,
    markdown,
  };
}

export type YouTubeVideoMetrics = {
  videoId: string;
  title: string;
  impressions: number;
  clickThroughRate: number;
  views: number;
  watchTimeMinutes: number;
  averageViewDurationSeconds: number;
  subscribersGained: number;
};

export type YouTubeOptimizationRecommendation = {
  videoId: string;
  priorityScore: number;
  diagnosis: string[];
  recommendedActions: Array<"title" | "description" | "thumbnail" | "retention" | "topic_followup">;
};

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

/**
 * Scores opportunity, not quality. Higher means the video is a stronger candidate
 * for a packaging/retention experiment. Inputs are intentionally simple so AI Boss
 * OS can run the first pass locally without paying an LLM provider.
 */
export function scoreYouTubeOpportunity(metrics: YouTubeVideoMetrics): YouTubeOptimizationRecommendation {
  const diagnosis: string[] = [];
  const actions = new Set<YouTubeOptimizationRecommendation["recommendedActions"][number]>();

  const ctr = metrics.clickThroughRate;
  const avgView = metrics.averageViewDurationSeconds;
  const viewsPerImpression = metrics.impressions > 0 ? metrics.views / metrics.impressions : 0;
  const subscriberYield = metrics.views > 0 ? metrics.subscribersGained / metrics.views : 0;

  let score = 0;

  if (metrics.impressions >= 1000 && ctr < 4) {
    score += 35;
    diagnosis.push("YouTube is showing the video, but relatively few viewers are clicking.");
    actions.add("thumbnail");
    actions.add("title");
  } else if (metrics.impressions < 1000 && ctr >= 5) {
    score += 25;
    diagnosis.push("The packaging converts reasonably well, but the video has limited reach.");
    actions.add("description");
    actions.add("topic_followup");
  }

  if (avgView < 180) {
    score += 30;
    diagnosis.push("Viewer retention is weak enough that the opening and pacing should be reviewed.");
    actions.add("retention");
  } else if (avgView >= 300) {
    score += 15;
    diagnosis.push("Watch time is comparatively strong, so packaging improvements may unlock more traffic.");
    actions.add("thumbnail");
    actions.add("title");
  }

  if (subscriberYield >= 0.01) {
    score += 15;
    diagnosis.push("The video converts viewers into subscribers, making it a good candidate to expand reach.");
    actions.add("topic_followup");
  }

  if (viewsPerImpression < 0.03 && metrics.impressions >= 500) {
    score += 10;
    actions.add("thumbnail");
    actions.add("title");
  }

  if (diagnosis.length === 0) {
    diagnosis.push("No obvious bottleneck was detected from the current baseline metrics.");
  }

  return {
    videoId: metrics.videoId,
    priorityScore: clamp(score),
    diagnosis,
    recommendedActions: [...actions],
  };
}

export function pickPilotVideos(videos: YouTubeVideoMetrics[], limit = 3): YouTubeOptimizationRecommendation[] {
  return videos
    .map(scoreYouTubeOpportunity)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, Math.max(1, limit));
}

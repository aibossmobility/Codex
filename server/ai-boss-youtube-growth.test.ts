import assert from "node:assert/strict";
import { pickPilotVideos, scoreYouTubeOpportunity } from "./ai-boss-youtube-growth";

const packagingProblem = scoreYouTubeOpportunity({
  videoId: "a",
  title: "When Your Adult Child Pulls Away",
  impressions: 5000,
  clickThroughRate: 2.5,
  views: 120,
  watchTimeMinutes: 900,
  averageViewDurationSeconds: 450,
  subscribersGained: 3,
});
assert.equal(packagingProblem.recommendedActions.includes("thumbnail"), true);
assert.equal(packagingProblem.recommendedActions.includes("title"), true);

const retentionProblem = scoreYouTubeOpportunity({
  videoId: "b",
  title: "Listening Without Defending",
  impressions: 1700,
  clickThroughRate: 5.6,
  views: 90,
  watchTimeMinutes: 120,
  averageViewDurationSeconds: 80,
  subscribersGained: 0,
});
assert.equal(retentionProblem.recommendedActions.includes("retention"), true);

const selected = pickPilotVideos([
  { videoId: "c", title: "C", impressions: 100, clickThroughRate: 6, views: 8, watchTimeMinutes: 60, averageViewDurationSeconds: 420, subscribersGained: 0 },
  { videoId: "a", title: "A", impressions: 5000, clickThroughRate: 2, views: 100, watchTimeMinutes: 700, averageViewDurationSeconds: 420, subscribersGained: 2 },
  { videoId: "b", title: "B", impressions: 2000, clickThroughRate: 3, views: 60, watchTimeMinutes: 50, averageViewDurationSeconds: 60, subscribersGained: 0 },
], 2);
assert.equal(selected.length, 2);
assert.equal(selected[0].priorityScore >= selected[1].priorityScore, true);
console.log("✓ YouTube growth engine identifies packaging, retention, and pilot-video opportunities");

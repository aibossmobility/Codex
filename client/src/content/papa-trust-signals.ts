// Only publish proof after permission and independent verification.
// This file is intentionally empty: no reviews, signups, or external mentions have been invented.
export type ApprovedStory = { sourceId: string; firstName: string; quote: string };
export type ApprovedExternalMention = { label: string; url: string; date: string };
export const approvedStories: ApprovedStory[] = [];
export const approvedProofCount: number | null = null;
export const approvedExternalMentions: ApprovedExternalMention[] = [];

// Only publish proof after permission and independent verification.
// Only documented, independently published coverage. An interview is not a testimonial or endorsement.
export type ApprovedStory = { sourceId: string; firstName: string; photo: string; context: string; quote: string };
export type ApprovedExternalMention = { label: string; url: string; date: string };
export const approvedStories: ApprovedStory[] = [];
type ApprovedProofCount = { count: number; label: string; updatedOn: string };
export const approvedProofCount = (): ApprovedProofCount | null => null;
export const approvedExternalMentions: ApprovedExternalMention[] = [
  { label: "Interview with Dear Fathers (not a product endorsement)", url: "https://dearfathers.com/2026/09/brian-keith-hill-opens-up-about-fatherhood-papa-life-and-more/", date: "September 22, 2026" },
];

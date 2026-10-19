/**
 * Copy for CRM / email automation follow-ups (Papa Life homepage funnel).
 * Wire these in your ESP or GHL; replace BASE with your public site origin (e.g. https://bossmobilelifecoach.com).
 */

export const FUNNEL_PAGE_PATHS = {
  crm: "/crm",
  video: "/papa-intro",
  firstLesson: "/papa-first-lesson",
  courses: "/courses",
} as const;

/** Sequence A — Submitted intake, did NOT watch video (send immediately) */
export const SEQUENCE_A = {
  subject: "You started for a reason.",
  bodyTemplate: (baseUrl: string) =>
    `You started for a reason. Go here and watch this first: ${baseUrl}${FUNNEL_PAGE_PATHS.video}`,
};

/** Sequence B — Watched intro; suggest first digital lesson */
export const SEQUENCE_B = {
  subject: "Awareness is not the same as movement.",
  bodyTemplate: (baseUrl: string) =>
    `Awareness is not the same as movement. Take the next step here: ${baseUrl}${FUNNEL_PAGE_PATHS.firstLesson}`,
};

/** Sequence C — Continue self-guided course path */
export const SEQUENCE_C = {
  subject: "You do not need more information right now.",
  bodyTemplate: (baseUrl: string) =>
    `You do not need more information right now. Choose your next guided Papa Life lesson here: ${baseUrl}${FUNNEL_PAGE_PATHS.courses}`,
};

/** Sequence D — No activity after intake (send after 3 days) */
export const SEQUENCE_D = {
  subject: "If something still feels off, do not leave it unnamed.",
  bodyTemplate: (baseUrl: string) =>
    `If something still feels off, do not leave it unnamed. Come back and continue here: ${baseUrl}${FUNNEL_PAGE_PATHS.crm} or ${baseUrl}${FUNNEL_PAGE_PATHS.video}`,
};

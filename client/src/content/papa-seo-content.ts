import {
  articleSchema,
  ASSESSMENT_WEB_APP_SCHEMA,
  BRIAN_PERSON_SCHEMA,
  ORGANIZATION_SCHEMA,
} from "./papa-schema";

export type SeoArticle = {
  slug: string;
  title: string;
  description: string;
  keywords: string;
  headline: string;
  subheadline: string;
  sections: { heading?: string; paragraphs: string[] }[];
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

export const ASSESSMENT_PAGE = {
  title: "Free Father–Adult Child Relationship Assessment | Boss Mobile Life Coach",
  description:
    "Take the free relationship assessment. See where things stand with your adult son or daughter — and your first step toward closing the gap.",
  keywords:
    "father adult child relationship assessment, estranged adult child, fatherhood coaching, PAPA framework, Brian Keith Hill",
  headline: "Your grown child stopped talking to you. It doesn't have to stay that way.",
  subheadline: "Take the free assessment. In a few minutes you'll see exactly where things stand — and the first step toward closing the gap.",
  intro: [
    "Maybe the calls stopped. Maybe the visits got shorter, then stopped too. You're not a bad dad. You just never got a map for this part.",
    "I'm Brian. I lost my oldest daughter for almost 20 years. Then I got her back. Now I help fathers like you do the same — one honest step at a time.",
  ],
  thankYou: {
    headline: "You showed up. Here's what comes next.",
    paragraphs: [
      "Thank you for completing the assessment. Your answers help us understand where you are — and where you want to go with your adult child.",
      "Check your email for your personalized results and next steps. If you are ready to move past awareness into guided action, unlock the full PAPA Journey and keep going with structure, reflection, and coaching.",
    ],
    primaryCta: { label: "Unlock the Full PAPA Journey — $4.99/mo →", href: "/member-billing" },
    secondaryCta: { label: "Find My Fatherhood Stage →", href: "https://fatherhood5-c3sirayz.manus.space/" },
  },
  jsonLd: [ORGANIZATION_SCHEMA, ASSESSMENT_WEB_APP_SCHEMA],
};

export const SEO_PAGES: SeoArticle[] = [
  {
    slug: "/adult-son-relationship",
    title: "Adult Son Relationship Help for Fathers | Boss Mobile Life Coach",
    description:
      "Guidance for fathers rebuilding connection with an adult son — without control, lectures, or walking on eggshells.",
    keywords: "adult son relationship, father son estrangement, reconnect with adult son",
    headline: "Your adult son doesn't need a boss. He needs a father who shows up differently.",
    subheadline: "When the relationship feels strained, distant, or silent — you can change how you lead without losing yourself.",
    sections: [
      {
        paragraphs: [
          "Many fathers built their identity around providing and protecting. That worked when your son was younger. With an adult son, the same instincts can feel like pressure — and he pulls away.",
          "The distance isn't always about what you did wrong. Often it's about what neither of you was ever taught: how to relate as two grown men who still matter to each other.",
        ],
      },
      {
        heading: "What fathers get wrong (without meaning to)",
        paragraphs: [
          "Fixing instead of listening. Lecturing when he needed space. Treating every conversation like a performance review.",
          "Pride keeps both of you locked in old patterns. The first shift isn't getting him to change — it's getting honest about your side of the pattern.",
        ],
      },
      {
        heading: "A better path forward",
        paragraphs: [
          "The PAPA framework — Purpose, Authority, Presence, Alignment — gives you language and steps when emotions run high and words fail.",
          "Start with clarity, not a grand gesture. Take the free assessment to see where your relationship stands today and what one honest next step could look like.",
        ],
      },
    ],
    jsonLd: articleSchema(
      "/adult-son-relationship",
      "Adult Son Relationship Help for Fathers",
      "Guidance for fathers rebuilding connection with an adult son."
    ),
  },
  {
    slug: "/adult-daughter-relationship",
    title: "Adult Daughter Relationship Help for Fathers | Boss Mobile Life Coach",
    description:
      "Support for fathers who want a deeper, safer connection with an adult daughter — after years of tension, silence, or misunderstanding.",
    keywords: "adult daughter relationship, father daughter estrangement, reconnect with adult daughter",
    headline: "She's not little anymore — but she still needs to know she's seen.",
    subheadline: "Fathers of adult daughters often feel dismissed, shut out, or unsure what to say. You can rebuild trust without forcing it.",
    sections: [
      {
        paragraphs: [
          "An adult daughter may love you and still keep her distance. That gap can feel like rejection — especially when you thought you did everything right.",
          "Reconnection isn't about one perfect apology. It's about consistent presence, humility, and showing her you can hear her without defending yourself.",
        ],
      },
      {
        heading: "Why daughters pull away",
        paragraphs: [
          "Unspoken expectations. Old hurts that never got air. A father who led with authority but not emotional safety.",
          "She may not need you to fix her life. She may need proof that you can stay in the room when it's uncomfortable.",
        ],
      },
      {
        heading: "What changes when you lead differently",
        paragraphs: [
          "Presence over performance. Curiosity over control. Small, steady contact over dramatic speeches.",
          "The free relationship assessment helps you name where things stand — connected, strained, distant, or estranged — so your next move is intentional, not reactive.",
        ],
      },
    ],
    jsonLd: articleSchema(
      "/adult-daughter-relationship",
      "Adult Daughter Relationship Help for Fathers",
      "Support for fathers rebuilding connection with an adult daughter."
    ),
  },
  {
    slug: "/why-adult-children-pull-away",
    title: "Why Adult Children Pull Away From Their Fathers | Boss Mobile Life Coach",
    description:
      "Understand why grown sons and daughters create distance — and what fathers can do that actually helps.",
    keywords: "why adult children pull away, adult child distance, fatherhood transition",
    headline: "When they pull away, it's rarely because they stopped caring.",
    subheadline: "Distance is often a signal — not a verdict on your worth as a father.",
    sections: [
      {
        paragraphs: [
          "Adult children pull away for many reasons: unfinished business, different values, boundaries they never learned to voice, or simply growing into lives that don't revolve around home.",
          "Fathers often interpret distance as disrespect. More often, it's self-protection — from old dynamics that still feel unsafe.",
        ],
      },
      {
        heading: "Common patterns behind the silence",
        paragraphs: [
          "Control disguised as care. Criticism disguised as wisdom. Absence disguised as providing.",
          "When a child becomes an adult, they test whether the relationship can hold honesty. Many fathers fail that test without realizing they took it.",
        ],
      },
      {
        heading: "What helps instead of chasing",
        paragraphs: [
          "Stop demanding closeness on your timeline. Start building safety in small moments.",
          "The assessment on this site helps you map your relationship honestly — so you stop guessing and start moving with purpose.",
        ],
      },
    ],
    jsonLd: articleSchema(
      "/why-adult-children-pull-away",
      "Why Adult Children Pull Away From Their Fathers",
      "Understand why grown children create distance and what fathers can do."
    ),
  },
  {
    slug: "/father-child-estrangement",
    title: "Father–Child Estrangement Help | Boss Mobile Life Coach",
    description:
      "Hope and practical steps for fathers in estrangement with an adult son or daughter — from a coach who lived it.",
    keywords: "father child estrangement, estranged adult child, reconcile with adult child",
    headline: "Estrangement hurts. It doesn't have to be the last chapter.",
    subheadline: "As long as you're both alive, repair is still possible — one honest step at a time.",
    sections: [
      {
        paragraphs: [
          "Estrangement is one of the deepest pains a father can carry — shame, grief, anger, and the fear that it's too late.",
          "Brian Keith Hill lost nearly 20 years with his oldest daughter before finding his way back. That journey shapes everything PAPA Life teaches: humility, patience, and action that matches your words.",
        ],
      },
      {
        heading: "What estrangement is really asking of you",
        paragraphs: [
          "Not a performance of change — real change. Not a single letter that fixes years — a new way of showing up.",
          "Your child may not respond on your schedule. Your job is to become the kind of man worth responding to.",
        ],
      },
      {
        heading: "Start where you are",
        paragraphs: [
          "Name the truth without drowning in blame. Get support so you're not navigating this alone.",
          "Take the free assessment to understand your starting point — then use the resources on the PAPA Journey to build from there.",
        ],
      },
    ],
    jsonLd: articleSchema(
      "/father-child-estrangement",
      "Father–Child Estrangement Help",
      "Practical hope and steps for fathers estranged from adult children."
    ),
  },
  {
    slug: "/papa-framework",
    title: "The PAPA Framework for Fathers | Purpose, Authority, Presence, Alignment",
    description:
      "Learn the PAPA framework — four pillars that help fathers lead with clarity, character, presence, and integrity with adult children.",
    keywords: "PAPA framework, fatherhood framework, Purpose Authority Presence Alignment",
    headline: "Four pillars. One mission: become the father your adult child can trust again.",
    subheadline: "Purpose · Authority · Presence · Alignment — a map when fatherhood feels harder than it should.",
    sections: [
      {
        paragraphs: [
          "The PAPA framework was built for the season no one prepares you for: when your children are grown, the rules change, and love alone isn't enough without skill.",
        ],
      },
      {
        heading: "Purpose",
        paragraphs: [
          "Know why you were built for this role — beyond paychecks and provider identity. Purpose anchors you when emotions spike.",
        ],
      },
      {
        heading: "Authority",
        paragraphs: [
          "Lead without control. Trade volume and force for grounded character your adult child can respect without fear.",
        ],
      },
      {
        heading: "Presence",
        paragraphs: [
          "Show up without fixing everything. Stay in the room when it's awkward. Let your child feel seen, not managed.",
        ],
      },
      {
        heading: "Alignment",
        paragraphs: [
          "Close the gap between who you say you are and how you live. Alignment is where trust gets rebuilt over time.",
        ],
      },
    ],
    jsonLd: articleSchema(
      "/papa-framework",
      "The PAPA Framework for Fathers",
      "Purpose, Authority, Presence, and Alignment — a fatherhood framework for adult children."
    ),
  },
  {
    slug: "/about-brian-keith-hill",
    title: "About Brian Keith Hill | Founder, Boss Mobile Life Coach",
    description:
      "Meet Brian Keith Hill — fatherhood coach, PAPA framework creator, and founder of Boss Mobile Life Coach.",
    keywords: "Brian Keith Hill, Boss Mobile Life Coach, PAPA Life founder, fatherhood coach",
    headline: "Brian Keith Hill",
    subheadline: "Founder of Boss Mobile Life Coach · Creator of the PAPA framework",
    sections: [
      {
        paragraphs: [
          "Brian Keith Hill is a visionary leader dedicated to restoring the heart of fatherhood. He guides men through the complex transition of parenting adult children — with clarity, presence, and care for mental health.",
          "He watched his father walk out when he was eleven. That wound shaped how he showed up — and the nearly twenty years of silence with his own oldest daughter before reconciliation.",
          "After 20 years and 307,000 rideshare miles of conversations with fathers, Brian built PAPA Life on one truth: as long as you're both alive, it's never too late.",
        ],
      },
      {
        heading: "What Brian brings to this work",
        paragraphs: [
          "Faith-informed coaching without jargon. Direct talk at a human reading level. Frameworks that turn good intentions into daily practice.",
          "Brian is the face, voice, and authority of this brand — not a figurehead. The work is personal because the wound was personal.",
        ],
      },
    ],
    jsonLd: [BRIAN_PERSON_SCHEMA, articleSchema("/about-brian-keith-hill", "About Brian Keith Hill", "Founder of Boss Mobile Life Coach and creator of the PAPA framework.")],
  },
];

export const ASSESSMENT_CTA = {
  label: "Take the Free Assessment →",
  href: "/relationship-assessment",
};

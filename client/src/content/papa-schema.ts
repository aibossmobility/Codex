const SITE = "https://papalifecoach.com";

export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Papa Life",
  alternateName: ["Papa Life"],
  url: SITE,
  logo: `${SITE}/images/papa-life-approved-20261016.webp`,
  description:
    "Faith-informed self-paced fatherhood lessons, audio, manuscripts and practical educational resources for fathers of adult children, grounded in the PAPA framework.",
  founder: {
    "@type": "Person",
    name: "Brian Keith Hill",
    url: `${SITE}/about-brian-keith-hill`,
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+1-510-415-2098",
    contactType: "customer service",
    areaServed: "US",
    availableLanguage: "English",
  },
  sameAs: [
    "https://www.linkedin.com/in/brian-hill-bossmobility",
    "https://briankeithhill.com",
    "https://www.alignable.com/san-leandro-ca/papa-life-fatherhood-life-coach-ambassador-of-the-east-bay-ca",
  ],
};

export const BRIAN_PERSON_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Brian Keith Hill",
  jobTitle: "Founder of AI Boss Mobility Consulting; Creator of Papa Life; Leadership and Organizational Advisor",
  knowsAbout: ["Papa Life", "fatherhood education", "leadership", "AI strategy", "organizational consulting"],
  url: `${SITE}/about-brian-keith-hill`,
  image: `${SITE}/images/brian-keith-hill.png`,
  description:
    "Brian Keith Hill creates self-paced fatherhood educational resources through Papa Life and offers AI strategy and organizational consulting separately through AI Boss Mobility. His work emphasizes trust, wisdom, and human connection.",
  sameAs: [
    "https://www.linkedin.com/in/brian-hill-bossmobility",
    "https://briankeithhill.com",
  ],
};

export const HOMEPAGE_FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Papa Life?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Papa Life provides original self-paced audio lessons, written resources, and faith-informed fatherhood education for fathers of adult children.",
      },
    },
    {
      "@type": "Question",
      name: "Who is this for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Fathers of adult sons and daughters who feel distance, tension, awkwardness, or estrangement — and want a honest path toward reconnection.",
      },
    },
    {
      "@type": "Question",
      name: "What is the PAPA framework?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PAPA stands for Presence, Authority, Purpose, and Alignment — four pillars that help fathers move from confusion to intentional leadership with adult children.",
      },
    },
    {
      "@type": "Question",
      name: "How can I begin exploring Papa Life?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Explore the available self-paced lessons, original audio, manuscripts, and fatherhood learning resources.",
      },
    },
  ],
};

export function webApplicationSchema(path: string, name: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url: `${SITE}${path}`,
    applicationCategory: "HealthApplication",
    operatingSystem: "Web browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    provider: {
      "@type": "Organization",
      name: "Papa Life Coach",
    },
  };
}

export function articleSchema(slug: string, headline: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    url: `${SITE}${slug}`,
    author: {
      "@type": "Person",
      name: "Brian Keith Hill",
    },
    publisher: {
      "@type": "Organization",
      name: "Papa Life Coach",
      logo: {
        "@type": "ImageObject",
        url: `${SITE}/images/papa-life-approved-20261016.webp`,
      },
    },
    mainEntityOfPage: `${SITE}${slug}`,
  };
}

export const ASSESSMENT_WEB_APP_SCHEMA = webApplicationSchema(
  "/relationship-assessment",
  "Father–Adult Child Relationship Assessment",
  "Free assessment for fathers to understand where they stand with an adult son or daughter and receive a personalized next step."
);

export const HOMEPAGE_WEB_APP_SCHEMA = webApplicationSchema(
  "/relationship-assessment",
  "Free Relationship Assessment",
  "Take the free father–adult child relationship assessment in minutes."
);

export const HOMEPAGE_ARTICLE_SCHEMA = articleSchema(
  "/",
  "Papa Life — Fatherhood Lessons and Educational Resources",
  "Faith-informed self-paced fatherhood lessons and resources for fathers of adult children."
);

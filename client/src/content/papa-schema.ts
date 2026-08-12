const SITE = "https://papalifecoach.com";

export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Papa Life",
  alternateName: ["PapaLifeCoach.com", "Boss Mobility", "Boss Mobile Life Coach"],
  url: SITE,
  logo: `${SITE}/images/papa-life-logo.png`,
  description:
    "Faith-informed life coaching for fathers of adult children — helping men rebuild connection, presence, and legacy through the PAPA framework.",
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
  jobTitle: "Founder of Boss Mobility and Papa Life; Fatherhood Coach",
  worksFor: {
    "@type": "Organization",
    name: "Boss Mobility",
    alternateName: "Boss Mobile Life Coach",
  },
  url: `${SITE}/about-brian-keith-hill`,
  image: `${SITE}/images/brian-keith-hill.png`,
  description:
    "Founder of Boss Mobility and Papa Life, a Scripture-centered fatherhood coaching movement helping fathers of adult children become safer, more present, and better prepared for healthy reconnection.",
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
        text: "Papa Life provides coaching and resources for fathers navigating relationships with adult children—with clarity, presence, and care for mental health.",
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
        text: "PAPA stands for Purpose, Authority, Presence, and Alignment — four pillars that help fathers move from confusion to intentional leadership with adult children.",
      },
    },
    {
      "@type": "Question",
      name: "What is the free relationship assessment?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A short, free assessment that helps you see where your relationship stands today and identifies your first step toward closing the gap with your adult child.",
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
      name: "Papa Life",
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
      name: "Papa Life",
      logo: {
        "@type": "ImageObject",
        url: `${SITE}/images/papa-life-logo.png`,
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
  "Papa Life — Fatherhood & Life Coaching",
  "Supportive coaching for fathers ready for a clearer mental-health journey with adult children."
);

const SITE = "https://bossmobilelifecoach.com";

export const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Boss Mobile Life Coach",
  alternateName: "PAPA Life",
  url: SITE,
  logo: `${SITE}/media/brian-keith-hill-headshot.jpg`,
  description:
    "Faith-informed life coaching for fathers of adult children — helping men rebuild connection, presence, and legacy through the PAPA framework.",
  founder: {
    "@type": "Person",
    name: "Brian Keith Hill",
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
  jobTitle: "Founder & Fatherhood Life Coach",
  worksFor: {
    "@type": "Organization",
    name: "Boss Mobile Life Coach",
  },
  url: `${SITE}/about-brian-keith-hill`,
  image: `${SITE}/media/brian-keith-hill-headshot.jpg`,
  description:
    "Visionary leader dedicated to restoring the heart of fatherhood. Creator of the PAPA framework — Purpose, Authority, Presence, and Alignment.",
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
      name: "What is Boss Mobile Life Coach?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Boss Mobile Life Coach (PAPA Life) provides coaching and resources for fathers navigating relationships with adult children — with clarity, presence, and care for mental health.",
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
      name: "Boss Mobile Life Coach",
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
      name: "Boss Mobile Life Coach",
      logo: {
        "@type": "ImageObject",
        url: `${SITE}/media/brian-keith-hill-headshot.jpg`,
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
  "Boss Mobile Life Coach — Fatherhood & Life Coaching",
  "Supportive coaching for fathers ready for a clearer mental-health journey with adult children."
);

import fs from "node:fs";
import path from "node:path";

const publicDir = path.resolve("dist/public");
const templatePath = path.join(publicDir, "index.html");
const template = fs.readFileSync(templatePath, "utf8");

const pages = [
  {
    path: "/",
    title: "Papa Life - A Practical Path for Fathers of Adult Children",
    description:
      "Papa Life helps fathers understand distance, tension, and changing roles with adult children and begin rebuilding connection with humility, faith, and practical next steps.",
    eyebrow: "Boss Mobile Life Coach",
    headline: "Papa Life gives fathers a practical path back to connection.",
    intro:
      "For fathers whose adult sons or daughters feel distant, guarded, or silent, Papa Life offers assessment, guided lessons, AI coaching, and the PAPA Framework: Purpose, Authority, Presence, and Alignment.",
    sections: [
      ["Start with clarity", "Take the free relationship assessment to name where things stand and identify the first honest step toward closing the gap."],
      ["Learn the new role", "Use the free workshop and course library to move from pressure and control into listening, humility, consistency, and trust."],
      ["Practice the path", "Papa Life combines practical coaching, reflection tools, membership resources, and support for fathers rebuilding adult-child relationships."],
    ],
  },
  {
    path: "/assessment",
    title: "Free PAPA Fatherhood Assessment | Papa Life",
    description:
      "Score yourself across Purpose, Authority, Presence, and Alignment. A free five-minute assessment for fathers of adult children.",
    eyebrow: "Free Assessment",
    headline: "Your grown child stopped talking to you. It does not have to stay that way.",
    intro:
      "Take the free assessment to see where things stand with your adult son or daughter and identify a first step toward closing the gap.",
    sections: [
      ["Purpose", "Know who you are now that fatherhood is no longer centered on daily provision and control."],
      ["Authority", "Lead through character, humility, and consistency instead of pressure or position."],
      ["Presence", "Listen before fixing and become safe enough for honest conversation."],
      ["Alignment", "Close the gap between your values, words, and daily actions."],
    ],
  },
  {
    path: "/relationship-assessment",
    title: "Free Father-Adult Child Relationship Assessment | Boss Mobile Life Coach",
    description:
      "Take the free relationship assessment and see where things stand with your adult son or daughter.",
    eyebrow: "Relationship Assessment",
    headline: "Name the relationship clearly so your next move is intentional.",
    intro:
      "The assessment helps fathers stop guessing and start moving with honesty, humility, and practical direction.",
    sections: [
      ["Built for fathers", "Questions focus on distance, trust, emotional safety, and the changing role with adult children."],
      ["Practical result", "Your result points you toward the Papa Life resources that fit where you are now."],
    ],
  },
  {
    path: "/papa-first-lesson",
    title: "Free Papa Life Workshop | First Lesson",
    description: "A free first lesson for fathers learning the new role with adult children.",
    eyebrow: "Free Workshop",
    headline: "Learn why the old fatherhood role stops working with adult children.",
    intro: "This first lesson helps fathers understand distance, tension, and the shift from control to presence.",
    sections: [
      ["What you will learn", "Why well-meaning fathers get stuck, how authority changes, and what one steady next step can look like."],
      ["Continue the path", "After the workshop, members can continue through guided Papa Life courses and reflection tools."],
    ],
  },
  {
    path: "/ai-coach",
    title: "Papa Life AI Coach | Biblical Fatherhood Coaching",
    description:
      "Ask the Papa Life AI Coach for practical guidance for fathers of adult children, including assessment, resources, prayer, Bible study, Tuesday Live support, and membership help.",
    eyebrow: "AI Coach",
    headline: "Ask for guidance when you need words, next steps, or perspective.",
    intro: "The Papa Life AI Coach helps fathers think through distance, tension, faith, repair, and practical next steps with adult children.",
    sections: [
      ["Assessment help", "Use the coach to understand your PAPA scores and what they suggest about Purpose, Authority, Presence, and Alignment."],
      ["Resource guidance", "Get pointed toward lessons, membership resources, Tuesday Live support, and practical exercises."],
    ],
  },
  {
    path: "/papa-framework",
    title: "The PAPA Framework for Fathers | Purpose, Authority, Presence, Alignment",
    description:
      "Learn the PAPA framework, four pillars that help fathers lead with clarity, character, presence, and integrity with adult children.",
    eyebrow: "PAPA Framework",
    headline: "Four pillars. One mission: become the father your adult child can trust again.",
    intro: "Purpose, Authority, Presence, and Alignment give fathers a map when adult-child relationships feel harder than they should.",
    sections: [
      ["Purpose", "Know why you were built for this role beyond paychecks and provider identity."],
      ["Authority", "Lead without control and trade force for grounded character."],
      ["Presence", "Show up without fixing everything and let your child feel seen, not managed."],
      ["Alignment", "Close the gap between who you say you are and how you live."],
    ],
  },
  {
    path: "/adult-son-relationship",
    title: "Adult Son Relationship Help for Fathers | Boss Mobile Life Coach",
    description:
      "Guidance for fathers rebuilding connection with an adult son without control, lectures, or walking on eggshells.",
    eyebrow: "Adult Son Relationship",
    headline: "Your adult son does not need a boss. He needs a father who shows up differently.",
    intro: "When the relationship feels strained, distant, or silent, you can change how you lead without losing yourself.",
    sections: [
      ["What fathers get wrong", "Fixing instead of listening, lecturing when he needed space, and treating conversations like performance reviews."],
      ["A better path forward", "The PAPA Framework gives language and steps when emotions run high and words fail."],
    ],
  },
  {
    path: "/adult-daughter-relationship",
    title: "Adult Daughter Relationship Help for Fathers | Boss Mobile Life Coach",
    description:
      "Support for fathers who want a deeper, safer connection with an adult daughter after years of tension, silence, or misunderstanding.",
    eyebrow: "Adult Daughter Relationship",
    headline: "She is not little anymore, but she still needs to know she is seen.",
    intro: "Fathers of adult daughters often feel dismissed, shut out, or unsure what to say. Trust can be rebuilt without forcing it.",
    sections: [
      ["Why daughters pull away", "Old hurts, unspoken expectations, and a lack of emotional safety can create distance."],
      ["What changes", "Presence over performance, curiosity over control, and small steady contact over dramatic speeches."],
    ],
  },
  {
    path: "/why-adult-children-pull-away",
    title: "Why Adult Children Pull Away From Their Fathers | Boss Mobile Life Coach",
    description:
      "Understand why grown sons and daughters create distance and what fathers can do that actually helps.",
    eyebrow: "Adult Child Distance",
    headline: "When they pull away, it is rarely because they stopped caring.",
    intro: "Distance is often a signal, not a verdict on your worth as a father.",
    sections: [
      ["Common patterns", "Control disguised as care, criticism disguised as wisdom, and absence disguised as providing."],
      ["What helps", "Stop demanding closeness on your timeline and start building safety in small moments."],
    ],
  },
  {
    path: "/father-child-estrangement",
    title: "Father-Child Estrangement Help | Boss Mobile Life Coach",
    description:
      "Hope and practical steps for fathers in estrangement with an adult son or daughter from a coach who lived it.",
    eyebrow: "Estrangement Help",
    headline: "Estrangement hurts. It does not have to be the last chapter.",
    intro: "As long as you are both alive, repair is still possible one honest step at a time.",
    sections: [
      ["What estrangement asks", "Not a performance of change, but real change. Not one letter that fixes years, but a new way of showing up."],
      ["Start where you are", "Name the truth without drowning in blame and get support so you are not navigating this alone."],
    ],
  },
  {
    path: "/about-brian-keith-hill",
    title: "About Brian Keith Hill | Founder, Boss Mobile Life Coach",
    description:
      "Meet Brian Keith Hill, fatherhood coach, PAPA framework creator, and founder of Boss Mobile Life Coach.",
    eyebrow: "About Brian",
    headline: "Brian Keith Hill",
    intro: "Brian Keith Hill is the founder of Boss Mobile Life Coach and creator of the PAPA Framework for fathers of adult children.",
    sections: [
      ["Why the work is personal", "Brian's own fatherhood story and reconciliation journey shape the practical, honest way Papa Life supports fathers."],
      ["What he brings", "Faith-informed coaching, clear language, and frameworks that turn good intentions into daily practice."],
    ],
  },
  {
    path: "/courses",
    title: "Papa Life Courses | Boss Mobile Life Coach",
    description:
      "Programs built for fathers navigating relationships with adult children. Preview Papa Life courses and sign in to watch lessons.",
    eyebrow: "Courses",
    headline: "Papa Life course catalog",
    intro: "Programs built for fathers navigating relationships with adult children. Members can sign in to watch lessons and track progress.",
    sections: [
      ["Course previews", "Papa Life courses support fathers with practical lessons organized around the PAPA Framework."],
      ["Member access", "Sign in to the member portal to watch lesson videos and track progress."],
    ],
  },
  {
    path: "/resources",
    title: "Papa Life Resources | Boss Mobile Life Coach",
    description: "Free and member resources for fathers rebuilding connection with adult children through Papa Life.",
    eyebrow: "Resources",
    headline: "Find tools for reflection, repair, and relationship growth.",
    intro:
      "Papa Life resources include the free relationship assessment, the first workshop lesson, AI coaching, course previews, books, podcast material, and Tuesday Live support.",
    sections: [
      ["Free starting points", "Begin with the assessment, Papa Life AI Coach, and the free workshop for fathers of adult children."],
      ["Member path", "Members continue into guided lessons, reflection tools, and support organized around the PAPA Framework."],
    ],
  },
  {
    path: "/membership",
    title: "Papa Life Membership | Boss Mobile Life Coach",
    description: "Papa Life membership gives fathers structure, lessons, reflection tools, and support for rebuilding adult-child relationships.",
    eyebrow: "Membership",
    headline: "Build consistency instead of relying on one emotional moment.",
    intro: "Membership helps fathers keep practicing Purpose, Authority, Presence, and Alignment through guided lessons and reflection tools.",
    sections: [
      ["Course structure", "Work through practical lessons built for fathers navigating relationships with adult children."],
      ["Ongoing support", "Use AI coaching, resources, and community-oriented support to stay steady."],
    ],
  },
  {
    path: "/books",
    title: "Papa Life Books | Boss Mobile Life Coach",
    description: "Books and written resources from Brian Keith Hill for fathers navigating distance with adult children.",
    eyebrow: "Books",
    headline: "Written guidance for the fatherhood season no one prepared you for.",
    intro: "Brian Keith Hill's work speaks to fathers carrying silence, shame, hope, and the desire to rebuild trust with adult children.",
    sections: [
      ["Core message", "As long as both of you are alive, repair is still possible one honest step at a time."],
      ["What to do next", "Pair the written material with the free assessment and Papa Life course path for steady action."],
    ],
  },
  {
    path: "/podcast",
    title: "Papa Life Podcast | Boss Mobile Life Coach",
    description: "Podcast resources for fathers learning to reconnect with adult children through humility, presence, and practical action.",
    eyebrow: "Podcast",
    headline: "Listen for language, perspective, and next steps.",
    intro: "Papa Life podcast material supports fathers who want a calmer, wiser way to handle distance, silence, and difficult conversations.",
    sections: [
      ["For strained relationships", "Episodes focus on adult-child distance, fatherhood identity, repair, faith, and emotional maturity."],
      ["Keep moving", "Use the podcast alongside the assessment, workshop, and membership lessons."],
    ],
  },
  {
    path: "/contact",
    title: "Contact Boss Mobile Life Coach",
    description: "Contact Brian Keith Hill and Boss Mobile Life Coach about Papa Life, fatherhood coaching, and support.",
    eyebrow: "Contact",
    headline: "Reach out when you are ready for support.",
    intro: "Boss Mobile Life Coach supports fathers, families, and leaders who want clearer next steps and stronger relationships.",
    sections: [
      ["Start here", "If you are a father trying to reconnect with an adult child, the free assessment is the best first step."],
      ["For broader support", "Use the AI Coach or membership path to get oriented around resources and next actions."],
    ],
  },
  {
    path: "/marlee-assessment",
    title: "Marlee Motivation Assessment | Papa Life",
    description:
      "Join Brian Keith Hill's Papa Life Marlee workspace and complete a motivational assessment for self-awareness, communication, leadership, and relationship growth.",
    eyebrow: "Marlee Assessment",
    headline: "Understand what motivates you and how your style affects relationships.",
    intro: "The Marlee assessment supports Papa Life fathers with self-awareness around communication, decision-making, and leadership.",
    sections: [
      ["Better self-awareness", "Learn how your natural style may show up in family conversations and repair attempts."],
      ["Use it with PAPA", "Pair Marlee insights with Purpose, Authority, Presence, and Alignment."],
    ],
  },
  {
    path: "/papa-journey",
    title: "Papa Journey | Boss Mobile Life Coach",
    description: "A guided Papa Life journey for fathers rebuilding connection with adult children.",
    eyebrow: "Papa Journey",
    headline: "Move from awareness into a guided fatherhood path.",
    intro: "The Papa Journey helps fathers work through relationship distance with structure, reflection, coaching, and next steps.",
    sections: [
      ["PAPA pillars", "Purpose, Authority, Presence, and Alignment organize the path."],
      ["Continue steadily", "Use the journey to build consistency and repair-oriented habits over time."],
    ],
  },
  {
    path: "/papa-intro",
    title: "Papa Life Intro Video",
    description: "Introductory video for the Papa Life fatherhood path.",
    eyebrow: "Intro Video",
    headline: "Start with the heart of Papa Life.",
    intro: "The intro video explains the Papa Life path for fathers of adult children.",
    sections: [
      ["Watch first", "Begin here to understand the mission, message, and next step."],
      ["Continue", "Move into the free workshop and Papa Life assessment for practical next steps."],
    ],
  },
  {
    path: "/booking",
    title: "Booking | Boss Mobile Life Coach",
    description: "Booking page for Boss Mobile Life Coach.",
    eyebrow: "Booking",
    headline: "Book time with Boss Mobile Life Coach.",
    intro: "Use this page to move from interest into a scheduled conversation or next step.",
    sections: [
      ["Next step", "Choose an available path for booking or follow-up."],
      ["Prepare", "Start with the assessment if you are looking for fatherhood relationship support."],
    ],
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Boss Mobile Life Coach",
    description: "How Papa Life collects, uses, and protects information submitted through bossmobilelifecoach.com.",
    eyebrow: "Privacy Policy",
    headline: "Privacy Policy",
    intro:
      "Papa Life is a fatherhood coaching service owned and operated by Brian Keith Hill. This policy explains what information is collected on bossmobilelifecoach.com, how it is used, and how visitors can control it.",
    sections: [
      ["Information use", "Information may be used to respond to requests, send coaching resources and reminders, process membership payments, improve services, and follow the law."],
      ["SMS consent", "Phone numbers and SMS consent are never sold or shared with third parties for their own marketing."],
    ],
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy | Boss Mobile Life Coach",
    description: "How Papa Life collects, uses, and protects information submitted through bossmobilelifecoach.com.",
    eyebrow: "Privacy Policy",
    headline: "Privacy Policy",
    intro:
      "Papa Life is a fatherhood coaching service owned and operated by Brian Keith Hill. This policy explains what information is collected on bossmobilelifecoach.com, how it is used, and how visitors can control it.",
    sections: [
      ["Information use", "Information may be used to respond to requests, send coaching resources and reminders, process membership payments, improve services, and follow the law."],
      ["SMS consent", "Phone numbers and SMS consent are never sold or shared with third parties for their own marketing."],
    ],
  },
  {
    path: "/terms",
    title: "Terms of Service | Boss Mobile Life Coach",
    description: "Terms for using Papa Life, bossmobilelifecoach.com, ORACLE, courses, and membership.",
    eyebrow: "Terms of Service",
    headline: "Terms of Service",
    intro:
      "By using bossmobilelifecoach.com, the ORACLE AI coach, Papa Life courses, or the $4.99/month membership, visitors agree to these terms.",
    sections: [
      ["Coaching service", "Papa Life is a coaching and educational service, not therapy, counseling, or licensed mental health care."],
      ["Membership", "Papa Life membership bills monthly after any free trial period until canceled."],
    ],
  },
  {
    path: "/terms-of-service",
    title: "Terms of Service | Boss Mobile Life Coach",
    description: "Terms for using Papa Life, bossmobilelifecoach.com, ORACLE, courses, and membership.",
    eyebrow: "Terms of Service",
    headline: "Terms of Service",
    intro:
      "By using bossmobilelifecoach.com, the ORACLE AI coach, Papa Life courses, or the $4.99/month membership, visitors agree to these terms.",
    sections: [
      ["Coaching service", "Papa Life is a coaching and educational service, not therapy, counseling, or licensed mental health care."],
      ["Membership", "Papa Life membership bills monthly after any free trial period until canceled."],
    ],
  },
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    if (ch === '"') return "&quot;";
    return "&#39;";
  });
}

function bodyHtml(page) {
  return `
    <main id="server-prerender" style="font-family: Inter, Arial, sans-serif; background: #050505; color: #f8fafc; min-height: 100vh; padding: 64px 20px;">
      <article style="max-width: 920px; margin: 0 auto;">
        <p style="color: #f6c74a; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;">${escapeHtml(page.eyebrow)}</p>
        <h1 style="font-size: clamp(2.25rem, 6vw, 4.75rem); line-height: 1.02; margin: 18px 0;">${escapeHtml(page.headline)}</h1>
        <p style="font-size: 1.2rem; line-height: 1.7; color: #d4d4d8; max-width: 760px;">${escapeHtml(page.intro)}</p>
        <div style="display: grid; gap: 24px; margin-top: 42px;">
          ${page.sections
            .map(([heading, body]) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(body)}</p></section>`)
            .join("")}
        </div>
      </article>
    </main>`;
}

function render(page) {
  return template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(page.description)}" />`
    )
    .replace('<div id="root"></div>', `<div id="root">${bodyHtml(page)}</div>`);
}

for (const page of pages) {
  const html = render(page);
  if (page.path === "/") {
    fs.writeFileSync(templatePath, html);
    continue;
  }

  const routeDir = path.join(publicDir, page.path.replace(/^\//, ""));
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(path.join(routeDir, "index.html"), html);
}

console.log(`Generated ${pages.length} static SEO pages in ${publicDir}`);

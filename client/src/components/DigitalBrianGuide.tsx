import { useState } from "react";

type Topic = { id: string; question: string; answer: string; href: string; action: string };

const ownerTopics: Topic[] = [
  {
    id: "assign",
    question: "How do I give a worker an assignment?",
    answer: "Return to Papa Life OS and tap Give Assignment to Workers. Choose the business and worker, describe a read-only task, and queue it. No paid voice assistant is needed. Work cannot start until you approve it.",
    href: "/papa-life-os",
    action: "Open Worker Command Center",
  },
  {
    id: "approvals",
    question: "Where do I approve and review work?",
    answer: "Open Approvals & Queue to review the exact task and its stated external AI cost. Approve only work you recognize. The Mac worker checks for approved assignments independently of Digital Brian.",
    href: "/papa-life-os/approvals",
    action: "Open Approvals & Queue",
  },
  {
    id: "reports",
    question: "Where are my business reports?",
    answer: "Papa Life Daily Work Reports are stored with your Papa Life site rather than sent to the retired iShareHow journal. Worker completion and independent approval remain separate steps.",
    href: "/papa-daily-work-report",
    action: "Open Daily Work Reports",
  },
  {
    id: "pages",
    question: "Where are my website tools?",
    answer: "The Papa Life OS site directory links to your administration, courses, CRM, website pages, and other current tools. You can use these directly without starting a Digital Twin call.",
    href: "/papa-life-os/all-pages",
    action: "Open All Pages",
  },
];

const visitorTopics: Topic[] = [
  {
    id: "repair",
    question: "I want to reconnect with my adult child.",
    answer: "Begin with presence rather than pressure: listen to understand, own your impact without defending it, and choose one small, consistent action. Connection is an invitation, not a demand. The first Papa Life lesson gives you a place to start.",
    href: "/papa-first-lesson",
    action: "Explore the First Lesson",
  },
  {
    id: "framework",
    question: "What is the PAPA framework?",
    answer: "PAPA stands for Presence, Authority, Purpose, and Alignment. It's a way for fathers of adult children to grow in humility, steadiness, responsibility, and consistency.",
    href: "/papa-framework",
    action: "Explore the PAPA Framework",
  },
  {
    id: "courses",
    question: "What digital courses and services are available?",
    answer: "Papa Life provides self-guided digital learning and fatherhood resources. Explore the current course catalog for available options, details, and any published prices. No membership signup is required simply to browse.",
    href: "/courses",
    action: "Explore Digital Courses",
  },
  {
    id: "support",
    question: "How can I begin without a voice call?",
    answer: "You can use the first lesson and website resources without starting a paid voice conversation. If you need Brian personally, use the site's verified contact channel; this guide does not send him a message or claim he has read your words.",
    href: "/papa-first-lesson",
    action: "Begin with a Lesson",
  },
];

export function DigitalBrianGuide({ mode }: { mode: "owner" | "visitor" }) {
  const topics = mode === "owner" ? ownerTopics : visitorTopics;
  const [selected, setSelected] = useState(topics[0].id);
  const topic = topics.find((item) => item.id === selected) || topics[0];
  return (
    <section className="w-full rounded-2xl border border-white/15 bg-[#141414] p-5 text-left text-white" aria-label="Digital Brian no-cost guide">
      <h2 className="text-lg font-bold text-brand-yellow">{mode === "owner" ? "Digital Brian — OS Guide" : "Digital Brian — Start Here"}</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/70">
        {mode === "owner"
          ? "Select a topic for immediate, no-model-cost guidance. This does not submit or approve worker assignments."
          : "I'm Brian's digital guide, not Brian himself. Choose a question for a prepared answer and a helpful Papa Life resource."}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {topics.map((item) => (
          <button key={item.id} type="button" onClick={() => setSelected(item.id)}
            aria-pressed={item.id === topic.id}
            className={`rounded-lg border px-3 py-3 text-left text-sm font-semibold transition ${item.id === topic.id ? "border-brand-yellow bg-brand-yellow/15 text-white" : "border-white/20 bg-white/5 text-white/80 hover:border-brand-yellow/60"}`}>
            {item.question}
          </button>
        ))}
      </div>
      <div aria-live="polite" className="mt-4 rounded-xl border border-brand-yellow/25 bg-black/30 p-4">
        <p className="font-semibold">{topic.question}</p>
        <p className="mt-2 text-sm leading-relaxed text-white/75">{topic.answer}</p>
        <a className="mt-4 inline-block rounded-lg bg-brand-yellow px-4 py-2 text-sm font-bold text-black hover:brightness-110" href={topic.href}>{topic.action}</a>
      </div>
      <p className="mt-3 text-xs text-white/50">These prepared answers work without an AI-provider call or ElevenLabs credits. They are not a live conversation with Brian.</p>
    </section>
  );
}

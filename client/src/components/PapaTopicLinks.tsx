import { useLocation } from "wouter";
import linksByPath from "@/content/papa-topic-links.json";

type Topic = { title: string; hub: string[] | null; links: string[][] };

export function PapaTopicLinks() {
  const [location] = useLocation();
  const topic = (linksByPath as Record<string, Topic>)[location.replace(/\/+$/, "")];
  if (!topic) return null;

  return (
    <section aria-label="Related Papa Life pages" className="bg-[#fffaf0] px-6 py-8 text-[#17231c]">
      <div className="mx-auto max-w-5xl">
        {topic.hub && (
          <nav aria-label="Breadcrumb" className="mb-4 text-sm">
            <a className="underline" href="/">Home</a> /{" "}
            <a className="underline" href={topic.hub[0]}>{topic.hub[1]}</a> /{" "}
            <span aria-current="page">{topic.title}</span>
          </nav>
        )}
        <h2 className="text-xl font-bold">Continue exploring</h2>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
          {topic.links.map(([href, label]) => (
            <li key={href}><a className="font-semibold underline" href={href}>{label}</a></li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SiteLogoStacked } from "@/components/SiteLogo";
import {
  TAG_TO_JOURNAL_PROMPT,
  getFunnelEmail,
  getFunnelTag,
  logFunnelEngagement,
  type PapaIssueKey,
} from "@/lib/papa-funnel";

export default function PapaJournal() {
  const [, navigate] = useLocation();
  const [body, setBody] = useState("");
  const tag = getFunnelTag();
  const prompt = useMemo(() => TAG_TO_JOURNAL_PROMPT[tag as PapaIssueKey] ?? TAG_TO_JOURNAL_PROMPT.ready_to_change, [tag]);

  useEffect(() => {
    const email = getFunnelEmail();
    void logFunnelEngagement(email, "funnel_reached_journal", `tag=${tag}`);
  }, [tag]);

  const handleContinue = () => {
    const email = getFunnelEmail();
    void logFunnelEngagement(email, "funnel_journal_continue", body.trim() ? "has_text" : "empty");
    navigate("/papa-first-lesson");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="container max-w-3xl mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link href="/papa-intro">
            <a className="text-sm text-gray-400 hover:text-brand-yellow transition-colors">← Video</a>
          </Link>
          <SiteLogoStacked size="sm" className="sm:ml-auto" />
        </div>
      </header>

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-10 md:py-14 space-y-8">
        <div className="space-y-3">
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-white">Reflection</h1>
          <p className="text-gray-400 text-sm uppercase tracking-wide">Your prompt</p>
          <p className="text-lg md:text-xl text-gray-100 leading-relaxed border-l-4 border-brand-yellow pl-4 py-1">
            {prompt}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="journal" className="text-sm text-gray-400">
            Write freely — this is for you.
          </label>
          <Textarea
            id="journal"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="bg-white/[0.04] border-white/15 text-gray-100 placeholder:text-gray-600 resize-y min-h-[200px]"
            placeholder="Take your time…"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:justify-end pt-4">
          <Button
            type="button"
            onClick={handleContinue}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 text-lg rounded-full"
          >
            Continue To My Next Step
          </Button>
        </div>
      </main>
    </div>
  );
}

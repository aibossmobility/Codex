import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SiteLogoStacked } from "@/components/SiteLogo";
import { HEYGEN_EMBED_URL, getFunnelEmail, logFunnelEngagement } from "@/lib/papa-funnel";

export default function PapaIntroVideo() {
  useEffect(() => {
    const email = getFunnelEmail();
    void logFunnelEngagement(email, "funnel_reached_video", "Papa intro HeyGen");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Link href="/">
            <a className="text-sm text-gray-400 hover:text-brand-yellow transition-colors">Back to Home</a>
          </Link>
          <SiteLogoStacked size="sm" className="sm:ml-auto" />
        </div>
      </header>

      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8">
        <div className="space-y-4 text-gray-200 text-base md:text-lg leading-relaxed max-w-3xl mx-auto text-center">
          <p>What you are experiencing is not random.</p>
          <p>
            Most fathers were never shown how to navigate the shift from raising a child to relating to an adult son or daughter.
          </p>
          <p className="text-white font-medium">Watch this first. Then take the next step below.</p>
        </div>

        <a
          href={HEYGEN_EMBED_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto flex aspect-video max-w-3xl flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#141210] to-black px-6 text-center shadow-2xl transition-colors hover:from-[#1a1817] hover:to-[#050505]"
          aria-label="Papa Life intro video"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="ml-1 h-7 w-7" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="text-lg font-semibold text-white">Papa Life intro video</span>
          <span className="text-sm text-white/55">Open video</span>
        </a>

        <div className="flex justify-center pt-2">
          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 text-lg rounded-full"
          >
            <Link href="/papa-journal">
              <a>Go To My Reflection Step</a>
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

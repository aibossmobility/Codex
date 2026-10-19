import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const DIGITAL_TWIN_URL = "https://papa-life-digital-twin-preview-production.up.railway.app/";

export default function DigitalTwinPortal() {
  const [, navigate] = useLocation();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) navigate("/login");
      })
      .catch(() => navigate("/login"))
      .finally(() => setAuthChecked(true));
  }, [navigate]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-yellow" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col">
      <header className="shrink-0 border-b border-white/10 bg-black px-3 py-2">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <img src="/images/papa-life-logo.png" alt="Papa Life" className="h-9 w-9 rounded-lg bg-white object-contain" />
          <div>
            <h1 className="font-bold leading-tight">Papa Life Digital Twin</h1>
            <p className="text-xs text-gray-500">Cloud mode — Mac not required</p>
          </div>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => navigate("/papa-life-os")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Papa Life OS
          </Button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <h2 className="text-2xl font-bold">Talk with Brian's Digital Twin</h2>
        <p className="max-w-lg text-gray-300">
          The Digital Twin opens in its own secure page. This avoids a browser restriction that prevents it from loading inside Papa Life OS.
        </p>
        <a href={DIGITAL_TWIN_URL} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-xl bg-brand-yellow px-6 py-4 font-bold text-black hover:bg-brand-yellow/90">
          Open Digital Twin <ExternalLink className="ml-2 h-5 w-5" />
        </a>
        <p className="text-sm text-gray-400">
          Voice and chat may use ElevenLabs credits. For free local worker assignments,
          return to Papa Life OS and select Give Assignment to Workers instead.
        </p>
      </main>
    </div>
  );
}

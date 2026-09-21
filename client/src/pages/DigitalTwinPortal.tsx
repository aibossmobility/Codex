import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
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
      <iframe
        title="Papa Life Digital Twin"
        src={DIGITAL_TWIN_URL}
        allow="microphone; camera; autoplay"
        className="min-h-0 flex-1 w-full border-0 bg-black"
      />
    </div>
  );
}

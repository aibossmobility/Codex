import { createElement, useEffect } from "react";

const AGENT_ID = "agent_7601kt209ptbe0qrd9b3e4gezyv6";

export function BrianLiveAvatar() {
  useEffect(() => {
    const id = "papa-elevenlabs-widget-script";
    if (document.getElementById(id)) return;
    const script = document.createElement("script");
    script.id = id;
    script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="overflow-hidden rounded-3xl border border-[#f2c230]/35 bg-black shadow-2xl">
      <img src="/images/brian-green-sweater-live.jpg" alt="Brian Keith Hill in a green sweater" className="aspect-video w-full object-cover" />
      <div className="border-t border-white/10 p-5 text-white">
        <p className="font-extrabold">Brian Keith Hill — Papa Life Digital Twin</p>
        <p className="mt-2 text-sm text-white/70">Use the microphone below to speak with Brian's Papa Life AI.</p>
        <div className="mt-4">{createElement("elevenlabs-convai", { "agent-id": AGENT_ID })}</div>
      </div>
    </div>
  );
}

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
      <video
        controls
        playsInline
        preload="metadata"
        poster="/videos/brian-green-sweater-papa-life-clean.jpg"
        className="aspect-video w-full bg-black object-cover"
        aria-label="Brian Keith Hill — Papa Life welcome video"
      >
        <source src="/videos/brian-green-sweater-papa-life-clean.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="border-t border-white/10 p-5 text-white">
        <p className="font-extrabold">Brian Keith Hill — Papa Life Digital Twin</p>
        <p className="mt-2 text-sm text-white/70">Use the microphone below to speak with Brian's Papa Life AI.</p>
        <div className="mt-4">
          {createElement("elevenlabs-convai", {
            "agent-id": AGENT_ID,
            "worklet-path-raw-audio-processor": "/vendor/elevenlabs-worklets/rawAudioProcessor.js",
            "worklet-path-audio-concat-processor": "/vendor/elevenlabs-worklets/audioConcatProcessor.js",
          })}
        </div>
      </div>
    </div>
  );
}

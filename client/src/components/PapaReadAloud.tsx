import { useEffect, useRef, useState } from "react";
import { ClipboardPaste, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function splitIntoSpeechChunks(text: string): string[] {
  const chunks: string[] = [];
  let phrase = "";
  for (const word of text.trim().split(/\s+/)) {
    if (phrase && phrase.length + word.length + 1 > 160) {
      chunks.push(phrase);
      phrase = word;
    } else {
      phrase = phrase ? phrase + " " + word : word;
    }
  }
  if (phrase) chunks.push(phrase);
  return chunks;
}

/** Browser TTS only: no paid API, server upload, or saved text. */
export default function PapaReadAloud() {
  const [text, setText] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const speechSequence = useRef(0);
  const textBox = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
    return () => {
      speechSequence.current += 1;
      window.speechSynthesis?.cancel();
    };
  }, []);

  function stop() {
    speechSequence.current += 1;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }

  function start() {
    if (!text.trim()) {
      toast.message("Paste or type some words into the box first.");
      textBox.current?.focus();
      return;
    }
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      toast.error("Audio reading is unavailable here. Open Papa Life OS in Chrome on your phone.");
      return;
    }
    stop();
    const ticket = speechSequence.current;
    const chunks = splitIntoSpeechChunks(text);
    let index = 0;
    function speakNext() {
      if (ticket !== speechSequence.current) return;
      if (index === chunks.length) {
        setSpeaking(false);
        return;
      }
      const voice = new SpeechSynthesisUtterance(chunks[index++]);
      voice.lang = "en-US";
      voice.rate = 0.94;
      voice.onend = speakNext;
      voice.onerror = (event) => {
        if (ticket !== speechSequence.current) return;
        setSpeaking(false);
        if (event.error !== "interrupted" && event.error !== "canceled") toast.error("Reading stopped. Tap Read Text Aloud to try again.");
      };
      window.speechSynthesis.speak(voice);
    }
    setSpeaking(true);
    speakNext();
  }

  async function paste() {
    try {
      if (!navigator.clipboard?.readText) throw new Error("No clipboard read permission");
      const copied = await navigator.clipboard.readText();
      if (!copied.trim()) {
        toast.message("Your clipboard is empty. Copy some words first.");
        return;
      }
      stop();
      setText(copied.slice(0, 30000));
      toast.success("Text pasted. Tap Read Text Aloud.");
    } catch {
      textBox.current?.focus();
      toast.message("Long-press in the text box and choose Paste.");
    }
  }

  return (
    <section id="read-aloud" aria-labelledby="read-aloud-heading" className="scroll-mt-24 rounded-2xl border-2 border-brand-yellow bg-[#151515] p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-brand-yellow p-3 text-black"><Volume2 aria-hidden="true" className="h-7 w-7" /></span>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-brand-yellow">Quick tool — no credits</p>
          <h2 id="read-aloud-heading" className="text-2xl font-black text-white">READ TEXT ALOUD</h2>
        </div>
      </div>
      <p className="mt-3 text-base text-white/85">Copy any words, paste them below, and tap the yellow button to hear them.</p>
      <label htmlFor="papa-read-text" className="mt-4 block text-base font-bold text-white">Text to read</label>
      <Textarea
        id="papa-read-text"
        ref={textBox}
        value={text}
        maxLength={30000}
        onChange={(event) => {
          if (speaking) stop();
          setText(event.target.value);
        }}
        placeholder="Tap here to type, or long-press and choose Paste…"
        className="mt-2 min-h-36 resize-y border-white/35 bg-black text-base leading-relaxed text-white placeholder:text-gray-400"
      />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr]">
        <Button type="button" size="lg" variant="outline" onClick={() => void paste()} className="min-h-14 border-white/40 bg-white/10 text-base font-bold text-white hover:bg-white/20 hover:text-white">
          <ClipboardPaste className="mr-2 h-5 w-5" />PASTE TEXT
        </Button>
        <Button type="button" size="lg" onClick={start} disabled={!supported} className="min-h-16 bg-brand-yellow text-lg font-black text-black hover:bg-[#ffde6b]">
          <Volume2 className="mr-2 h-6 w-6" />READ TEXT ALOUD
        </Button>
      </div>
      {speaking && (
        <Button type="button" variant="outline" onClick={stop} className="mt-3 min-h-12 w-full border-red-400/60 text-base font-bold text-red-200 hover:bg-red-950/30">
          <Square className="mr-2 h-4 w-4" />STOP READING
        </Button>
      )}
      {!supported && <p role="alert" className="mt-3 text-sm text-red-200">This browser does not support speech. Please open the page in Chrome on your Samsung phone.</p>}
      <p className="mt-3 text-xs leading-relaxed text-gray-400">Uses your phone/browser's regular speech voice, not Brian's clone or ElevenLabs. No voice credits are used. This tool does not save or upload your pasted text.</p>
    </section>
  );
}

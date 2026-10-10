import { CalendarDays, ClipboardCheck } from "lucide-react";
import { PAPA_CONVERSATION_REQUEST_URL } from "@/lib/papa-links";

const BOOKING_URL = PAPA_CONVERSATION_REQUEST_URL;

export function GlobalBookingButton() {
  return (
    <div className="relative mx-auto my-6 flex w-fit max-w-[calc(100%-2rem)] flex-col items-center gap-2">
      <a
        href="/assessment?src=global_checkin"
        aria-label="Take the Papa Life 2-Minute Fatherhood Check-In"
        className="inline-flex max-w-full min-h-12 items-center text-center justify-center gap-2 rounded-full border-2 border-[#145b35] bg-[#f2c230] px-5 py-3 text-sm font-extrabold text-[#17231c] shadow-xl transition hover:-translate-y-0.5 hover:bg-[#f7d75e] focus:outline-none focus:ring-4 focus:ring-[#145b35]/30"
      >
        <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
        <span>2-Minute Fatherhood Check-In</span>
      </a>
      <a
        href={BOOKING_URL}
        aria-label="Request a Papa Life conversation with Brian Keith Hill by email"
        className="inline-flex max-w-full min-h-10 items-center text-center justify-center gap-2 rounded-full border border-[#f2c230] bg-[#145b35] px-4 py-2 text-xs font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#0f492a] focus:outline-none focus:ring-4 focus:ring-[#f2c230]/40"
      >
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
        <span>Request a Papa Life Conversation</span>
      </a>
    </div>
  );
}

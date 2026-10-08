import { CalendarDays, ClipboardCheck } from "lucide-react";

const BOOKING_URL = "https://calendar.app.google/Jcu2RaCp4jyC1zE36";

export function GlobalBookingButton() {
  return (
    <div className="fixed bottom-5 left-4 z-[60] flex flex-col items-start gap-2 sm:left-6">
      <a
        href="/assessment?src=global_checkin"
        aria-label="Take the Papa Life 2-Minute Fatherhood Check-In"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-[#145b35] bg-[#f2c230] px-5 py-3 text-sm font-extrabold text-[#17231c] shadow-xl transition hover:-translate-y-0.5 hover:bg-[#f7d75e] focus:outline-none focus:ring-4 focus:ring-[#145b35]/30"
      >
        <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
        <span>2-Minute Fatherhood Check-In</span>
      </a>
      <a
        href={BOOKING_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Schedule a conversation with Brian Keith Hill using Google Calendar"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#f2c230] bg-[#145b35] px-4 py-2 text-xs font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#0f492a] focus:outline-none focus:ring-4 focus:ring-[#f2c230]/40"
      >
        <CalendarDays className="h-4 w-4" aria-hidden="true" />
        <span>Book a Google Meet Conversation</span>
      </a>
    </div>
  );
}

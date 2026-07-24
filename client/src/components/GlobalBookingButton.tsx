import { CalendarDays } from "lucide-react";

const BOOKING_URL = "https://calendly.com/briankeithhill/30";

export function GlobalBookingButton() {
  return (
    <a
      href={BOOKING_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Schedule a Papa Life conversation with Brian Keith Hill"
      className="fixed bottom-5 left-4 z-[60] inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-[#f2c230] bg-[#145b35] px-5 py-3 text-sm font-extrabold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-[#0f492a] focus:outline-none focus:ring-4 focus:ring-[#f2c230]/40 sm:left-6"
    >
      <CalendarDays className="h-5 w-5" aria-hidden="true" />
      <span>Book a Conversation</span>
    </a>
  );
}

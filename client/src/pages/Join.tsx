import CheckoutForm from "@/components/CheckoutForm";
import { useLocation } from "wouter";

export default function Join() {
  const [, navigate] = useLocation();
  const supporterMode = Date.now() >= Date.parse("2026-11-01T07:00:00.000Z");
  if (supporterMode) return (
    <main className="min-h-screen bg-[#0a0a0a] px-5 py-16 text-white">
      <div className="mx-auto max-w-2xl rounded-xl border border-[#f2c230] bg-[#152b20] p-8">
        <h1 className="text-4xl font-extrabold">Support the growth of Papa Life</h1>
        <p className="mt-5 text-lg">Starting November 1, 2026, $4.99 or $5 contributions support our work with fathers and families. Giving is optional. Donations are not memberships and do not unlock lessons, courses, discounts, or other materials.</p>
        <p className="mt-4">We are verifying the approved contribution payment link. No payment is taken on this page until that secure option is connected. Existing recurring subscriptions are not automatically turned into donations.</p>
        <a href="/shop" className="mt-8 inline-block rounded-lg bg-[#f2c230] px-5 py-3 font-extrabold text-black">Browse Papa Life materials</a>
      </div>
    </main>
  );
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <CheckoutForm onClose={() => navigate("/")} />
    </div>
  );
}

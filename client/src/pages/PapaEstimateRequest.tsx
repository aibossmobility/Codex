import { useEffect, useState, type FormEvent } from "react";
import { PageMeta } from "@/components/PageMeta";
import { SiteLogo } from "@/components/SiteLogo";

type Offer = {
  code: string;
  canonical_name: string;
  public_price_display: string;
};
type Result = {
  ok: boolean;
  reference?: string;
  product?: string;
  status?: string;
  error?: string;
  tax_notice?: string;
  next_step?: string;
};
const CUTOVER = Date.parse("2026-11-01T07:00:00.000Z");

export default function PapaEstimateRequest() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [productCode, setProductCode] = useState(new URLSearchParams(window.location.search).get("product") || "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [salesReady, setSalesReady] = useState(false);
  const active = Date.now() >= CUTOVER;
  useEffect(() => {
    fetch("/api/public/papa-commerce-policy").then((r) => r.json()).then((data) => setSalesReady(Boolean(data.purchase?.sales_ready))).catch(() => setSalesReady(false));
    fetch("/api/public/commerce-catalog")
      .then((r) => r.json())
      .then((data) => setOffers((data.products || []).filter((x: Offer) => x.code !== "membership.community.monthly")))
      .catch(() => setOffers([]));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!active || !salesReady || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const response = await fetch("/api/public/papa-estimate-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_code: productCode, name, email, note }),
      });
      const data = await response.json() as Result;
      setResult(data);
    } catch {
      setResult({ ok: false, error: "The request could not be saved. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#101610] text-white">
      <PageMeta title="Request a Papa Life Estimate" description="Review Papa Life materials and request a written product estimate before signing and payment." />
      <nav className="border-b border-white/15 p-5"><a href="/"><SiteLogo size="md" /></a></nav>
      <main className="mx-auto max-w-3xl p-6 py-12">
        <p className="font-bold uppercase tracking-wider text-[#f2c230]">Papa Life product requests</p>
        <h1 className="mt-3 text-3xl font-extrabold md:text-5xl">Understand the value before you pay.</h1>
        <p className="mt-4 text-white/80">Choose a product, request a written estimate, review its price and terms, and sign only when you are comfortable. Payment is not collected on this form. An estimate request is not an invoice or a confirmed purchase.</p>
        {!active && <div className="mt-8 rounded-xl border border-[#f2c230] bg-[#2b2916] p-5">The new process begins November 1, 2026. Legacy sales links are closed for safety; no payment is collected on this website.</div>}
        {active && !salesReady && <div className="mt-8 rounded-xl border border-[#f2c230] bg-[#152b20] p-6"><h2 className="text-2xl font-bold">Sales are moving to GoHighLevel</h2><p className="mt-3">Papa Life will use only the verified GoHighLevel product catalog, written estimates, electronic signatures, and payment requests. Products shown on the website are not yet ready for checkout. Older P2P and bossmobility.net sales links are not authorized.</p><p className="mt-3">No estimate, invoice, or payment has been created. For product questions, use the Papa Life contact address below.</p></div>}
        {active && salesReady && !result?.ok && <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-white/20 bg-white/5 p-6">
          <label className="block font-semibold">Papa Life product
            <select required value={productCode} onChange={(event) => setProductCode(event.target.value)} className="mt-2 w-full rounded-lg border border-white/30 bg-[#152b20] p-3 text-white">
              <option value="">Select a product</option>
              {offers.map((offer) => <option value={offer.code} key={offer.code}>{offer.canonical_name} — {offer.public_price_display}</option>)}
            </select>
          </label>
          <label className="block font-semibold">Your name
            <input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="mt-2 w-full rounded-lg border border-white/30 bg-[#152b20] p-3 text-white" />
          </label>
          <label className="block font-semibold">Email for your estimate
            <input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-2 w-full rounded-lg border border-white/30 bg-[#152b20] p-3 text-white" />
          </label>
          <label className="block font-semibold">Optional questions
            <textarea rows={4} maxLength={1500} value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 w-full rounded-lg border border-white/30 bg-[#152b20] p-3 text-white" />
          </label>
          <p className="text-sm text-white/65">Submitting records your request for an estimate, not consent to a charge or a subscription. Any applicable tax and payment terms must appear in the agreement you review.</p>
          <button type="submit" disabled={busy || !productCode} className="w-full rounded-lg bg-[#f2c230] px-5 py-4 font-extrabold text-black disabled:opacity-50">{busy ? "Recording request..." : "Request my written estimate"}</button>
        </form>}
        {result && <div role="status" className="mt-8 rounded-xl border border-[#f2c230] p-6">
          {result.ok ? <>
            <h2 className="text-2xl font-bold">Request recorded: {result.reference}</h2>
            <p className="mt-2">Product: {result.product || "Selected item"}</p>
            <p className="mt-2">No payment was taken. No invoice was generated, and your signature has not yet been collected.</p>
            <p className="mt-3 text-white/70">A written estimate and a secure signature step still need to follow. Keep this reference for your records.</p>
          </> : <p>{result.error || "Please check the form and try again."}</p>}
        </div>}
        <p className="mt-8 text-sm text-white/70">Need assistance? <a className="underline text-[#f2c230]" href="mailto:brian@papalifecoach.com?subject=Papa%20Life%20Estimate%20Question">Contact Papa Life</a>. The Digital Twin can explain the process but cannot claim a signature, invoice, or payment without verified confirmation.</p>
        <a href="/shop" className="mt-8 inline-block font-bold text-[#f2c230] underline">Return to the Papa Life shop</a>
      </main>
    </div>
  );
}

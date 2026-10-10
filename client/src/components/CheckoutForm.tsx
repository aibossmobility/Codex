/**
 * Legacy checkout has been retired for safety. This intentionally contains no
 * payment URL, fallback gateway, capture form, or payment action. Papa Life
 * sales must be configured and verified inside Brian's authorized HighLevel.
 */
interface CheckoutFormProps { onClose: () => void }

export default function CheckoutForm({ onClose }: CheckoutFormProps) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Papa Life purchasing update" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4">
      <section className="my-12 w-full max-w-lg rounded-xl border border-white/20 bg-[#12271c] p-7 text-white">
        <h2 className="text-2xl font-extrabold text-[#f2c230]">Papa Life purchasing is being updated</h2>
        <p className="mt-4 text-white/85">
          We are moving purchasing to a verified estimate, agreement, and payment process.
          No payment is collected through this old form, and older checkout links should not be used.
        </p>
        <p className="mt-4 text-white/80">
          Existing purchased materials remain available under their original terms.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a className="rounded-md bg-[#f2c230] px-4 py-2 font-bold text-[#111c17]" href="/shop">Review products</a>
          <a className="rounded-md border border-white/40 px-4 py-2 font-bold" href="mailto:brian@papalifecoach.com?subject=Papa%20Life%20Product%20Question">Ask a question</a>
          <button type="button" className="rounded-md border border-white/40 px-4 py-2 font-bold" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

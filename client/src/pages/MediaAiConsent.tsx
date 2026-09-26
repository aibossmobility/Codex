import { useMemo, useState } from "react";

const CONSENT_TEXT =
  "I give Brian Keith Hill / AI Boss Mobility / Papa Life permission to use the materials I voluntarily provide, only for the categories and purposes I select below. I understand that approved materials may be edited, adapted, or processed with artificial-intelligence tools for the selected uses. I confirm that I have authority to grant this permission.";

type ConsentState = {
  full_name: string;
  email: string;
  project_or_purpose: string;
  allow_photo: boolean;
  allow_video: boolean;
  allow_voice: boolean;
  allow_name_likeness: boolean;
  allow_testimonial: boolean;
  allow_website_social: boolean;
  allow_education_training: boolean;
  allow_marketing: boolean;
  allow_ai_assisted_editing: boolean;
  consent_all: boolean;
  typed_signature: string;
  affirm: boolean;
};

const initial: ConsentState = {
  full_name: "", email: "", project_or_purpose: "",
  allow_photo: false, allow_video: false, allow_voice: false,
  allow_name_likeness: false, allow_testimonial: false,
  allow_website_social: false, allow_education_training: false,
  allow_marketing: false, allow_ai_assisted_editing: false,
  consent_all: false, typed_signature: "", affirm: false,
};

export default function MediaAiConsent() {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const permissionKeys = useMemo(() => [
    "allow_photo","allow_video","allow_voice","allow_name_likeness","allow_testimonial",
    "allow_website_social","allow_education_training","allow_marketing","allow_ai_assisted_editing"
  ] as const, []);

  const set = <K extends keyof ConsentState>(key: K, value: ConsentState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleAll = (checked: boolean) => {
    setForm((prev) => {
      const next = { ...prev, consent_all: checked };
      permissionKeys.forEach((key) => { next[key] = checked; });
      return next;
    });
  };

  const Check = ({ name, children }: { name: keyof ConsentState; children: React.ReactNode }) => (
    <label className="flex items-start gap-3 rounded-lg border border-white/15 bg-white/5 p-3">
      <input type="checkbox" className="mt-1 h-5 w-5" checked={Boolean(form[name])}
        onChange={(e) => set(name, e.target.checked as never)} />
      <span>{children}</span>
    </label>
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.affirm) return setStatus("Please confirm that you have read and agree to the permission statement.");
    setSaving(true); setStatus("Recording permission…");
    try {
      const response = await fetch("/api/media-ai-consent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, consent_text: CONSENT_TEXT }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Unable to record permission.");
      setStatus("Thank you. Your permission has been recorded.");
      setForm(initial);
    } catch (error: any) {
      setStatus(error?.message || "Unable to record permission.");
    } finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-[#17231c] px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="font-extrabold text-[#f2c230]">← Papa Life</a>
        <div className="mt-6 rounded-2xl border border-[#f2c230]/30 bg-black/30 p-6 shadow-2xl md:p-9">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f2c230]">Clear permission. Respect first.</p>
          <h1 className="mt-2 text-4xl font-extrabold">Media & AI Permission</h1>
          <p className="mt-4 text-white/75">Choose exactly what you give Brian Keith Hill / Papa Life / AI Boss Mobility permission to use. Nothing is pre-selected.</p>

          <form onSubmit={submit} className="mt-8 space-y-7">
            <section className="space-y-3">
              <h2 className="text-xl font-extrabold text-[#f2c230]">Your information</h2>
              <input required value={form.full_name} onChange={(e)=>set("full_name",e.target.value)} placeholder="Full name" className="w-full rounded-lg border border-white/20 bg-black px-4 py-3" />
              <input required type="email" value={form.email} onChange={(e)=>set("email",e.target.value)} placeholder="Email" className="w-full rounded-lg border border-white/20 bg-black px-4 py-3" />
              <input value={form.project_or_purpose} onChange={(e)=>set("project_or_purpose",e.target.value)} placeholder="Project or purpose (optional)" className="w-full rounded-lg border border-white/20 bg-black px-4 py-3" />
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-extrabold text-[#f2c230]">What may be used?</h2>
              <Check name="allow_photo">My photographs or images</Check>
              <Check name="allow_video">My video recordings</Check>
              <Check name="allow_voice">My voice or audio recordings</Check>
              <Check name="allow_name_likeness">My name and likeness</Check>
              <Check name="allow_testimonial">My testimonial, interview, story, or written comments</Check>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-extrabold text-[#f2c230]">How may it be used?</h2>
              <Check name="allow_website_social">Website and social media</Check>
              <Check name="allow_education_training">Educational presentations and training</Check>
              <Check name="allow_marketing">Promotional or marketing materials</Check>
              <Check name="allow_ai_assisted_editing">AI-assisted editing or content creation</Check>
              <label className="flex items-start gap-3 rounded-lg border-2 border-[#145b35] bg-[#145b35]/20 p-3 font-extrabold">
                <input type="checkbox" className="mt-1 h-5 w-5" checked={form.consent_all} onChange={(e)=>toggleAll(e.target.checked)} />
                <span>I approve all categories and uses listed above.</span>
              </label>
            </section>

            <section className="rounded-xl border border-[#b33a32]/50 bg-[#b33a32]/10 p-4">
              <h2 className="font-extrabold text-[#f6cf55]">Consent statement</h2>
              <p className="mt-2 text-sm leading-6 text-white/80">{CONSENT_TEXT}</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-extrabold text-[#f2c230]">Signature</h2>
              <input required value={form.typed_signature} onChange={(e)=>set("typed_signature",e.target.value)} placeholder="Type your full name" className="w-full rounded-lg border border-white/20 bg-black px-4 py-3" />
              <label className="flex items-start gap-3"><input required type="checkbox" className="mt-1 h-5 w-5" checked={form.affirm} onChange={(e)=>set("affirm",e.target.checked)} /><span>I have read the statement and agree to the permissions I selected.</span></label>
              <p className="text-xs text-white/50">Submitting creates a dated record of the choices and permission language shown here.</p>
            </section>

            <button disabled={saving} type="submit" className="w-full rounded-xl bg-[#f2c230] px-5 py-4 text-lg font-black text-[#17231c] disabled:opacity-60">{saving ? "Saving…" : "Give Permission"}</button>
            {status && <p className="font-bold text-[#f2c230]" role="status">{status}</p>}
          </form>
        </div>
      </div>
    </main>
  );
}

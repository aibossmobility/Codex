import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getFirstTouchAttribution } from "@/lib/attribution";

const relationshipOptions = ["Close—strengthen", "Communication difficult", "Limited contact", "Disconnected", "Unsure"];
const concernOptions = ["I feel judged", "I feel shut out", "I don’t know what to say", "I’m afraid of making it worse", "I’m not sure"];
const nextStepOptions = ["Watch Tuesday Live", "Get weekly email", "Personal conversation", "I’ll think about it"];

export function FatherEngagementFollowUpForm() {
  const [form, setForm] = useState({ first_name: "", email: "", phone: "", relationship_status: "", fathers_stated_hope: "", primary_concern: "", preferred_next_step: "" });
  const [fatherConfirmed, setFatherConfirmed] = useState(false);
  const [followUpConsent, setFollowUpConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setField = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.first_name.trim() || !form.email.trim() || !form.relationship_status || !form.fathers_stated_hope.trim() || !form.primary_concern || !form.preferred_next_step) {
      toast.error("Please complete the required Fatherhood Check-In fields.");
      return;
    }
    if (!fatherConfirmed || !followUpConsent) {
      toast.error("Please confirm that you are a father of an adult child and that you are asking Papa Life to follow up.");
      return;
    }
    if (form.phone.trim() && !smsConsent) {
      toast.error("Please confirm SMS consent if you include a mobile number.");
      return;
    }
    setSubmitting(true);
    try {
      const attribution = getFirstTouchAttribution();
      const attributionAnswers = Object.fromEntries(
        Object.entries(attribution)
          .filter(([, value]) => Boolean(String(value || "").trim()))
          .map(([key, value]) => [`attribution_${key}`, String(value)])
      );
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: {
            first_name: form.first_name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            situation: form.fathers_stated_hope.trim(),
            routed_pillar: form.relationship_status,
            disconnected_pillar: form.primary_concern,
            vision: form.preferred_next_step,
            relationship_status: form.relationship_status,
            fathers_stated_hope: form.fathers_stated_hope.trim(),
            primary_concern: form.primary_concern,
            preferred_next_step: form.preferred_next_step,
            father_confirmation: "true",
            consent_follow_up: "true",
            sms_consent: form.phone.trim() && smsConsent ? "true" : "",
            father_engagement_opt_in: "true",
            ...attributionAnswers,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not submit your request");
      setSubmitted(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-5"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-300" /><div><p className="font-bold text-white">Your request is with Brian for review.</p><p className="mt-1 text-sm leading-relaxed text-white/65">Papa Life will use only the follow-up information you chose to share here. Your private reflection scores were not submitted.</p></div></div></div>;
  }

  const selectClass = "w-full rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-white focus:border-brand-yellow focus:outline-none";
  const inputClass = "w-full rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-white placeholder:text-white/35 focus:border-brand-yellow focus:outline-none";

  return <form onSubmit={submit} className="space-y-5">
    <div><Label>Your name <span className="text-brand-yellow">*</span></Label><input className={inputClass} value={form.first_name} onChange={(e)=>setField("first_name",e.target.value)} autoComplete="name" /></div>
    <div><Label>Email <span className="text-brand-yellow">*</span></Label><input type="email" className={inputClass} value={form.email} onChange={(e)=>setField("email",e.target.value)} autoComplete="email" /></div>
    <div><Label>Mobile (optional)</Label><input type="tel" className={inputClass} value={form.phone} onChange={(e)=>setField("phone",e.target.value)} autoComplete="tel" />{form.phone.trim() ? <label className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-white/55"><input type="checkbox" className="mt-1" checked={smsConsent} onChange={(e)=>setSmsConsent(e.target.checked)} /><span>I agree to receive Papa Life text messages about the follow-up I requested. Message frequency varies; message/data rates may apply. Reply STOP to opt out.</span></label> : null}</div>
    <div><Label>Where are things with your adult child right now? <span className="text-brand-yellow">*</span></Label><select className={selectClass} value={form.relationship_status} onChange={(e)=>setField("relationship_status",e.target.value)}><option value="">Choose one</option>{relationshipOptions.map((x)=><option key={x} value={x}>{x}</option>)}</select></div>
    <div><Label>What do you hope will be different? <span className="text-brand-yellow">*</span></Label><input className={inputClass} value={form.fathers_stated_hope} onChange={(e)=>setField("fathers_stated_hope",e.target.value)} placeholder="A short sentence is enough" /></div>
    <div><Label>What concerns you most right now? <span className="text-brand-yellow">*</span></Label><select className={selectClass} value={form.primary_concern} onChange={(e)=>setField("primary_concern",e.target.value)}><option value="">Choose one</option>{concernOptions.map((x)=><option key={x} value={x}>{x}</option>)}</select></div>
    <div><Label>What would help most next? <span className="text-brand-yellow">*</span></Label><select className={selectClass} value={form.preferred_next_step} onChange={(e)=>setField("preferred_next_step",e.target.value)}><option value="">Choose one</option>{nextStepOptions.map((x)=><option key={x} value={x}>{x}</option>)}</select></div>
    <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70"><input type="checkbox" className="mt-1" checked={fatherConfirmed} onChange={(e)=>setFatherConfirmed(e.target.checked)} /><span>I am the father of an adult child.</span></label>
    <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-white/70"><input type="checkbox" className="mt-1" checked={followUpConsent} onChange={(e)=>setFollowUpConsent(e.target.checked)} /><span>By submitting, I am asking Papa Life to respond with the resource, invitation, or personal follow-up I selected. My information will be handled under the Papa Life Privacy Policy, and I may ask Papa Life to stop contacting me at any time.</span></label>
    <Button type="submit" disabled={submitting} className="rounded-full bg-brand-yellow px-8 font-extrabold text-black hover:bg-brand-yellow/90">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : "Ask Brian for a Next Step →"}</Button>
  </form>;
}

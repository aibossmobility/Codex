import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type FormQuestion = {
  question_key: string;
  label: string;
  help_text: string | null;
  input_type: string;
  required: boolean;
  sort_order: number;
  placeholder: string | null;
  options: string[];
};

type PapaLeadFormProps = {
  onSuccess?: () => void;
  submitLabel?: string;
};

const SMS_CONSENT_TEXT =
  "By submitting this form, you agree to receive text messages from Papa Life regarding coaching appointments, educational resources, reminders, and account notifications. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe or HELP for assistance. SMS consent is not shared with third parties.";

export function PapaLeadForm({ onSuccess, submitLabel = "Get My Results →" }: PapaLeadFormProps) {
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [smsConsent, setSmsConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/forms/papa_lead");
        if (!res.ok) throw new Error("bad");
        const data = await res.json();
        if (!cancelled) {
          setQuestions(Array.isArray(data.questions) ? data.questions : []);
        }
      } catch {
        if (!cancelled) toast.error("Could not load the assessment form. Please refresh and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    for (const q of questions) {
      if (!q.required) continue;
      if (!(answers[q.question_key] ?? "").trim()) {
        toast.error(`Please complete: ${q.label}`);
        return false;
      }
    }
    const phoneQuestion = questions.find((q) => q.question_key === "phone" || q.input_type === "tel");
    if (phoneQuestion && (answers[phoneQuestion.question_key] ?? "").trim() && !smsConsent) {
      toast.error("Please confirm SMS consent before submitting your phone number.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/papa-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: { ...answers, sms_consent: smsConsent ? "true" : "" } }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Something went wrong. Please try again.");
        return;
      }
      const email = answers.email?.trim();
      if (email) {
        await fetch("/api/engagement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            event_type: "content_click",
            event_detail: "Completed relationship assessment (papa_lead)",
          }),
        }).catch(() => undefined);
      }
      onSuccess?.();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (q: FormQuestion) => {
    const value = answers[q.question_key] ?? "";

    if (q.input_type === "select" && q.options.length > 0) {
      return (
        <div className="grid gap-2">
          {q.options.map((opt) => {
            const selected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setField(q.question_key, opt)}
                className={`text-left rounded-xl border px-4 py-3 text-sm md:text-base transition-all ${
                  selected
                    ? "border-accent bg-accent/10 text-white ring-1 ring-accent/40"
                    : "border-white/15 bg-white/[0.03] text-gray-200 hover:border-white/25 hover:bg-white/[0.06]"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    const inputType =
      q.input_type === "email" ? "email" : q.input_type === "tel" ? "tel" : "text";

    return (
      <input
        type={inputType}
        value={value}
        onChange={(e) => setField(q.question_key, e.target.value)}
        placeholder={q.placeholder || ""}
        required={q.required}
        autoComplete={
          q.question_key === "first_name"
            ? "given-name"
            : q.question_key === "email"
              ? "email"
              : q.question_key === "phone"
                ? "tel"
                : undefined
        }
        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
      />
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm">Loading assessment…</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <p className="text-center text-red-300 py-8">
        The assessment form is not available right now. Please try again later.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {questions.map((q) => (
        <div key={q.question_key} className="space-y-2">
          <Label className="text-gray-300 text-sm md:text-base">
            {q.label}
            {q.required ? <span className="text-brand-yellow ml-1">*</span> : null}
          </Label>
          {q.help_text ? <p className="text-xs text-gray-500">{q.help_text}</p> : null}
          {renderField(q)}
          {(q.question_key === "phone" || q.input_type === "tel") ? (
            <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-gray-400">
              <input
                type="checkbox"
                checked={smsConsent}
                required={Boolean((answers[q.question_key] ?? "").trim())}
                onChange={(event) => setSmsConsent(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/30 bg-black accent-brand-yellow"
              />
              <span>{SMS_CONSENT_TEXT}</span>
            </label>
          ) : null}
        </div>
      ))}
      <Button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto bg-brand-yellow text-black hover:bg-brand-yellow/90 font-bold rounded-full px-8 py-6 text-base"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting…
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}

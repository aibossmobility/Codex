import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Loader2 } from "lucide-react";

const DEFAULT_PAYMENT_LINK =
  "https://agent.bossmobility.net/payment-link/68d610ad67ee3bd205696444";

const SMS_CONSENT_TEXT =
  "By submitting this form, you agree to receive text messages from Papa Life regarding coaching appointments, educational resources, reminders, and account notifications. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe or HELP for assistance. SMS consent is not shared with third parties.";

interface FormData {
  invited_by: string;
  first_name: string;
  last_name: string;
  mobile_phone: string;
  business_email: string;
  business_name: string;
  website: string;
  street_address: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  consent_transactional: boolean;
  consent_marketing: boolean;
}

interface CheckoutFormProps {
  onClose: () => void;
}

export default function CheckoutForm({ onClose }: CheckoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentLink, setPaymentLink] = useState(DEFAULT_PAYMENT_LINK);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      consent_transactional: false,
      consent_marketing: false,
    },
  });

  const consentTransactional = watch("consent_transactional");
  const consentMarketing = watch("consent_marketing");

  useEffect(() => {
    fetch("/api/public/pricing")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.checkout_payment_link) {
          setPaymentLink(String(data.checkout_payment_link));
        }
      })
      .catch(() => {
        // Keep default link if pricing endpoint is unavailable.
      });
  }, []);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");
    if (!data.consent_transactional) {
      setLoading(false);
      setError("Please confirm SMS consent before continuing to checkout.");
      return;
    }
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Server error");
      if (!paymentLink) {
        throw new Error("Checkout link is not configured");
      }
      window.open(paymentLink, "_blank", "noopener,noreferrer");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">Almost There!</h2>
            <p className="text-sm text-gray-400 mt-1">
              Please fill out the form below before proceeding to checkout.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Who Invited You */}
          <div className="space-y-1.5">
            <Label className="text-white">
              Who Invited you to fill out this form?{" "}
              <span className="text-red-400">*</span>
            </Label>
            <Input
              placeholder="First Name"
              className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
              {...register("invited_by", { required: "This field is required" })}
            />
            {errors.invited_by && (
              <p className="text-red-400 text-xs">{errors.invited_by.message}</p>
            )}
          </div>

          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-white">
                First Name <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="First Name"
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                {...register("first_name", { required: "Required" })}
              />
              {errors.first_name && (
                <p className="text-red-400 text-xs">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-white">
                Last Name <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="Last Name"
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                {...register("last_name", { required: "Required" })}
              />
              {errors.last_name && (
                <p className="text-red-400 text-xs">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          {/* Mobile Phone */}
          <div className="space-y-1.5">
            <Label className="text-white">
              Mobile Phone <span className="text-red-400">*</span>
            </Label>
            <Input
              type="tel"
              placeholder="Phone"
              className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
              {...register("mobile_phone", { required: "Required" })}
            />
            {errors.mobile_phone && (
              <p className="text-red-400 text-xs">{errors.mobile_phone.message}</p>
            )}
            <div className="flex gap-3 items-start rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <Checkbox
                id="consent_transactional"
                checked={consentTransactional}
                aria-required="true"
                onCheckedChange={(checked) =>
                  setValue("consent_transactional", checked === true)
                }
                className="mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label
                htmlFor="consent_transactional"
                className="text-xs text-gray-400 leading-relaxed cursor-pointer"
              >
                {SMS_CONSENT_TEXT}
              </Label>
            </div>
          </div>

          {/* Business Email */}
          <div className="space-y-1.5">
            <Label className="text-white">
              Business Email <span className="text-red-400">*</span>
            </Label>
            <Input
              type="email"
              placeholder="Business Email"
              className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
              {...register("business_email", {
                required: "Required",
                pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email" },
              })}
            />
            {errors.business_email && (
              <p className="text-red-400 text-xs">{errors.business_email.message}</p>
            )}
          </div>

          {/* Business Name & Website */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-white">Business Name</Label>
              <Input
                placeholder="Business Name"
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                {...register("business_name")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white">Website</Label>
              <Input
                type="url"
                placeholder="Web URL goes here"
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                {...register("website")}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-3">
            <Label className="text-white">Address</Label>
            <Input
              placeholder="Street Address"
              className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
              {...register("street_address")}
            />
            <Input
              placeholder="Address Line 2"
              className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
              {...register("address2")}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="City"
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                {...register("city")}
              />
              <Input
                placeholder="State"
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                {...register("state")}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Country"
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                {...register("country")}
              />
              <Input
                placeholder="Postal Code"
                className="bg-white/5 border-white/20 text-white placeholder:text-gray-500"
                {...register("postal_code")}
              />
            </div>
          </div>

          {/* Consent Checkboxes */}
          <div className="space-y-4 pt-2">
            {/* Marketing consent */}
            <div className="flex gap-3 items-start">
              <Checkbox
                id="consent_marketing"
                checked={consentMarketing}
                onCheckedChange={(checked) =>
                  setValue("consent_marketing", checked === true)
                }
                className="mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <Label
                htmlFor="consent_marketing"
                className="text-xs text-gray-400 leading-relaxed cursor-pointer"
              >
                By checking this box, I consent to receive marketing and promotional
                messages, including special offers, discounts, new product updates
                among others. Message frequency may vary. Message & Data rates may
                apply. Reply HELP for help or STOP to opt-out.
              </Label>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-lg py-6 rounded-full shadow-[0_0_20px_rgba(56,189,248,0.25)] transition-all hover:scale-[1.02]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...
              </>
            ) : (
              "Continue to Checkout"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

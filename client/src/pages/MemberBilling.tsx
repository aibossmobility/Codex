import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CreditCard, ShieldCheck } from "lucide-react";
import { SiteLogoStacked } from "@/components/SiteLogo";

interface BillingState {
  hasPortalAccess: boolean;
  billingRequired: boolean;
  reason: string;
  payment_status: string;
  trial_expires_at: string | null;
  trial_hours: number;
  amount_cents: number;
}

export default function MemberBilling() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [amountDisplay, setAmountDisplay] = useState("$4.99");
  const [checkoutProvider, setCheckoutProvider] = useState("stripe");

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionId = params.get("session_id");
  const success = params.get("success") === "1";
  const canceled = params.get("canceled") === "1";

  const loadStatus = async () => {
    const res = await fetch("/api/member/billing/status");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unable to load billing status");
    }
    setBilling(data.billing);
    if (data.amount_display) setAmountDisplay(data.amount_display);
    if (data.checkout_provider) setCheckoutProvider(data.checkout_provider);
    if (data.billing?.hasPortalAccess) {
      navigate("/portal");
    }
  };

  const confirmPayment = async (sid: string) => {
    const res = await fetch("/api/member/billing/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sid }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Payment confirmation failed");
    }
    setStatusMessage("Payment confirmed. Redirecting to your portal...");
    setTimeout(() => navigate("/portal"), 1000);
  };

  useEffect(() => {
    setLoading(true);
    setError("");

    const run = async () => {
      try {
        if (success && sessionId) {
          await confirmPayment(sessionId);
        }
        await loadStatus();
        if (canceled) {
          setStatusMessage("Checkout was canceled. Complete payment to keep access.");
        }
      } catch (err: any) {
        setError(err.message || "Unable to load billing");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [success, sessionId, canceled]);

  const handleCheckout = async () => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/member/billing/create-checkout-session", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to start checkout");
      }
      if (data.already_paid) {
        navigate("/portal");
        return;
      }
      if (!data.checkout_url) {
        throw new Error("Checkout URL was not returned");
      }
      if (data.provider === "fastpay") {
        setStatusMessage("Opening the Boss Mobility payment page. Portal access may need confirmation after payment.");
      }
      window.location.href = data.checkout_url;
    } catch (err: any) {
      setError(err.message || "Unable to start checkout");
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <SiteLogoStacked size="lg" className="mb-2" />
          <p className="text-gray-500 text-sm mt-1">Complete billing to keep portal access</p>
        </div>

        <Card className="bg-[#111] border-white/10">
          <CardContent className="p-8 space-y-5">
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-brand-yellow/10 mx-auto">
              <CreditCard className="w-5 h-5 text-brand-yellow" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-white text-xl font-bold">Membership Billing</h2>
              <p className="text-gray-400 text-sm">
                Papa Life membership is $4.99 per month with no free trial. Payment is required to activate membership access.
              </p>
            </div>

            {billing?.trial_expires_at && billing.payment_status === "trial" && (
              <p className="text-center text-xs text-gray-500">
                Trial expires: {new Date(billing.trial_expires_at).toLocaleString()}
              </p>
            )}

            {loading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="w-5 h-5 text-brand-yellow animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Portal access</p>
                  <p className="text-white text-2xl font-bold mt-1">{amountDisplay}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {checkoutProvider === "fastpay"
                      ? "Payment through Boss Mobility checkout"
                      : "One-time payment via Stripe"}
                  </p>
                </div>
                <Button
                  onClick={handleCheckout}
                  disabled={actionLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-5 rounded-xl text-sm"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening checkout...
                    </>
                  ) : (
                    "Pay and Continue"
                  )}
                </Button>
              </div>
            )}

            {statusMessage && (
              <p className="text-center text-sm text-green-400 bg-green-400/10 py-2 px-3 rounded-lg">
                {statusMessage}
              </p>
            )}

            {error && (
              <p className="text-center text-sm text-red-400 bg-red-400/10 py-2 px-3 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              Secure checkout powered by Boss Mobility
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

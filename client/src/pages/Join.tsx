import CheckoutForm from "@/components/CheckoutForm";
import { useLocation } from "wouter";

export default function Join() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <CheckoutForm onClose={() => navigate("/")} />
    </div>
  );
}

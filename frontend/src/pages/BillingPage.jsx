import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Loader2, ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const COLORS = {
  ink: "#1C2B22", paper: "#F3F1EC", paperDeep: "#EBE7DD",
  moss: "#2F5233", brass: "#B8923F", rust: "#B4472A", slate: "#5C6660",
};

// Replace with the real Price IDs from your Stripe dashboard.
const PLANS = [
  { id: "solo", name: "Solo", blurb: "One operator, one calendar.", monthly: 29, annual: 24, staff: "1 user",
    priceIdMonthly: "price_solo_monthly", priceIdAnnual: "price_solo_annual",
    features: ["Online booking + reminders", "No-show tracking", "Basic bank integration"] },
  { id: "team", name: "Team", blurb: "For shops with staff to schedule.", monthly: 79, annual: 65, staff: "Up to 10 staff",
    priceIdMonthly: "price_team_monthly", priceIdAnnual: "price_team_annual",
    features: ["Everything in Solo", "Multi-staff calendar", "Deposits & cancellation fees", "Revenue forecasting"], featured: true },
  { id: "growth", name: "Growth", blurb: "Multiple locations, real reporting.", monthly: 199, annual: 165, staff: "Unlimited staff",
    priceIdMonthly: "price_growth_monthly", priceIdAnnual: "price_growth_annual",
    features: ["Everything in Team", "Multi-location dashboard", "Staff performance reports", "Priority support"] },
];

export default function BillingPage() {
  const { token } = useAuth();
  const [billing, setBilling] = useState("monthly");
  const [selected, setSelected] = useState("team");
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState(null);

  const handleCheckout = async (plan) => {
    setError(null);
    setLoadingPlan(plan.id);
    const priceId = billing === "monthly" ? plan.priceIdMonthly : plan.priceIdAnnual;
    try {
      const data = await apiFetch("/billing/create-checkout-session", {
        method: "POST", token, body: { priceId, planId: plan.id },
      });
      if (data.url) window.location.href = data.url;
      else throw new Error("No checkout URL returned");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div style={{ color: COLORS.ink, background: COLORS.paper }} className="min-h-screen">
      <div className="px-4 sm:px-6 lg:px-12 py-5 border-b flex items-center justify-between" style={{ borderColor: COLORS.paperDeep }}>
        <Link to="/dashboard" className="flex items-center gap-2 text-sm" style={{ color: COLORS.ink }}><ArrowLeft size={16} /> Dashboard</Link>
        <span className="text-xs flex items-center gap-1" style={{ color: COLORS.slate }}><ShieldCheck size={13} /> Payments handled by Stripe</span>
      </div>

      <div className="px-4 sm:px-6 lg:px-12 py-8 lg:py-12 max-w-5xl mx-auto">
        <h1 style={{ fontFamily: "'Source Serif 4', serif" }} className="text-2xl sm:text-3xl lg:text-4xl font-semibold mb-2">Choose your plan</h1>
        <p className="text-sm mb-8" style={{ color: COLORS.slate }}>Cancel or switch plans anytime from account settings.</p>

        <div className="inline-flex border mb-10" style={{ borderColor: COLORS.ink }}>
          {["monthly", "annual"].map((b) => (
            <button key={b} onClick={() => setBilling(b)} className="px-4 py-2 text-sm"
              style={{ background: billing === b ? COLORS.ink : "transparent", color: billing === b ? "white" : COLORS.ink }}>
              {b === "monthly" ? "Monthly" : "Annual — save ~18%"}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-8 px-4 py-3 flex items-start gap-3 text-sm text-white" style={{ background: COLORS.rust }}>
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {PLANS.map((plan) => {
            const price = billing === "monthly" ? plan.monthly : plan.annual;
            const isSelected = selected === plan.id;
            return (
              <div key={plan.id} onClick={() => setSelected(plan.id)} className="border p-6 flex flex-col cursor-pointer"
                style={{ borderColor: isSelected ? COLORS.moss : COLORS.ink, borderWidth: isSelected ? 2 : 1, background: plan.featured ? COLORS.paperDeep : "transparent" }}>
                {plan.featured && <span className="text-xs mb-3" style={{ color: COLORS.brass }}>Most popular</span>}
                <p style={{ fontFamily: "'Source Serif 4', serif" }} className="text-lg font-semibold mb-1">{plan.name}</p>
                <p className="text-sm mb-4" style={{ color: COLORS.slate }}>{plan.blurb}</p>
                <p style={{ fontFamily: "'Source Serif 4', serif" }} className="text-3xl font-semibold mb-1">${price}<span className="text-sm font-normal" style={{ color: COLORS.slate }}>/mo</span></p>
                <p className="text-xs mb-5" style={{ color: COLORS.slate }}>{billing === "annual" ? "billed annually" : "billed monthly"} &middot; {plan.staff}</p>
                <ul className="space-y-2 mb-6 text-sm">
                  {plan.features.map((f, i) => <li key={i} className="flex gap-2"><Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: COLORS.moss }} />{f}</li>)}
                </ul>
                <button onClick={(e) => { e.stopPropagation(); handleCheckout(plan); }} disabled={loadingPlan === plan.id}
                  className="mt-auto text-sm py-2.5 px-4 border flex items-center justify-center gap-2"
                  style={{ borderColor: COLORS.ink, background: isSelected ? COLORS.moss : "transparent", color: isSelected ? "white" : COLORS.ink }}>
                  {loadingPlan === plan.id ? <><Loader2 size={14} className="animate-spin" /> Redirecting&hellip;</> : `Subscribe to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs mt-8" style={{ color: COLORS.slate }}>By subscribing you agree to recurring monthly billing until you cancel. Taxes calculated at checkout.</p>
      </div>
    </div>
  );
}

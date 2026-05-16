"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface BillingData {
  tenant: {
    id: string;
    name: string;
    plan: string;
    monthlyTokenLimit: number;
    active: boolean;
  };
  billing: {
    period: string;
    planPriceFcfa: number;
    planPriceUsd: number;
    planBaseTokens: number;
    subscriptionThisMonth: number;
    subscriptionThisMonthUsd: number;
    topupThisMonth: number;
    tokensAddedThisMonth: number;
    isPaidThisMonth: boolean;
    balanceFcfa: number;
    balanceUsd: number;
    topupFcfa: number;
    topupTokens: number;
    topupUsd: number;
  };
  payments: Array<{
    id: string;
    amountFcfa: number;
    amountUsd: number;
    type: string;
    tokensAdded: number;
    method: string;
    reference: string | null;
    period: string;
    notes: string | null;
    paidAt: string;
  }>;
}

type PaymentStatusResult = {
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  amountFcfa: number;
  operator?: string;
  paidAt?: string;
  type: string;
  tokensAdded: number;
  failureReason?: string;
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

function fmtFcfa(n: number) {
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M tokens`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K tokens`;
  return `${n} tokens`;
}

// Inner component that uses useSearchParams (requires Suspense boundary)
function BillingViewInner() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState<"subscription" | "topup" | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusResult | null>(null);
  const [paymentStatusLoading, setPaymentStatusLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const searchParams = useSearchParams();
  const txParam = searchParams.get("tx");

  const showToast = useCallback((type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
  }, []);

  // Poll payment status when tx= param is present
  useEffect(() => {
    if (!txParam) return;

    let attempts = 0;
    const maxAttempts = 20; // ~60s total with 3s intervals
    setPaymentStatusLoading(true);

    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/status?tx=${encodeURIComponent(txParam)}`);
        if (!res.ok) {
          setPaymentStatusLoading(false);
          showToast("error", "Impossible de vérifier le statut du paiement.");
          return;
        }
        const result: PaymentStatusResult = await res.json();
        setPaymentStatus(result);

        if (result.status === "PAID") {
          setPaymentStatusLoading(false);
          if (result.type === "topup") {
            showToast("success", `Recharge réussie ! ${fmtTokens(result.tokensAdded)} tokens ajoutés à votre compte.`);
          } else {
            showToast("success", "Paiement de l'abonnement confirmé ! Votre compte est à jour.");
          }
          // Refresh billing data
          fetch("/api/billing").then((r) => r.json()).then(setData);
          return;
        }

        if (result.status === "FAILED" || result.status === "CANCELLED") {
          setPaymentStatusLoading(false);
          showToast(
            "error",
            result.status === "CANCELLED"
              ? "❌ Paiement annulé. Aucun montant n'a été débité. Vous pouvez réessayer."
              : "❌ Paiement échoué. Aucun montant n'a été débité et votre offre n'a pas changé. Vérifiez votre solde Orange Money et réessayez."
          );
          return;
        }

        // PENDING — keep polling
        attempts++;
        if (attempts >= maxAttempts) {
          setPaymentStatusLoading(false);
          showToast("info", "Le paiement est en cours de traitement. Actualisez la page dans quelques instants.");
          return;
        }
        setTimeout(poll, 3000);
      } catch {
        setPaymentStatusLoading(false);
        showToast("error", "Erreur lors de la vérification du paiement.");
      }
    };

    // Start polling after a brief delay (CinetPay needs time to process)
    const timer = setTimeout(poll, 2000);
    return () => clearTimeout(timer);
  }, [txParam, showToast]);

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const handleOnlinePayment = async (type: "subscription" | "topup") => {
    if (!data) return;
    setPaymentLoading(type);
    try {
      const body: Record<string, unknown> = {
        type,
        channel: "ALL",
      };
      if (type === "subscription") {
        body.amount = data.billing.balanceFcfa > 0 ? data.billing.balanceFcfa : data.billing.planPriceFcfa;
        body.period = data.billing.period;
      } else {
        body.amount = data.billing.topupFcfa;
      }

      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        showToast("error", err.error ?? "Erreur lors de l'initialisation du paiement.");
        return;
      }

      const { paymentUrl } = await res.json();
      // Redirect to CinetPay
      window.location.href = paymentUrl;
    } catch {
      showToast("error", "Erreur réseau. Vérifiez votre connexion et réessayez.");
    } finally {
      setPaymentLoading(null);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-aria-stone">
        Chargement…
      </div>
    );
  if (!data)
    return (
      <div className="min-h-screen flex items-center justify-center text-aria-red">
        Erreur de chargement.
      </div>
    );

  const { tenant, billing, payments } = data;
  const { isPaidThisMonth, balanceFcfa, planPriceFcfa } = billing;

  return (
    <div className="min-h-screen bg-aria-sand">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium max-w-md text-center transition-all ${
            toast.type === "success"
              ? "bg-aria-emerald text-white"
              : toast.type === "error"
              ? "bg-aria-red text-white"
              : "bg-aria-slate text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Polling indicator */}
      {paymentStatusLoading && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-aria-indigo/20 rounded-xl px-4 py-2 shadow-md flex items-center gap-2 text-sm text-aria-indigo">
          <span className="inline-block w-3 h-3 rounded-full bg-aria-indigo animate-pulse" />
          Vérification du paiement…
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-[#E8E2D6] px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">💳</span>
          <div>
            <h1 className="text-lg font-bold text-aria-anthracite">Facturation</h1>
            <p className="text-xs text-aria-stone">
              {tenant.name} · Powered by Claude · Anthropic
            </p>
          </div>
        </div>
        <Link href="/chat" className="text-sm text-aria-indigo hover:underline">
          ← Retour au chat
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Statut du mois */}
        <div
          className={`rounded-2xl border-2 p-6 ${
            isPaidThisMonth
              ? "border-green-300 bg-green-50"
              : "border-orange-300 bg-orange-50"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-aria-stone uppercase tracking-wide mb-1">
                Abonnement — {billing.period}
              </p>
              <p
                className={`text-2xl font-bold ${
                  isPaidThisMonth ? "text-green-700" : "text-orange-700"
                }`}
              >
                {isPaidThisMonth ? "✅ À jour" : "⚠️ En attente de paiement"}
              </p>
              {!isPaidThisMonth && (
                <p className="text-sm text-orange-600 mt-1">
                  Montant restant dû :{" "}
                  <strong>
                    {fmtFcfa(balanceFcfa)} (${billing.balanceUsd.toFixed(2)})
                  </strong>
                </p>
              )}
              {isPaidThisMonth && billing.subscriptionThisMonth > 0 && (
                <p className="text-sm text-green-600 mt-1">
                  {fmtFcfa(billing.subscriptionThisMonth)} reçus ce mois
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-aria-stone mb-0.5">Offre</p>
              <span className="px-3 py-1 rounded-full bg-aria-indigo/10 text-aria-indigo font-semibold text-sm">
                {PLAN_LABELS[tenant.plan] ?? tenant.plan}
              </span>
            </div>
          </div>
        </div>

        {/* Détail de l'offre */}
        <div className="bg-white rounded-2xl border border-[#E8E2D6] p-6">
          <h2 className="text-sm font-semibold text-aria-stone uppercase tracking-wide mb-4">
            Votre offre
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InfoCard
              label="Tarif mensuel"
              value={fmtFcfa(planPriceFcfa)}
              sub={`$${billing.planPriceUsd.toFixed(2)} USD`}
            />
            <InfoCard
              label="Tokens de base"
              value={fmtTokens(billing.planBaseTokens)}
              sub="par mois"
            />
            <InfoCard
              label="Quota actuel"
              value={fmtTokens(tenant.monthlyTokenLimit)}
              sub={
                billing.tokensAddedThisMonth > 0
                  ? `+${fmtTokens(billing.tokensAddedThisMonth)} recharge`
                  : "inclus dans l'offre"
              }
              highlight={billing.tokensAddedThisMonth > 0}
            />
          </div>
        </div>

        {/* Paiement en ligne */}
        <div className="bg-white rounded-2xl border border-aria-indigo/20 p-6">
          <h2 className="text-sm font-semibold text-aria-indigo uppercase tracking-wide mb-1">
            🌐 Paiement en ligne
          </h2>
          <p className="text-xs text-aria-stone mb-4">
            Payez directement par Mobile Money (Orange Money, Wave, MTN…) ou carte bancaire.
          </p>

          <div className="space-y-3">
            {/* Subscription button — CTA primaire Terre de Sienne */}
            {!isPaidThisMonth && (
              <button
                onClick={() => handleOnlinePayment("subscription")}
                disabled={paymentLoading !== null}
                className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-aria-terracotta hover:bg-aria-terracotta-dark disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors"
              >
                <div className="text-left">
                  <p className="font-semibold text-sm">Payer l&apos;abonnement</p>
                  <p className="text-xs text-white/70 mt-0.5">{billing.period}</p>
                </div>
                <div className="text-right">
                  {paymentLoading === "subscription" ? (
                    <span className="text-sm">Chargement…</span>
                  ) : (
                    <>
                      <p className="font-bold">{fmtFcfa(balanceFcfa > 0 ? balanceFcfa : planPriceFcfa)}</p>
                      <p className="text-xs text-white/60">→ Mobile Money</p>
                    </>
                  )}
                </div>
              </button>
            )}

            {/* Topup button — CTA secondaire Indigo */}
            <button
              onClick={() => handleOnlinePayment("topup")}
              disabled={paymentLoading !== null}
              className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-aria-indigo hover:bg-aria-indigo/90 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors"
            >
              <div className="text-left">
                <p className="font-semibold text-sm">
                  Recharger {fmtTokens(billing.topupTokens)}
                </p>
                <p className="text-xs text-white/70 mt-0.5">Ajoutés immédiatement à votre quota</p>
              </div>
              <div className="text-right">
                {paymentLoading === "topup" ? (
                  <span className="text-sm">Chargement…</span>
                ) : (
                  <>
                    <p className="font-bold">{fmtFcfa(billing.topupFcfa)}</p>
                    <p className="text-xs text-white/60">→ Mobile Money</p>
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Payment result after returning from CinetPay */}
          {paymentStatus && (
            <div
              className={`mt-4 p-3 rounded-xl text-sm ${
                paymentStatus.status === "PAID"
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : paymentStatus.status === "PENDING"
                  ? "bg-blue-50 border border-blue-200 text-blue-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              {paymentStatus.status === "PAID" && (
                <>✅ Paiement confirmé{paymentStatus.operator ? ` via ${paymentStatus.operator}` : ""}.</>
              )}
              {paymentStatus.status === "PENDING" && (
                <>⏳ Paiement en cours de traitement. Actualisez dans quelques instants.</>
              )}
              {(paymentStatus.status === "FAILED" || paymentStatus.status === "CANCELLED") && (
                <>❌ Paiement {paymentStatus.status === "CANCELLED" ? "annulé" : "échoué"}. {paymentStatus.failureReason ? `(${paymentStatus.failureReason})` : ""}</>
              )}
            </div>
          )}

          <p className="text-xs text-aria-stone mt-3">
            Paiement sécurisé · Vos données ne transitent pas par nos serveurs.
          </p>
        </div>

        {/* Comment payer (cash — shown only if not paid) */}
        {!isPaidThisMonth && (
          <div className="bg-aria-slate/5 border border-aria-slate/20 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-aria-anthracite uppercase tracking-wide mb-3">
              📤 Paiement en espèces
            </h2>
            <p className="text-sm text-aria-stone leading-relaxed">
              Vous pouvez également payer par <strong>versement en espèces</strong> auprès de votre
              représentant. Une fois le paiement remis, votre compte sera mis à jour sous 24h.
            </p>
            <div className="mt-3 p-3 bg-aria-slate/10 rounded-lg">
              <p className="text-sm font-medium text-aria-anthracite">
                Montant à régler : {fmtFcfa(balanceFcfa)}
                <span className="text-aria-stone font-normal ml-2">
                  (${billing.balanceUsd.toFixed(2)})
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Recharge de tokens (cash info) */}
        <div className="bg-white rounded-2xl border border-[#E8E2D6] p-6">
          <h2 className="text-sm font-semibold text-aria-stone uppercase tracking-wide mb-3">
            ⚡ Recharge de tokens supplémentaires
          </h2>
          <p className="text-sm text-aria-stone mb-4">
            Besoin de plus de capacité ce mois-ci ? Achetez des tokens supplémentaires.
          </p>
          <div className="bg-aria-indigo-light border border-aria-indigo/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-aria-indigo">
                {fmtTokens(billing.topupTokens)} supplémentaires
              </p>
              <p className="text-xs text-aria-stone mt-0.5">
                Ajoutés immédiatement à votre quota du mois
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-aria-indigo">
                {fmtFcfa(billing.topupFcfa)}
              </p>
              <p className="text-xs text-aria-stone">${billing.topupUsd.toFixed(2)}</p>
            </div>
          </div>
          {billing.tokensAddedThisMonth > 0 && (
            <p className="text-xs text-aria-emerald mt-3">
              ✓ Ce mois : {fmtTokens(billing.tokensAddedThisMonth)} de tokens supplémentaires activés.
            </p>
          )}
          <p className="text-xs text-aria-stone mt-3">
            Paiement en ligne (bouton ci-dessus) ou en espèces auprès de votre représentant.
          </p>
        </div>

        {/* Historique des paiements */}
        <div className="bg-white rounded-2xl border border-[#E8E2D6] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8E2D6]">
            <h2 className="text-sm font-semibold text-aria-stone uppercase tracking-wide">
              Historique des paiements
            </h2>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-aria-stone text-center py-8">
              Aucun paiement enregistré pour le moment.
            </p>
          ) : (
            <div className="divide-y divide-[#E8E2D6]">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="px-6 py-3 flex items-center justify-between hover:bg-aria-sand"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {p.type === "topup" ? "⚡" : "📅"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-aria-anthracite">
                        {p.type === "topup"
                          ? `Recharge — +${fmtTokens(p.tokensAdded)}`
                          : `Abonnement ${PLAN_LABELS[tenant.plan] ?? tenant.plan}`}
                      </p>
                      <p className="text-xs text-aria-stone">
                        {p.period} ·{" "}
                        {new Date(p.paidAt).toLocaleDateString("fr-FR")} ·{" "}
                        {p.method}
                        {p.reference ? ` · Réf: ${p.reference}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-aria-emerald">
                      {fmtFcfa(p.amountFcfa)}
                    </p>
                    <p className="text-xs text-aria-stone">${p.amountUsd.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-center text-aria-stone pb-4">
          Powered by Claude · Anthropic
        </p>
      </main>
    </div>
  );
}

export default function BillingView() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-aria-stone bg-aria-sand">
          Chargement…
        </div>
      }
    >
      <BillingViewInner />
    </Suspense>
  );
}

function InfoCard({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${
        highlight ? "bg-aria-indigo-light border border-aria-indigo/20" : "bg-aria-sand"
      }`}
    >
      <p className="text-xs text-aria-stone mb-1">{label}</p>
      <p
        className={`text-base font-bold ${
          highlight ? "text-aria-indigo" : "text-aria-anthracite"
        }`}
      >
        {value}
      </p>
      <p className={`text-xs mt-0.5 ${highlight ? "text-aria-indigo/70" : "text-aria-stone"}`}>
        {sub}
      </p>
    </div>
  );
}

// lib/payments/types.ts
// Abstraction layer for payment providers (CinetPay, PayDunya, Wave, Stripe...)
// Routes and API routes NEVER import a provider directly — they use PaymentProvider.

export type PaymentChannel = "ALL" | "MOBILE_MONEY" | "CREDIT_CARD" | "WALLET";
export type PaymentType = "subscription" | "topup";
export type Currency = "XOF" | "XAF" | "USD" | "EUR";

export interface InitiateParams {
  transactionId: string;      // ARIA-generated unique ID
  tenantId: string;
  userId: string;
  amount: number;             // in smallest currency unit (FCFA for XOF)
  currency: Currency;
  description: string;
  type: PaymentType;
  period?: string;            // "YYYY-MM" for subscriptions
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  metadata?: Record<string, unknown>;
  notifyUrl: string;
  returnUrl: string;
  channel: PaymentChannel;
}

export interface InitiateResult {
  paymentUrl: string;
  transactionId: string;
  providerRef?: string;       // provider's own payment token
}

export type PaymentStatus = {
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  operator?: string;
  paidAt?: Date;
  failureReason?: string;
  rawPayload: unknown;
};

export interface WebhookResult {
  transactionId: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  verified: boolean;
}

export class PaymentError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

export class WebhookSignatureError extends Error {
  constructor(message = "Invalid webhook signature") {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

export class PaymentsDisabledError extends Error {
  constructor() {
    super("Les paiements en ligne sont temporairement désactivés.");
    this.name = "PaymentsDisabledError";
  }
}

export interface PaymentProvider {
  name: string;
  /** Initiate a payment and return the redirect URL */
  initiate(params: InitiateParams): Promise<InitiateResult>;
  /** Re-check the real status of a transaction from the provider */
  verify(transactionId: string): Promise<PaymentStatus>;
  /** Parse and validate an incoming webhook request */
  parseWebhook(req: Request): Promise<WebhookResult>;
}

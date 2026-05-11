// lib/audit.ts
// Append-only security audit log. Added in response to ST-018/019 (May 2026).
//
// Usage from any API route:
//   import { audit } from "@/lib/audit";
//   await audit(req, session, "payment.create", { type: "Payment", id: payment.id }, { amountFcfa, period });
//
// `req` is optional. If passed, IP and User-Agent are captured from headers.
// `session` is the NextAuth session — pass null when the actor is unknown
// (e.g. failed login).
//
// Failures inside audit() are swallowed and logged to console.error so they
// can never break the calling request. We *never* throw on audit failure.

import { prisma } from "@/lib/prisma";

type SessionLike = {
  user?: {
    id?: string;
    email?: string | null;
    role?: string;
    tenantId?: string;
  };
} | null;

type Target = { type: string; id: string } | null | undefined;

export type AuditAction =
  | "login.success"
  | "login.failure"
  | "logout"
  | "user.suspend"
  | "user.unsuspend"
  | "user.password_reset"
  | "payment.create"
  | "payment.initiated"
  | "payment.webhook.received"
  | "payment.webhook.signature_invalid"
  | "payment.webhook.site_mismatch"
  | "payment.completed"
  | "payment.failed"
  | "payment.topup.credited"
  | "payment.reverify_manual"
  | "payment.duplicate_webhook_blocked"
  | "tenant.update"
  | "tenant.quota_change"
  | "tenant.plan_change"
  | "project.delete"
  | "conversation.delete"
  | "admin.access";

export async function audit(
  req: Request | null,
  session: SessionLike,
  action: AuditAction,
  target?: Target,
  metadata?: Record<string, unknown>,
  // Override actor when no session yet (failed login)
  actorOverride?: { email?: string; id?: string }
): Promise<void> {
  try {
    const ip =
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req?.headers.get("x-real-ip") ??
      null;
    const userAgent = req?.headers.get("user-agent") ?? null;

    await prisma.auditLog.create({
      data: {
        action,
        actorId: session?.user?.id ?? actorOverride?.id ?? null,
        actorEmail: session?.user?.email ?? actorOverride?.email ?? null,
        actorRole: session?.user?.role ?? null,
        actorTenant: session?.user?.tenantId ?? null,
        targetType: target?.type ?? null,
        targetId: target?.id ?? null,
        metadata: metadata ? (metadata as never) : undefined,
        ip,
        userAgent,
      },
    });
  } catch (e) {
    // NEVER let audit failure break the request.
    console.error("[audit] failed to write log:", e);
  }
}

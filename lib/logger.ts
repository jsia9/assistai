/**
 * Structured application logger.
 * Output: console.log (JSON) — compatible with Vercel logs and any log aggregator.
 * Rules: never log secrets (API keys, passwords). Mask PII (phone numbers).
 */

type LogLevel = "debug" | "info" | "warn" | "error";

function maskPhone(phone: string): string {
  if (phone.length < 6) return "***";
  return phone.slice(0, Math.ceil(phone.length * 0.4)) + "***" + phone.slice(-2);
}

function sanitize(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const safe = { ...(data as Record<string, unknown>) };
  const REDACTED_KEYS = ["apikey", "api_key", "apiKey", "password", "api_password", "CINETPAY_API_KEY", "CINETPAY_API_PASSWORD"];
  for (const key of REDACTED_KEYS) {
    if (key in safe) safe[key] = "[REDACTED]";
  }
  if ("customer_phone_number" in safe && typeof safe.customer_phone_number === "string") {
    safe.customer_phone_number = maskPhone(safe.customer_phone_number);
  }
  return safe;
}

export function log(level: LogLevel, message: string, data?: unknown): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(data !== undefined ? { data: sanitize(data) } : {}),
  };
  if (level === "error" || level === "warn") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

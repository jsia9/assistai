import { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { checkRateLimit } from "@/lib/ratelimit";

// HTML-escape user-supplied strings before injecting into email body.
// Prevents HTML injection / phishing via the contact form.
function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  // Rate limit: 3 submissions per IP per hour to prevent email spam
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkRateLimit(`access-request:${ip}`, 3, 60 * 60 * 1000);
  if (!limit.ok) {
    return new Response(
      JSON.stringify({ error: "Trop de demandes. Réessayez dans une heure." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Corps JSON invalide", { status: 400 });
  }

  const { name, company, email } = body;

  if (!name || !company || !email) {
    return new Response("Champs requis manquants", { status: 400 });
  }

  // Input length caps — prevent oversized payloads reaching the email body
  if (typeof name !== "string" || name.trim().length > 120) return new Response("Nom invalide", { status: 400 });
  if (typeof company !== "string" || company.trim().length > 200) return new Response("Entreprise invalide", { status: 400 });
  if (typeof email !== "string" || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return new Response("Email invalide", { status: 400 });
  }

  const safeName    = escHtml(name.trim());
  const safeCompany = escHtml(company.trim());
  const safeEmail   = escHtml(email.trim());

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `Nouvelle demande d'accès — ${safeCompany}`,
      text: `Nom: ${name.trim()}\nEntreprise: ${company.trim()}\nEmail: ${email.trim()}`,
      html: `<h2>Nouvelle demande d'acc&egrave;s</h2>
<p><strong>Nom:</strong> ${safeName}</p>
<p><strong>Entreprise:</strong> ${safeCompany}</p>
<p><strong>Email:</strong> ${safeEmail}</p>`,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    return new Response("Erreur d'envoi", { status: 500 });
  }
}

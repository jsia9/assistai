/**
 * POST /api/payments/cash-request
 * Sends a cash payment request email to the admin.
 * Requires an authenticated session.
 */
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }

  // Rate limit: 2 requests per user per hour
  const userId = session.user.id;
  const limit = checkRateLimit(`cash-request:${userId}`, 2, 60 * 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { error: "Trop de demandes. Réessayez dans une heure." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  // Fetch tenant name for the email
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { name: true },
  });

  const { plan, amountFcfa, period } = body as {
    plan?: string;
    amountFcfa?: number;
    period?: string;
  };

  if (!plan || typeof plan !== "string") {
    return Response.json({ error: "Plan requis." }, { status: 400 });
  }
  if (typeof amountFcfa !== "number" || amountFcfa <= 0) {
    return Response.json({ error: "Montant invalide." }, { status: 400 });
  }

  const userName = escHtml(session.user.name ?? "—");
  const userEmail = escHtml(session.user.email ?? "—");
  const companyName = escHtml(tenant?.name ?? session.user.name ?? "—");
  const safePlan = escHtml(plan);
  const safePeriod = period ? escHtml(String(period)) : "—";
  const safeAmount = amountFcfa.toLocaleString("fr-FR");

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
      subject: `Demande paiement cash — ${companyName} — ${safePlan}`,
      text: [
        `Nom: ${session.user.name ?? "—"}`,
        `Entreprise: ${tenant?.name ?? session.user.name ?? "—"}`,
        `Email: ${session.user.email ?? "—"}`,
        `Plan demandé: ${plan}`,
        `Montant: ${amountFcfa.toLocaleString("fr-FR")} FCFA`,
        `Période: ${period ?? "—"}`,
      ].join("\n"),
      html: `<h2>Demande de paiement en espèces</h2>
<p><strong>Nom :</strong> ${userName}</p>
<p><strong>Entreprise :</strong> ${companyName}</p>
<p><strong>Email :</strong> ${userEmail}</p>
<p><strong>Plan demandé :</strong> ${safePlan}</p>
<p><strong>Montant :</strong> ${safeAmount} FCFA</p>
<p><strong>Période :</strong> ${safePeriod}</p>`,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("Cash request email error:", err);
    return Response.json({ error: "Erreur d'envoi de l'e-mail." }, { status: 500 });
  }
}

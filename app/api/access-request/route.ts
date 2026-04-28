import { NextRequest } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const { name, company, email } = await req.json();
  if (!name || !company || !email) {
    return new Response("Champs requis manquants", { status: 400 });
  }

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
      subject: `Nouvelle demande d'accès — ${company}`,
      text: `Nom: ${name}\nEntreprise: ${company}\nEmail: ${email}`,
      html: `<h2>Nouvelle demande d'accès</h2>
<p><strong>Nom:</strong> ${name}</p>
<p><strong>Entreprise:</strong> ${company}</p>
<p><strong>Email:</strong> ${email}</p>`,
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    return new Response("Erreur d'envoi", { status: 500 });
  }
}

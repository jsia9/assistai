import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_SERVICES = [
  "github",
  "notion",
  "gmail",
  "slack",
  "whatsapp",
  "drive",
  "calendar",
  "linear",
  "jira",
  "teams",
] as const;

type AllowedService = (typeof ALLOWED_SERVICES)[number];

function isAllowedService(s: string): s is AllowedService {
  return (ALLOWED_SERVICES as readonly string[]).includes(s);
}

// GET — list current user's integrations (never returns apiKey)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const integrations = await prisma.integration.findMany({
    where: { userId: session.user.id },
    select: { id: true, service: true, label: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ integrations });
}

// POST — create or update integration
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const { service, apiKey, label } = body as {
    service: string;
    apiKey: string;
    label?: string;
  };

  if (!service || !isAllowedService(service)) {
    return NextResponse.json(
      { error: `Service invalide. Services autorisés : ${ALLOWED_SERVICES.join(", ")}` },
      { status: 400 }
    );
  }

  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "apiKey est requis" }, { status: 400 });
  }

  // TODO: encrypt apiKey at rest before storing in production
  const integration = await prisma.integration.upsert({
    where: { userId_service: { userId: session.user.id, service } },
    create: {
      userId: session.user.id,
      tenantId: session.user.tenantId,
      service,
      apiKey: apiKey.trim(),
      label: label?.trim() || null,
      status: "active",
    },
    update: {
      apiKey: apiKey.trim(),
      label: label?.trim() || null,
      status: "active",
    },
    select: { id: true, service: true, label: true, status: true },
  });

  return NextResponse.json(integration);
}

// DELETE — remove integration for ?service=xxx
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const service = searchParams.get("service");

  if (!service || !isAllowedService(service)) {
    return NextResponse.json(
      { error: `Service invalide. Services autorisés : ${ALLOWED_SERVICES.join(", ")}` },
      { status: 400 }
    );
  }

  await prisma.integration.deleteMany({
    where: { userId: session.user.id, service },
  });

  return NextResponse.json({ ok: true });
}

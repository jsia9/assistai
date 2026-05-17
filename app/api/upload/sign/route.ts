import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      "Storage not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars.",
      { status: 503 }
    );
  }

  let body: { name?: string; mimeType?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { name, mimeType } = body;
  if (!name) return new Response("Missing name", { status: 400 });

  // Derive tenant from session — fall back to "default" if not present
  // session.user.tenantId may not exist in all deployments; use email domain as fallback
  const tenantId =
    (session.user as { tenantId?: string }).tenantId ??
    (session.user?.email?.split("@")[1]?.replace(/\./g, "-") ?? "default");
  const userId = (session.user as { id?: string }).id ?? "unknown";

  // Build the storage path
  const ext = name.includes(".") ? name.split(".").pop() : "";
  const timestamp = Date.now();
  const uuid = randomUUID();
  const path = `${tenantId}/${userId}/${timestamp}-${uuid}${ext ? "." + ext : ""}`;

  // Supabase signed upload URL:
  // POST /storage/v1/object/sign/upload/{bucket}/{path}
  // Returns { signedURL, token }
  const bucket = "liya-uploads";
  const signEndpoint = `${supabaseUrl}/storage/v1/object/sign/upload/${bucket}/${path}`;

  let signedURL: string;
  try {
    const res = await fetch(signEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      // expiresIn in seconds for the signed URL
      body: JSON.stringify({ expiresIn: 300 }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Supabase sign error:", res.status, text);
      return new Response(
        `Impossible d'obtenir l'URL d'upload (${res.status})`,
        { status: 502 }
      );
    }

    const json = await res.json() as { signedURL?: string; token?: string };
    // Supabase returns signedURL as a relative path like /storage/v1/object/...?token=...
    // We need to prepend the base URL if it starts with /
    const raw = json.signedURL ?? "";
    signedURL = raw.startsWith("/") ? `${supabaseUrl}${raw}` : raw;

    if (!signedURL) {
      console.error("Supabase sign response missing signedURL:", json);
      return new Response("Réponse invalide du service de stockage", { status: 502 });
    }
  } catch (e) {
    console.error("Supabase sign fetch error:", e);
    return new Response("Erreur réseau lors de la génération de l'URL d'upload", { status: 502 });
  }

  return Response.json({
    uploadUrl: signedURL,
    path,
    bucket,
    mimeType: mimeType ?? "application/octet-stream",
  });
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB hard limit for server-side processing

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

  let body: { path?: string; name?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const { path, name, mimeType } = body;
  if (!path || !name) return new Response("Missing path or name", { status: 400 });

  const bucket = "liya-uploads";

  // ── Download from Supabase Storage ────────────────────────────
  let buffer: Buffer;
  try {
    const downloadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;
    const dlRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${serviceKey}` },
    });

    if (!dlRes.ok) {
      const text = await dlRes.text();
      console.error("Supabase download error:", dlRes.status, text);
      return new Response(
        `Impossible de récupérer le fichier depuis le stockage (${dlRes.status})`,
        { status: 502 }
      );
    }

    const arrayBuf = await dlRes.arrayBuffer();
    if (arrayBuf.byteLength > MAX_BYTES) {
      // Delete oversized file then reject
      await deleteFromStorage(supabaseUrl, serviceKey, bucket, path);
      return new Response("Fichier trop volumineux (max 25 Mo)", { status: 413 });
    }
    buffer = Buffer.from(arrayBuf);
  } catch (e) {
    console.error("Storage download fetch error:", e);
    return new Response("Erreur réseau lors de la récupération du fichier", { status: 502 });
  }

  // ── Process the file (same logic as /api/upload) ─────────────
  const mime = mimeType ?? "";

  let result: Response;

  // Images → base64
  if (mime.startsWith("image/")) {
    const supported = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!supported.includes(mime)) {
      result = new Response("Format d'image non supporté (JPEG, PNG, GIF, WebP)", { status: 415 });
    } else {
      result = Response.json({
        type: "image",
        name,
        content: buffer.toString("base64"),
        mimeType: mime,
      });
    }
  }
  // PDF → text
  else if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{ text: string }>;
      const data = await pdfParse(buffer);
      result = Response.json({ type: "text", name, content: data.text });
    } catch (e) {
      console.error("pdf-parse error:", e);
      result = new Response("Impossible de lire ce PDF", { status: 422 });
    }
  }
  // DOCX → text
  else if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.toLowerCase().endsWith(".docx")
  ) {
    try {
      const mammoth = await import("mammoth");
      const res = await mammoth.extractRawText({ buffer });
      result = Response.json({ type: "text", name, content: res.value });
    } catch (e) {
      console.error("mammoth error:", e);
      result = new Response("Impossible de lire ce fichier Word", { status: 422 });
    }
  }
  // XLSX / XLS → CSV text
  else if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel" ||
    name.toLowerCase().endsWith(".xlsx") ||
    name.toLowerCase().endsWith(".xls")
  ) {
    // Detect legacy BIFF binary format (magic: D0 CF 11 E0)
    const isLegacyBiff =
      buffer.length >= 4 &&
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0;
    if (isLegacyBiff) {
      result = new Response(
        "Format .xls non supporté. Ouvrez le fichier dans Excel puis « Enregistrer sous » → format .xlsx, et réessayez.",
        { status: 422 }
      );
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const ExcelJS = require("exceljs") as typeof import("exceljs");
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
        const text = workbook.worksheets
          .map((ws) => {
            const rows: string[] = [];
            ws.eachRow((row) => {
              const cells = (
                row.values as (string | number | boolean | null | undefined)[]
              )
                .slice(1)
                .map((v) => (v == null ? "" : String(v)));
              rows.push(cells.join("\t"));
            });
            return `=== Feuille : ${ws.name} ===\n` + rows.join("\n");
          })
          .join("\n\n");
        result = Response.json({ type: "text", name, content: text });
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        console.error("exceljs error:", detail);
        result = new Response(
          `Impossible de lire ce fichier Excel (${detail}). Vérifiez que le fichier n'est pas protégé par un mot de passe et réessayez.`,
          { status: 422 }
        );
      }
    }
  }
  // PPTX → text
  else if (
    mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    name.toLowerCase().endsWith(".pptx")
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const JSZip = require("jszip") as typeof import("jszip");
      const zip = await JSZip.loadAsync(buffer);
      const slideKeys = Object.keys(zip.files)
        .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
        .sort((a, b) => {
          const na = parseInt(a.match(/\d+/)?.[0] ?? "0");
          const nb = parseInt(b.match(/\d+/)?.[0] ?? "0");
          return na - nb;
        });
      const total = slideKeys.length;
      const slideTexts: string[] = [];
      for (const key of slideKeys) {
        const xml = await zip.files[key].async("string");
        const matches = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)];
        const text = matches.map((m) => m[1]).filter(Boolean).join(" ").trim();
        if (text) slideTexts.push(text);
      }
      const content = slideTexts.length
        ? slideTexts.map((t, i) => `=== Diapositive ${i + 1}/${total} ===\n${t}`).join("\n\n")
        : "(présentation vide ou protégée)";
      result = Response.json({ type: "text", name, content });
    } catch (e) {
      console.error("pptx parse error:", e);
      result = new Response("Impossible de lire ce fichier PowerPoint (.pptx)", { status: 422 });
    }
  }
  // Plain text
  else if (
    mime.startsWith("text/") ||
    [".txt", ".md", ".csv", ".json", ".xml", ".yaml", ".yml", ".html", ".htm", ".log"].some(
      (ext) => name.toLowerCase().endsWith(ext)
    )
  ) {
    result = Response.json({ type: "text", name, content: buffer.toString("utf-8") });
  }
  // Code files
  else if (
    [".js", ".ts", ".tsx", ".jsx", ".py", ".java", ".c", ".cpp", ".cs", ".go", ".rs", ".php", ".rb", ".swift", ".kt", ".sql"].some(
      (ext) => name.toLowerCase().endsWith(ext)
    )
  ) {
    result = Response.json({ type: "text", name, content: buffer.toString("utf-8") });
  } else {
    result = new Response(
      "Type de fichier non supporté. Formats acceptés : PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), images, texte, code.",
      { status: 415 }
    );
  }

  // ── Delete from storage after processing ──────────────────────
  // Fire-and-forget; don't block the response on cleanup
  deleteFromStorage(supabaseUrl, serviceKey, bucket, path).catch((e) =>
    console.error("Storage cleanup error:", e)
  );

  return result;
}

async function deleteFromStorage(
  supabaseUrl: string,
  serviceKey: string,
  bucket: string,
  path: string
): Promise<void> {
  const deleteUrl = `${supabaseUrl}/storage/v1/object/${bucket}`;
  const res = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [path] }),
  });
  if (!res.ok) {
    console.warn("Storage delete failed:", res.status, await res.text());
  }
}

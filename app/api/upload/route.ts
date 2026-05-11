import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Vercel serverless functions cap request bodies at 4.5 MB by default
// (https://vercel.com/docs/functions/runtimes#size-limits). The previous
// 10 MB application limit was unreachable — Vercel's edge returned 413
// "FUNCTION_PAYLOAD_TOO_LARGE" before this code ran. We now clamp to 4 MB
// (with a small safety margin under Vercel's 4.5 MB) so the user sees a
// friendly French error instead of an opaque infrastructure one.
//
// To allow larger uploads later: switch to direct-to-storage uploads via
// Supabase Storage signed URLs and upload bytes browser → storage,
// then POST the storage URL to /api/upload-from-storage.
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_LABEL = "4 Mo";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new Response("Invalid form data", { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return new Response("No file provided", { status: 400 });
  if (file.size > MAX_BYTES)
    return new Response(`Fichier trop volumineux (max ${MAX_LABEL})`, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.type;
  const name = file.name;

  // ── Images → base64 (sent to Claude vision) ───────────────────
  if (mime.startsWith("image/")) {
    const supported = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!supported.includes(mime)) {
      return new Response("Format d'image non supporté (JPEG, PNG, GIF, WebP)", {
        status: 415,
      });
    }
    return Response.json({
      type: "image",
      name,
      content: buffer.toString("base64"),
      mimeType: mime,
    });
  }

  // ── PDF → text ─────────────────────────────────────────────────
  if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
    try {
      // Use the lib entry-point directly to avoid pdf-parse v2.x loading test
      // fixtures at require-time — those paths don't exist in Vercel serverless
      // and cause an immediate crash before any buffer is processed.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{ text: string }>;
      const data = await pdfParse(buffer);
      return Response.json({ type: "text", name, content: data.text });
    } catch (e) {
      console.error("pdf-parse error:", e);
      return new Response("Impossible de lire ce PDF", { status: 422 });
    }
  }

  // ── DOCX → text ────────────────────────────────────────────────
  const isDocx =
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.toLowerCase().endsWith(".docx");
  if (isDocx) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return Response.json({ type: "text", name, content: result.value });
    } catch (e) {
      console.error("mammoth error:", e);
      return new Response("Impossible de lire ce fichier Word", { status: 422 });
    }
  }

  // ── XLSX / XLS → CSV text ──────────────────────────────────────
  // Using exceljs for .xlsx (ZIP-based). Old binary .xls (BIFF format, magic
  // bytes D0 CF 11 E0) is NOT supported by exceljs — detect it early and give
  // a clear error instead of a cryptic "zip parse" failure.
  const isXls =
    mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel" ||
    name.toLowerCase().endsWith(".xlsx") ||
    name.toLowerCase().endsWith(".xls");
  if (isXls) {
    // Detect legacy BIFF binary format (magic: D0 CF 11 E0)
    const isLegacyBiff =
      buffer.length >= 4 &&
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0;
    if (isLegacyBiff) {
      return new Response(
        "Format .xls non supporté. Ouvrez le fichier dans Excel puis « Enregistrer sous » → format .xlsx, et réessayez.",
        { status: 422 }
      );
    }

    try {
      // Use require (not dynamic import) so Next.js/Turbopack doesn't try to
      // bundle a native-friendly CJS module. exceljs is listed in
      // serverExternalPackages, so this always runs in the Node runtime.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ExcelJS = require("exceljs") as typeof import("exceljs");
      const workbook = new ExcelJS.Workbook();
      // Pass the Node Buffer directly — exceljs accepts Buffer | ArrayBuffer.
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
      const text = workbook.worksheets
        .map((ws) => {
          const rows: string[] = [];
          ws.eachRow((row) => {
            // row.values is 1-indexed (index 0 is undefined)
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
      return Response.json({ type: "text", name, content: text });
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      console.error("exceljs error:", detail);
      return new Response(
        `Impossible de lire ce fichier Excel (${detail}). Vérifiez que le fichier n'est pas protégé par un mot de passe et réessayez.`,
        { status: 422 }
      );
    }
  }

  // ── Plain text (txt, md, csv, json, etc.) ─────────────────────
  const textExtensions = [".txt", ".md", ".csv", ".json", ".xml", ".yaml", ".yml", ".html", ".htm", ".log"];
  const isText =
    mime.startsWith("text/") ||
    textExtensions.some((ext) => name.toLowerCase().endsWith(ext));
  if (isText) {
    return Response.json({ type: "text", name, content: buffer.toString("utf-8") });
  }

  // ── Code files ─────────────────────────────────────────────────
  const codeExtensions = [
    ".js", ".ts", ".tsx", ".jsx", ".py", ".java", ".c", ".cpp", ".cs",
    ".go", ".rs", ".php", ".rb", ".swift", ".kt", ".sql",
  ];
  if (codeExtensions.some((ext) => name.toLowerCase().endsWith(ext))) {
    return Response.json({ type: "text", name, content: buffer.toString("utf-8") });
  }

  return new Response(
    "Type de fichier non supporté. Formats acceptés : PDF, Word, Excel, images, texte, code.",
    { status: 415 }
  );
}

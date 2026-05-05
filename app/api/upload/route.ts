import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

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
    return new Response("Fichier trop volumineux (max 10 Mo)", { status: 413 });

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
      // pdf-parse is CJS; .default may or may not exist depending on bundler
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
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
  const isXls =
    mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel" ||
    name.toLowerCase().endsWith(".xlsx") ||
    name.toLowerCase().endsWith(".xls");
  if (isXls) {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const text = workbook.SheetNames.map((sheetName: string) => {
        const sheet = workbook.Sheets[sheetName];
        return `=== Feuille : ${sheetName} ===\n` + XLSX.utils.sheet_to_csv(sheet);
      }).join("\n\n");
      return Response.json({ type: "text", name, content: text });
    } catch (e) {
      console.error("xlsx error:", e);
      return new Response("Impossible de lire ce fichier Excel", { status: 422 });
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

import * as XLSX from "xlsx";

interface SheetInput {
  name: string;
  headers: string[];
  rows: string[][];
  totals?: boolean;
}

interface XlsxInput {
  filename: string;
  sheets: SheetInput[];
}

export function generateXlsx(input: XlsxInput): Buffer {
  const wb = XLSX.utils.book_new();

  for (const sheet of input.sheets) {
    // En-têtes + données
    const data: string[][] = [sheet.headers, ...sheet.rows];

    // Ligne de totaux (somme des colonnes numériques)
    if (sheet.totals) {
      const totalsRow = sheet.headers.map((_, colIdx) => {
        if (colIdx === 0) return "TOTAL";
        // Essaie de sommer les valeurs numériques
        const nums = sheet.rows.map(r => parseFloat(r[colIdx]?.replace(/\s/g, "").replace(",", ".") ?? "")).filter(n => !isNaN(n));
        if (nums.length > 0) return nums.reduce((a, b) => a + b, 0).toLocaleString("fr-FR");
        return "";
      });
      data.push(totalsRow);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Style des en-têtes — largeur auto
    const colWidths = sheet.headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...sheet.rows.map(r => String(r[i] ?? "").length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    ws["!cols"] = colWidths;

    // Freeze la première ligne (en-têtes)
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31)); // Excel max 31 chars
  }

  // Métadonnées
  wb.Props = {
    Title: input.filename,
    Author: "LIYA — Powered by Claude · Anthropic",
    CreatedDate: new Date(),
  };

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return buf;
}

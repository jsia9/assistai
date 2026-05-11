import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  Packer,
} from "docx";

// Couleurs LIYA
const INDIGO     = "1A2A4F";
const TERRACOTTA = "C8543A";
const STONE      = "6B6F76";

interface SectionInput {
  heading?: string;
  level?: 1 | 2 | 3;
  paragraphs: string[];
  bullets?: string[];
  table?: { headers: string[]; rows: string[][] };
}

interface DocxInput {
  filename: string;
  title: string;
  sections: SectionInput[];
  metadata?: { author?: string; date?: string; subject?: string };
}

function makeHeading(text: string, level: 1 | 2 | 3 = 1): Paragraph {
  const sizes: Record<number, number> = { 1: 32, 2: 26, 3: 22 };
  const colors: Record<number, string> = { 1: INDIGO, 2: INDIGO, 3: TERRACOTTA };
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: sizes[level], color: colors[level] })],
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    spacing: { before: level === 1 ? 400 : 240, after: 120 },
  });
}

function makeParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { after: 160 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function makeBullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

function makeTable(headers: string[], rows: string[][]): Table {
  const headerCells = headers.map(h =>
    new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20 })],
        alignment: AlignmentType.CENTER,
      })],
      shading: { type: ShadingType.SOLID, color: INDIGO },
      width: { size: Math.floor(9000 / headers.length), type: WidthType.DXA },
    })
  );

  const dataRows = rows.map((row, rowIdx) =>
    new TableRow({
      children: row.map(cell =>
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ text: cell, size: 20 })],
          })],
          shading: rowIdx % 2 === 0
            ? { type: ShadingType.SOLID, color: "F5F1EA" }
            : { type: ShadingType.SOLID, color: "FFFFFF" },
          width: { size: Math.floor(9000 / row.length), type: WidthType.DXA },
        })
      ),
    })
  );

  return new Table({
    rows: [
      new TableRow({ children: headerCells, tableHeader: true }),
      ...dataRows,
    ],
    width: { size: 9000, type: WidthType.DXA },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: "C8C2B5" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "C8C2B5" },
      left:   { style: BorderStyle.SINGLE, size: 1, color: "C8C2B5" },
      right:  { style: BorderStyle.SINGLE, size: 1, color: "C8C2B5" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "C8C2B5" },
      insideVertical:   { style: BorderStyle.SINGLE, size: 1, color: "C8C2B5" },
    },
  });
}

export async function generateDocx(input: DocxInput): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // ── Titre principal ─────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: input.title, bold: true, size: 40, color: INDIGO })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: TERRACOTTA } },
      spacing: { after: 400 },
    })
  );

  // Métadonnées sous le titre
  if (input.metadata?.date || input.metadata?.author) {
    children.push(
      new Paragraph({
        children: [
          ...(input.metadata.author ? [new TextRun({ text: `Auteur : ${input.metadata.author}   `, size: 18, color: STONE })] : []),
          ...(input.metadata.date   ? [new TextRun({ text: `Date : ${input.metadata.date}`, size: 18, color: STONE })] : []),
        ],
        spacing: { after: 400 },
        alignment: AlignmentType.RIGHT,
      })
    );
  }

  // ── Sections ────────────────────────────────────────────────
  for (const section of input.sections) {
    if (section.heading) {
      children.push(makeHeading(section.heading, section.level ?? 1));
    }
    for (const p of section.paragraphs) {
      if (p.trim()) children.push(makeParagraph(p));
    }
    if (section.bullets?.length) {
      for (const b of section.bullets) {
        children.push(makeBullet(b));
      }
    }
    if (section.table) {
      children.push(
        new Paragraph({ spacing: { before: 200 } }),
        makeTable(section.table.headers, section.table.rows),
        new Paragraph({ spacing: { after: 200 } })
      );
    }
  }

  // ── Document ────────────────────────────────────────────────
  const doc = new Document({
    creator:  input.metadata?.author ?? "LIYA",
    title:    input.title,
    subject:  input.metadata?.subject ?? input.title,
    description: "Généré par LIYA — Powered by Claude · Anthropic",
    sections: [{
      properties: {},
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ text: input.title, size: 16, color: STONE })],
            alignment: AlignmentType.RIGHT,
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: "Généré par LIYA  ·  Powered by Claude · Anthropic  —  page ", size: 16, color: STONE }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: STONE }),
            ],
            alignment: AlignmentType.CENTER,
          })],
        }),
      },
      children,
    }],
    numbering: {
      config: [{
        reference: "bullet-list",
        levels: [{
          level: 0,
          format: NumberFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 360 } } },
        }],
      }],
    },
  });

  const buf = await Packer.toBuffer(doc);
  return buf;
}

import PptxGenJS from "pptxgenjs";

// Palette LIYA
const COLORS = {
  indigo:      "1A2A4F",
  terracotta:  "C8543A",
  ochre:       "D9A441",
  sand:        "F5F1EA",
  white:       "FFFFFF",
  stone:       "6B6F76",
  anthracite:  "1F1F23",
};

interface Slide {
  title: string;
  content: string[];
  type?: "title" | "content" | "two-column" | "conclusion";
  notes?: string;
}

interface PptxInput {
  filename: string;
  title: string;
  subtitle?: string;
  theme?: "professional" | "modern" | "minimal";
  slides: Slide[];
}

export async function generatePptx(input: PptxInput): Promise<Buffer> {
  const pptx = new PptxGenJS();

  // Dimensions et métadonnées
  pptx.layout = "LAYOUT_WIDE";
  pptx.author  = "LIYA";
  pptx.subject = input.title;
  pptx.title   = input.title;

  const bg = input.theme === "minimal" ? COLORS.white : COLORS.sand;

  // ── Diapositive de titre ────────────────────────────────────
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: COLORS.indigo };

  // Bande décorative terracotta
  titleSlide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 4.8, w: "100%", h: 0.06,
    fill: { color: COLORS.terracotta },
    line: { color: COLORS.terracotta },
  });

  titleSlide.addText(input.title, {
    x: 0.6, y: 1.5, w: 8.8, h: 1.6,
    fontSize: 40,
    bold: true,
    color: COLORS.white,
    fontFace: "Calibri",
    breakLine: false,
  });

  if (input.subtitle) {
    titleSlide.addText(input.subtitle, {
      x: 0.6, y: 3.2, w: 8.8, h: 0.6,
      fontSize: 20,
      color: COLORS.ochre,
      fontFace: "Calibri",
    });
  }

  // Mention LIYA
  titleSlide.addText("Généré par LIYA · Powered by Claude · Anthropic", {
    x: 0.6, y: 6.8, w: 8.8, h: 0.3,
    fontSize: 10,
    color: "8899BB",
    fontFace: "Calibri",
  });

  // ── Diapositives de contenu ─────────────────────────────────
  for (const slide of input.slides) {
    const s = pptx.addSlide();
    s.background = { color: bg };

    // Bande de couleur en haut
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: "100%", h: 0.08,
      fill: { color: COLORS.terracotta },
      line: { color: COLORS.terracotta },
    });

    // Titre
    s.addText(slide.title, {
      x: 0.5, y: 0.2, w: 9, h: 0.9,
      fontSize: 24,
      bold: true,
      color: COLORS.indigo,
      fontFace: "Calibri",
    });

    // Ligne séparatrice sous le titre
    s.addShape(pptx.ShapeType.line, {
      x: 0.5, y: 1.1, w: 9, h: 0,
      line: { color: COLORS.terracotta, width: 1.5 },
    });

    if (slide.type === "two-column" && slide.content.length >= 2) {
      // 2 colonnes — moitié gauche / droite
      const half = Math.ceil(slide.content.length / 2);
      const left  = slide.content.slice(0, half);
      const right = slide.content.slice(half);

      s.addText(left.map(t => ({ text: t, options: { bullet: true, breakLine: true } })), {
        x: 0.5, y: 1.3, w: 4.3, h: 4.5,
        fontSize: 16,
        color: COLORS.anthracite,
        fontFace: "Calibri",
        valign: "top",
      });
      s.addText(right.map(t => ({ text: t, options: { bullet: true, breakLine: true } })), {
        x: 5.2, y: 1.3, w: 4.3, h: 4.5,
        fontSize: 16,
        color: COLORS.anthracite,
        fontFace: "Calibri",
        valign: "top",
      });
    } else if (slide.type === "conclusion") {
      // Conclusion : texte centré, grand, fond Indigo
      s.background = { color: COLORS.indigo };
      s.addText(slide.title, {
        x: 0.5, y: 0.2, w: 9, h: 0.9,
        fontSize: 24, bold: true,
        color: COLORS.white, fontFace: "Calibri",
      });
      s.addText(slide.content.join("\n"), {
        x: 1, y: 1.8, w: 8, h: 3.5,
        fontSize: 20,
        color: COLORS.ochre,
        fontFace: "Calibri",
        align: "center",
        valign: "middle",
      });
    } else {
      // Bullet list standard
      s.addText(
        slide.content.map(t => ({ text: t, options: { bullet: { type: "bullet" }, breakLine: true } })),
        {
          x: 0.5, y: 1.3, w: 9, h: 4.5,
          fontSize: 17,
          color: COLORS.anthracite,
          fontFace: "Calibri",
          valign: "top",
          paraSpaceBefore: 4,
        }
      );
    }

    // Pied de page
    s.addText(`${input.title}  ·  LIYA`, {
      x: 0.5, y: 7.1, w: 9, h: 0.25,
      fontSize: 9, color: COLORS.stone, fontFace: "Calibri",
      align: "right",
    });

    if (slide.notes) {
      s.addNotes(slide.notes);
    }
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  return buffer;
}

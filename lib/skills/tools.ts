import Anthropic from "@anthropic-ai/sdk";

/**
 * LIYA Document Skills — Tool definitions for Anthropic tool use.
 * Ces outils permettent à Claude de générer des fichiers Office
 * (PowerPoint, Excel, Word) directement depuis le chat.
 */
export const DOCUMENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "generate_powerpoint",
    description:
      "Génère un fichier PowerPoint (.pptx) avec des diapositives structurées. " +
      "Utilise cet outil quand l'utilisateur demande une présentation, un diaporama, des slides ou un PowerPoint. " +
      "Crée des slides complètes avec titres et contenu détaillé.",
    input_schema: {
      type: "object" as const,
      properties: {
        filename: {
          type: "string",
          description: "Nom du fichier sans extension (ex: 'presentation_projet')",
        },
        title: {
          type: "string",
          description: "Titre principal de la présentation",
        },
        subtitle: {
          type: "string",
          description: "Sous-titre optionnel de la diapositive de titre",
        },
        theme: {
          type: "string",
          enum: ["professional", "modern", "minimal"],
          description: "Thème visuel de la présentation",
        },
        slides: {
          type: "array",
          description: "Liste des diapositives",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Titre de la diapositive" },
              content: {
                type: "array",
                items: { type: "string" },
                description: "Points/paragraphes de la diapositive (chaque élément = une ligne ou un bullet point)",
              },
              type: {
                type: "string",
                enum: ["title", "content", "two-column", "conclusion"],
                description: "Type de mise en page",
              },
              notes: { type: "string", description: "Notes du présentateur (optionnel)" },
            },
            required: ["title", "content"],
          },
        },
      },
      required: ["filename", "title", "slides"],
    },
  },

  {
    name: "generate_excel",
    description:
      "Génère un fichier Excel (.xlsx) avec des feuilles de calcul structurées. " +
      "Utilise cet outil quand l'utilisateur demande un tableau, une feuille de calcul, un budget, " +
      "un planning, un tableau de bord ou un fichier Excel.",
    input_schema: {
      type: "object" as const,
      properties: {
        filename: {
          type: "string",
          description: "Nom du fichier sans extension (ex: 'budget_2026')",
        },
        sheets: {
          type: "array",
          description: "Feuilles du classeur",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Nom de la feuille" },
              headers: {
                type: "array",
                items: { type: "string" },
                description: "En-têtes des colonnes",
              },
              rows: {
                type: "array",
                description: "Lignes de données",
                items: {
                  type: "array",
                  items: { type: "string" },
                  description: "Valeurs des cellules (dans l'ordre des en-têtes)",
                },
              },
              totals: {
                type: "boolean",
                description: "Ajouter une ligne de totaux automatique",
              },
            },
            required: ["name", "headers", "rows"],
          },
        },
      },
      required: ["filename", "sheets"],
    },
  },

  {
    name: "generate_word",
    description:
      "Génère un document Word (.docx) formaté. " +
      "Utilise cet outil quand l'utilisateur demande un rapport, une lettre, un contrat, " +
      "un mémo, un compte-rendu ou tout autre document Word.",
    input_schema: {
      type: "object" as const,
      properties: {
        filename: {
          type: "string",
          description: "Nom du fichier sans extension (ex: 'rapport_mensuel')",
        },
        title: {
          type: "string",
          description: "Titre principal du document",
        },
        sections: {
          type: "array",
          description: "Sections du document",
          items: {
            type: "object",
            properties: {
              heading: {
                type: "string",
                description: "Titre de la section (laisser vide pour paragraphe sans titre)",
              },
              level: {
                type: "number",
                enum: [1, 2, 3],
                description: "Niveau du titre (1=H1, 2=H2, 3=H3)",
              },
              paragraphs: {
                type: "array",
                items: { type: "string" },
                description: "Paragraphes de la section",
              },
              bullets: {
                type: "array",
                items: { type: "string" },
                description: "Points en liste à puces (optionnel)",
              },
              table: {
                type: "object",
                description: "Tableau optionnel dans la section",
                properties: {
                  headers: { type: "array", items: { type: "string" } },
                  rows: { type: "array", items: { type: "array", items: { type: "string" } } },
                },
              },
            },
            required: ["paragraphs"],
          },
        },
        metadata: {
          type: "object",
          properties: {
            author: { type: "string" },
            date: { type: "string" },
            subject: { type: "string" },
          },
        },
      },
      required: ["filename", "title", "sections"],
    },
  },
];

export type DocumentToolName = "generate_powerpoint" | "generate_excel" | "generate_word";

export function isDocumentTool(name: string): name is DocumentToolName {
  return ["generate_powerpoint", "generate_excel", "generate_word"].includes(name);
}

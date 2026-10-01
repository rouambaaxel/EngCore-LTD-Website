import "server-only";
import ExcelJS from "exceljs";

/**
 * Lecture d'une liste de pièces envoyée par un client.
 *
 * Un donneur d'ordre écrit rarement dans notre format : il joint le tableur
 * que son service achats lui a sorti, avec ses propres intitulés, en français
 * ou en anglais. On reconnaît les colonnes usuelles et on ignore le reste,
 * comme pour l'import d'un tarif fournisseur.
 *
 * Deux différences avec `catalogue-import` : les quantités et les prix
 * comptent ici, et une référence inconnue du catalogue n'est pas une erreur —
 * c'est le cas courant d'une pièce que nous n'avons pas encore fichée.
 */

export interface OrderLineRow {
  /** Référence catalogue si elle est reconnue, sinon texte libre. */
  reference: string | null;
  designation: string | null;
  quantity: number;
  unitPrice: number | null;
  /** Ligne dans le fichier, pour désigner précisément une anomalie. */
  line: number;
}

export interface LineParseResult {
  rows: OrderLineRow[];
  recognised: Record<string, string>;
  ignored: string[];
  errors: string[];
}

type Field = "reference" | "designation" | "quantity" | "unitPrice";

const HEADERS: Record<Field, string[]> = {
  reference: ["reference", "référence", "ref", "réf", "part number", "partnumber", "code"],
  designation: [
    "designation", "désignation", "name", "nom", "libelle", "libellé",
    "produit", "product", "description",
  ],
  quantity: ["quantity", "quantite", "quantité", "qte", "qté", "qty", "nombre"],
  unitPrice: [
    "unit price", "prix unitaire", "prix", "price", "pu", "prix u",
    "unit cost", "tarif",
  ],
};

function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const FIELD_BY_HEADER = new Map<string, Field>();
for (const [field, aliases] of Object.entries(HEADERS)) {
  for (const alias of aliases) FIELD_BY_HEADER.set(normalise(alias), field as Field);
}

/**
 * Lit un nombre écrit à la française comme à l'anglaise.
 *
 * « 1 234,50 », « 1,234.50 » et « 1234.5 » désignent le même montant. La
 * règle : le dernier séparateur rencontré est le décimal, les autres sont des
 * séparateurs de milliers. Les symboles monétaires sont écartés.
 */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.\-]/g, "").trim();
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalised = cleaned;

  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    normalised = cleaned.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    // Une virgule seule : décimale (« 12,50 ») sauf si elle sépare des
    // milliers (« 1,250 » — trois chiffres derrière, pas de décimales).
    const after = cleaned.length - lastComma - 1;
    normalised = after === 3 ? cleaned.replace(",", "") : cleaned.replace(",", ".");
  }

  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function detectDelimiter(headerLine: string): string {
  const counts = [";", ",", "\t"].map((d) => [d, headerLine.split(d).length] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 1 ? counts[0][0] : ";";
}

function readCsv(buffer: Buffer): string[][] {
  const text = buffer.toString("utf8").replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];
  const delimiter = detectDelimiter(lines[0]);
  return lines.map((line) => splitCsvLine(line, delimiter));
}

async function readSpreadsheet(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const grid: string[][] = [];
  sheet.eachRow((row) => {
    const cells: string[] = [];
    // `values` est décalé d'un cran : l'index 0 n'est pas utilisé par ExcelJS.
    const values = row.values as unknown[];
    for (let i = 1; i < values.length; i += 1) {
      const value = values[i];
      cells.push(value === null || value === undefined ? "" : String(value).trim());
    }
    grid.push(cells);
  });
  return grid;
}

export async function parseOrderLineFile(
  fileName: string,
  buffer: Buffer,
): Promise<LineParseResult> {
  const errors: string[] = [];
  const isSpreadsheet = /\.xlsx?$/i.test(fileName);

  let grid: string[][];
  try {
    grid = isSpreadsheet ? await readSpreadsheet(buffer) : readCsv(buffer);
  } catch {
    return {
      rows: [],
      recognised: {},
      ignored: [],
      errors: ["Fichier illisible. Attendu : .csv, .xlsx ou .xls."],
    };
  }

  if (grid.length < 2) {
    return {
      rows: [],
      recognised: {},
      ignored: [],
      errors: ["Le fichier ne contient aucune ligne de données sous ses intitulés."],
    };
  }

  const columnField = new Map<number, Field>();
  const recognised: Record<string, string> = {};
  const ignored: string[] = [];

  grid[0].forEach((header, index) => {
    const field = FIELD_BY_HEADER.get(normalise(header));
    if (field) {
      columnField.set(index, field);
      recognised[header] = field;
    } else if (header.trim() !== "") {
      ignored.push(header);
    }
  });

  const fields = [...columnField.values()];
  if (!fields.includes("reference") && !fields.includes("designation")) {
    return {
      rows: [],
      recognised,
      ignored,
      errors: [
        "Aucune colonne « Référence » ni « Désignation » : impossible de savoir ce qui est commandé.",
      ],
    };
  }

  const rows: OrderLineRow[] = [];

  for (let i = 1; i < grid.length; i += 1) {
    const cells = grid[i];
    const value = (field: Field): string => {
      for (const [index, name] of columnField) {
        if (name === field) return (cells[index] ?? "").trim();
      }
      return "";
    };

    const reference = value("reference");
    const designation = value("designation");
    if (!reference && !designation) continue; // ligne vide au milieu du fichier

    const line = i + 1;
    const quantityRaw = value("quantity");
    const parsedQuantity = quantityRaw ? parseNumber(quantityRaw) : null;

    if (quantityRaw && parsedQuantity === null) {
      errors.push(`Ligne ${line} : quantité « ${quantityRaw} » illisible, 1 retenu.`);
    }

    const quantity =
      parsedQuantity !== null && parsedQuantity >= 1
        ? Math.min(99999, Math.floor(parsedQuantity))
        : 1;

    const priceRaw = value("unitPrice");
    const unitPrice = priceRaw ? parseNumber(priceRaw) : null;
    if (priceRaw && unitPrice === null) {
      errors.push(`Ligne ${line} : prix « ${priceRaw} » illisible, laissé vide.`);
    }

    rows.push({
      reference: reference || null,
      designation: designation || null,
      quantity,
      unitPrice: unitPrice !== null && unitPrice >= 0 ? unitPrice : null,
      line,
    });
  }

  if (rows.length === 0) {
    errors.push("Aucune ligne exploitable dans ce fichier.");
  }

  return { rows, recognised, ignored, errors };
}

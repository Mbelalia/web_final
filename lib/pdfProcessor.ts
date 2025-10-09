// Module partagé pour le traitement PDF


// Use browser ESM builds; avoid CJS to prevent requiring 'canvas'
async function loadPdfJs(): Promise<any> {
  // Import root entry compatible with 2.16.x; avoids missing *.mjs paths
  const m = await import('pdfjs-dist');
  return m as any;
}

export type Product = {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  priceHT?: number;
  priceTTC?: number;
  reference?: string;
};

// Fonction simplifiée pour utiliser pdf-parse directement
export async function loadPdfParse() {
  try {
    // Direct require for server-side only
    const pdfParse = require('pdf-parse');
    return pdfParse;
  } catch (error) {
    console.error('Failed to load pdf-parse:', error);
    throw new Error('pdf-parse could not be loaded');
  }
}
// Fonction pour normaliser le texte
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fonction pour extraire un extrait pertinent
export function takeRelevantExcerpt(fullText: string, maxLength = 50000): string {
  if (fullText.length <= maxLength) {
    return fullText;
  }
  const halfLength = Math.floor(maxLength / 2);
  const start = fullText.substring(0, halfLength);
  const end = fullText.substring(fullText.length - halfLength);
  return start + "\n\n[...TEXTE TRONQUÉ...]\n\n" + end;
}

// Extraction via pdf.js
// extractWithPdfJs()
export async function extractWithPdfJs(buffer: Buffer): Promise<{
  plainText: string;
  pages: Array<{
    pageNumber: number;
    width: number;
    height: number;
    items: Array<{
      str: string;
      x: number;
      y: number;
      fontName?: string;
      dir?: string;
      width?: number;
      height?: number;
      transform?: number[];
      // Added: normalized bounding box in page coordinates (top-left origin)
      bbox?: { x: number; y: number; w: number; h: number };
    }>;
  }>;
}> {
  const pdfjsLib: any = await loadPdfJs();
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.js';

  const loadingTask = (pdfjsLib as any).getDocument({
    data: buffer,
    disableWorker: false,
    isEvalSupported: false,
  });
  const doc = await loadingTask.promise;

  const numPages = doc.numPages;
  const pages: Array<{
    pageNumber: number;
    width: number;
    height: number;
    items: Array<any>;
  }> = [];
  const textParts: string[] = [];

  for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const width = viewport.width;
    const height = viewport.height;
    const content = await page.getTextContent({ includeMarkedContent: true });

    const items = content.items.map((item: any) => {
      const t = item.transform || [1, 0, 0, 1, 0, 0];
      const x = t[4];
      const y = height - t[5]; // flip y to top-left origin

      // Approximate width/height in device space
      const w = typeof item.width === 'number' ? item.width : Math.abs(t[0]);
      const h = typeof item.height === 'number' ? item.height : Math.abs(t[3]);

      const bbox = { x, y: y - h, w, h };

      return {
        str: item.str,
        x,
        y,
        fontName: item.fontName,
        dir: item.dir,
        width: w,
        height: h,
        transform: t,
        bbox,
      };
    });

    const pageText = content.items.map((it: any) => it.str).join(' ');
    textParts.push(pageText);

    pages.push({ pageNumber, width, height, items });
  }

  await doc.cleanup();
  await doc.destroy();

  const plainText = textParts.join('\n');

  return { plainText, pages };
}

// Summarize positional data into line-based rows for LLM consumption
// summarizePositionsForLLM(pages, options?)
export function summarizePositionsForLLM(pages: Array<{
  pageNumber: number;
  width: number;
  height: number;
  items: Array<{
    str: string;
    x: number;
    y: number;
    bbox?: { x: number; y: number; w: number; h: number };
  }>;
}>, options?: { prune?: boolean; aggressive?: boolean; maxContextRows?: number; maxRowsPerPage?: number; onlyPagesWithPrices?: boolean }): {
  pages: Array<{
    pageNumber: number;
    width: number;
    height: number;
    rows: Array<{
      y: number;
      tokens: Array<{ t: string; x: number; y: number }>;
      hasEuro: boolean;
    }>;
  }>;
} {
  const yTolerance = 3.0;

  const summarized = pages.map(page => {
    const filtered = page.items.filter(i => (i.str || '').trim().length > 0);
    filtered.sort((a, b) => (a.y - b.y) || (a.x - b.x));

    const rows: Array<{
      y: number;
      tokens: Array<{ t: string; x: number; y: number }>;
      hasEuro: boolean;
    }> = [];

    let current: { y: number; tokens: Array<{ t: string; x: number; y: number }>; hasEuro: boolean } | null = null;

    for (const it of filtered) {
      const tokenText = it.str.trim();
      if (!current || Math.abs(current.y - it.y) > yTolerance) {
        if (current) rows.push(current);
        current = { y: it.y, tokens: [{ t: tokenText, x: it.x, y: it.y }], hasEuro: tokenText === '€' };
      } else {
        current.tokens.push({ t: tokenText, x: it.x, y: it.y });
        current.hasEuro = current.hasEuro || tokenText === '€';
      }
    }
    if (current) rows.push(current);

    if (options?.prune) {
      const keepToken = (t: string) => t === '€' || /\d/.test(t) || /[A-Za-zÀ-ÿ]/.test(t);
      const prunedRowBase = rows
        .map(row => {
          const prunedTokens = row.tokens
            .filter(tok => keepToken(tok.t))
            .map(tok => ({ t: tok.t, x: Math.round(tok.x), y: Math.round(tok.y) }));
          return {
            y: Math.round(row.y),
            tokens: prunedTokens,
            hasEuro: row.hasEuro || prunedTokens.some(tok => tok.t === '€'),
          };
        })
        .filter(row => row.tokens.length > 0);

      let prunedRows = prunedRowBase;

      if (options?.aggressive) {
        const priceLike = (s: string) =>
          /\b\d{1,3}(?:[.,]\d{2})\b/.test(s) || /\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})\b/.test(s);
        const isAlphaRow = (r: { tokens: Array<{ t: string; x: number; y: number }> }) =>
          r.tokens.some(tok => /[A-Za-zÀ-ÿ]/.test(tok.t));
        const isRefRow = (r: { tokens: Array<{ t: string; x: number; y: number }> }) =>
          r.tokens.some(tok => /article numéro/i.test(tok.t));
        const isCodeToken = (t: string) => /^(?:\d[\d.]{5,}|\d{3}\.\d{3}\.\d{2})$/.test(t);

        // Keyword-based exclusions: totals, delivery, address, payment, etc.
        const dropKeywords = /(articles achetés|livraison|sous[- ]?total|frais de livraison|tva|payée|numéro de la commande|information de la commande|adresse|éco-part|services inclus)/i;

        // Initial keep flags for price and reference rows + context window
        const keepFlags = new Array(prunedRows.length).fill(false);
        const window = options.maxContextRows ?? 2;

        for (let i = 0; i < prunedRows.length; i++) {
          const r = prunedRows[i];
          const rowText = r.tokens.map(t => t.t).join(' ');
          const hasPriceToken = r.tokens.some(tok => priceLike(tok.t));
          const isRef = isRefRow(r);

          // Skip rows matching unwanted keywords
          if (dropKeywords.test(rowText)) {
            continue;
          }

          if (r.hasEuro || hasPriceToken || isRef) {
            keepFlags[i] = true;

            // If ref row, also keep next immediate code row if present
            if (isRef && i + 1 < prunedRows.length) {
              const nextHasCode = prunedRows[i + 1].tokens.some(tok => isCodeToken(tok.t));
              if (nextHasCode) keepFlags[i + 1] = true;
            }

            // Keep small alpha context around price/ref rows (but avoid dropKeywords rows)
            for (let k = 1; k <= window; k++) {
              if (i - k >= 0 && isAlphaRow(prunedRows[i - k])) {
                const prevText = prunedRows[i - k].tokens.map(t => t.t).join(' ');
                if (!dropKeywords.test(prevText)) keepFlags[i - k] = true;
              }
              if (i + k < prunedRows.length && isAlphaRow(prunedRows[i + k])) {
                const nextText = prunedRows[i + k].tokens.map(t => t.t).join(' ');
                if (!dropKeywords.test(nextText)) keepFlags[i + k] = true;
              }
            }
          }
        }

        prunedRows = prunedRows.filter((_, idx) => keepFlags[idx]);

        // Final guard: drop any lingering rows that match dropKeywords
        prunedRows = prunedRows.filter(r => !dropKeywords.test(r.tokens.map(t => t.t).join(' ')));

        // Cap rows per page
        if (typeof options.maxRowsPerPage === 'number' && prunedRows.length > options.maxRowsPerPage) {
          prunedRows = prunedRows.slice(0, options.maxRowsPerPage);
        }
      }

      return {
        pageNumber: page.pageNumber,
        width: page.width,
        height: page.height,
        rows: prunedRows
      };
    }

    return {
      pageNumber: page.pageNumber,
      width: page.width,
      height: page.height,
      rows
    };
  });

  // Optionally drop pages without any price-like rows
  const hasPriceRow = (rows: Array<{ y: number; tokens: Array<{ t: string; x: number; y: number }>; hasEuro: boolean }>) => {
    const priceLike = (s: string) =>
      /\b\d{1,3}(?:[.,]\d{2})\b/.test(s) || /\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})\b/.test(s);
    return rows.some(r => r.hasEuro || r.tokens.some(tok => priceLike(tok.t)));
  };

  const finalPages = options?.onlyPagesWithPrices
    ? summarized.filter(p => hasPriceRow(p.rows))
    : summarized;

  return { pages: finalPages };
}

export function groupRowsIntoProductBoxes(
  summary: ReturnType<typeof summarizePositionsForLLM>,
  options?: { prePadding?: number; postPadding?: number; minRowsPerBox?: number }
): {
  pages: Array<{
    pageNumber: number;
    width: number;
    height: number;
    boxes: Array<{
      topY: number;
      bottomY: number;
      rows: Array<{ y: number; tokens: Array<{ t: string; x: number; y: number }>; hasEuro: boolean }>;
    }>;
  }>;
} {
  const pre = options?.prePadding ?? 80;
  const post = options?.postPadding ?? 10;
  const minRows = options?.minRowsPerBox ?? 1;

  const priceLike = (s: string) =>
    /\b\d{1,3}(?:[.,]\d{2})\b/.test(s) || /\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})\b/.test(s);
  const isSectionHeader = (rowText: string) =>
    /(articles achetés|livraison|frais de livraison|tva|numéro de la commande|information de la commande|adresse|éco-part|services inclus|montant|total)/i.test(rowText);

  const outPages = summary.pages.map(p => {
    const rows = [...p.rows].sort((a, b) => a.y - b.y);
    const anchors = rows
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.hasEuro || r.tokens.some(t => priceLike(t.t)));

    const boxes: Array<{
      topY: number;
      bottomY: number;
      rows: Array<{ y: number; tokens: Array<{ t: string; x: number; y: number }>; hasEuro: boolean }>;
    }> = [];

    for (let ai = 0; ai < anchors.length; ai++) {
      const { r: anchor } = anchors[ai];
      const nextAnchorY = anchors[ai + 1]?.r.y ?? (rows[rows.length - 1]?.y ?? anchor.y) + 100;

      let topY = anchor.y - pre;
      let bottomY = Math.floor((anchor.y + nextAnchorY) / 2) - post;

      const boxRows = rows.filter(rr => rr.y >= topY && rr.y <= bottomY)
        .filter(rr => {
          const text = rr.tokens.map(t => t.t).join(' ').trim();
          return text.length > 0 && !isSectionHeader(text);
        });

      if (boxRows.length >= minRows) {
        boxes.push({ topY, bottomY, rows: boxRows });
      }
    }

    return { pageNumber: p.pageNumber, width: p.width, height: p.height, boxes };
  });

  return { pages: outPages };
}

export function extractProductsFromPositions(
  pages: Array<{ pageNumber: number; width: number; height: number; items: Array<{ str: string; x: number; y: number; bbox?: { x: number; y: number; w: number; h: number } }> }>,
  options?: { vendor?: "la_redoute" | "ikea" | "generic" }
): Product[] {
  const yTolerance = 3.0;

  // Helper: normalize French decimals, strip currency
  const parsePrice = (s: string): number | undefined => {
    const cleaned = s.replace(/[^\d.,]/g, '').replace(',', '.');
    const m = cleaned.match(/^\d{1,3}(?:\.\d{3})*(?:\.\d{2})$|^\d+(?:\.\d{2})$/);
    if (!m) return undefined;
    const n = parseFloat(cleaned.replace(/(\d)\.(?=\d{3}\b)/g, '$1'));
    return isNaN(n) ? undefined : n;
  };

  const isInteger = (s: string) => /^\d+$/.test(s.trim());
  const isRefLabel = (s: string) => /article numéro/i.test(s);
  const extractRefCode = (s: string) => {
    const m = s.match(/(\d[\d.]*)/);
    return m ? m[1] : undefined;
  };

  // Exclude headings/fees that should not become products
  const dropKeywords = /(articles achetés|livraison|sous[- ]?total|frais de livraison|tva|adresse|information de la commande|éco-part|montant\b|^total\b|carte\s+visa|frais\s+de\s+port|économie\s+réalisée)/i;

  // Recognize reference code tokens (e.g., 305.332.14, 606.024.04)
  const isRefCodeToken = (s: string) => /^\d{3}\.\d{3}\.\d{2}$/.test(s.trim());

  type Line = {
    pageNumber: number;
    y: number;
    items: Array<{
      str: string;
      x: number;
      y: number;
      bbox?: { x: number; y: number; w: number; h: number };
    }>;
    minX: number;
    maxX: number;
    text: string;
    hasEuro: boolean;
    priceToken?: string;
  };

  // Group items into lines by y
  const lines: Line[] = [];
  for (const page of pages) {
    const filtered = page.items.filter(i => (i.str || '').trim().length > 0);
    filtered.sort((a, b) => (a.y - b.y) || (a.x - b.x));

    let current: Line | null = null;
    for (const it of filtered) {
      if (!current || Math.abs(current.y - it.y) > yTolerance) {
        if (current) lines.push(current);
        current = {
          pageNumber: page.pageNumber,
          y: it.y,
          items: [it],
          minX: it.x,
          maxX: it.x,
          text: it.str.trim(),
          hasEuro: it.str === '€',
          priceToken: undefined,
        };
      } else {
        current.items.push(it);
        current.minX = Math.min(current.minX, it.x);
        current.maxX = Math.max(current.maxX, it.x);
        current.text += ' ' + it.str.trim();
        current.hasEuro = current.hasEuro || it.str === '€';
      }
    }
    if (current) lines.push(current);
  }

  // Estimate columns using medians of x positions
  const euroXs = lines
    .flatMap(l => l.items.filter(i => i.str === '€').map(i => i.x));
  const priceColumnX = euroXs.length
    ? euroXs.sort((a, b) => a - b)[Math.floor(euroXs.length / 2)]
    : undefined;

  const qtyCandidates = lines
    .flatMap(l =>
      l.items
        .filter(i => isInteger(i.str))
        .map(i => i.x)
    );
  const qtyColumnX = qtyCandidates.length
    ? qtyCandidates.sort((a, b) => a - b)[Math.floor(qtyCandidates.length / 2)]
    : undefined;

  const descXs = lines
    .filter(l => /[A-Za-zÀ-ÿ]/.test(l.text))
    .map(l => l.minX);
  const descColumnX = descXs.length
    ? descXs.sort((a, b) => a - b)[Math.floor(descXs.length / 2)]
    : undefined;

  // NEW: also estimate price column from actual price-like tokens on lines with €
  const priceLikeXs = lines
    .filter(l => l.items.some(i => i.str === '€'))
    .flatMap(l =>
      l.items
        .map(i => ({ s: i.str.trim(), x: i.x }))
        .filter(t => parsePrice(t.s) !== undefined)
        .map(t => t.x)
    );
  const derivedPriceX = priceLikeXs.length
    ? priceLikeXs.sort((a, b) => a - b)[Math.floor(priceLikeXs.length / 2)]
    : undefined;

  const colGuard = {
    descX: descColumnX ?? 0,
    qtyX: qtyColumnX ?? ((priceColumnX ?? derivedPriceX ?? 0) - 60),
    priceX: (priceColumnX ?? derivedPriceX ?? ((qtyColumnX ?? 0) + 30)),
  };

  // Detect price tokens per line: near price column and not ref codes
  for (const line of lines) {
    const items = line.items.map(i => ({ s: i.str.trim(), x: i.x }));
    let price: { s: string; x: number } | undefined;

    // Prefer token adjacent to euro and near price column
    const euroIndex = items.findIndex(t => t.s === '€');
    if (euroIndex > 0) {
      const candidate = items[euroIndex - 1];
      if (!isRefCodeToken(candidate.s)) {
        const n = parsePrice(candidate.s);
        if (n !== undefined && Math.abs(candidate.x - colGuard.priceX) < 100) {
          price = candidate;
        }
      }
    }

    // Fallback: any token that parses as price, near price column, not a ref code
    if (!price) {
      for (const t of items) {
        if (isRefCodeToken(t.s)) continue;
        const n = parsePrice(t.s);
        if (n !== undefined && Math.abs(t.x - colGuard.priceX) < 100) {
          price = t;
          break;
        }
      }
    }

    // NOTE: do NOT mark unit-price lines (left column) as price lines if we already have a price column
    // This prevents description-column prices from being mistaken as new product anchors.
    line.priceToken = price?.s;
  }

  // Detect La Redoute-style headers anywhere on the page
  const hasLaRedouteHeaders = lines.some(
    (l) => /\bArticle\b/.test(l.text) && /\bQuantité\b/.test(l.text) && /\bPrix\b/.test(l.text)
  );
  const sectionHeaderPattern = /\bArticle\b.*\bTaille\b.*\bQuantité\b.*\bRemise\b.*\bPrix\b/i;

  // Helper: is a line a new product anchor?
  const isMeasurementNoise = (t: string) => /^(cm|mm|tu|x)$/i.test(t);
  const isAnchorLine = (l: Line): boolean => {
    const isFeeLine = feeKeywords.test(l.text.trim());
    const items = l.items;
    const priceTok = items.find(
      (it) => parsePrice(it.str) !== undefined && Math.abs(it.x - colGuard.priceX) < 100
    );
    const hasRightEuro = items.some((it) => it.str === '€' && Math.abs(it.x - colGuard.priceX) < 100);

    const leftTokens = items
      .filter((it) => it.x < (colGuard.priceX ?? Number.POSITIVE_INFINITY) - 60)
      .map((it) => it.str.trim())
      .filter((t) => t && !feeKeywords.test(t));

    const meaningfulLeftTokens = leftTokens.filter(
      (t) => /[A-Za-zÀ-ÿ]/.test(t) && !metaKeywords.test(t) && !isMeasurementNoise(t)
    );

    const hasNameLikeLeft = meaningfulLeftTokens.length > 0;
    const priceTokAny = items.find((it) => parsePrice(it.str) !== undefined);
    const hasAnyEuro = items.some((it) => it.str === '€');

    const strict = hasNameLikeLeft && !!priceTok && hasRightEuro && !isFeeLine;
    const loose = hasNameLikeLeft && !!priceTokAny && hasAnyEuro && !isFeeLine;
    return strict || loose;
  };

  // Build product blocks by walking lines
  const products: Product[] = [];
  let pendingRefForPage: { pageNumber: number; code?: string } | null = null;
  const lastProductYByPage = new Map<number, number>();

  const feeKeywords = /^(dont\b|éco-?participation|eco-?participation)/i;
  const metaKeywords = /^(ref\b|article numéro|couleur\s*:|taille\s*:|quantité\s*:)/i;
  const descNoiseKeywords =
    /(d['’]?\s?éco-?participation|^livré?s?\b|à\s+domicile|vendus?\s+et\s+expédiés?\s+par|entre\s+le\s+\d{2}\/\d{2}\/\d{4}\s+et\s+le\s+\d{2}\/\d{2}\/\d{4})/i;
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const text = line.text.trim();

    // Skip page changes and obvious non-product headers
    if (!text || dropKeywords.test(text)) continue;

    // Determine if this line is a fee/meta line
    const isFeeLine = feeKeywords.test(text);
    const isMetaLine = metaKeywords.test(text);

    // Identify price token anchored on the right column
    const priceToken = line.items.find(
      (it) => parsePrice(it.str) !== undefined && Math.abs(it.x - colGuard.priceX) < 100
    );
    const hasRightEuro = line.items.some((it) => it.str === '€' && Math.abs(it.x - colGuard.priceX) < 100);

    // IKEA fallback: any price-like token + any euro on the line
    const priceTokenAny = line.items.find((it) => parsePrice(it.str) !== undefined);
    const hasAnyEuro = line.items.some((it) => it.str === '€');

    // Build left-side name tokens (exclude trivial labels like "dont")
    const leftTokens = line.items
      .filter((it) => it.x < (colGuard.priceX ?? Number.POSITIVE_INFINITY) - 60)
      .map((it) => it.str.trim())
      .filter((t) => t && !feeKeywords.test(t));

    // Filter out measurement/noise-only tokens (e.g., "cm", "TU", solitary "x")
    const meaningfulLeftTokens = leftTokens.filter(
      (t) => /[A-Za-zÀ-ÿ]/.test(t) && !metaKeywords.test(t) && !isMeasurementNoise(t)
    );
    const hasNameLikeLeft = meaningfulLeftTokens.length > 0;

    // Anchor condition:
    const isAnchorStrict = hasNameLikeLeft && !!priceToken && hasRightEuro && !isFeeLine;
    const isAnchorLoose = hasNameLikeLeft && !!priceTokenAny && hasAnyEuro && !isFeeLine;
    const isAnchor = isAnchorStrict || isAnchorLoose;

    // Only start a product on anchor lines
    if (!isAnchor) {
      if (products.length > 0 && isMetaLine) {
        const cur = products[products.length - 1];
        if (/^ref\b/i.test(text)) {
          const m = text.match(/(\d[\d.]+)/);
          if (m) cur.reference = m[1].replace(/\./g, '');
        }
        if (/^article numéro/i.test(text)) {
          const nextLine = lines[idx + 1];
          const m = (nextLine?.text || '').match(/(\d[\d.]+)/);
          if (m) cur.reference = m[1].replace(/\./g, '');
        }
        if (/^quantité\s*:/i.test(text)) {
          const mq = text.match(/quantité\s*:\s*(\d+)/i);
          if (mq) cur.quantity = parseInt(mq[1], 10);
        }
        if (/^couleur\s*:/i.test(text) || /^taille\s*:/i.test(text)) {
          cur.description = [cur.description, text.replace(/^\s*(couleur|taille)\s*:\s*/i, '').trim()]
            .filter(Boolean)
            .join(' ')
            .trim();
        }
      }
      continue;
    }

    // Total price from the right column if available; else from any price token
    const anchorPriceVal =
      (priceToken ? parsePrice(priceToken.str) : undefined) ??
      parsePrice(priceTokenAny?.str || '');

    // Quantity on the anchor line: nearest pure integer to the left of the right-side price
    let quantity = 1;
    const anchorPriceX = priceToken?.x ?? colGuard.priceX;
    if (anchorPriceX !== undefined) {
      const intTokens = line.items.filter((it) => /^\d+$/.test(it.str.trim()));
      let closest: { str: string; x: number } | undefined;
      for (const it of intTokens) {
        const dx = anchorPriceX - it.x;
        if (dx > 10 && dx < 150) {
          if (!closest || (anchorPriceX - it.x) < (anchorPriceX - closest.x)) {
            closest = it;
          }
        }
      }
      if (closest) {
        quantity = parseInt(closest.str.trim(), 10);
      }
    }
    // Fallback: keep previous heuristic if anchorPriceX missing
    if (anchorPriceX === undefined) {
      const qtyOnLine =
        line.items.find(
          (it) =>
            /^\d+$/.test(it.str.trim()) &&
            it.x > (colGuard.descX - 40) &&
            it.x < (colGuard.priceX ?? it.x + 999) - 10
        )?.str ?? undefined;
      if (qtyOnLine) quantity = parseInt(qtyOnLine, 10);
    }

    // Name: use meaningful tokens (exclude measurement-only)
    const name = meaningfulLeftTokens.filter((t) => !/^\d+$/.test(t)).join(' ').replace(/\s+/g, ' ').trim();

    // Collect description/metadata below this anchor,
    // but STOP if we hit a section header or the NEXT anchor line.
    const descriptionLines: string[] = [];
    let reference: string | undefined;
    let unitPrice: number | undefined;
    // Force La Redoute rules when vendor is detected, even if headers aren't present
    let isLaRedouteBlock = hasLaRedouteHeaders || options?.vendor === "la_redoute"; // force LR rules by vendor

    const maxDownGap = 160;
    let lastY = line.y;

    const priceCandidates: number[] = [];
    if (anchorPriceVal !== undefined) priceCandidates.push(anchorPriceVal);

    let nextIdx = idx + 1;
    while (nextIdx < lines.length) {
      const nxt = lines[nextIdx];

      // Stop if we jumped too far down or hit a header/section break
      if (!nxt || (nxt.y - lastY) > maxDownGap) break;
      const nxtText = nxt.text.trim();

      // Section break/header row
      if (sectionHeaderPattern.test(nxtText)) break;

      // Stop at obvious non-product headers
      if (dropKeywords.test(nxtText)) break;

      // If the next line is a new anchor, stop the current block
      if (isAnchorLine(nxt)) break;

      // Parse quantity from "Quantité : X" pattern and update the quantity variable
      if (/^quantité\s*:/i.test(nxtText)) {
        console.log(`DEBUG: Found quantity pattern in description loop: "${nxtText}"`);
        const mq = nxtText.match(/quantité\s*:\s*(\d+)/i);
        if (mq) {
          const oldQuantity = quantity;
          quantity = parseInt(mq[1], 10);
          console.log(`DEBUG: Updated quantity from ${oldQuantity} to ${quantity} for "${name}"`);
        } else {
          console.log(`DEBUG: Quantity pattern matched but no number found in: "${nxtText}"`);
        }
      }

      // Prix à droite (unit/rabais)
      const nxtPriceToken = nxt.items.find(
        (it) => parsePrice(it.str) !== undefined && Math.abs(it.x - colGuard.priceX) < 100
      );
      const nxtHasRightEuro = nxt.items.some((it) => it.str === '€' && Math.abs(it.x - colGuard.priceX) < 100);

      if (nxtHasRightEuro && nxtPriceToken) {
        const candVal = parsePrice(nxtPriceToken.str);
        if (candVal !== undefined) {
          // Filter out eco-participation fees (typically very small amounts like 0.50, 0.00)
          const nxtText = nxt.text.trim().toLowerCase();
          const isEcoFee = /\bdont\b/.test(nxtText) || (candVal < 1.0 && /éco|eco/.test(nxtText));
          
          if (!isEcoFee) {
            priceCandidates.push(candVal);
            unitPrice = unitPrice ?? candVal;
          }
        }
      }

      // Texte côté gauche
      const leftTextChunk = nxt.items
        .filter((it) => it.x < (colGuard.priceX ?? Number.POSITIVE_INFINITY) - 60)
        .map((it) => it.str.trim())
        .join(' ')
        .trim();

      if (leftTextChunk && !metaKeywords.test(leftTextChunk) && !descNoiseKeywords.test(leftTextChunk)) {
        descriptionLines.push(leftTextChunk.replace(/\b\d{1,3}(?:[.,]\d{2})\b\s*€/g, '').trim());
      }


      lastY = nxt.y;
      nextIdx++;
    }

    // Prefer discounted price when multiple prices are stacked
    const discountedTotal = isLaRedouteBlock 
      ? (priceCandidates.length ? Math.max(...priceCandidates) : undefined)
      : (priceCandidates.length ? Math.min(...priceCandidates) : undefined);

    // Final price selection
    let priceTTC: number | undefined;
    let priceSource: 'total' | 'unit' | 'fallback' | undefined;
    const totalPriceTTC = discountedTotal;

    if (isLaRedouteBlock) {
      // La Redoute: choose total if present; otherwise use detected unit price
      if (totalPriceTTC !== undefined) {
        priceTTC = totalPriceTTC;
        priceSource = 'total';
      } else if (unitPrice !== undefined) {
        priceTTC = unitPrice;
        priceSource = 'unit';
      } else {
        priceTTC = undefined;
        priceSource = undefined;
      }
    } else {
      // IKEA and generic: prefer detected unit price; else compute from total/qty
      priceTTC = unitPrice;
      priceSource = priceTTC !== undefined ? 'unit' : undefined;

      if (priceTTC === undefined) {
        if (totalPriceTTC !== undefined && quantity > 1) {
          priceTTC = parseFloat((totalPriceTTC / quantity).toFixed(2));
          priceSource = 'total';
        } else {
          const fallbackTotal = priceCandidates.length ? Math.max(...priceCandidates) : undefined;
          priceTTC = fallbackTotal;
          priceSource = fallbackTotal !== undefined ? 'fallback' : undefined;
        }
      }
    }

    // Add debug logging before the unit price division logic
    console.log(`DEBUG: Product "${name}" - isLaRedouteBlock: ${isLaRedouteBlock}, priceSource: ${priceSource}, priceTTC: ${priceTTC}, quantity: ${quantity}, vendor: ${options?.vendor}`);

    // Enforce unit price for La Redoute when price came from a total and quantity > 1
    if (isLaRedouteBlock && priceSource === 'total' && priceTTC !== undefined && quantity > 1) {
      console.log(`DEBUG: Dividing La Redoute total ${priceTTC} by quantity ${quantity} for "${name}"`);
      priceTTC = parseFloat((priceTTC / quantity).toFixed(2));
    }

    products.push({
      id: (name + (reference ?? '')).toLowerCase().replace(/[^a-z0-9]/g, '') || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      description: descriptionLines.join(' ').replace(/\s+/g, ' ').trim(),
      quantity,
      priceTTC,
      reference,
    });

    // Skip lines consumed in this block; next loop resumes at the next candidate
    idx = nextIdx - 1;
  }

  // AFTER all products are created and post-processed, apply La Redoute unit price division
  if (options?.vendor === "la_redoute") {
    for (const product of products) {
      if (product.priceTTC !== undefined && product.quantity > 1) {
        const originalPrice = product.priceTTC;
        product.priceTTC = parseFloat((originalPrice / product.quantity).toFixed(2));
        console.log(`DEBUG: Post-processing La Redoute unit price for "${product.name}": ${originalPrice} / ${product.quantity} = ${product.priceTTC}`);
      }
    }
  }

  // At the very end of the function:
  return products;
}
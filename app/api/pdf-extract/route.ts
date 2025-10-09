import { NextRequest, NextResponse } from "next/server";
import { extractWithPdfJs, summarizePositionsForLLM, Product, extractProductsFromPositions, groupRowsIntoProductBoxes } from "../../../lib/pdfProcessor";

export const runtime = "nodejs";

// POST /api/pdf-extract
// Always uses LLM over positional summary (layout-aware) — no text mode or async jobs
// In POST(): add vendor detection and vendor-aware prompt rules before calling LLM
export async function POST(request: NextRequest) {
  try {
    console.log('=== /api/pdf-extract [positions-only LLM] :: request received ===');

    const formData = await request.formData();
    const file = formData.get('pdf') as File | null;

    if (!file) {
      console.error("FormData missing 'pdf' field.");
      return NextResponse.json({ error: "Missing 'pdf' file in form-data" }, { status: 400 });
    }

    console.log('Upload info:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: (file as any)?.lastModified
    });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.time('pdfjs:extract');
    const { plainText, pages } = await extractWithPdfJs(buffer);
    console.timeEnd('pdfjs:extract');

    console.log(`PDF extracted: ${pages.length} page(s).`);
    pages.slice(0, 3).forEach(p =>
      console.log(`  Page ${p.pageNumber} (${p.width}x${p.height}) :: items=${p.items.length}`)
    );

    // Use pruned summary for LLM (fewer chars) but always print full summary to terminal
    const summary = summarizePositionsForLLM(
      pages,
      { prune: true, aggressive: true, maxContextRows: 2, maxRowsPerPage: 100, onlyPagesWithPrices: true }
    );
    const totalRows = summary.pages.reduce((acc, p) => acc + p.rows.length, 0);
    const totalTokens = summary.pages.reduce(
      (acc, p) => acc + p.rows.reduce((a, r) => a + r.tokens.length, 0),
      0
    );
    console.log(`Positions summary: pages=${summary.pages.length}, rows=${totalRows}, tokens=${totalTokens}`);
    const summaryJsonLength = JSON.stringify(summary).length;
    console.log(`Summary JSON length: ${summaryJsonLength}`);

    // Always print the entire extracted summary to the terminal
    console.log('--- FULL SUMMARY JSON ---');
    console.log(JSON.stringify(summary));
    console.log('--- END FULL SUMMARY ---');

    summary.pages.slice(0, 2).forEach((p, pi) => {
      console.log(`Page ${p.pageNumber} sample rows:`);
      p.rows.slice(0, 8).forEach((r, ri) => {
        const tokensPreview = r.tokens.map(t => `${t.t}@(${t.x},${t.y})`).join(' | ');
        console.log(`  Row#${ri} y=${r.y} euro=${r.hasEuro} :: ${tokensPreview}`);
      });
    });

    // Detect vendor from summary (La Redoute, IKEA, or generic)
    const detectVendor = (sum: ReturnType<typeof summarizePositionsForLLM>): "la_redoute" | "ikea" | "generic" => {
      const hasToken = (re: RegExp) =>
        sum.pages.some(p =>
          p.rows.some(r => r.tokens.some(t => re.test(t.t)))
        );

      // La Redoute clues: "Ref :", "Couleur :", "Taille :", "Quantité :", "dont", "FRAIS DE PORT", "MONTANT"
      const isLaRedoute =
        hasToken(/^(ref|réf)\s*:/i) ||
        hasToken(/^couleur\s*:/i) ||
        hasToken(/^taille\s*:/i) ||
        hasToken(/^quantité\s*:/i) ||
        hasToken(/\bdont\b/i) ||
        hasToken(/frais\s+de\s+port/i) ||
        hasToken(/\bmontant\b/i);

      // IKEA clues: "Article numéro", IKEA ref codes like 305.332.14, 606.024.04
      const isIkea =
        hasToken(/article\s+numéro/i) ||
        sum.pages.some(p =>
          p.rows.some(r => r.tokens.some(t => /^\d{3}\.\d{3}\.\d{2}$/.test(t.t.trim())))
        );

      if (isLaRedoute) return "la_redoute";
      if (isIkea) return "ikea";
      return "generic";
    };

    const vendor = detectVendor(summary);
    console.log('Detected vendor:', vendor);

    // Build vendor-specific rules appended to the LLM prompt
    const vendorPromptRules = (v: "la_redoute" | "ikea" | "generic"): string => {
      if (v === "la_redoute") {
        return [
          "- Use the discounted (smaller) price near the right-side euro symbol.",
          "- If both total and quantity appear, set priceTTC (unit price) = total / quantity.",
          "- Include Couleur and Taille in description when present.",
          "- Ignore lines starting with 'dont', shipping (FRAIS DE PORT), and global totals (MONTANT).",
        ].join("\n");
      }
      if (v === "ikea") {
        return [
          "- Use the discounted (smaller) price when two prices appear on the same line.",
          "- Quantity is the nearest pure integer to the left of the right-side price on the same line.",
          "- Recognize 'Article numéro' and code patterns like 305.332.14 for reference.",
          "- Ignore shipping, eco-participation, and global totals.",
        ].join("\n");
      }
      // Generic rules for unknown vendors
      return [
        "- Use numeric tokens adjacent to '€' for priceTTC; convert commas to dots.",
        "- Quantity is a small integer aligned left of the price column on the same line.",
        "- Names must be clean (no prices/codes); references come from nearby codes or labels.",
        "- Ignore shipping/fees/global totals lines.",
      ].join("\n");
    };

    // First: deterministic positional extraction
    const baseProducts = extractProductsFromPositions(pages, { vendor });
    console.log(`Positional products parsed: ${baseProducts.length}`);
    (baseProducts || []).slice(0, 10).forEach((p, i) =>
      console.log(`POS ${i + 1}. "${p.name}" qty=${p.quantity} TTC=${p.priceTTC ?? 'n/a'} HT=${p.priceHT ?? 'n/a'} ref=${p.reference ?? 'n/a'}`)
    );

    let products: Product[] = [];

    // For IKEA: prefer positional results (they work perfectly)
    // For La Redoute: use LLM with boxes for better segmentation
    if (vendor === "ikea" && baseProducts.length > 0) {
      products = baseProducts;
      console.log('Using IKEA positional products; LLM skipped.');
    } else {
      // Use LLM approach with boxes for La Redoute and generic PDFs
      const boxSummary = groupRowsIntoProductBoxes(summary, { prePadding: 80, postPadding: 10, minRowsPerBox: 1 });
      console.log(`Box summary: pages=${boxSummary.pages.length}, boxes=${boxSummary.pages.reduce((a,p)=>a+p.boxes.length,0)}`);

      const llmPrompt =
        `You are extracting products from an invoice.\n` +
        `Vendor: ${vendor}\n` +
        `Assumption: Each 'box' below corresponds to exactly one product.\n` +
        `Rules:\n` +
        vendorPromptRules(vendor) + "\n" +
        `Output: ONLY a minified JSON array with objects:\n` +
        `[\n` +
        `  {\n` +
        `    "id": "unique-identifier",\n` +
        `    "name": "PRODUCT_NAME_ONLY",\n` +
        `    "description": "size, color, variant details",\n` +
        `    "quantity": 1,\n` +
        `    "priceTTC": 0.00,\n` +
        `    "priceHT": 0.00,\n` +
        `    "reference": "product-reference-or-sku"\n` +
        `  }\n` +
        `]\n` +
        `Do not echo the input data.\n` +
        `DATA (do not echo):\n` +
        `${JSON.stringify(boxSummary)}`;

      console.log(`LLM prompt length: ${llmPrompt.length} chars`);

      console.time('llm:call');
      products = await extractProductsWithLLM(llmPrompt);
      console.timeEnd('llm:call');

      // Fallback if LLM returns nothing or generic placeholders
      const isGeneric = (p: Product) =>
        !p?.name ||
        /^(item|product)\s*\d+$/i.test(p.name.trim()) ||
        p.name.trim().length < 2;

      // If LLM yields nothing or is generic, fall back to positional extractor
      if (!products || products.length === 0) {
        console.log('LLM products empty or generic; falling back to positional extractor.');
        const fallback = extractProductsFromPositions(pages, { vendor });
        if (fallback.length > 0) {
          products = fallback;
        }
      }
      if (products.length === 0 || products.every(isGeneric)) {
        const fallback = extractProductsFromPositions(pages, { vendor });
        products = fallback;
      }
    }

    console.log(`Final products: ${Array.isArray(products) ? products.length : 0}`);
    (products || []).slice(0, 10).forEach((p, i) =>
      console.log(`${i + 1}. "${p.name}" qty=${p.quantity} TTC=${p.priceTTC ?? 'n/a'} HT=${p.priceHT ?? 'n/a'} ref=${p.reference ?? 'n/a'}`)
    );

    return NextResponse.json({
      success: true,
      products,
      positions: pages,
      metadata: {
        pages: pages.length,
        textLength: (plainText || '').length,
        productsFound: Array.isArray(products) ? products.length : 0,
        method: 'llm-positions'
      }
    });
  } catch (error: any) {
    console.error('PDF extraction (positions-only) error:', error?.stack || error);
    return NextResponse.json(
      { error: 'Failed to extract products from PDF using positional LLM' },
      { status: 500 }
    );
  }
}

// LLM call — expects a prompt including positional summary; returns a parsed products array
async function extractProductsWithLLM(prompt: string): Promise<Product[]> {
  const ollamaEndpoint = process.env.HOSTINGER_LLM_ENDPOINT || 'https://ollama.mabeldev.com/api/generate';
  const ollamaApiKey = process.env.HOSTINGER_LLM_API_KEY;

  console.log('LLM endpoint:', ollamaEndpoint);
  console.log('Prompt size:', prompt.length);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200000);

  try {
    const payload = {
      model: 'mistral:latest',
      prompt,
      stream: false,
      // Removed to prevent the model from echoing the embedded summary JSON
      // format: 'json',
      system:
        'You are a function that returns ONLY a minified JSON array. ' +
        'No prose, no markdown, and do not echo the input data. ' +
        'If unsure, return [].',
      options: {
        temperature: 0,
        top_p: 0.7,
        num_predict: 2048
      }
    };
    console.log('LLM payload options:', payload.options);

    const response = await fetch(ollamaEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ollamaApiKey && { 'Authorization': `Bearer ${ollamaApiKey}` })
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    console.log('LLM response status:', response.status, response.statusText);
    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Prefer structured fields first; fall back to the whole object
    let raw: string;
    if (typeof data.response === 'string') {
      raw = data.response;
    } else if (data.response && typeof data.response === 'object') {
      raw = JSON.stringify(data.response);
    } else if (typeof data.text === 'string') {
      raw = data.text;
    } else {
      raw = JSON.stringify(data);
    }

    console.log('LLM raw length:', raw.length);
    console.log('='.repeat(80));
    console.log('LLM RAW (head):');
    console.log(raw.slice(0, 800));
    if (raw.length > 1200) {
      console.log('--- tail ---');
      console.log(raw.slice(-400));
    }
    console.log('='.repeat(80));

    const tryJsonParse = (s: string): any | null => {
      try { return JSON.parse(s); } catch { return null; }
    };
    const parsedRoot = tryJsonParse(raw);

    const pickArray = (obj: any): any[] | null => {
      if (Array.isArray(obj)) return obj;
      if (!obj || typeof obj !== 'object') return null;

      // Check common wrappers first
      const directKeys = ['items', 'products', 'result', 'array'];
      for (const key of directKeys) {
        const val = obj[key];
        if (Array.isArray(val)) return val;
      }

      // Nested common: { data: { items/products: [...] } }
      const dataKey = obj.data;
      if (dataKey && typeof dataKey === 'object') {
        if (Array.isArray(dataKey.items)) return dataKey.items;
        if (Array.isArray(dataKey.products)) return dataKey.products;
      }

      // Avoid picking positional summary pages
      if (Array.isArray(obj.pages)) {
        // This is likely the positional summary, do not treat as products
      }

      return null;
    };

    let arrayCandidate: any[] | null =
      (parsedRoot ? pickArray(parsedRoot) : null);

    // Regex fallback if no structured candidate found
    if (!arrayCandidate) {
      const jsonArrayMatch = raw.match(/\[\s*{[\s\S]*}\s*\]/);
      if (!jsonArrayMatch) {
        const firstBracket = raw.indexOf('[');
        const lastBracket = raw.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket > firstBracket) {
          const candidate = raw.slice(firstBracket, lastBracket + 1);
          const parsedCandidate = tryJsonParse(candidate);
          if (Array.isArray(parsedCandidate)) {
            console.warn('Parsed array via bracket fallback.');
            arrayCandidate = parsedCandidate;
          }
        }
      } else {
        const parsedCandidate = tryJsonParse(jsonArrayMatch[0]);
        if (Array.isArray(parsedCandidate)) {
          arrayCandidate = parsedCandidate;
        }
      }
    }

    if (!arrayCandidate || !Array.isArray(arrayCandidate)) {
      console.warn('LLM did not return a usable JSON array; returning empty products.');
      return [];
    }

    // Map with field synonyms to tolerate different keys
    const products: Product[] = arrayCandidate
      .filter((p: any) => p && typeof p === 'object')
      .map((p: any, idx: number) => {
        const name =
          String(p?.name ?? p?.product ?? p?.title ?? p?.label ?? '').trim();
        const description =
          String(p?.description ?? p?.desc ?? p?.details ?? p?.variant ?? '').trim();
        const quantityRaw = p?.quantity ?? p?.qty ?? p?.count ?? 1;
        const quantity = Number.isFinite(Number(quantityRaw))
          ? parseInt(String(quantityRaw), 10)
          : 1;

        const priceTTC = coercePrice(
          p?.priceTTC ?? p?.ttc ?? p?.price ?? p?.total ?? p?.amount
        );
        const priceHT = coercePrice(
          p?.priceHT ?? p?.ht ?? p?.net ?? p?.subtotal
        );

        const reference =
          String(p?.reference ?? p?.sku ?? p?.code ?? p?.itemCode ?? '').trim();

        const id =
          (String(p?.id || '') ||
            (name + reference).toLowerCase().replace(/[^a-z0-9]/g, '') ||
            `product_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

        console.log(`Product[${idx}]:`, { id, name, quantity, priceTTC, priceHT, reference });
        return { id, name, description, quantity, priceHT, priceTTC, reference };
      });

    console.log('Parsed products count:', products.length);
    return products;
  } catch (err) {
    console.error('LLM call failed:', err);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

function coercePrice(val: any): number | undefined {
  if (val == null) return undefined;
  const s = String(val).replace(',', '.').replace(/[^\d.]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}
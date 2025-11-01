import { NextRequest, NextResponse } from "next/server";
import { extractWithPdfJs, summarizePositionsForLLM, Product, extractProductsFromPositions, groupRowsIntoProductBoxes } from "../../../lib/pdfProcessor";

export const runtime = "nodejs";

// Simple vendor detection - only IKEA and La Redoute get special treatment
function detectVendor(summary: ReturnType<typeof summarizePositionsForLLM>): "la_redoute" | "ikea" | "generic" {
  const hasToken = (re: RegExp) =>
    summary.pages.some(p => p.rows.some(r => r.tokens.some(t => re.test(t.t))));

  const countMatches = (re: RegExp) =>
    summary.pages.reduce((acc, p) => 
      acc + p.rows.reduce((sum, r) => 
        sum + r.tokens.filter(t => re.test(t.t)).length, 0), 0);

  // IKEA detection
  const ikeaScore =
    (hasToken(/ikea/i) ? 10 : 0) +
    (hasToken(/article\s+numéro/i) ? 5 : 0) +
    (countMatches(/^\d{3}\.\d{3}\.\d{2}$/) * 3);

  if (ikeaScore >= 5) return "ikea";

  // La Redoute detection
  const laRedouteScore =
    (hasToken(/la\s*redoute/i) ? 10 : 0) +
    (hasToken(/^(ref|réf)\s*:/i) ? 3 : 0) +
    (hasToken(/^couleur\s*:/i) ? 2 : 0) +
    (hasToken(/\bdont\b/i) ? 2 : 0);

  if (laRedouteScore >= 5) return "la_redoute";

  // Everything else is generic
  return "generic";
}

// Universal LLM prompt that works for any invoice layout
function buildUniversalPrompt(
  boxSummary: ReturnType<typeof groupRowsIntoProductBoxes>,
  vendor: "la_redoute" | "ikea" | "generic"
): string {
  
  const vendorHints = vendor === "ikea" 
    ? "\n- IKEA: Look for reference codes like 305.332.14"
    : vendor === "la_redoute"
    ? "\n- La Redoute: Use smaller price, divide by quantity if needed"
    : "";

  return `Extract products from invoice data. Return ONLY a JSON array.

UNIVERSAL EXTRACTION RULES:
1. Find product names (left-aligned text, usually longest text on the line)
2. Find prices (numbers near € symbol on the right side)
3. Find quantities (small integers, usually between name and price)
4. When multiple prices appear: use the SMALLER one (discounted price)
5. Price must be UNIT price per item (if you see total and quantity, divide: total/quantity)
6. Product reference/SKU: look for codes near the product name${vendorHints}

SKIP THESE (not products):
- Headers: "Article", "Taille", "Quantité", "Remise", "Prix"
- Totals: "MONTANT", "TOTAL", "SOUS-TOTAL", "SOUS TOTAL"
- Shipping: "FRAIS DE PORT", "Livraison", "Frais de livraison"
- Fees: "dont", "éco-participation", "eco-participation"
- Payment: "CARTE VISA", "Payé par", "Mode de paiement"
- Other: "ÉCONOMIE", "TVA", "Adresse"

OUTPUT FORMAT (minified JSON only, no explanation):
[
  {
    "id": "auto-generated-id",
    "name": "Clean Product Name",
    "description": "size, color, variant details if present",
    "quantity": 1,
    "priceTTC": 123.45,
    "priceHT": null,
    "reference": "SKU or code if found"
  }
]

INSTRUCTIONS:
- Each "box" below = one product
- Extract from tokens in each box
- name: text tokens from left side (no prices, no codes)
- priceTTC: number before € symbol on right side, use SMALLER if multiple
- quantity: integer near middle/before price
- description: extra details like size (cm, mm), color, variant
- reference: any code/SKU near product name
- Format prices as decimals: 269.90 not "269,90" or "269.90 €"

DATA:
${JSON.stringify(boxSummary, null, 0)}

JSON OUTPUT:`;
}

// Robust LLM extraction with cleanup
async function extractWithLLM(
  boxSummary: ReturnType<typeof groupRowsIntoProductBoxes>,
  vendor: "la_redoute" | "ikea" | "generic"
): Promise<Product[]> {
  const ollamaEndpoint = process.env.HOSTINGER_LLM_ENDPOINT || 'https://ollama.mabeldev.com/api/generate';
  const ollamaApiKey = process.env.HOSTINGER_LLM_API_KEY;

  const prompt = buildUniversalPrompt(boxSummary, vendor);
  console.log(`LLM prompt: ${prompt.length} chars, vendor: ${vendor}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const payload = {
      model: 'mistral:latest',
      prompt,
      stream: false,
      system: 'You extract product data and return pure JSON arrays. No markdown, no explanations, no echoing input.',
      options: {
        temperature: 0,
        top_p: 0.9,
        num_predict: 4096,
        stop: ['```', 'DATA:', 'INSTRUCTIONS:', '\n\nNote:', '\n\nRemember:']
      }
    };

    const response = await fetch(ollamaEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ollamaApiKey && { 'Authorization': `Bearer ${ollamaApiKey}` })
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`LLM error: ${response.status}`);
    }

    const data = await response.json();
    let raw = data.response || data.text || JSON.stringify(data);

    console.log('LLM response length:', raw.length);
    console.log('LLM sample:', raw.slice(0, 500));

    // Aggressive cleanup
    raw = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/^[^[{]*/g, '')  // Remove everything before first [ or {
      .replace(/[}\]]\s*[^}\]]*$/g, ']}')  // Clean after last ] or }
      .trim();

    // Extract JSON array
    const arrayMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!arrayMatch) {
      console.warn('No valid JSON array in response');
      return [];
    }

    let parsed: any;
    try {
      parsed = JSON.parse(arrayMatch[0]);
    } catch (e) {
      console.error('JSON parse error:', e);
      // Try to fix common issues
      const fixed = arrayMatch[0]
        .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":');  // Quote unquoted keys
      try {
        parsed = JSON.parse(fixed);
      } catch (e2) {
        console.error('JSON fix failed');
        return [];
      }
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    // Map to clean Product objects
    const products: Product[] = parsed
      .filter((p: any) => {
        if (!p || typeof p !== 'object') return false;
        const name = String(p.name || '').trim();
        // Filter out generic placeholders
        if (!name || name.length < 2) return false;
        if (/^(product|item|article)\s*\d*$/i.test(name)) return false;
        return true;
      })
      .map((p: any, idx: number) => {
        const cleanPrice = (val: any): number | undefined => {
          if (val == null) return undefined;
          const s = String(val).replace(/[^\d.,]/g, '').replace(',', '.');
          const n = parseFloat(s);
          return isFinite(n) && n > 0 ? parseFloat(n.toFixed(2)) : undefined;
        };

        const name = String(p.name || '').trim();
        const description = String(p.description || p.desc || p.details || '').trim();
        
        let quantity = 1;
        const qtyRaw = p.quantity || p.qty || p.count;
        if (qtyRaw != null) {
          const q = parseInt(String(qtyRaw), 10);
          if (!isNaN(q) && q > 0 && q < 1000) quantity = q;
        }

        const priceTTC = cleanPrice(p.priceTTC || p.ttc || p.price || p.amount);
        const priceHT = cleanPrice(p.priceHT || p.ht);
        const reference = String(p.reference || p.sku || p.code || p.ref || '').trim();

        const id = (name + reference)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 40) || `prod_${Date.now()}_${idx}`;

        return { id, name, description, quantity, priceTTC, priceHT, reference };
      });

    console.log(`LLM extracted: ${products.length} products`);
    return products;

  } catch (err: any) {
    console.error('LLM call failed:', err.message);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

// Main extraction endpoint
export async function POST(request: NextRequest) {
  try {
    console.log('=== PDF EXTRACTION START ===');

    const formData = await request.formData();
    const file = formData.get('pdf') as File | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    console.log(`Processing: ${file.name} (${file.size} bytes)`);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract PDF structure
    console.time('pdf-extraction');
    const { plainText, pages } = await extractWithPdfJs(buffer);
    console.timeEnd('pdf-extraction');

    console.log(`PDF: ${pages.length} pages, ${plainText.length} chars`);

    // Create compact positional summary
    const summary = summarizePositionsForLLM(pages, {
      prune: true,
      aggressive: true,
      maxContextRows: 3,
      maxRowsPerPage: 100,
      onlyPagesWithPrices: true
    });

    const totalRows = summary.pages.reduce((a, p) => a + p.rows.length, 0);
    console.log(`Summary: ${summary.pages.length} pages, ${totalRows} rows`);

    // Detect vendor (only IKEA and La Redoute get special handling)
    const vendor = detectVendor(summary);
    console.log(`Vendor: ${vendor}`);

    let products: Product[] = [];

    // IKEA works best with positional extraction
    if (vendor === 'ikea') {
      console.log('Using positional extraction (IKEA optimized)');
      products = extractProductsFromPositions(pages, { vendor });
      
      // Fallback to LLM if positional fails
      if (products.length === 0) {
        console.log('Positional extraction failed, trying LLM...');
        const boxSummary = groupRowsIntoProductBoxes(summary, {
          prePadding: 80,
          postPadding: 10,
          minRowsPerBox: 1
        });
        products = await extractWithLLM(boxSummary, vendor);
      }
    } else {
      // Everything else (including La Redoute) uses universal LLM approach
      console.log('Using universal LLM extraction');
      
      const boxSummary = groupRowsIntoProductBoxes(summary, {
        prePadding: 100,
        postPadding: 15,
        minRowsPerBox: 1
      });

      console.log(`Created ${boxSummary.pages.reduce((a, p) => a + p.boxes.length, 0)} product boxes`);

      products = await extractWithLLM(boxSummary, vendor);

      // Fallback to positional if LLM completely fails
      if (products.length === 0) {
        console.log('LLM extraction failed, trying positional fallback...');
        products = extractProductsFromPositions(pages, { vendor });
      }
    }

    // Validate and clean results
    const validProducts = products
      .filter(p => p.name && p.name.length >= 2)
      .map(p => ({
        ...p,
        quantity: Math.max(1, p.quantity || 1),
        priceTTC: p.priceTTC && p.priceTTC > 0 ? parseFloat(p.priceTTC.toFixed(2)) : undefined,
        priceHT: p.priceHT && p.priceHT > 0 ? parseFloat(p.priceHT.toFixed(2)) : undefined,
        description: p.description?.slice(0, 200) || '',
        reference: p.reference?.slice(0, 50) || ''
      }));

    console.log(`=== RESULTS: ${validProducts.length} products ===`);
    validProducts.slice(0, 5).forEach((p, i) => {
      console.log(`${i + 1}. "${p.name}" x${p.quantity} @ €${p.priceTTC || '?'}`);
    });

    return NextResponse.json({
      success: true,
      products: validProducts,
      metadata: {
        vendor,
        pages: pages.length,
        productsFound: validProducts.length,
        method: vendor === 'ikea' ? 'positional' : 'llm-universal'
      }
    });

  } catch (error: any) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { 
        error: 'PDF extraction failed', 
        details: error.message,
        success: false 
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

/**
 * PDF Extraction API Route
 * 
 * Proxies PDF files to the Python FastAPI backend for extraction.
 * The Python backend handles:
 * 1. Text extraction (pdfplumber)
 * 2. OCR fallback (Tesseract)
 * 3. LLM product extraction (vLLM)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('=== PDF EXTRACTION (Python Backend) ===');

    const formData = await request.formData();
    const file = formData.get('pdf') as File | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    console.log(`Processing: ${file.name} (${file.size} bytes)`);

    // Forward to Python backend
    const pythonFormData = new FormData();
    pythonFormData.append('pdf', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 min timeout for OCR

    try {
      const response = await fetch(`${PYTHON_BACKEND_URL}/extract`, {
        method: 'POST',
        body: pythonFormData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Python backend error:', response.status, errorText);

        return NextResponse.json(
          {
            error: 'PDF extraction failed',
            details: errorText,
            success: false
          },
          { status: response.status }
        );
      }

      const result = await response.json();

      console.log(`=== RESULTS: ${result.products?.length || 0} products ===`);
      if (result.products?.length > 0) {
        result.products.slice(0, 5).forEach((p: any, i: number) => {
          console.log(`${i + 1}. "${p.name}" x${p.quantity} @ €${p.priceTTC || '?'}`);
        });
      }

      return NextResponse.json(result);

    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          {
            error: 'Request timeout',
            details: 'PDF extraction took too long',
            success: false
          },
          { status: 504 }
        );
      }

      // Check if Python backend is running
      if (fetchError.cause?.code === 'ECONNREFUSED') {
        console.error('Python backend not running at', PYTHON_BACKEND_URL);
        return NextResponse.json(
          {
            error: 'Backend unavailable',
            details: `Python backend not running at ${PYTHON_BACKEND_URL}. Start it with: cd backend && python main.py`,
            success: false
          },
          { status: 503 }
        );
      }

      throw fetchError;
    }

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
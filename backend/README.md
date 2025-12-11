# PDF Extraction Backend

FastAPI service for extracting products from PDF invoices using OCR and LLM.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Install Tesseract (for OCR)

**Windows:**
- Download from [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki)
- Add to PATH

**Linux:**
```bash
sudo apt install tesseract-ocr tesseract-ocr-fra poppler-utils
```

**macOS:**
```bash
brew install tesseract tesseract-lang poppler
```

### 3. Configure Environment

Copy the example file and edit:
```bash
cp env.example .env
```

Edit `.env`:
```
LLM_BASE_URL=https://vllm.mabeldev.com/v1
LLM_MODEL=gemma-3-12b-it
```

### 4. Run the Server

```bash
python main.py
```

Or with uvicorn:
```bash
uvicorn main:app --reload --port 8000
```

## API Endpoints

### `POST /extract`

Extract products from a PDF invoice.

**Request:**
```bash
curl -X POST http://localhost:8000/extract \
  -F "pdf=@invoice.pdf"
```

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": "productname",
      "name": "Product Name",
      "description": "Size, color details",
      "quantity": 2,
      "priceTTC": 29.99,
      "priceHT": null,
      "reference": "SKU123"
    }
  ],
  "metadata": {
    "pages": 1,
    "usedOcr": false,
    "productsFound": 1,
    "textLength": 1234,
    "extractionTimeMs": 150,
    "llmTimeMs": 2500,
    "totalTimeMs": 2650
  }
}
```

### `GET /health`

Health check endpoint.

```bash
curl http://localhost:8000/health
```

## Architecture

```
PDF Upload
    │
    ▼
┌─────────────────────┐
│  pdfplumber         │ ─── Text extraction
│  (text extraction)  │
└─────────────────────┘
    │
    ▼ (if no text)
┌─────────────────────┐
│  Tesseract OCR      │ ─── Image-based extraction
│  (pdf2image)        │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│  vLLM               │ ─── Product extraction
│  (gemma-3-12b-it)   │
└─────────────────────┘
    │
    ▼
JSON Response
```

## Integration with Next.js

The Next.js API route at `/api/pdf-extract` proxies requests to this backend.

Add to your `.env.local`:
```
PYTHON_BACKEND_URL=http://localhost:8000
```

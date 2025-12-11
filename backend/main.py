"""
PDF Extraction API

FastAPI service for extracting products from PDF invoices.
"""

import logging
import os
import time
from typing import List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pdf_extractor import extract_text_from_pdf
from llm_client import extract_products_with_llm, Product

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="PDF Extraction API",
    description="Extract products from PDF invoices using OCR and LLM",
    version="1.0.0"
)

# CORS configuration for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExtractionResponse(BaseModel):
    """Response model for extraction endpoint."""
    success: bool
    products: List[Product]
    metadata: dict


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="1.0.0"
    )


@app.post("/extract", response_model=ExtractionResponse)
async def extract_products(pdf: UploadFile = File(...)):
    """
    Extract products from a PDF invoice.
    
    1. Extracts text from PDF using pdfplumber
    2. If text extraction fails, uses OCR (Tesseract)
    3. Sends text to LLM for product extraction
    
    Args:
        pdf: Uploaded PDF file
        
    Returns:
        ExtractionResponse with products and metadata
    """
    start_time = time.time()
    
    # Validate file
    if not pdf.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    if not pdf.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    logger.info(f"Processing: {pdf.filename}")
    
    try:
        # Read PDF bytes
        pdf_bytes = await pdf.read()
        file_size = len(pdf_bytes)
        logger.info(f"File size: {file_size} bytes")
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="Empty PDF file")
        
        if file_size > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(status_code=400, detail="PDF too large (max 50MB)")
        
        # Extract text from PDF
        extraction_start = time.time()
        text, page_count, used_ocr = extract_text_from_pdf(pdf_bytes)
        extraction_time = time.time() - extraction_start
        
        logger.info(f"Text extraction: {len(text)} chars, {page_count} pages, OCR: {used_ocr}, time: {extraction_time:.2f}s")
        
        if not text or len(text.strip()) < 50:
            logger.warning("Insufficient text extracted from PDF")
            return ExtractionResponse(
                success=False,
                products=[],
                metadata={
                    "error": "Could not extract text from PDF",
                    "pages": page_count,
                    "usedOcr": used_ocr,
                    "extractionTimeMs": int(extraction_time * 1000),
                }
            )
        
        # Extract products using LLM
        llm_start = time.time()
        products = extract_products_with_llm(text)
        llm_time = time.time() - llm_start
        
        total_time = time.time() - start_time
        
        logger.info(f"Extraction complete: {len(products)} products, total time: {total_time:.2f}s")
        
        return ExtractionResponse(
            success=True,
            products=products,
            metadata={
                "pages": page_count,
                "usedOcr": used_ocr,
                "productsFound": len(products),
                "textLength": len(text),
                "extractionTimeMs": int(extraction_time * 1000),
                "llmTimeMs": int(llm_time * 1000),
                "totalTimeMs": int(total_time * 1000),
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Extraction failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"PDF extraction failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )

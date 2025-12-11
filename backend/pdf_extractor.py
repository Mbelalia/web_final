"""
PDF Text Extraction Module

Extracts text from PDFs using pdfplumber, with OCR fallback via Tesseract.
"""

import io
import logging
from typing import Optional, Tuple

import pdfplumber

logger = logging.getLogger(__name__)

# Try to import OCR dependencies
try:
    import pytesseract
    from pdf2image import convert_from_bytes
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    logger.warning("OCR dependencies not available. Install pytesseract and pdf2image for OCR support.")


def extract_text_from_pdf(pdf_bytes: bytes) -> Tuple[str, int, bool]:
    """
    Extract text from a PDF file.
    
    Args:
        pdf_bytes: Raw PDF file bytes
        
    Returns:
        Tuple of (extracted_text, page_count, used_ocr)
    """
    text_parts = []
    page_count = 0
    
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            page_count = len(pdf.pages)
            
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                text_parts.append(page_text)
        
        full_text = "\n\n".join(text_parts)
        
        # Check if we got meaningful text
        if _has_meaningful_text(full_text):
            logger.info(f"Extracted {len(full_text)} chars from {page_count} pages using pdfplumber")
            return full_text, page_count, False
        
        # Text extraction failed or produced garbage, try OCR
        logger.info("Text extraction produced insufficient text, attempting OCR...")
        return _ocr_pdf(pdf_bytes, page_count)
        
    except Exception as e:
        logger.error(f"pdfplumber extraction failed: {e}")
        # Try OCR as fallback
        return _ocr_pdf(pdf_bytes, page_count or 1)


def _has_meaningful_text(text: str, min_chars: int = 100, min_words: int = 20) -> bool:
    """
    Check if extracted text is meaningful (not just noise/garbage).
    """
    if not text:
        return False
    
    # Remove whitespace and check length
    cleaned = text.strip()
    if len(cleaned) < min_chars:
        return False
    
    # Count words
    words = cleaned.split()
    if len(words) < min_words:
        return False
    
    # Check for reasonable character distribution
    # Scanned PDFs often produce garbage like repeated characters
    alpha_count = sum(1 for c in cleaned if c.isalpha())
    if alpha_count < len(cleaned) * 0.3:  # At least 30% alphabetic
        return False
    
    return True


def _ocr_pdf(pdf_bytes: bytes, fallback_page_count: int = 1) -> Tuple[str, int, bool]:
    """
    Perform OCR on a PDF using Tesseract.
    
    Args:
        pdf_bytes: Raw PDF file bytes
        fallback_page_count: Page count to return if OCR fails
        
    Returns:
        Tuple of (extracted_text, page_count, used_ocr)
    """
    if not OCR_AVAILABLE:
        logger.error("OCR not available - pytesseract or pdf2image not installed")
        return "", fallback_page_count, False
    
    try:
        # Convert PDF pages to images
        images = convert_from_bytes(pdf_bytes, dpi=300)
        page_count = len(images)
        
        text_parts = []
        for i, image in enumerate(images):
            logger.info(f"OCR processing page {i + 1}/{page_count}...")
            # Use French + English for better invoice recognition
            page_text = pytesseract.image_to_string(image, lang='fra+eng')
            text_parts.append(page_text)
        
        full_text = "\n\n".join(text_parts)
        logger.info(f"OCR extracted {len(full_text)} chars from {page_count} pages")
        
        return full_text, page_count, True
        
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        return "", fallback_page_count, True

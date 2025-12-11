"""
LLM Client for Product Extraction

Uses OpenAI-compatible API to communicate with vLLM endpoint.
"""

import json
import logging
import os
import re
from typing import List, Optional

from openai import OpenAI
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class Product(BaseModel):
    """Extracted product from invoice."""
    id: str
    name: str
    description: Optional[str] = ""
    quantity: int = 1
    priceTTC: Optional[float] = None
    priceHT: Optional[float] = None
    reference: Optional[str] = ""


# Default configuration
DEFAULT_LLM_BASE_URL = "https://vllm.mabeldev.com/v1"
DEFAULT_LLM_MODEL = "gemma-3-12b-it"


def get_llm_client() -> OpenAI:
    """Create OpenAI client configured for vLLM endpoint."""
    base_url = os.getenv("LLM_BASE_URL", DEFAULT_LLM_BASE_URL)
    api_key = os.getenv("LLM_API_KEY", "not-needed")  # vLLM may not need API key
    
    return OpenAI(
        base_url=base_url,
        api_key=api_key,
    )


def build_extraction_prompt(text: str) -> str:
    """Build the prompt for product extraction."""
    return f"""Extract products from this invoice text. Return ONLY a valid JSON array.

EXTRACTION RULES:
1. Find product names (descriptive text, not codes)
2. Find the TOTAL price for each line (Total TTC column, or the final price on the right)
3. Find quantities (integers, look for "Quantité" column or numbers like "2" before price)
4. When multiple prices appear on a line: use the SMALLER one (it's the discounted price)
5. Extract the TOTAL LINE PRICE, not the unit price - we will calculate unit price later
6. Look for reference codes/SKUs (usually 6-digit numbers like "234964")

SKIP THESE (not products):
- Headers: "Article", "Taille", "Quantité", "Remise", "Prix", "Code"
- Totals: "MONTANT", "TOTAL", "SOUS-TOTAL"
- Shipping: "FRAIS DE LIVRAISON", "Livraison" (code 124025)
- Fees: "dont", "éco-participation", "Eco Part"
- Payment: "CARTE VISA", "Payé par"
- Other: "TVA", "Adresse", "ÉCONOMIE"

OUTPUT FORMAT (JSON array only, no explanation):
[
  {{
    "name": "Product Name",
    "description": "size, color, details if present",
    "quantity": 2,
    "totalTTC": 199.80,
    "totalHT": 166.50,
    "reference": "234964"
  }}
]

IMPORTANT:
- Return ONLY the JSON array, no markdown, no explanation
- totalTTC = the TOTAL price for the line (quantity × unit price), from "Total TTC" column
- totalHT = the TOTAL HT price if available, from "Total HT" column
- Format prices as decimals: 199.80 not "199,80 €"
- quantity should be the number of items (e.g., 2 chaises = quantity 2)

INVOICE TEXT:
{text}

JSON OUTPUT:"""


def extract_products_with_llm(text: str) -> List[Product]:
    """
    Extract products from invoice text using LLM.
    
    Args:
        text: Extracted text from PDF
        
    Returns:
        List of extracted products
    """
    if not text or len(text.strip()) < 50:
        logger.warning("Text too short for extraction")
        return []
    
    client = get_llm_client()
    model = os.getenv("LLM_MODEL", DEFAULT_LLM_MODEL)
    
    prompt = build_extraction_prompt(text)
    logger.info(f"Sending {len(prompt)} chars to LLM ({model})")
    
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a JSON-only API. Return only valid JSON arrays. Do not include markdown, comments, or explanations. Your output must start with '[' and end with ']'."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0,
            max_tokens=4096,
        )
        
        raw_response = response.choices[0].message.content or ""
        logger.info(f"LLM response length: {len(raw_response)}")
        logger.debug(f"LLM response sample: {raw_response[:500]}")
        
        return _parse_llm_response(raw_response)
        
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        return []


def _parse_llm_response(raw: str) -> List[Product]:
    """
    Parse and clean LLM response to extract products.
    """
    # Clean up common issues
    cleaned = raw.strip()
    
    # Remove markdown code blocks
    cleaned = re.sub(r'```json\s*', '', cleaned)
    cleaned = re.sub(r'```\s*', '', cleaned)
    
    # Remove anything before first [ or after last ]
    cleaned = re.sub(r'^[^[]*', '', cleaned)
    cleaned = re.sub(r'[^\]]*$', '', cleaned)
    
    # Try to find JSON array
    match = re.search(r'\[\s*\{[\s\S]*\}\s*\]', cleaned)
    if not match:
        logger.warning("No valid JSON array found in response")
        return []
    
    json_str = match.group(0)
    
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.warning(f"Initial JSON parse failed: {e}")
        # Try to fix common issues
        json_str = _fix_json(json_str)
        try:
            data = json.loads(json_str)
            logger.info("JSON fixed after cleanup")
        except json.JSONDecodeError as e2:
            logger.error(f"JSON fix failed: {e2}")
            return []
    
    if not isinstance(data, list):
        logger.warning("LLM output not an array")
        return []
    
    products = []
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            continue
        
        name = str(item.get("name", "")).strip()
        if len(name) < 2:
            continue
        
        # Parse quantity first (need it for unit price calculation)
        quantity = 1
        qty_raw = item.get("quantity") or item.get("qty")
        if qty_raw is not None:
            try:
                q = int(str(qty_raw))
                if 0 < q < 1000:
                    quantity = q
            except ValueError:
                pass
        
        # Parse total prices from LLM response
        total_ttc = _parse_price(item.get("totalTTC") or item.get("priceTTC") or item.get("price"))
        total_ht = _parse_price(item.get("totalHT") or item.get("priceHT"))
        
        # Calculate UNIT price by dividing total by quantity
        price_ttc = None
        price_ht = None
        
        if total_ttc is not None:
            price_ttc = round(total_ttc / quantity, 2)
            logger.debug(f"Product '{name}': totalTTC={total_ttc}, qty={quantity}, unitPrice={price_ttc}")
        
        if total_ht is not None:
            price_ht = round(total_ht / quantity, 2)
        
        # Generate ID from name and reference
        reference = str(item.get("reference", "") or "").strip()[:50]
        product_id = re.sub(r'[^a-z0-9]', '', name.lower())[:40]
        if not product_id:
            product_id = f"prod_{i}"
        
        products.append(Product(
            id=product_id,
            name=name,
            description=str(item.get("description", "") or "").strip()[:200],
            quantity=quantity,
            priceTTC=price_ttc,
            priceHT=price_ht,
            reference=reference,
        ))
    
    logger.info(f"Extracted {len(products)} products from LLM response")
    return products


def _parse_price(value) -> Optional[float]:
    """Parse price value from various formats."""
    if value is None:
        return None
    
    # Convert to string and clean
    s = str(value)
    s = re.sub(r'[^\d.,]', '', s)  # Keep only digits, comma, dot
    s = s.replace(',', '.')  # French decimal to standard
    
    try:
        n = float(s)
        if n > 0:
            return round(n, 2)
    except ValueError:
        pass
    
    return None


def _fix_json(json_str: str) -> str:
    """Attempt to fix common JSON issues."""
    # Remove trailing commas
    fixed = re.sub(r',(\s*[}\]])', r'\1', json_str)
    
    # Quote unquoted keys
    fixed = re.sub(r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*):', r'\1"\2"\3:', fixed)
    
    # Remove duplicate quotes
    fixed = fixed.replace('""', '"')
    
    # Remove line breaks and control chars
    fixed = re.sub(r'[\r\n\t]', ' ', fixed)
    
    return fixed.strip()

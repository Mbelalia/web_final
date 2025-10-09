import { loadPdfParse } from './pdfProcessor';

export interface InventoryPdfData {
  products: Array<{
    productName: string;
    price: number;
    description: string;
    arrivalDate: string;
    quantity: number;
  }>;
  metadata: {
    pages: number;
    textLength: number;
  };
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export async function parseInventoryPdf(file: File): Promise<InventoryPdfData> {
  // Debug the input file
  console.log('🔍 Frontend file object:', {
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
    isFile: file instanceof File,
    constructor: file.constructor.name
  });
  
  // Basic parsing logic - customize as needed
  const products: InventoryPdfData['products'] = [];
  
  // Create FormData for the API call
  const formData = new FormData();
  formData.append('pdf', file);  // Make sure this is 'pdf', not 'file'
  
  // Debug FormData
  console.log('📤 Sending FormData with entries:');
  for (const [key, value] of formData.entries()) {
    console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size})` : value);
  }
  
  // API call to process the PDF - force llm-positions mode for testing
  const response = await fetch('/api/pdf-extract?mode=llm-positions', {
    method: 'POST',
    body: formData  // Use FormData instead of buffer
  });
  
  const result = await response.json();
  
  if (result.success && result.products && Array.isArray(result.products)) {
    const mappedProducts = result.products.map((item: any) => ({
      productName: item.name || '',
      price: item.priceTTC || item.priceHT || 0,
      description: item.description || '',
      arrivalDate: getTodayDate(),
      quantity: item.quantity || 1
    }));
    
    products.push(...mappedProducts);
  }
  
  return {
    products,
    metadata: {
      pages: result.metadata?.pages || 0,
      textLength: result.metadata?.textLength || 0
    }
  };
}
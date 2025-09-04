import * as pdfjs from 'pdfjs-dist';

// Définir le chemin du worker pour pdfjs
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

// Interface pour les produits extraits
export interface ExtractedProduct {
  reference: string;
  name: string;
  quantity: number;
  priceHT: number;
  priceTTC: number;
  tva: number;
}

/**
 * Extrait les données de produits à partir d'un fichier PDF
 * @param file Le fichier PDF à analyser
 * @returns Une promesse qui résout avec un tableau de produits extraits
 */
export async function extractProductsFromPdf(file: File): Promise<ExtractedProduct[]> {
  try {
    // Convertir le fichier en ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Charger le document PDF
    const loadingTask = pdfjs.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;
    
    // Extraire le texte de toutes les pages
    const extractedText = await extractTextFromPdf(pdf);
    
    // Analyser le texte pour extraire les produits
    const products = parseProductsFromText(extractedText);
    
    return products;
  } catch (error) {
    console.error('Erreur lors de l\'extraction des données du PDF:', error);
    throw new Error('Impossible d\'extraire les données du PDF');
  }
}

/**
 * Extrait le texte de toutes les pages d'un document PDF
 */
async function extractTextFromPdf(pdf: pdfjs.PDFDocumentProxy): Promise<string> {
  let fullText = '';
  
  // Parcourir toutes les pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    fullText += pageText + '\n';
  }
  
  return fullText;
}

/**
 * Analyse le texte extrait pour identifier les produits
 * Adapté spécifiquement au format de facture IKEA
 */
function parseProductsFromText(text: string): ExtractedProduct[] {
  const products: ExtractedProduct[] = [];
  
  // Recherche des lignes de produits avec une expression régulière
  // Format attendu: référence, nom, quantité, prix HT, TVA, prix TTC
  const productRegex = /(\d+\.\d+\.\d+)\s+([\w\s]+?)\s+(\d+)\s+(\d+[,.]\d+)\s+(\d+\s*%)\s+(\d+[,.]\d+)/g;
  
  let match;
  while ((match = productRegex.exec(text)) !== null) {
    const [, reference, name, quantity, priceHT, tvaStr, priceTTC] = match;
    
    // Convertir les valeurs en nombres
    const quantityNum = parseInt(quantity, 10);
    const priceHTNum = parseFloat(priceHT.replace(',', '.'));
    const priceTTCNum = parseFloat(priceTTC.replace(',', '.'));
    const tvaNum = parseInt(tvaStr.replace('%', '').trim(), 10);
    
    products.push({
      reference: reference.trim(),
      name: name.trim(),
      quantity: quantityNum,
      priceHT: priceHTNum,
      priceTTC: priceTTCNum,
      tva: tvaNum
    });
  }
  
  return products;
}

/**
 * Fonction spécifique pour le format de facture IKEA
 * Extrait les produits d'une facture IKEA
 */
export async function extractIkeaProducts(file: File): Promise<ExtractedProduct[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;
    const extractedText = await extractTextFromPdf(pdf);
    
    // Regex spécifique pour le format IKEA
    const products: ExtractedProduct[] = [];
    
    // Format: référence (ex: 905.691.39), nom, quantité, prix HT, TVA, prix TTC
    const ikeaRegex = /(\d{3}\.\d{3}\.\d{2})\s+([\w\s\/.]+?)\s+(\d+)\s+(\d+[,.]\d{2})\s+(\d+\s*%)\s+(\d+[,.]\d{2})/g;
    
    let match;
    while ((match = ikeaRegex.exec(extractedText)) !== null) {
      const [, reference, name, quantity, priceHT, tvaStr, priceTTC] = match;
      
      products.push({
        reference: reference.trim(),
        name: name.trim(),
        quantity: parseInt(quantity, 10),
        priceHT: parseFloat(priceHT.replace(',', '.')),
        priceTTC: parseFloat(priceTTC.replace(',', '.')),
        tva: parseInt(tvaStr.replace('%', '').trim(), 10)
      });
    }
    
    return products;
  } catch (error) {
    console.error('Erreur lors de l\'extraction des produits IKEA:', error);
    throw new Error('Impossible d\'extraire les produits de la facture IKEA');
  }
}
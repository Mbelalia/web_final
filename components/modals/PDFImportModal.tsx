"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, FileText, Trash2, Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"
import { User } from "@supabase/supabase-js"
import { Package } from 'lucide-react';  // Importing the Package icon from lucide-react

// Types
interface ExtractedProduct {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  priceHT?: number;
  priceTTC?: number;
  reference?: string;
  category?: string;
}

// PDF Text Extraction using PDF.js
const extractTextFromPDF = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = async function () {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

        const typedarray = new Uint8Array(this.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;

        let fullText = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n';
        }

        resolve(fullText);
      } catch (error) {
        reject(error);
      }
    };
    fileReader.onerror = () => reject(new Error('Failed to read file'));
    fileReader.readAsArrayBuffer(file);
  });
};

// Handle PDF Data Parsing (basic example)
const parseInvoiceData = (text: string): ExtractedProduct[] => {
  const products: ExtractedProduct[] = [];
  const lines = text.split('\n');

  lines.forEach((line) => {
    const match = line.match(/(\w+)\s+(\d+)\s+([\d,]+)\s+([\d,]+)/);
    if (match) {
      const [, name, quantity, priceHT, priceTTC] = match;
      products.push({
        id: Math.random().toString(36).substr(2, 9),
        name: name.trim(),
        quantity: parseInt(quantity),
        priceHT: parseFloat(priceHT.replace(',', '.')),
        priceTTC: parseFloat(priceTTC.replace(',', '.'))
      });
    }
  });

  return products;
};

// Product Import Modal Component
const PDFImportModal = ({ isOpen, onClose, onImportSuccess, user }: {
  isOpen: boolean,
  onClose: () => void,
  onImportSuccess: () => void,
  user: User
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)

  const handleFileUpload = async (uploadedFile: File) => {
    if (uploadedFile && uploadedFile.type === 'application/pdf') {
      setFile(uploadedFile)
      await extractDataFromPDF(uploadedFile)
    } else {
      toast.error("Veuillez sélectionner un fichier PDF valide")
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const extractDataFromPDF = async (pdfFile: File) => {
    setLoading(true);
    try {
      const text = await extractTextFromPDF(pdfFile);
      const products = parseInvoiceData(text);

      if (products.length === 0) {
        toast.error("Aucun produit détecté dans ce PDF.");
      } else {
        setExtractedData(products);
        setSelectedItems(products.map(item => item.id));
        toast.success(`${products.length} produit(s) détecté(s)`);
      }
    } catch (error) {
      console.error('Error extracting PDF data:', error);
      toast.error("Erreur lors de l'extraction des données PDF.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      setLoading(true);

      const selectedProducts = extractedData.filter(item => selectedItems.includes(item.id));

      const productsToInsert = selectedProducts.map(item => ({
        name: item.name,
        description: item.description || '',
        currentStock: item.quantity || 1,
        priceHT: item.priceHT || 0,
        priceTTC: item.priceTTC || 0,
        reference: item.reference || '',
        user_id: user.id
      }));

      const { error } = await supabase
        .from('products')
        .insert(productsToInsert);

      if (error) throw error;

      toast.success(`${selectedProducts.length} produit(s) importé(s)`);
      onImportSuccess();
      onClose();

      setFile(null);
      setExtractedData([]);
      setSelectedItems([]);
    } catch (error: any) {
      console.error('Error importing from PDF:', error);
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setExtractedData([]);
    setSelectedItems([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Importer depuis un PDF
          </DialogTitle>
          <DialogDescription>
            Téléchargez un PDF de facture pour extraire automatiquement les produits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-border'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Sélectionner un fichier PDF
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Formats supportés: PDF de factures IKEA, Maisons du Monde, La Redoute, Oviala, etc.
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Glissez-déposez votre fichier ici ou cliquez pour parcourir
              </p>
              <label htmlFor="pdf-file-input" className="cursor-pointer">
                <input
                  id="pdf-file-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <Button type="button" className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Choisir un fichier
                </Button>
              </label>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-muted-foreground">Extraction des données en cours...</p>
            </div>
          ) : extractedData.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Données extraites</h3>
                  <p className="text-sm text-muted-foreground">
                    {extractedData.length} produit(s) détecté(s)
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetImport}
                  className="bg-card/50 border-border/50 hover:bg-muted/50"
                >
                  ← Nouveau fichier
                </Button>
              </div>

              <div className="max-h-[400px] overflow-y-auto bg-card/30 backdrop-blur-xl border border-border/50 rounded-xl">
                <div className="p-4 space-y-3">
                  {extractedData.map((item) => (
                    <div key={item.id} className="group flex items-center justify-between p-4 rounded-lg border">
                      <Checkbox 
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => setSelectedItems(prev => 
                          prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                        )}
                        className="border-border/50"
                      />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-sm text-muted-foreground">{item.category}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Quantité:</Label>
                            <Input 
                              type="number" 
                              value={item.quantity}
                              onChange={(e) => setExtractedData(prev => prev.map(product => 
                                product.id === item.id ? { ...product, quantity: parseInt(e.target.value) } : product
                              ))}
                              className="w-16 bg-card/50 text-foreground"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Prix TTC:</Label>
                            <Input 
                              type="number" 
                              value={item.priceTTC || 0}
                              onChange={(e) => setExtractedData(prev => prev.map(product => 
                                product.id === item.id ? { ...product, priceTTC: parseFloat(e.target.value) } : product
                              ))}
                              className="w-24 bg-card/50 text-foreground"
                            />
                          </div>
                        </div>
                      </div>

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setExtractedData(prev => prev.filter(product => product.id !== item.id))}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <Button 
                  onClick={handleImport} 
                  disabled={selectedItems.length === 0 || loading}
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground disabled:opacity-50"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Importer les produits
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <p className="text-amber-400 font-medium">Aucun produit détecté</p>
              <p className="text-sm text-muted-foreground mt-2">
                Le PDF ne semble pas contenir de produits valides.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PDFImportModal;
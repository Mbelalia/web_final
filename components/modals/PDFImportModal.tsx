"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Plus, FileText, Trash2, Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"
import { User } from "@supabase/supabase-js"
import { Package } from 'lucide-react'
import PDFReviewModal from './PDFReviewModal'
import { usePdfExtraction } from '@/hooks/usePdfExtraction'

// Types
interface ExtractedProduct {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  priceHT?: number;
  priceTTC?: number;
  reference?: string;
  category?: string; // make optional to align with LLM response
}

interface PDFImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  user: User;
}

// Product Import Modal Component
const PDFImportModal = ({ isOpen, onClose, onImportSuccess, user }: PDFImportModalProps) => {
  const { startExtraction } = usePdfExtraction();
  const [file, setFile] = useState<File | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [showReview, setShowReview] = useState(false)

  const handleFileUpload = async (uploadedFile: File) => {
    if (uploadedFile && uploadedFile.type === 'application/pdf') {
      setFile(uploadedFile)
      setIsUploading(true);
      
      try {
        // Always run synchronous extraction in LLM positions mode for testing
        await extractDataFromPDF(uploadedFile)
      } catch (error) {
        toast.error('Erreur lors du traitement du PDF');
      } finally {
        setIsUploading(false);
      }
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
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      
      const response = await fetch('/api/pdf-extract/?mode=llm-positions', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
        redirect: 'follow',
      });
      
      const contentType = response.headers.get('content-type') || '';
      const raw = await response.text();
      
      if (!response.ok) {
        if (contentType.includes('application/json')) {
          const errorData = JSON.parse(raw);
          throw new Error(errorData.error || 'Erreur lors du traitement du PDF');
        } else {
          throw new Error(`HTTP ${response.status}: ${raw.slice(0, 200)}`);
        }
      }
      
      const result = contentType.includes('application/json')
          ? JSON.parse(raw)
          : (() => { throw new Error(`Unexpected response format (not JSON): ${raw.slice(0, 200)}`); })();
      
      console.log('PDF extraction result (llm-positions):', result);
      
      if (result.success && Array.isArray(result.products) && result.products.length > 0) {
        setExtractedData(result.products);
        setSelectedItems(result.products.map((item: ExtractedProduct) => item.id));
        setShowReview(true);
        toast.success(`${result.products.length} produit(s) détecté(s) par l'IA (positions)`);
      } else {
        toast.error("Aucun produit détecté dans ce PDF. Vérifiez que le PDF contient une facture ou un reçu.");
      }
    } catch (error) {
      console.error('Error extracting PDF data:', error);
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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

  const handleExtractSuccess = (data: ExtractedProduct[]) => {
    setExtractedData(data)
    setShowReview(true) // Show review modal instead of inline review
  }

  return (
    <>
      <Dialog open={isOpen && !showReview} onOpenChange={onClose}>
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
            ) : loading || isUploading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-muted-foreground">
                  {isUploading ? 'Traitement du fichier en cours...' : 'Extraction des données en cours...'}
                </p>
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
      
      <PDFReviewModal
        isOpen={showReview}
        onClose={() => {
          setShowReview(false)
          onClose()
        }}
        onImportSuccess={() => {
          setShowReview(false)
          onImportSuccess()
        }}
        extractedProducts={extractedData}
        user={user}
        fileName={file?.name}
      />
    </>
  )
}

export default PDFImportModal;
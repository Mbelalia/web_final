"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Package, 
  FileText, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Filter,
  Search,
  Eye,
  EyeOff,
  Star,
  Edit3,
  ShoppingCart,
  DollarSign
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"
import { User } from "@supabase/supabase-js"

interface ExtractedProduct {
  id: string
  name: string
  category?: string  // Make it optional to match PDFImportModal
  quantity: number
  priceHT?: number
  priceTTC?: number
  confidence?: number
  description?: string
}

interface PDFReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess: () => void
  extractedProducts: ExtractedProduct[]
  user: User
  fileName?: string
}

const PDFReviewModal = ({ 
  isOpen, 
  onClose, 
  onImportSuccess, 
  extractedProducts, 
  user, 
  fileName 
}: PDFReviewModalProps) => {
  const [products, setProducts] = useState<ExtractedProduct[]>(extractedProducts)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showLowConfidence, setShowLowConfidence] = useState(true)
  const [editingProduct, setEditingProduct] = useState<string | null>(null)

  // Initialize selected items when products change
  useEffect(() => {
    setProducts(extractedProducts)
    setSelectedItems(extractedProducts.map(p => p.id))
  }, [extractedProducts])

  // Get unique categories
  const categories = Array.from(new Set(products.map(p => p.category || 'Non catégorisé')))

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || (product.category || 'Non catégorisé') === filterCategory
    const matchesConfidence = showLowConfidence || (product.confidence || 1) >= 0.7
    return matchesSearch && matchesCategory && matchesConfidence
  })

  const handleSelectAll = () => {
    const filteredIds = filteredProducts.map(p => p.id)
    if (filteredIds.every(id => selectedItems.includes(id))) {
      setSelectedItems(prev => prev.filter(id => !filteredIds.includes(id)))
    } else {
      setSelectedItems(prev => [...new Set([...prev, ...filteredIds])])
    }
  }

  const handleProductUpdate = (productId: string, field: string, value: any) => {
    setProducts(prev => prev.map(product => 
      product.id === productId ? { ...product, [field]: value } : product
    ))
  }

  const handleRemoveProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId))
    setSelectedItems(prev => prev.filter(id => id !== productId))
  }

  const handleImport = async () => {
    if (selectedItems.length === 0) {
      toast.error("Veuillez sélectionner au moins un produit")
      return
    }

    setLoading(true)
    try {
      const selectedProducts = products.filter(product => selectedItems.includes(product.id))
      
      const productsToInsert = selectedProducts.map(product => ({
        name: product.name,
        category: product.category,
        quantity: product.quantity,
        price_ht: product.priceHT || 0,
        price_ttc: product.priceTTC || 0,
        description: product.description || '',
        user_id: user.id,
        created_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from('products')
        .insert(productsToInsert)

      if (error) {
        console.error('Error inserting products:', error)
        toast.error("Erreur lors de l'importation des produits")
        return
      }

      toast.success(`${selectedProducts.length} produit(s) importé(s) avec succès`)
      onImportSuccess()
    } catch (error) {
      console.error('Import error:', error)
      toast.error("Erreur lors de l'importation")
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-500'
    if (confidence >= 0.8) return 'bg-green-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const selectedCount = selectedItems.length
  const totalValue = products
    .filter(p => selectedItems.includes(p.id))
    .reduce((sum, p) => sum + (p.priceTTC || 0) * p.quantity, 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Révision des produits extraits
          </DialogTitle>
          <DialogDescription>
            {fileName && `Fichier: ${fileName} • `}
            {products.length} produit(s) détecté(s)
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[70vh]">
          {/* Filters and Search */}
          <div className="flex flex-wrap gap-4 p-4 bg-card/30 rounded-lg mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-card/50"
                />
              </div>
            </div>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px] bg-card/50">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-low-confidence"
                checked={showLowConfidence}
                onCheckedChange={(checked) => setShowLowConfidence(checked === true)}
              />
              <Label htmlFor="show-low-confidence" className="text-sm">
                Afficher faible confiance
              </Label>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card className="bg-card/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Sélectionnés</span>
                </div>
                <p className="text-2xl font-bold">{selectedCount}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Total produits</span>
                </div>
                <p className="text-2xl font-bold">{filteredProducts.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Valeur totale</span>
                </div>
                <p className="text-2xl font-bold">{totalValue.toFixed(2)}€</p>
              </CardContent>
            </Card>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="bg-card/50"
              >
                {filteredProducts.every(p => selectedItems.includes(p.id)) ? (
                  <><EyeOff className="w-4 h-4 mr-2" />Désélectionner tout</>
                ) : (
                  <><Eye className="w-4 h-4 mr-2" />Sélectionner tout</>
                )}
              </Button>
            </div>
            
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              {filteredProducts.length} produit(s) affiché(s)
            </Badge>
          </div>

          {/* Products List */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="bg-card/30 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedItems.includes(product.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems(prev => [...prev, product.id])
                        } else {
                          setSelectedItems(prev => prev.filter(id => id !== product.id))
                        }
                      }}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            {editingProduct === product.id ? (
                              <Input
                                value={product.name}
                                onChange={(e) => handleProductUpdate(product.id, 'name', e.target.value)}
                                onBlur={() => setEditingProduct(null)}
                                onKeyDown={(e) => e.key === 'Enter' && setEditingProduct(null)}
                                className="font-medium bg-card/50"
                                autoFocus
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{product.name}</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingProduct(product.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {product.category}
                              </Badge>
                              {product.confidence && (
                                <div className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${getConfidenceColor(product.confidence)}`} />
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round(product.confidence * 100)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProduct(product.id)}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Quantité</Label>
                          <Input
                            type="number"
                            value={product.quantity}
                            onChange={(e) => handleProductUpdate(product.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="bg-card/50 h-8"
                            min="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Prix HT</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={product.priceHT || 0}
                            onChange={(e) => handleProductUpdate(product.id, 'priceHT', parseFloat(e.target.value) || 0)}
                            className="bg-card/50 h-8"
                            min="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Prix TTC</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={product.priceTTC || 0}
                            onChange={(e) => handleProductUpdate(product.id, 'priceTTC', parseFloat(e.target.value) || 0)}
                            className="bg-card/50 h-8"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{selectedCount} produit(s) sélectionné(s)</span>
            <span>•</span>
            <span>Valeur: {totalValue.toFixed(2)}€</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedCount === 0 || loading}
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importation...</>
              ) : (
                <><CheckCircle className="mr-2 h-4 w-4" />Importer {selectedCount} produit(s)</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PDFReviewModal
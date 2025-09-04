"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Edit, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"
import { User } from "@supabase/supabase-js"

interface DbCategory {
  id: string; 
  name: string;
  user_id: string;
}

interface DbSubcategory {
  id: string; 
  name: string;
  category_id: string; 
  user_id: string;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  currentStock: number;
  imageUrl?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  reference?: string | null;
  priceHT?: number | null;
  priceTTC?: number | null;
  url?: string | null;
  user_id: string;
  favorite?: boolean;
}

interface EditProductModalProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
  user: User;
  categories: DbCategory[];
  subcategories: DbSubcategory[];
}

export const EditProductModal: React.FC<EditProductModalProps> = ({ 
  productId, 
  isOpen, 
  onClose, 
  user, 
  categories, 
  subcategories 
}) => {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && productId) {
      fetchProduct()
    }
  }, [isOpen, productId])

  const fetchProduct = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('user_id', user.id)
        .single()
      
      if (error) throw error
      setProduct(data)
    } catch (error) {
      console.error('Error fetching product:', error)
      toast.error("Impossible de charger les détails du produit")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setProduct(prev => {
      if (!prev) return prev
      
      let processedValue: any = value
      
      if (type === 'number') {
        if (name.includes('price')) {
          processedValue = value === '' ? null : parseFloat(value) || null
        } else {
          processedValue = value === '' ? 0 : parseInt(value) || 0
        }
      } else {
        processedValue = value === '' ? null : value
      }
      
      // Reset subcategory when category changes
      if (name === 'category_id') {
        return {
          ...prev,
          [name]: processedValue,
          subcategory_id: null
        }
      }
      
      return {
        ...prev,
        [name]: processedValue
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product || !user) return

    try {
      setSaving(true)
      
      const priceTTCValue = typeof product.priceTTC === 'number' ? product.priceTTC : 0;
      const priceHTValue = priceTTCValue > 0 ? priceTTCValue / 1.20 : 0;
      
      const updateData = {
        ...product,
        description: product.description || null,
        imageUrl: product.imageUrl || null,
        reference: product.reference || null,
        url: product.url || null,
        category_id: product.category_id || null,
        subcategory_id: product.subcategory_id || null,
        priceHT: priceHTValue,
        priceTTC: priceTTCValue,
      }
      
      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', product.id)
        .eq('user_id', user.id)
      
      if (error) throw error
      toast.success("Produit mis à jour avec succès")
      onClose()
    } catch (error: any) {
      console.error('Error updating product:', error)
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const availableSubcategories = product?.category_id
    ? subcategories.filter(sub => sub.category_id === product.category_id)
    : [];

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Modifier le produit</DialogTitle>
          <DialogDescription>
            Modifiez les informations du produit ci-dessous.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        ) : product ? (
          <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-foreground font-medium">Nom du produit</Label>
                <Input 
                  id="edit-name" 
                  name="name"
                  value={product.name || ''} 
                  onChange={handleChange} 
                  required 
                  className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-foreground font-medium">Description</Label>
                <Textarea 
                  id="edit-description" 
                  name="description"
                  value={product.description || ''} 
                  onChange={handleChange} 
                  className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-category_id" className="text-foreground font-medium">Catégorie</Label>
                  <select 
                    id="edit-category_id" 
                    name="category_id" 
                    value={product.category_id || ''}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-foreground focus:border-primary/50 focus:ring-primary/20"
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-subcategory_id" className="text-foreground font-medium">Sous-catégorie</Label>
                  <select 
                    id="edit-subcategory_id" 
                    name="subcategory_id" 
                    value={product.subcategory_id || ''} 
                    onChange={handleChange}
                    className="w-full rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-foreground focus:border-primary/50 focus:ring-primary/20"
                    disabled={!product.category_id}
                  >
                    <option value="">Sélectionner une sous-catégorie</option>
                    {availableSubcategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-currentStock" className="text-foreground font-medium">Stock actuel</Label>
                  <Input 
                    id="edit-currentStock" 
                    name="currentStock"
                    type="number" 
                    value={product.currentStock || 0} 
                    onChange={handleChange} 
                    required 
                    min="0"
                    className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-priceTTC" className="text-foreground font-medium">Prix TTC (€)</Label>
                  <Input 
                    id="edit-priceTTC" 
                    name="priceTTC"
                    type="number" 
                    step="0.01"
                    value={product.priceTTC === 0 || product.priceTTC === null ? '' : product.priceTTC} 
                    onChange={handleChange} 
                    min="0"
                    className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-reference" className="text-foreground font-medium">Référence</Label>
                  <Input 
                    id="edit-reference" 
                    name="reference"
                    value={product.reference || ''} 
                    onChange={handleChange} 
                    className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
                    placeholder="REF-001"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-url" className="text-foreground font-medium">URL du produit</Label>
                  <Input 
                    id="edit-url" 
                    name="url"
                    value={product.url || ''} 
                    onChange={handleChange} 
                    className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
                    placeholder="https://exemple.com/produit"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-imageUrl" className="text-foreground font-medium">URL de l'image</Label>
                <Input 
                  id="edit-imageUrl" 
                  name="imageUrl"
                  value={product.imageUrl || ''} 
                  onChange={handleChange} 
                  className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
                  placeholder="https://exemple.com/image.jpg"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={saving} 
                className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit className="mr-2 h-4 w-4" />}
                Enregistrer les modifications
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-medium">Produit non trouvé</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
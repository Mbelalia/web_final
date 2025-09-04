"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from "@/components/ui/textarea"
import { DialogFooter } from "@/components/ui/dialog"
import { Plus, Loader2 } from 'lucide-react'
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

interface ProductFormProps {
  onSuccess: () => void;
  user: User;
  categories: DbCategory[];
  subcategories: DbSubcategory[];
}

export const ProductForm: React.FC<ProductFormProps> = ({ onSuccess, user, categories, subcategories }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currentStock: 1,
    imageUrl: '',
    priceTTC: '',
    category_id: '',
    subcategory_id: '',
    reference: '',
    url: ''
  })
  const [loading, setLoading] = useState(false)

  const availableSubcategories = formData.category_id
    ? subcategories.filter(sub => sub.category_id === formData.category_id)
    : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'category_id') {
      setFormData(prev => ({
        ...prev,
        category_id: value,
        subcategory_id: '' // Reset subcategory when category changes
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Calculate Prix HT from Prix TTC (TTC = HT + 20% VAT, so HT = TTC / 1.20)
      const priceTTCValue = formData.priceTTC ? parseFloat(formData.priceTTC) : 0;
      const priceHTValue = priceTTCValue > 0 ? priceTTCValue / 1.20 : 0;
      
      const dataToInsert = {
        name: formData.name,
        description: formData.description || null,
        currentStock: formData.currentStock,
        imageUrl: formData.imageUrl || null,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        reference: formData.reference || null,
        url: formData.url || null,
        priceHT: priceHTValue,
        priceTTC: priceTTCValue,
        favorite: false,
        user_id: user.id
      }
      
      const { error } = await supabase.from('products').insert(dataToInsert)
      if (error) throw error
      
      toast.success("Produit ajouté avec succès")
      onSuccess()
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        currentStock: 1,
        imageUrl: '',
        priceTTC: '',
        category_id: '',
        subcategory_id: '',
        reference: '',
        url: ''
      })
    } catch (error: any) {
      console.error('Error adding product:', error)
      toast.error(`Erreur: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-foreground font-medium">Nom du produit *</Label>
          <Input 
            id="name" 
            name="name"
            value={formData.name} 
            onChange={handleInputChange} 
            required 
            className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
            placeholder="Entrez le nom du produit"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description" className="text-foreground font-medium">Description</Label>
          <Textarea 
            id="description" 
            name="description"
            value={formData.description} 
            onChange={handleInputChange} 
            className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
            placeholder="Description du produit (optionnel)"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category_id" className="text-foreground font-medium">Catégorie</Label>
            <select 
              id="category_id" 
              name="category_id" 
              value={formData.category_id}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-foreground focus:border-primary/50 focus:ring-primary/20"
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subcategory_id" className="text-foreground font-medium">Sous-catégorie</Label>
            <select 
              id="subcategory_id" 
              name="subcategory_id" 
              value={formData.subcategory_id} 
              onChange={handleInputChange}
              className="w-full rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-foreground focus:border-primary/50 focus:ring-primary/20"
              disabled={!formData.category_id}
            >
              <option value="">Sélectionner une sous-catégorie</option>
              {availableSubcategories.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currentStock" className="text-foreground font-medium">Stock initial *</Label>
            <Input 
              id="currentStock" 
              name="currentStock"
              type="number" 
              value={formData.currentStock} 
              onChange={(e) => setFormData({...formData, currentStock: parseInt(e.target.value) || 0})} 
              required 
              min="0"
              className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="priceTTC" className="text-foreground font-medium">Prix TTC (€)</Label>
            <Input 
              id="priceTTC" 
              name="priceTTC"
              type="number" 
              step="0.01"
              value={formData.priceTTC} 
              onChange={handleInputChange} 
              min="0"
              className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="reference" className="text-foreground font-medium">Référence</Label>
            <Input 
              id="reference" 
              name="reference"
              value={formData.reference} 
              onChange={handleInputChange} 
              className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
              placeholder="REF-001"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="url" className="text-foreground font-medium">URL du produit</Label>
            <Input 
              id="url" 
              name="url"
              value={formData.url} 
              onChange={handleInputChange} 
              className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
              placeholder="https://exemple.com/produit"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="imageUrl" className="text-foreground font-medium">URL de l'image</Label>
          <Input 
            id="imageUrl" 
            name="imageUrl"
            value={formData.imageUrl} 
            onChange={handleInputChange} 
            className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
            placeholder="https://exemple.com/image.jpg"
          />
        </div>
      </div>
      
      <DialogFooter>
        <Button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground shadow-lg shadow-primary/25"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Ajouter le produit
        </Button>
      </DialogFooter>
    </form>
  )
}
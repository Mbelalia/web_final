"use client"

import React, { useState } from 'react'
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
import { Plus, Tag, Trash2, X } from 'lucide-react'
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

interface CategoryManagementProps {
  isOpen: boolean;
  onClose: () => void;
  categories: DbCategory[];
  subcategories: DbSubcategory[];
  onCategoriesUpdate: () => void;
  user: User;
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({ 
  isOpen, 
  onClose, 
  categories, 
  subcategories, 
  onCategoriesUpdate,
  user 
}) => {
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newSubcategoryName, setNewSubcategoryName] = useState("")
  const [parentCategoryIdForNewSub, setParentCategoryIdForNewSub] = useState<string | null>(null)
  const [categoryAddDialogOpen, setCategoryAddDialogOpen] = useState(false)
  const [subcategoryAddDialogOpen, setSubcategoryAddDialogOpen] = useState(false)

  const handleAddCategory = async () => {
    if (!user || !newCategoryName.trim()) {
      toast.error("Le nom de la catégorie est requis.");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('categories')
        .insert({ 
          name: newCategoryName.trim(),
          user_id: user.id 
        })
      
      if (error) throw error;
      setNewCategoryName("");
      setCategoryAddDialogOpen(false);
      toast.success("Catégorie ajoutée !");
      onCategoriesUpdate();
    } catch (error: any) {
      console.error('Error adding category:', error);
      if (error.message?.includes('duplicate')) {
        toast.error("Cette catégorie existe déjà.");
      } else {
        toast.error(`Erreur: ${error.message}`);
      }
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      toast.success("Catégorie supprimée.");
      onCategoriesUpdate();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleAddSubcategory = async () => {
    if (!user || !newSubcategoryName.trim() || !parentCategoryIdForNewSub) {
      toast.error("Catégorie parente et nom de sous-catégorie requis.");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('subcategories')
        .insert({ 
          name: newSubcategoryName.trim(), 
          category_id: parentCategoryIdForNewSub,
          user_id: user.id 
        })
      
      if (error) throw error;
      setNewSubcategoryName("");
      setParentCategoryIdForNewSub(null);
      setSubcategoryAddDialogOpen(false);
      toast.success("Sous-catégorie ajoutée !");
      onCategoriesUpdate();
    } catch (error: any) {
      console.error('Error adding subcategory:', error);
      if (error.message?.includes('duplicate')) {
        toast.error("Cette sous-catégorie existe déjà.");
      } else {
        toast.error(`Erreur: ${error.message}`);
      }
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', subcategoryId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      toast.success("Sous-catégorie supprimée.");
      onCategoriesUpdate();
    } catch (error: any) {
      console.error('Error deleting subcategory:', error);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Gérer les Catégories & Sous-catégories</DialogTitle>
            <DialogDescription>
              Organisez vos catégories et sous-catégories pour une meilleure gestion de votre stock.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 max-h-[60vh] overflow-y-auto p-1">
            <div className="flex justify-end gap-2 mb-4 sticky top-0 bg-card/80 backdrop-blur-xl py-2 z-10 border-b border-border/30">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCategoryAddDialogOpen(true)} 
                className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
              >
                <Plus className="h-4 w-4 mr-1" /> Nouvelle Catégorie
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSubcategoryAddDialogOpen(true)} 
                className="bg-secondary/10 border-secondary/30 text-secondary hover:bg-secondary/20"
              >
                <Plus className="h-4 w-4 mr-1" /> Nouvelle Sous-catégorie
              </Button>
            </div>
            
            {categories.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Tag className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Aucune catégorie</h3>
                <p className="text-muted-foreground">Ajoutez une catégorie pour commencer à organiser vos produits.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map(cat => (
                  <div key={cat.id} className="group bg-card/50 backdrop-blur-xl border border-border/30 rounded-xl p-6 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                          <Tag className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-lg">{cat.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {subcategories.filter(s => s.category_id === cat.id).length} sous-catégories
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-500/20" 
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">Sous-catégories:</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:text-primary/80 hover:bg-primary/10 h-7 text-xs" 
                          onClick={() => {
                            setParentCategoryIdForNewSub(cat.id); 
                            setSubcategoryAddDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Ajouter
                        </Button>
                      </div>
                      
                      {subcategories.filter(s => s.category_id === cat.id).length > 0 ? (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {subcategories.filter(s => s.category_id === cat.id).map(sub => (
                            <div key={sub.id} className="flex justify-between items-center p-2 bg-muted/30 rounded-lg border border-border/20">
                              <span className="text-sm text-foreground">{sub.name}</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20" 
                                onClick={() => handleDeleteSubcategory(sub.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Aucune sous-catégorie</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-6 border-t border-border/30 pt-4">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={categoryAddDialogOpen} onOpenChange={setCategoryAddDialogOpen}>
        <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Ajouter une catégorie</DialogTitle>
            <DialogDescription>
              Créez une nouvelle catégorie pour organiser vos produits.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newCategoryName" className="text-sm font-medium text-foreground">Nom de la catégorie</Label>
              <Input 
                id="newCategoryName" 
                value={newCategoryName} 
                onChange={(e) => setNewCategoryName(e.target.value)} 
                placeholder="Ex: Électronique" 
                className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddCategory} className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subcategory Dialog */}
      <Dialog open={subcategoryAddDialogOpen} onOpenChange={setSubcategoryAddDialogOpen}>
        <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Ajouter une sous-catégorie</DialogTitle>
            <DialogDescription>
              Créez une nouvelle sous-catégorie pour une catégorie existante.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parentCategoryForNewSub" className="text-sm font-medium text-foreground">Catégorie parente</Label>
              <select 
                id="parentCategoryForNewSub" 
                value={parentCategoryIdForNewSub || ""}
                onChange={(e) => setParentCategoryIdForNewSub(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-foreground focus:border-primary/50 focus:ring-primary/20"
              >
                <option value="">Sélectionner la catégorie parente</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newSubcategoryName" className="text-sm font-medium text-foreground">Nom de la sous-catégorie</Label>
              <Input 
                id="newSubcategoryName" 
                value={newSubcategoryName} 
                onChange={(e) => setNewSubcategoryName(e.target.value)} 
                placeholder="Ex: Smartphones" 
                className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubcategoryAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddSubcategory} className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
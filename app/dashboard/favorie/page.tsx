"use client"

import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Plus,
  Search,
  Tag,
  Heart,
  ChevronDown,
  Trash2,
  Edit,
  X,
  ExternalLink,
  Settings2,
  Star,
  TrendingUp,
  DollarSign,
  Grid3X3,
  List,
  ArrowUpRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast, Toaster } from "sonner"
import { useRouter } from "next/navigation"
import Image from 'next/image'

// Types
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
  description: string;
  imageUrl: string;
  url?: string;
  priceHT: number;
  priceTTC: number;
  category_id: string | null; 
  subcategory_id: string | null; 
  favorite: boolean;
  createdAt: string;
  user_id: string;
  category_name?: string;
  subcategory_name?: string;
}

interface User {
  id: string;
  email?: string;
}

const VAT_RATE = 0.20;

export default function FavoritePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Core states
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] = useState(true);

  // Dialog states
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [categoryAddDialogOpen, setCategoryAddDialogOpen] = useState(false);
  const [subcategoryAddDialogOpen, setSubcategoryAddDialogOpen] = useState(false);
  const [manageCategoriesDialogOpen, setManageCategoriesDialogOpen] = useState(false);

  // UI states
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Data states
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [subcategories, setSubcategories] = useState<DbSubcategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [priceSort, setPriceSort] = useState<'none' | 'asc' | 'desc'>('none');
  
  // Form states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [parentCategoryIdForNewSub, setParentCategoryIdForNewSub] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    url: '',
    priceHT: '' as string | number,
    priceTTC: '' as string | number,
    category_id: '',
    subcategory_id: ''
  });

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        
        if (!user) {
          router.push('/login');
          return;
        }
        
        setUser(user);
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/login');
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        router.push('/login');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Utility functions
  const calculateTTC = (priceHT: number) => {
    return parseFloat((priceHT * (1 + VAT_RATE)).toFixed(2));
  };

  // Data fetching
  const fetchDbCategories = useCallback(async () => {
    if (!user) return;
    
    setLoadingCategories(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error("Impossible de charger les catégories.");
    } finally {
      setLoadingCategories(false);
    }
  }, [user]);

  const fetchDbSubcategories = useCallback(async () => {
    if (!user) return;
    
    setLoadingSubcategories(true);
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      
      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      toast.error("Impossible de charger les sous-catégories.");
    } finally {
      setLoadingSubcategories(false);
    }
  }, [user]);

  const fetchFavoritesWithNames = useCallback(async () => {
    if (!user) return;
    
    setLoadingFavorites(true);
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('favorite', true)
        .eq('user_id', user.id);
      
      if (productsError) throw productsError;

      const productsWithNames = (productsData || []).map(product => {
        const category = categories.find(cat => cat.id === product.category_id);
        const subcategory = subcategories.find(sub => sub.id === product.subcategory_id);
        return {
          ...product,
          category_name: category?.name,
          subcategory_name: subcategory?.name,
        };
      });
      setFavorites(productsWithNames);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error("Impossible de charger vos favoris.");
    } finally {
      setLoadingFavorites(false);
    }
  }, [categories, subcategories, user]);

  // Effects for data loading
  useEffect(() => {
    if (user && !authLoading) {
      fetchDbCategories();
      fetchDbSubcategories();
    }
  }, [user, authLoading, fetchDbCategories, fetchDbSubcategories]);

  useEffect(() => {
    if (!loadingCategories && !loadingSubcategories && user) {
      fetchFavoritesWithNames();
    }
  }, [loadingCategories, loadingSubcategories, fetchFavoritesWithNames, user]);

  // Data processing
  const filteredFavorites = favorites.filter(product => {
    const nameMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const descMatch = product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = nameMatch || descMatch;
    const matchesCategory = !selectedCategoryId || product.category_id === selectedCategoryId;
    const matchesSubcategory = !selectedSubcategoryId || product.subcategory_id === selectedSubcategoryId;
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  const sortedFavorites = [...filteredFavorites].sort((a, b) => {
    if (priceSort === 'asc') return a.priceTTC - b.priceTTC;
    if (priceSort === 'desc') return b.priceTTC - a.priceTTC;
    return 0;
  });

  // Event handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'priceHT' || name === 'priceTTC' ? parseFloat(value) : value
    }));
  };

  const handleHTChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setFormData(prev => ({ ...prev, priceHT: '', priceTTC: '' }));
    } else {
      const priceHT = parseFloat(value);
      setFormData(prev => ({ ...prev, priceHT: value, priceTTC: calculateTTC(priceHT) }));
    }
  };

  const handleTTCChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setFormData(prev => ({ ...prev, priceTTC: '', priceHT: '' }));
    } else {
      const priceTTC = parseFloat(value);
      const priceHT = parseFloat((priceTTC / (1 + VAT_RATE)).toFixed(2));
      setFormData(prev => ({ ...prev, priceTTC: value, priceHT: priceHT.toString() }));
    }
  };

  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Vous devez être connecté pour effectuer cette action.");
      return;
    }
    
    if (!formData.name || !formData.category_id) {
        toast.error("Le nom du produit et la catégorie sont requis.");
        return;
    }
    
    const priceHT = formData.priceHT === '' ? 0 : parseFloat(formData.priceHT.toString());
    const priceTTC = formData.priceTTC === '' ? 0 : parseFloat(formData.priceTTC.toString());
    
    const productPayload = {
        name: formData.name, 
        description: formData.description, 
        imageUrl: formData.imageUrl,
        url: formData.url, 
        priceHT: priceHT, 
        priceTTC: priceTTC,
        category_id: formData.category_id || null, 
        subcategory_id: formData.subcategory_id || null,
        favorite: true,
        user_id: user.id,
    };
    
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', editingProduct.id)
          .eq('user_id', user.id);
        
        if (error) throw error;
        toast.success("Produit mis à jour !");
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productPayload);
        
        if (error) throw error;
        toast.success("Produit ajouté aux favoris !");
      }
      setOpenProductDialog(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        imageUrl: '',
        url: '',
        priceHT: '',
        priceTTC: '',
        category_id: '',
        subcategory_id: ''
      });
      fetchFavoritesWithNames(); 
    } catch (error) {
      console.error('Error saving product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur: ${errorMessage}`);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name, 
      description: product.description || '', 
      imageUrl: product.imageUrl || '',
      url: product.url || '', 
      priceHT: product.priceHT, 
      priceTTC: product.priceTTC,
      category_id: product.category_id || '', 
      subcategory_id: product.subcategory_id || '',
    });
    setOpenProductDialog(true);
  };

  const handleRemoveFavorite = async (id: string) => {
    if (!user) {
      toast.error("Vous devez être connecté pour effectuer cette action.");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ favorite: false })
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      toast.success("Produit retiré des favoris");
      fetchFavoritesWithNames();
    } catch (error) {
      console.error('Error removing favorite:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur: ${errorMessage}`);
    }
  };

  const handleAddCategory = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour effectuer cette action.");
      return;
    }
    
    if (!newCategoryName.trim()) {
      toast.error("Le nom de la catégorie est requis."); 
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({ 
          name: newCategoryName,
          user_id: user.id 
        })
        .select();
      
      if (error) throw error;
      if (data) setCategories(prev => [...prev, ...data].sort((a,b) => a.name.localeCompare(b.name)));
      setNewCategoryName("");
      setCategoryAddDialogOpen(false);
      toast.success("Catégorie ajoutée !");
    } catch (error) {
      console.error('Error adding category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      if (errorMessage?.includes('duplicate key value violates unique constraint')) 
        toast.error("Cette catégorie existe déjà.");
      else toast.error(`Erreur: ${errorMessage}`);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user) {
      toast.error("Vous devez être connecté pour effectuer cette action.");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      setSubcategories(prev => prev.filter(sub => sub.category_id !== categoryId));
      if (selectedCategoryId === categoryId) { 
        setSelectedCategoryId(null); 
        setSelectedSubcategoryId(null); 
      }
      toast.success("Catégorie supprimée.");
      fetchFavoritesWithNames(); 
    } catch (error) {
      console.error('Error deleting category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur: ${errorMessage}`);
    }
  };

  const handleAddSubcategory = async () => {
    if (!user) {
      toast.error("Vous devez être connecté pour effectuer cette action.");
      return;
    }
    
    if (!newSubcategoryName.trim() || !parentCategoryIdForNewSub) {
      toast.error("Catégorie parente et nom de sous-catégorie requis."); 
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .insert({ 
          name: newSubcategoryName, 
          category_id: parentCategoryIdForNewSub,
          user_id: user.id 
        })
        .select();
      
      if (error) throw error;
      if (data) setSubcategories(prev => [...prev, ...data].sort((a,b) => a.name.localeCompare(b.name)));
      setNewSubcategoryName("");
      setParentCategoryIdForNewSub(null);
      setSubcategoryAddDialogOpen(false);
      toast.success("Sous-catégorie ajoutée !");
    } catch (error) {
      console.error('Error adding subcategory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      if (errorMessage?.includes('duplicate key value violates unique constraint')) 
        toast.error("Cette sous-catégorie existe déjà pour cette catégorie.");
      else toast.error(`Erreur: ${errorMessage}`);
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    if (!user) {
      toast.error("Vous devez être connecté pour effectuer cette action.");
      return;
    }
    
    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', subcategoryId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      setSubcategories(prev => prev.filter(sub => sub.id !== subcategoryId));
      if (selectedSubcategoryId === subcategoryId) setSelectedSubcategoryId(null);
      toast.success("Sous-catégorie supprimée.");
      fetchFavoritesWithNames(); 
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur: ${errorMessage}`);
    }
  };

  // Helper variables
  const availableSubcategoriesForForm = formData.category_id
    ? subcategories.filter(sub => sub.category_id === formData.category_id)
    : [];
    
  const isLoading = authLoading || loadingFavorites || loadingCategories || loadingSubcategories;

  // Calculate stats
  const totalFavorites = sortedFavorites.length;
  const totalValue = sortedFavorites.reduce((sum, p) => sum + p.priceTTC, 0);
  const avgPrice = totalFavorites > 0 ? totalValue / totalFavorites : 0;
  const categoriesCount = new Set(sortedFavorites.map(p => p.category_id).filter(Boolean)).size;

  // Loading screen
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-background to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-medium text-foreground">Vérification de l&apos;authentification...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-background to-slate-800 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-secondary/10 to-transparent rounded-full blur-3xl"></div>
      
      <div className="relative z-10 p-4 sm:p-6 lg:p-8 space-y-8">
        <Toaster position="top-right" richColors />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
              Mes Favoris
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <span>Votre collection de produits favoris</span>
            </p>
          </div>
          <div className="flex gap-3">
            {/* Manage Categories Button */}
            <Dialog open={manageCategoriesDialogOpen} onOpenChange={setManageCategoriesDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/30" variant="outline">
                  <Settings2 className="w-4 h-4 mr-2" />
                  Gérer catégories
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-4xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Gérer les Catégories &amp; Sous-catégories</DialogTitle>
                  <DialogDescription>
                    Organisez vos catégories et sous-catégories. Les modifications affecteront les filtres et options de produits.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="mt-4 max-h-[60vh] overflow-y-auto p-1">
                  <div className="flex justify-end gap-2 mb-4 sticky top-0 bg-card/80 backdrop-blur-xl py-2 z-10 border-b border-border/30">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {setNewCategoryName(''); setCategoryAddDialogOpen(true)}} 
                      className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Nouvelle Catégorie
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => { setParentCategoryIdForNewSub(null); setNewSubcategoryName(''); setSubcategoryAddDialogOpen(true);}} 
                      className="bg-secondary/10 border-secondary/30 text-secondary hover:bg-secondary/20"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Nouvelle Sous-catégorie
                    </Button>
                  </div>
                  
                  {loadingCategories || loadingSubcategories ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-muted-foreground">Chargement des catégories...</p>
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Tag className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">Aucune catégorie</h3>
                      <p className="text-muted-foreground">Ajoutez une catégorie pour commencer à organiser vos favoris.</p>
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
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/20" 
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
                                onClick={() => {setParentCategoryIdForNewSub(cat.id); setNewSubcategoryName(''); setSubcategoryAddDialogOpen(true);}}
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
                                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/20" 
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
                  <Button variant="outline" onClick={() => setManageCategoriesDialogOpen(false)}>
                    Fermer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Product Button */}
            <Dialog open={openProductDialog} onOpenChange={(isOpen) => {
              setOpenProductDialog(isOpen);
              if (!isOpen) {
                setEditingProduct(null);
                setFormData({
                  name: '',
                  description: '',
                  imageUrl: '',
                  url: '',
                  priceHT: '',
                  priceTTC: '',
                  category_id: '',
                  subcategory_id: ''
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
                  <Plus className="mr-2 h-4 w-4" /> Nouveau favori
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">
                    {editingProduct ? 'Modifier le produit' : 'Ajouter un produit favori'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingProduct ? 'Modifiez les informations du produit' : 'Ajoutez un nouveau produit à vos favoris'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleProductFormSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium text-foreground">Nom du produit *</label>
                      <Input 
                        id="name" 
                        name="name" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20" 
                        placeholder="Entrez le nom du produit"
                        required 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="description" className="text-sm font-medium text-foreground">Description</label>
                      <Textarea 
                        id="description" 
                        name="description" 
                        value={formData.description} 
                        onChange={handleInputChange} 
                        rows={3} 
                        className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
                        placeholder="Description du produit (optionnel)" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="imageUrl" className="text-sm font-medium text-foreground">URL de l&apos;image</label>
                      <Input 
                        id="imageUrl" 
                        name="imageUrl" 
                        value={formData.imageUrl} 
                        onChange={handleInputChange} 
                        placeholder="https://exemple.com/image.jpg" 
                        className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="url" className="text-sm font-medium text-foreground">URL du produit</label>
                      <Input 
                        id="url" 
                        name="url" 
                        value={formData.url} 
                        onChange={handleInputChange} 
                        placeholder="https://exemple.com/produit" 
                        className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="priceHT" className="text-sm font-medium text-foreground">Prix HT (€) *</label>
                        <Input 
                          id="priceHT" 
                          name="priceHT" 
                          type="number" 
                          step="0.01"
                          value={formData.priceHT} 
                          onChange={handleHTChange} 
                          className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20" 
                          placeholder="0.00"
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="priceTTC" className="text-sm font-medium text-foreground">Prix TTC (€)</label>
                        <Input
                          id="priceTTC"
                          name="priceTTC"
                          type="number"
                          step="0.01"
                          value={formData.priceTTC}
                          onChange={handleTTCChange}
                          className="bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
                          placeholder="Calculé automatiquement"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="category_id" className="text-sm font-medium text-foreground">Catégorie *</label>
                      <select 
                        id="category_id" 
                        name="category_id" 
                        value={formData.category_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value, subcategory_id: '' }))}
                        className="w-full rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-foreground focus:border-primary/50 focus:ring-primary/20" 
                        required
                      >
                        <option value="">Sélectionner une catégorie</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>
                    
                    {formData.category_id && (
                      <div className="space-y-2">
                        <label htmlFor="subcategory_id" className="text-sm font-medium text-foreground">Sous-catégorie</label>
                        <select 
                          id="subcategory_id" 
                          name="subcategory_id" 
                          value={formData.subcategory_id} 
                          onChange={handleInputChange}
                          className="w-full rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-foreground focus:border-primary/50 focus:ring-primary/20"
                        >
                          <option value="">Sélectionner une sous-catégorie</option>
                          {availableSubcategoriesForForm.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  
                  <DialogFooter className="pt-6 border-t border-border/30">
                    <Button type="button" variant="outline" onClick={() => setOpenProductDialog(false)}>
                      Annuler
                    </Button>
                    <Button type="submit" className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
                      {editingProduct ? 'Mettre à jour' : 'Ajouter aux favoris'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-chart-4/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Favoris totaux</p>
                <p className="text-3xl font-bold text-foreground mb-1">{totalFavorites}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-chart-4/20 to-chart-5/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Star className="w-6 h-6 text-chart-4" />
              </div>
            </div>
          </div>
          
          <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-chart-1/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Valeur totale</p>
                <p className="text-3xl font-bold text-foreground mb-1">€{totalValue.toFixed(2)}</p>
                <div className="flex items-center gap-2 text-xs">
                  <ArrowUpRight className="w-3 h-3 text-chart-1" />
                  <span className="text-chart-1">TTC incluse</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-chart-1/20 to-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6 text-chart-1" />
              </div>
            </div>
          </div>
          
          <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-chart-2/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Prix moyen</p>
                <p className="text-3xl font-bold text-foreground mb-1">€{avgPrice.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-chart-2/20 to-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-chart-2" />
              </div>
            </div>
          </div>
          
          <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-chart-3/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Catégories</p>
                <p className="text-3xl font-bold text-foreground mb-1">{categoriesCount}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-chart-3/20 to-accent/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Tag className="w-6 h-6 text-chart-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Rechercher un favori..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10 bg-card/50 border-border/50 text-foreground focus:border-primary/50 focus:ring-primary/20"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button 
                  variant={viewMode === 'grid' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-primary/20 text-primary border-primary/30' : 'border-border/50 hover:bg-muted/50'}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-primary/20 text-primary border-primary/30' : 'border-border/50 hover:bg-muted/50'}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="border-border/50 hover:bg-muted/50">
                    {selectedCategoryId ? categories.find(c=>c.id === selectedCategoryId)?.name : "Catégories"}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0 bg-card/80 backdrop-blur-xl border-border/50 text-foreground">
                  <div className="p-4 max-h-[40vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-sm">Filtrer par catégorie</h4>
                      <Button variant="ghost" size="sm" onClick={() => {setNewCategoryName(''); setCategoryAddDialogOpen(true)}} className="h-6 w-6 p-0">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button 
                      variant={!selectedCategoryId ? "secondary" : "ghost"} 
                      size="sm" 
                      className="w-full justify-start mb-2" 
                      onClick={() => { setSelectedCategoryId(null); setSelectedSubcategoryId(null); }}
                    >
                      Toutes les catégories
                    </Button>
                    {categories.map(cat => (
                      <div key={cat.id} className="space-y-1">
                        <Button 
                          variant={selectedCategoryId === cat.id ? "secondary" : "ghost"} 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={() => { setSelectedCategoryId(cat.id); setSelectedSubcategoryId(null); }}
                        >
                          {cat.name}
                        </Button>
                        {selectedCategoryId === cat.id && subcategories.filter(s => s.category_id === cat.id).length > 0 && (
                          <div className="pl-4 space-y-1 border-l border-border/30">
                            <Button 
                              variant={!selectedSubcategoryId ? "secondary" : "ghost"} 
                              size="sm" 
                              className="w-full justify-start text-xs" 
                              onClick={() => setSelectedSubcategoryId(null)}
                            >
                              Toutes les sous-catégories
                            </Button>
                            {subcategories.filter(s => s.category_id === cat.id).map(sub => (
                              <Button 
                                key={sub.id}
                                variant={selectedSubcategoryId === sub.id ? "secondary" : "ghost"} 
                                size="sm" 
                                className="w-full justify-start text-xs" 
                                onClick={() => setSelectedSubcategoryId(sub.id)}
                              >
                                {sub.name}
                              </Button>
                            ))}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full justify-start text-xs mt-1 text-primary"
                              onClick={() => {
                                setParentCategoryIdForNewSub(selectedCategoryId);
                                setNewSubcategoryName('');
                                setSubcategoryAddDialogOpen(true);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Ajouter sous-catégorie
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-border/50 hover:bg-muted/50">
                    {priceSort === 'none' ? 'Trier par prix' : priceSort === 'asc' ? 'Prix croissant' : 'Prix décroissant'}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground">
                  <DropdownMenuItem onClick={() => setPriceSort('none')}>Aucun tri</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPriceSort('asc')}>Prix croissant</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPriceSort('desc')}>Prix décroissant</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Products Display */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-medium text-foreground">Chargement des favoris...</p>
          </div>
        ) : sortedFavorites.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedFavorites.map(product => (
                <div key={product.id} className="group bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:scale-[1.02]">
                  <div className="relative h-48 bg-muted/30">
                    {product.imageUrl ? (
                      <Image 
                        src={product.imageUrl} 
                        alt={product.name} 
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <Tag className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div 
                      className={`absolute inset-0 bg-background/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${product.url ? 'cursor-pointer' : 'cursor-default'}`}
                      onClick={() => product.url && window.open(product.url, '_blank', 'noopener,noreferrer')}
                      title={product.url ? "Visiter la page du produit" : undefined}
                    >
                      {product.url && <ExternalLink className="h-8 w-8 text-foreground" />}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveFavorite(product.id); }}
                      className="absolute top-3 right-3 p-2 bg-background/30 backdrop-blur-sm rounded-xl hover:bg-destructive/70 transition-colors"
                    >
                      <Heart className="h-5 w-5 text-destructive fill-destructive group-hover:text-foreground" />
                    </button>
                  </div>
                  
                  <div className="p-6">
                    <h3 
                      className={`font-semibold text-lg text-foreground truncate mb-2 ${product.url ? 'cursor-pointer hover:text-primary' : ''}`}
                      onClick={() => product.url && window.open(product.url, '_blank', 'noopener,noreferrer')}
                      title={product.name}
                    >
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-4">
                      {product.description || "Aucune description"}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-muted-foreground">HT: {product.priceHT.toFixed(2)} €</p>
                          <p className="font-semibold text-primary">TTC: {product.priceTTC.toFixed(2)} €</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditProduct(product)} 
                          className="opacity-0 group-hover:opacity-100 transition-opacity border-primary/30 text-primary hover:bg-primary/20"
                        >
                          <Edit className="h-3 w-3 mr-1.5" /> Modifier
                        </Button>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        {product.category_name && (
                          <Badge className="bg-primary/20 text-primary border-primary/30">
                            {product.category_name}
                          </Badge>
                        )}
                        {product.subcategory_name && (
                          <Badge variant="secondary" className="bg-secondary/20 text-secondary border-secondary/30">
                            {product.subcategory_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-foreground">Produit</th>
                      <th className="text-left p-4 text-sm font-semibold text-foreground">Description</th>
                      <th className="text-left p-4 text-sm font-semibold text-foreground">Prix TTC</th>
                      <th className="text-left p-4 text-sm font-semibold text-foreground">Catégorie</th>
                      <th className="text-right p-4 text-sm font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {sortedFavorites.map(product => (
                      <tr key={product.id} className="group hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-muted/30 rounded-lg overflow-hidden relative">
                              {product.imageUrl ? (
                                <Image 
                                  src={product.imageUrl} 
                                  alt={product.name} 
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Tag className="w-6 h-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{product.name}</p>
                              {product.url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 text-primary hover:text-primary/80"
                                  onClick={() => window.open(product.url, '_blank', 'noopener,noreferrer')}
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Voir le produit
                                </Button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-muted-foreground truncate max-w-[200px]">
                            {product.description || 'Aucune description'}
                          </p>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-primary">{product.priceTTC.toFixed(2)} €</p>
                            <p className="text-xs text-muted-foreground">HT: {product.priceHT.toFixed(2)} €</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            {product.category_name && (
                              <Badge className="bg-primary/20 text-primary border-primary/30 w-fit">
                                {product.category_name}
                              </Badge>
                            )}
                            {product.subcategory_name && (
                              <Badge variant="secondary" className="bg-secondary/20 text-secondary border-secondary/30 w-fit">
                                {product.subcategory_name}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 text-primary"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFavorite(product.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 text-destructive"
                            >
                              <Heart className="w-4 h-4 fill-current" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl">
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-chart-4/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Star className="h-10 w-10 text-chart-4" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Aucun produit favori</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                {searchTerm ? "Aucun favori ne correspond à votre recherche." : "Commencez par ajouter quelques produits à vos favoris !"}
              </p>
              <Button 
                onClick={() => setOpenProductDialog(true)} 
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un favori
              </Button>
            </div>
          </div>
        )}

        {/* Category Dialog */}
        <Dialog open={categoryAddDialogOpen} onOpenChange={setCategoryAddDialogOpen}>
          <DialogContent className="bg-card/80 backdrop-blur-xl border-border/50 text-foreground sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Ajouter une catégorie</DialogTitle>
              <DialogDescription>
                Créez une nouvelle catégorie pour organiser vos favoris.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="newCategoryName" className="text-sm font-medium text-foreground">Nom de la catégorie</label>
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

        {/* Subcategory Dialog */}
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
                <label htmlFor="parentCategoryForNewSub" className="text-sm font-medium text-foreground">Catégorie parente</label>
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
                <label htmlFor="newSubcategoryName" className="text-sm font-medium text-foreground">Nom de la sous-catégorie</label>
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
      </div>
    </div>
  );
}
"use client"

import { useState, useEffect, useCallback } from 'react'
import { User } from "@supabase/supabase-js"
import { supabase } from '@/lib/supabase'
import { toast } from "sonner"
import { DbCategory, DbSubcategory, Product, GroupedProduct } from '@/types/inventory'

export const useInventory = (user: User | null) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [subcategories, setSubcategories] = useState<DbSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] = useState(true);

  // Fetch categories and subcategories
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

  // Fetch products with category names
  const fetchProducts = useCallback(async () => {
    if (!user || loadingCategories || loadingSubcategories) return
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('favorite', false)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Add category and subcategory names
      const productsWithNames = (data || []).map(product => {
        const category = categories.find(cat => cat.id === product.category_id);
        const subcategory = subcategories.find(sub => sub.id === product.subcategory_id);
        return {
          ...product,
          category_name: category?.name,
          subcategory_name: subcategory?.name,
        };
      });
      
      setProducts(productsWithNames);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error("Impossible de charger les produits. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, [user, categories, subcategories, loadingCategories, loadingSubcategories]);

  // Group products by name
  const groupProductsByName = useCallback((products: Product[]): GroupedProduct[] => {
    const groupedProducts = products.reduce((acc, product) => {
      const existingProduct = acc.find(p => p.name === product.name);
      
      if (existingProduct) {
        existingProduct.currentStock = (existingProduct.currentStock || 0) + (product.currentStock || 0);
        existingProduct.groupedIds = existingProduct.groupedIds || [existingProduct.id];
        existingProduct.groupedIds.push(product.id);
        existingProduct.originalProducts = existingProduct.originalProducts || [existingProduct];
        existingProduct.originalProducts.push(product);
      } else {
        acc.push({
          ...product,
          groupedIds: [product.id],
          originalProducts: [product]
        });
      }
      
      return acc;
    }, [] as GroupedProduct[]);
    
    return groupedProducts;
  }, []);

  const handleCategoriesUpdate = useCallback(() => {
    fetchDbCategories();
    fetchDbSubcategories();
    setTimeout(() => fetchProducts(), 100);
  }, [fetchDbCategories, fetchDbSubcategories, fetchProducts]);

  return {
    products,
    categories,
    subcategories,
    loading,
    loadingCategories,
    loadingSubcategories,
    fetchDbCategories,
    fetchDbSubcategories,
    fetchProducts,
    groupProductsByName,
    handleCategoriesUpdate
  };
};
// components/inventory/index.ts
export { ProductForm } from './ProductForm'
export { ProductCard } from './ProductCard'
export { ProductTable } from './ProductTable'
export { ImportFromFavorites } from './ImportFromFavorites'
export { EditProductModal } from './EditProductModal'
export { CategoryManagement } from './CategoryManagement'
export { DeleteProductModal } from './DeleteProductModal'

// Types that might be shared across components
export interface DbCategory {
  id: string;
  name: string;
  user_id: string;
}

export interface DbSubcategory {
  id: string;
  name: string;
  category_id: string;
  user_id: string;
}

export interface Product {
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
  category_name?: string;
  subcategory_name?: string;
}

export interface GroupedProduct extends Product {
  groupedIds?: string[];
  originalProducts?: Product[];
}

export interface FavoriteProduct extends Product {
  favorite: true;
}
// 📁 src/types/inventory.ts
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

export interface FavoriteProduct extends Product {
  favorite: true;
}

export interface GroupedProduct extends Product {
  groupedIds?: string[];
  originalProducts?: Product[];
}
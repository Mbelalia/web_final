// components/movements/index.ts
export { ApartmentForm } from './ApartmentForm'
export { MovementForm } from './MovementForm'
export { ReverseMovementForm } from './ReverseMovementForm'
export { ApartmentCard } from './ApartmentCard'
export { ApartmentDetailModal } from './ApartementDetailModal'
export { RecentMovementsTable } from './RecentMovementsTable'
export { DeleteConfirmationModal } from './DeleteConfirmationModal'
export { StatsGrid } from './StatsGrid'

// Types that might be shared across components
export interface Apartment {
  id: string
  name: string
  address?: string
  description?: string
  created_at: string
  user_id: string
}

export interface Movement {
  id: string
  product_id: string
  apartment_id: string
  quantity: number
  priceht: number
  pricettc: number
  created_at: string
  product_name?: string
  product_description?: string
  user_id: string
  product?: any
  apartment?: Apartment
  product_category?: string
  product_subcategory?: string
  product_reference?: string
}

export interface ApartmentSummary {
  apartment: Apartment
  totalItems: number
  totalValueHT: number
  totalValueTTC: number
  itemCount: number
}

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
  id: string
  name: string
  description?: string
  currentStock: number
  priceHT?: number
  priceTTC?: number
  imageUrl?: string
  user_id: string
  category_id?: string | null
  subcategory_id?: string | null
  reference?: string | null
  url?: string | null
  category_name?: string
  subcategory_name?: string
}
export type Role = "CUSTOMER" | "SELLER" | "CAFE_OWNER" | "ADMIN";

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  enabled: boolean;
  referralCode: string;
  loyaltyPoints: number;
}

export type ProductType = "BEAN" | "MACHINE" | "ACCESSORY";

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  type: ProductType;
  category?: string;
  stock: number;
  imageUrl?: string;
  approved: boolean;
  avgRating: number;
  reviewCount: number;
  sellerId: number;
  sellerName: string;
  createdAt: string;
}

export interface Cafe {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  imageUrl?: string;
  approved: boolean;
  avgRating: number;
  reviewCount: number;
  ownerId: number;
  ownerName: string;
  createdAt: string;
}

export type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: number;
  customerId: number;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
}

export interface AdminStats {
  totalCustomers: number;
  totalSellers: number;
  totalCafeOwners: number;
  totalProducts: number;
  pendingProductApprovals: number;
  totalCafes: number;
  pendingCafeApprovals: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface Review {
  id: number;
  productId: number | null;
  cafeId: number | null;
  customerId: number;
  customerName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Wishlist {
  products: Product[];
  cafes: Cafe[];
}

export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export interface Reservation {
  id: number;
  cafeId: number;
  cafeName: string;
  customerId: number;
  customerName: string;
  customerPhone?: string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  notes?: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface ApiErrorBody {
  timestamp: string;
  status: number;
  error: string;
  message: string;
}

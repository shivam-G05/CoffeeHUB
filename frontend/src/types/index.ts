// Mirrors the backend DTOs. Money fields are plain numbers (rupees).

export type Role = "CUSTOMER" | "SELLER" | "ADMIN";

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  enabled: boolean;
  referralCode: string;
  loyaltyPoints: number;
  companyName?: string;
  gstNumber?: string;
  businessType?: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ---------------------------------------------------------------- catalogue

export type ProductType = "BEAN" | "MACHINE" | "ACCESSORY";
export type ProductStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "OUT_OF_STOCK" | "SUSPENDED";
export type AttributeGroup =
  | "GREEN_COFFEE"
  | "ROASTED_COFFEE"
  | "INSTANT_COFFEE"
  | "EQUIPMENT"
  | "ACCESSORY"
  | "BUSINESS_SUPPLY"
  | "GENERAL";

export interface AttributeDef {
  key: string;
  label: string;
  type: "TEXT" | "NUMBER" | "SELECT" | "BOOLEAN";
  options: string[];
  required: boolean;
  filterable: boolean;
  unit?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId?: number;
  parentName?: string;
  parentSlug?: string;
  attributeGroup: AttributeGroup;
  /** This category's own rate; null means it inherits. */
  commissionRate?: number;
  effectiveCommissionRate: number;
  /** Own GST rate; null means it inherits. */
  taxRate?: number;
  effectiveTaxRate: number;
  imageUrl?: string;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  attributes: AttributeDef[];
  children: Category[];
}

export interface Product {
  id: number;
  slug?: string;
  name: string;
  description?: string;
  price: number;
  priceUnit?: string;
  moq?: number;
  type: ProductType;
  categoryId?: number;
  categoryName?: string;
  categorySlug?: string;
  attributeGroup?: AttributeGroup;
  stock: number;
  imageUrl?: string;
  imageUrls: string[];
  attributes: Record<string, string>;
  shippingCharge?: number;
  dispatchDays?: number;
  shipsFrom?: string;
  status: ProductStatus;
  rejectionReason?: string;
  approved: boolean;
  featured: boolean;
  avgRating: number;
  reviewCount: number;
  sellerId: number;
  sellerName: string;
  vendorId?: number;
  vendorName?: string;
  vendorSlug?: string;
  vendorVerified: boolean;
  vendorCity?: string;
  vendorState?: string;
  createdAt: string;
}

// ---------------------------------------------------------------- vendors

export type VendorStatus = "DRAFT" | "PENDING_VERIFICATION" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type VendorType =
  | "COFFEE_ESTATE"
  | "GREEN_COFFEE_SUPPLIER"
  | "COFFEE_ROASTER"
  | "COFFEE_BRAND"
  | "INSTANT_COFFEE_MANUFACTURER"
  | "EQUIPMENT_SUPPLIER"
  | "ACCESSORIES_SUPPLIER"
  | "PACKAGING_SUPPLIER"
  | "CONTRACT_MANUFACTURER"
  | "DISTRIBUTOR";
export type DocumentType =
  | "GST"
  | "PAN"
  | "FSSAI"
  | "COMPANY_REGISTRATION"
  | "IEC"
  | "BANK_PROOF"
  | "ADDRESS_PROOF"
  | "CERTIFICATION";
export type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED";
export type BankStatus = "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";

export interface VendorSummary {
  id: number;
  businessName: string;
  slug: string;
  vendorType?: VendorType;
  vendorTypeLabel?: string;
  city?: string;
  state?: string;
  logoUrl?: string;
  verified: boolean;
  featured: boolean;
  avgRating: number;
  reviewCount: number;
  productCount: number;
  memberSince: string;
}

export interface Storefront {
  summary: VendorSummary;
  about?: string;
  website?: string;
  certifications: string[];
  avgResponseHours?: number;
}

export interface VendorDocument {
  id: number;
  type: DocumentType;
  label?: string;
  fileId: string;
  fileName: string;
  status: DocumentStatus;
  reviewNote?: string;
  uploadedAt: string;
}

export interface VendorBank {
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  bankName?: string;
  status: BankStatus;
  updatedAt: string;
}

/** Full onboarding record: what the vendor sees about themself and what admins review. */
export interface VendorProfile {
  id: number;
  userId: number;
  businessName: string;
  slug: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  vendorType?: VendorType;
  website?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pin?: string;
  gstNumber?: string;
  panNumber?: string;
  about?: string;
  logoUrl?: string;
  status: VendorStatus;
  statusReason?: string;
  featured: boolean;
  avgRating: number;
  reviewCount: number;
  submittedAt?: string;
  approvedAt?: string;
  createdAt: string;
  documents: VendorDocument[];
  bank?: VendorBank;
  missingRequirements: string[];
}

// ---------------------------------------------------------------- cart & orders

export interface CartLine {
  id: number;
  productId: number;
  productSlug?: string;
  name: string;
  imageUrl?: string;
  price: number;
  priceUnit?: string;
  moq?: number;
  quantity: number;
  stock: number;
  lineTotal: number;
  available: boolean;
  issue?: string;
}

export interface CartGroup {
  vendorId?: number;
  vendorName: string;
  vendorSlug?: string;
  vendorVerified: boolean;
  items: CartLine[];
  subtotal: number;
  shipping: number;
}

export interface Cart {
  groups: CartGroup[];
  itemCount: number;
  subtotal: number;
  shippingTotal: number;
  total: number;
  readyForCheckout: boolean;
}

export type OrderStatus =
  | "PLACED"
  | "PAYMENT_CONFIRMED"
  | "ACCEPTED"
  | "PROCESSING"
  | "READY_TO_SHIP"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUND_REQUESTED"
  | "REFUNDED"
  | "DISPUTED"
  // only on orders created before vendor sub-orders existed
  | "PENDING"
  | "CONFIRMED";

export type PaymentMethod = "COD" | "BANK_TRANSFER" | "ONLINE";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "PARTIALLY_REFUNDED" | "REFUNDED";
export type SettlementStatus = "PENDING" | "ELIGIBLE" | "ON_HOLD" | "SETTLED" | "CANCELLED";

export interface PostalAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pin: string;
}

export interface Address extends PostalAddress {
  id: number;
  label?: string;
  name: string;
  phone: string;
  defaultAddress: boolean;
}

export interface OrderItem {
  id: number;
  productId: number;
  productSlug?: string;
  productName: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/**
 * One vendor's part of an order. The buyer*, shippingAddress, notes and the
 * fee / payable / settlement fields are only present in vendor and admin responses.
 */
export interface VendorOrder {
  id: number;
  subOrderNumber: string;
  orderId: number;
  orderNumber: string;
  vendorId: number;
  vendorName: string;
  vendorSlug: string;
  vendorGstNumber?: string;
  vendorAddress?: string;
  status: OrderStatus;
  items: OrderItem[];
  itemsSubtotal: number;
  taxAmount: number;
  shippingAmount: number;
  totalAmount: number;
  refundAmount: number;
  courierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  dispatchDate?: string;
  cancelReason?: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  buyerName?: string;
  buyerPhone?: string;
  shippingAddress?: PostalAddress;
  notes?: string;
  platformFee?: number;
  gatewayFee?: number;
  vendorPayable?: number;
  settlementStatus?: SettlementStatus;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  shippingAddress?: PostalAddress;
  billingAddress?: PostalAddress;
  gstNumber?: string;
  notes?: string;
  itemsSubtotal?: number;
  shippingTotal?: number;
  taxTotal?: number;
  totalAmount: number;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  paymentReference?: string;
  createdAt: string;
  vendorOrders: VendorOrder[];
  /** Only for legacy orders with no vendorOrders. */
  items: OrderItem[];
}

export interface PaymentOptions {
  methods: PaymentMethod[];
  onlineIsTestMode: boolean;
  bankTransferInstructions: string;
}

export interface Settlement {
  id: number;
  vendorId: number;
  vendorName: string;
  amount: number;
  orderCount: number;
  reference?: string;
  note?: string;
  createdAt: string;
}

export interface Payable {
  vendorId: number;
  vendorName: string;
  amount: number;
  orderCount: number;
  bankStatus?: BankStatus;
  payoutOnHold: boolean;
}

export interface VendorPayments {
  pending: number;
  eligible: number;
  onHold: number;
  settled: number;
  bankStatus?: BankStatus;
  payoutOnHold: boolean;
  orders: VendorOrder[];
  settlements: Settlement[];
}

// ---------------------------------------------------------------- RFQ & quotes

export type RfqStatus = "SUBMITTED" | "OPEN" | "AWARDED" | "REJECTED" | "CANCELLED";
export type QuoteStatus = "SUBMITTED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
export type InvitationStatus = "INVITED" | "QUOTED" | "DECLINED";

export interface Quote {
  id: number;
  rfqId: number;
  rfqTitle: string;
  vendorId: number;
  vendorName: string;
  vendorSlug: string;
  vendorVerified: boolean;
  vendorRating: number;
  vendorReviewCount: number;
  vendorLocation?: string;
  pricePerUnit: number;
  moq?: number;
  availableQuantity?: number;
  taxPercent?: number;
  shippingCost?: number;
  leadTimeDays?: number;
  validUntil?: string;
  sampleCost?: number;
  notes?: string;
  /** pricePerUnit x RFQ quantity + tax + shipping. */
  estimatedTotal: number;
  status: QuoteStatus;
  createdAt: string;
}

export interface Rfq {
  id: number;
  title: string;
  categoryId: number;
  categoryName: string;
  productId?: number;
  productName?: string;
  coffeeType?: string;
  specification?: string;
  quantity: number;
  unit: string;
  targetPrice?: number;
  deliveryLocation: string;
  requiredBy?: string;
  sampleRequired: boolean;
  privateLabelRequired: boolean;
  additionalRequirements?: string;
  status: RfqStatus;
  adminNote?: string;
  selectedQuoteId?: number;
  buyerName: string;
  invitedCount: number;
  quoteCount: number;
  createdAt: string;
  /** Buyer and admin responses. */
  quotes: Quote[];
  /** Vendor responses only. */
  myQuote?: Quote;
  invitationStatus?: InvitationStatus;
  /** Admin responses only. */
  invitedVendors: VendorSummary[];
}

// ---------------------------------------------------------------- messaging, reviews, disputes

export type ConversationContext = "GENERAL" | "PRODUCT" | "RFQ" | "ORDER";

export interface Message {
  id: number;
  senderId: number;
  senderName: string;
  mine: boolean;
  body: string;
  flagged: boolean;
  createdAt: string;
}

export interface Conversation {
  id: number;
  subject: string;
  contextType: ConversationContext;
  contextId?: number;
  buyerId: number;
  buyerName: string;
  vendorId: number;
  vendorName: string;
  vendorSlug: string;
  lastMessagePreview?: string;
  lastMessageAt: string;
  unread: boolean;
  flagged: boolean;
  /** Empty in list responses. */
  messages: Message[];
}

export interface Review {
  id: number;
  productId: number | null;
  productName?: string;
  cafeId: number | null;
  vendorId?: number;
  vendorName?: string;
  customerId: number;
  customerName: string;
  rating: number;
  sellerRating?: number;
  qualityRating?: number;
  packagingRating?: number;
  deliveryRating?: number;
  communicationRating?: number;
  comment?: string;
  verifiedPurchase: boolean;
  hidden: boolean;
  moderationNote?: string;
  createdAt: string;
}

export interface ReviewEligibility {
  canReview: boolean;
  reason?: string;
}

export type DisputeReason =
  | "NOT_RECEIVED"
  | "DAMAGED"
  | "WRONG_ITEM"
  | "QUALITY_ISSUE"
  | "QUANTITY_ISSUE"
  | "LISTING_MISMATCH"
  | "SELLER_UNRESPONSIVE"
  | "OTHER";
export type DisputeStatus = "OPEN" | "VENDOR_RESPONDED" | "RESOLVED_REFUND" | "RESOLVED_NO_REFUND";

export interface Dispute {
  id: number;
  vendorOrderId: number;
  subOrderNumber: string;
  orderId: number;
  buyerId: number;
  buyerName: string;
  vendorId: number;
  vendorName: string;
  orderTotal: number;
  reason: DisputeReason;
  description: string;
  evidenceUrls: string[];
  vendorResponse?: string;
  vendorRespondedAt?: string;
  status: DisputeStatus;
  resolution?: string;
  refundAmount?: number;
  createdAt: string;
  resolvedAt?: string;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------- content, search, admin

export type ContentType = "BANNER" | "FAQ" | "ARTICLE" | "POLICY" | "FOOTER_LINK";

export interface ContentBlock {
  id: number;
  type: ContentType;
  slug?: string;
  title: string;
  body?: string;
  imageUrl?: string;
  linkUrl?: string;
  sortOrder: number;
  active: boolean;
  updatedAt: string;
}

export interface PlatformSetting {
  key: string;
  value: string;
  description?: string;
  publicSetting: boolean;
}

export interface SearchResults {
  products: Product[];
  totalProducts: number;
  suppliers: VendorSummary[];
  categories: { id: number; name: string; slug: string }[];
}

export interface AdminStats {
  gmv: number;
  platformRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  activeVendors: number;
  pendingVendors: number;
  totalProducts: number;
  pendingProducts: number;
  totalRfqs: number;
  totalQuotes: number;
  quoteAcceptanceRate: number;
  openDisputes: number;
  refundTotal: number;
  totalCustomers: number;
  totalSellers: number;
  totalCafes: number;
  pendingCafeApprovals: number;
}

export interface AdminReport {
  stats: AdminStats;
  salesByDay: { date: string; sales: number; orders: number }[];
  topVendors: { vendorId: number; vendorName: string; sales: number; orders: number }[];
}

export interface AuditEntry {
  id: number;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  ip?: string;
  createdAt: string;
}

export interface UploadedFile {
  id: string;
  url: string;
  fileName: string;
  contentType: string;
  size: number;
}

// ---------------------------------------------------------------- cafés (unchanged)

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

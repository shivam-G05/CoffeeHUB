import type { DisputeReason, DocumentType, OrderStatus, VendorType } from "../types";

export const VENDOR_TYPES: { value: VendorType; label: string }[] = [
  { value: "COFFEE_ESTATE", label: "Coffee Estate" },
  { value: "GREEN_COFFEE_SUPPLIER", label: "Green Coffee Supplier" },
  { value: "COFFEE_ROASTER", label: "Coffee Roaster" },
  { value: "COFFEE_BRAND", label: "Coffee Brand" },
  { value: "INSTANT_COFFEE_MANUFACTURER", label: "Instant Coffee Manufacturer" },
  { value: "EQUIPMENT_SUPPLIER", label: "Equipment Supplier" },
  { value: "ACCESSORIES_SUPPLIER", label: "Accessories Supplier" },
  { value: "PACKAGING_SUPPLIER", label: "Packaging Supplier" },
  { value: "CONTRACT_MANUFACTURER", label: "Contract Manufacturer" },
  { value: "DISTRIBUTOR", label: "Distributor" },
];

/** required = every vendor must upload it before submitting for verification. */
export const DOCUMENT_TYPES: { value: DocumentType; label: string; required: boolean }[] = [
  { value: "GST", label: "GST certificate", required: true },
  { value: "PAN", label: "PAN card", required: true },
  { value: "BANK_PROOF", label: "Bank proof / cancelled cheque", required: true },
  { value: "ADDRESS_PROOF", label: "Address proof", required: true },
  { value: "FSSAI", label: "FSSAI licence (food products)", required: false },
  { value: "COMPANY_REGISTRATION", label: "Company / LLP registration", required: false },
  { value: "IEC", label: "Import Export Code (IEC)", required: false },
  { value: "CERTIFICATION", label: "Other certification", required: false },
];

export const DISPUTE_REASONS: { value: DisputeReason; label: string }[] = [
  { value: "NOT_RECEIVED", label: "Order not received" },
  { value: "DAMAGED", label: "Arrived damaged" },
  { value: "WRONG_ITEM", label: "Wrong item sent" },
  { value: "QUALITY_ISSUE", label: "Quality issue" },
  { value: "QUANTITY_ISSUE", label: "Quantity issue" },
  { value: "LISTING_MISMATCH", label: "Not as described in the listing" },
  { value: "SELLER_UNRESPONSIVE", label: "Seller unresponsive" },
  { value: "OTHER", label: "Other" },
];

/** The normal fulfilment path, in order, for progress trackers. */
export const ORDER_FLOW: OrderStatus[] = [
  "PLACED",
  "PAYMENT_CONFIRMED",
  "ACCEPTED",
  "PROCESSING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

/** Slugs of the CMS policy pages, in footer order. Titles come from the CMS. */
export const POLICY_LINKS: { slug: string; title: string }[] = [
  { slug: "terms-conditions", title: "Terms & Conditions" },
  { slug: "privacy-policy", title: "Privacy Policy" },
  { slug: "seller-terms", title: "Seller Terms" },
  { slug: "buyer-protection", title: "Buyer Protection" },
  { slug: "refund-cancellation", title: "Refund & Cancellation" },
  { slug: "shipping-policy", title: "Shipping Policy" },
  { slug: "marketplace-disclaimer", title: "Marketplace Disclaimer" },
  { slug: "prohibited-products", title: "Prohibited Products" },
  { slug: "dispute-policy", title: "Dispute Policy" },
  { slug: "cookie-policy", title: "Cookie Policy" },
];

export type VehicleCondition = 'Foreign Used' | 'Nigerian Used' | 'Brand New';
export type VehicleTransmission = 'Automatic' | 'Manual' | 'CVT' | 'Semi-Automatic';
export type VehicleFuelType = 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric';
export type VehicleBodyType =
  | 'SUV'
  | 'Sedan'
  | 'Hatchback'
  | 'Coupe'
  | 'Pickup'
  | 'Bus'
  | 'Convertible'
  | 'Wagon';
export type VehicleStatus = 'available' | 'reserved' | 'sold';

export interface Vehicle {
  id: string;
  slug: string;
  referenceCode: string;
  name: string;
  make: string;
  model: string;
  year: number;
  priceNgn: number;
  previousPriceNgn?: number;
  location: string;
  condition: VehicleCondition;
  transmission: VehicleTransmission;
  fuelType: VehicleFuelType;
  bodyType: VehicleBodyType;
  mileageKm: number;
  engineSize?: string;
  exteriorColor?: string;
  interiorColor?: string;
  vin?: string;
  description: string;
  images: string[];
  verified: boolean;
  featured: boolean;
  financingAvailable: boolean;
  saveToOwnAvailable: boolean;
  status: VehicleStatus;
  popularityScore?: number;
  isSampleInventory?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  whatsappOptIn?: boolean;
  emailNotifications?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  vehicleId: string;
  vehicleName: string;
  priceNgn: number;
  createdAt: string;
}

export interface CustomerNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: 'enquiry' | 'financing' | 'savings' | 'payment' | 'valuation' | 'quotation' | 'system';
  referenceNumber?: string;
  isRead: boolean;
  createdAt: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface PromoBanner {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaPath: string;
  active: boolean;
}

export interface DealershipSettings {
  businessName: string;
  publicListingTitle: string;
  tagline: string;
  whatsappNumber: string;
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  businessHours: string;
  googleBusinessUrl: string;
  chatbotEnabled: boolean;
  chatbotName: string;
  chatbotWelcomeMessage: string;
  chatbotInstructions: string;
  faqs: FAQItem[];
  popularBrands: string[];
  promoBanners: PromoBanner[];
  sampleInventorySeeded?: boolean;
  sampleInventoryCleared?: boolean;
  updatedAt: string;
}

export interface Testimonial {
  id: string;
  customerName: string;
  location: string;
  vehiclePurchased: string;
  quote: string;
  rating: number;
  published: boolean;
  createdAt: string;
}

export interface Enquiry {
  id: string;
  referenceNumber: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  vehicleId?: string;
  vehicleName?: string;
  category: 'car_purchase' | 'financing' | 'save_to_own' | 'sell_car' | 'quotation' | 'inspection' | 'general';
  budgetNgn?: number;
  paymentPreference?: string;
  message: string;
  source: 'website' | 'chatbot' | 'whatsapp';
  status: 'new' | 'contacted' | 'quoted' | 'closed';
  whatsappNotificationStatus: 'pending' | 'sent' | 'failed' | 'not_configured';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RepaymentInstallment {
  installmentNumber: number;
  dueDate: string;
  amountNgn: number;
  status: 'pending' | 'paid' | 'overdue';
}

export interface FinancingApplication {
  id: string;
  referenceNumber: string;
  userId: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePriceNgn: number;
  fullName: string;
  phone: string;
  email: string;
  residentialAddress: string;
  employmentStatus: 'Employed' | 'Self-Employed' | 'Business Owner' | 'Corporate';
  employerName: string;
  monthlyIncomeNgn: number;
  preferredDepositNgn: number;
  repaymentMonths: number;
  documentUrls: string[];
  acceptedDisclosure: boolean;
  status: 'submitted' | 'under_review' | 'info_requested' | 'approved' | 'rejected';
  approvedDepositNgn: number;
  approvedMonthlyPaymentNgn: number;
  approvedMonths: number;
  interestRatePercent?: number;
  depositRecordedNgn: number;
  repaymentSchedule: RepaymentInstallment[];
  adminRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsPlan {
  id: string;
  referenceNumber: string;
  userId: string;
  vehicleId: string;
  vehicleName: string;
  targetPriceNgn: number;
  priceLocked: boolean;
  durationMonths: number;
  frequency: 'weekly' | 'monthly';
  suggestedContributionNgn: number;
  confirmedPaidNgn: number;
  pendingPaidNgn: number;
  agreedToTerms: boolean;
  status: 'active' | 'completed' | 'paused' | 'refund_requested' | 'refunded' | 'cancelled';
  nextReminderDate?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  referenceNumber: string;
  userId: string;
  relatedType: 'savings' | 'financing_deposit' | 'financing_installment' | 'vehicle_deposit';
  relatedId: string;
  amountNgn: number;
  method: 'paystack' | 'bank_transfer';
  gatewayReference?: string;
  receiptUrl?: string;
  status: 'pending_verification' | 'verified' | 'rejected';
  verifiedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleSubmission {
  id: string;
  referenceNumber: string;
  userId: string;
  arrangement: 'direct_purchase' | 'consignment';
  fullName: string;
  phone: string;
  email: string;
  make: string;
  model: string;
  year: number;
  mileageKm: number;
  condition: VehicleCondition;
  transmission: VehicleTransmission;
  fuelType: VehicleFuelType;
  location: string;
  expectedPriceNgn: number;
  description: string;
  images: string[];
  status: 'pending_review' | 'valued' | 'offer_sent' | 'approved_for_listing' | 'purchased' | 'declined';
  proposedValuationNgn?: number;
  adminOfferNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarQuotation {
  id: string;
  referenceNumber: string;
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  preferredBrand: string;
  preferredModel: string;
  preferredYear: number;
  budgetNgn: number;
  preferredCondition: 'Foreign Used' | 'Nigerian Used' | 'Brand New' | 'Any';
  location: string;
  paymentPreference: 'Outright' | 'Installment' | 'Financing';
  additionalRequirements?: string;
  status: 'pending' | 'sourcing' | 'quoted' | 'accepted' | 'closed';
  quotedPriceNgn?: number;
  adminQuoteNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  matchedVehicleIds?: string[];
}

export interface ChatConversation {
  id: string;
  sessionId: string;
  userId: string;
  customerName?: string;
  customerPhone?: string;
  enquiryCategory?: string;
  preferredVehicle?: string;
  budgetNgn?: number;
  paymentPreference?: string;
  enquiryReference?: string;
  whatsappNotificationStatus: 'none' | 'pending' | 'sent' | 'failed' | 'not_configured';
  handoverRequested: boolean;
  unansweredFlag: boolean;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppLog {
  id: string;
  enquiryReference: string;
  recipientPhone: string;
  category: string;
  payloadSummary: string;
  status: 'sent' | 'failed' | 'not_configured';
  providerMessageId?: string;
  errorMessage?: string;
  createdAt: string;
}

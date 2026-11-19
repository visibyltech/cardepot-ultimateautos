export const OFFICIAL_WHATSAPP_NUMBER = '+234 816 569 5833';
export const OFFICIAL_WHATSAPP_DIGITS = '2348165695833';
export const OFFICIAL_LOGO_PATH = '/assets/aistudio/file_00000000690c8210b5ee7b3852e306c7_adac1c2f.png';

export const DEFAULT_DEALERSHIP_SETTINGS = {
  businessName: 'CAR DEPOT BY ULTIMATE AUTOS',
  publicListingTitle: 'Car Depot | Foreign and Locally Used Cars in Nigeria | Ultimate Autos NG',
  tagline: 'YOUR TRUSTED CAR PARTNER.',
  whatsappNumber: '+234 816 569 5833',
  phoneNumber: '+234 816 569 5833',
  email: '',
  address: 'Lagos, Nigeria (Confirm exact Google Business Profile street address in Admin Settings)',
  city: 'Lagos, Nigeria',
  businessHours: 'Mon – Sat: 8:30 AM – 6:00 PM WAT',
  googleBusinessUrl: '',
  chatbotEnabled: true,
  chatbotName: 'Car Depot AI Assistant',
  chatbotWelcomeMessage:
    "Welcome to Car Depot by Ultimate Autos! 👋\nI'm your virtual car assistant. I can help you find vehicles, explore financing options, save towards owning a car, sell your vehicle or request a quotation.\nHow can I help you today?",
  chatbotInstructions:
    'Be warm, professional, concise, and helpful. Always quote only verified vehicles present in the live Car Depot inventory. Never fabricate vehicle prices, availability, or financing approvals.',
  faqs: [
    {
      question: 'How does Buy Now Pay Later car financing work?',
      answer:
        'Select a financing-eligible vehicle, submit your personal and employment details with your preferred deposit and repayment duration. Every application undergoes dealership eligibility review and verification before approval.'
    },
    {
      question: 'How does Save to Own (Pay Small Small) work?',
      answer:
        'Choose a vehicle, pick a weekly or monthly savings target duration, and make verified contributions toward your purchase. Payments are verified by our accounts team before updating your confirmed balance.'
    },
    {
      question: 'Can I sell my car directly or on consignment?',
      answer:
        'Yes. You can submit your vehicle on the Sell Your Car page for either Direct Purchase by Ultimate Autos or Consignment listing where we market and sell on your behalf after inspection.'
    }
  ],
  popularBrands: ['Toyota', 'Lexus', 'Mercedes-Benz', 'Honda', 'Hyundai', 'Ford', 'Land Rover', 'Kia'],
  promoBanners: [
    {
      id: 'bnpl',
      title: 'Flexible Car Financing',
      subtitle: 'Drive sooner with structured monthly repayments subject to dealership approval.',
      ctaLabel: 'Apply for Financing',
      ctaPath: '/financing',
      active: true
    },
    {
      id: 'save',
      title: 'Save to Own — Pay Small Small',
      subtitle: 'Build toward your vehicle deposit or full ownership with weekly or monthly contributions.',
      ctaLabel: 'Start Saving',
      ctaPath: '/save-to-own',
      active: true
    }
  ]
};

export function formatNaira(amount: number | undefined | null): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '₦0';
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

export function formatNumber(num: number | undefined | null): string {
  if (typeof num !== 'number' || Number.isNaN(num)) return '0';
  return Math.round(num).toLocaleString('en-NG');
}

export function generateReference(prefix = 'CD'): string {
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${randomDigits}${suffix}`;
}

export function slugifyVehicle(name: string, year: number, refCode: string): string {
  const base = `${year}-${name}-${refCode}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.slice(0, 140) || `vehicle-${Date.now()}`;
}

export function buildWhatsAppClickToChatUrl(
  message: string,
  whatsappNumber = OFFICIAL_WHATSAPP_NUMBER
): string {
  const digits = whatsappNumber.replace(/\D/g, '') || OFFICIAL_WHATSAPP_DIGITS;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function formatWhatsAppEnquiryMessage(params: {
  customerName?: string;
  customerPhone?: string;
  category: string;
  preferredVehicle?: string;
  budgetNgn?: number;
  paymentPreference?: string;
  enquiryReference?: string;
  questions?: string;
  summary?: string;
}): string {
  const lines = [
    'Hello Car Depot,',
    'I have an enquiry through your website.',
    `Name: ${params.customerName || 'Prospective Buyer'}`,
  ];
  if (params.customerPhone) lines.push(`Phone: ${params.customerPhone}`);
  lines.push(`Enquiry: ${params.category}`);
  if (params.preferredVehicle) lines.push(`Preferred Vehicle: ${params.preferredVehicle}`);
  if (params.budgetNgn && params.budgetNgn > 0) lines.push(`Budget: ${formatNaira(params.budgetNgn)}`);
  if (params.paymentPreference) lines.push(`Payment Preference: ${params.paymentPreference}`);
  if (params.enquiryReference) lines.push(`Enquiry Reference: ${params.enquiryReference}`);
  if (params.questions) lines.push(`Details: ${params.questions}`);
  if (params.summary) lines.push(`Summary: ${params.summary}`);
  lines.push('Please contact me.');
  return lines.join('\n');
}

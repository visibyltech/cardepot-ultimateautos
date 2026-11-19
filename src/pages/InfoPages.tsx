import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock, MapPin, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { buildWhatsAppClickToChatUrl, generateReference } from '../lib/format';
import { SeoHead } from '../components/SeoHead';

export function AboutPage() {
  const { settings } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <SeoHead
        title={`About Us | ${settings.businessName}`}
        description="Learn about Car Depot by Ultimate Autos — Your Trusted Car Partner for foreign and locally used vehicles, financing, and Save to Own in Nigeria."
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="bg-[#0B0D10] text-white rounded-2xl p-6 sm:p-10 space-y-3">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">
            {settings.tagline}
          </p>
          <h1 className="font-display font-bold text-3xl">{settings.businessName}</h1>
          <p className="text-sm text-slate-300">{settings.publicListingTitle}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            <strong>Car Depot by Ultimate Autos</strong> combines transparent Nigerian automotive marketplace browsing with verified dealership inspection, flexible Buy Now Pay Later car financing, Save to Own installment plans, and professional vehicle valuation and consignment services.
          </p>
          <p>
            Every vehicle published on our marketplace undergoes dealership review before listing. Financing applications and Save to Own payment confirmations are carefully verified by our administration and accounts team to protect both buyers and sellers.
          </p>
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h2 className="font-display font-bold text-base text-slate-900 mb-1">
                Location &amp; Hours
              </h2>
              <p className="text-xs text-slate-600">{settings.address}</p>
              <p className="text-xs text-slate-600 mt-1">{settings.businessHours}</p>
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-slate-900 mb-1">
                Official Sales &amp; WhatsApp
              </h2>
              <p className="font-mono-num text-sm font-semibold text-slate-900">
                {settings.whatsappNumber}
              </p>
              <Link to="/contact" className="text-xs text-red-600 font-semibold underline mt-1 inline-block">
                Contact Customer Support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { settings, user, loginWithGoogle } = useApp();
  const [name, setName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sentRef, setSentRef] = useState<string | null>(null);

  const whatsappUrl = buildWhatsAppClickToChatUrl(
    'Hello Car Depot by Ultimate Autos, I would like to speak with customer support.',
    settings.whatsappNumber
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await loginWithGoogle();
      return;
    }
    const refCode = generateReference('SUP');
    const id = `enq_${Date.now()}`;
    try {
      await setDoc(doc(db, 'enquiries', id), {
        referenceNumber: refCode,
        userId: user.uid,
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: user.email || '',
        category: 'general',
        message: message.trim(),
        source: 'website',
        status: 'new',
        whatsappNotificationStatus: 'not_configured',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSentRef(refCode);
      setMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `enquiries/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <SeoHead
        title={`Contact Us & Support | ${settings.businessName}`}
        description={`Contact Car Depot by Ultimate Autos on WhatsApp or phone at ${settings.whatsappNumber}.`}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-[#0B0D10] text-white rounded-2xl p-6 space-y-5">
          <h1 className="font-display font-bold text-2xl">Contact &amp; Customer Support</h1>
          <p className="text-sm text-slate-300">
            Reach our Lagos dealership sales and support representatives directly.
          </p>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-red-500 mt-1 shrink-0" />
              <span>{settings.address}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-red-500 shrink-0" />
              <a href={`tel:${settings.phoneNumber.replace(/\s+/g, '')}`} className="font-mono-num">
                {settings.phoneNumber}
              </a>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-red-500 shrink-0" />
              <span>{settings.businessHours}</span>
            </div>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl"
          >
            <MessageCircle className="w-4 h-4" />
            Message on WhatsApp
          </a>
        </div>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-display font-bold text-lg text-slate-900 mb-4">
            Send a Support Message
          </h2>
          {sentRef ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
              Support enquiry received! Reference: <strong className="font-mono-num">{sentRef}</strong>.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Full Name"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone / WhatsApp Number"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can our team assist you?"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl"
              >
                {user ? 'Send Message' : 'Sign in with Google & Send'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const POLICIES: Record<string, { title: string; sections: Array<{ heading: string; body: string }> }> = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        heading: 'Information We Collect',
        body: 'We collect account profile details, enquiry submissions, financing documents, vehicle valuation photos, and chat enquiries strictly to deliver dealership, financing, and Save to Own services.',
      },
      {
        heading: 'Data Protection & Access Control',
        body: 'Personal customer records are isolated to your authenticated account and authorized dealership administrators. Sensitive API keys and payment credentials are never exposed on the client.',
      },
    ],
  },
  terms: {
    title: 'Terms and Conditions',
    sections: [
      {
        heading: 'Marketplace & Dealership Services',
        body: 'Vehicle availability, pricing in Nigerian Naira, and promotional offers are subject to physical showroom verification until a deposit or purchase agreement is confirmed by Car Depot by Ultimate Autos.',
      },
      {
        heading: 'Customer Submissions',
        body: 'Customer vehicle submissions for Direct Purchase or Consignment undergo physical inspection and documentation checks before valuation offers or marketplace publication.',
      },
    ],
  },
  'financing-terms': {
    title: 'Buy Now Pay Later — Financing Terms',
    sections: [
      {
        heading: 'Subject to Dealership Approval',
        body: 'All Buy Now Pay Later car financing applications are subject to document verification, income/employment validation, physical inspection, and formal written approval by Car Depot by Ultimate Autos. Submitting an application does not guarantee approval.',
      },
      {
        heading: 'Repayment Schedules & Deposits',
        body: 'Approved deposits, interest terms, and monthly repayment schedules are issued solely by authorized administrators after credit review.',
      },
    ],
  },
  'save-to-own-terms': {
    title: 'Save to Own (Pay Small Small) Terms',
    sections: [
      {
        heading: 'Payment Verification',
        body: 'Bank transfer contributions and uploaded payment receipts remain in Pending Verification until confirmed by Car Depot Accounts Administration.',
      },
      {
        heading: 'Price-Lock & Vehicle Availability Policy',
        body: 'A vehicle price is only locked upon reaching the dealership’s qualifying lock milestone and receiving written price-lock confirmation. If a chosen vehicle is sold prior to price-lock, 100% of confirmed contributions may be applied toward an equivalent vehicle or refunded per the Refund Policy.',
      },
    ],
  },
  'purchase-policy': {
    title: 'Vehicle Purchase Policy',
    sections: [
      {
        heading: 'Inspection & Documentation',
        body: 'Buyers are encouraged to inspect vehicles physically or via an independent mechanic prior to completing full payment. All customs and registration documents are verified before release.',
      },
    ],
  },
  'refund-policy': {
    title: 'Refund Policy',
    sections: [
      {
        heading: 'Save to Own & Deposit Refunds',
        body: 'Customers requesting cancellation or refund of confirmed Save to Own contributions may submit a refund request from their Customer Dashboard. Verified refunds are processed to the customer’s verified bank account subject to administrative reconciliation.',
      },
    ],
  },
};

export function PolicyPage() {
  const { slug } = useParams<{ slug: string }>();
  const policy = POLICIES[slug || 'terms'] || POLICIES.terms;

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <SeoHead
        title={`${policy.title} | Car Depot by Ultimate Autos`}
        description={`${policy.title} for Car Depot by Ultimate Autos in Nigeria.`}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 text-red-600 text-xs font-semibold uppercase">
            <ShieldCheck className="w-4 h-4" />
            Dealership Policy
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">
            {policy.title}
          </h1>
          <div className="space-y-5">
            {policy.sections.map((sec) => (
              <div key={sec.heading} className="space-y-1.5">
                <h2 className="font-display font-bold text-base text-slate-900">{sec.heading}</h2>
                <p className="text-sm text-slate-700 leading-relaxed">{sec.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

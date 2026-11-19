import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, MessageCircle, Sparkles } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  buildWhatsAppClickToChatUrl,
  formatWhatsAppEnquiryMessage,
  generateReference,
} from '../lib/format';
import { AuthPromptCard } from '../components/AuthPromptCard';
import { SeoHead } from '../components/SeoHead';

export function RequestCarPage() {
  const { user, userProfile, settings } = useApp();

  const [fullName, setFullName] = useState(userProfile?.fullName || user?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [preferredBrand, setPreferredBrand] = useState('');
  const [preferredModel, setPreferredModel] = useState('');
  const [preferredYear, setPreferredYear] = useState(2021);
  const [budgetNgn, setBudgetNgn] = useState('');
  const [preferredCondition, setPreferredCondition] = useState<
    'Foreign Used' | 'Nigerian Used' | 'Brand New' | 'Any'
  >('Foreign Used');
  const [location, setLocation] = useState('Lagos');
  const [paymentPreference, setPaymentPreference] = useState<
    'Outright' | 'Installment' | 'Financing'
  >('Outright');
  const [additionalRequirements, setAdditionalRequirements] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setFullName((p) => p || userProfile.fullName);
      setPhone((p) => p || userProfile.phone || '');
      setEmail((p) => p || userProfile.email);
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) return;

    const qId = `quo_${Date.now()}`;
    const refCode = generateReference('QUO');
    setSubmitting(true);

    try {
      await setDoc(doc(db, 'quotations', qId), {
        referenceNumber: refCode,
        userId: user.uid,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        preferredBrand: preferredBrand.trim(),
        preferredModel: preferredModel.trim(),
        preferredYear: Number(preferredYear),
        budgetNgn: Number(budgetNgn || 0),
        preferredCondition,
        location: location.trim(),
        paymentPreference,
        additionalRequirements: additionalRequirements.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'users', user.uid, 'notifications', `notif_${Date.now()}`), {
        userId: user.uid,
        title: 'Car Quotation Request Received',
        message: `Quotation ${refCode} for ${preferredYear} ${preferredBrand} ${preferredModel} has been sent to our sourcing desk.`,
        category: 'quotation',
        referenceNumber: refCode,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      await fetch('/api/whatsapp/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enquiryReference: refCode,
          customerName: fullName.trim(),
          customerPhone: phone.trim(),
          category: 'quotation',
          preferredVehicle: `${preferredYear} ${preferredBrand} ${preferredModel} (${preferredCondition})`,
          budgetNgn: Number(budgetNgn || 0),
          paymentPreference,
          message: additionalRequirements.trim(),
        }),
      });

      setSubmittedRef(refCode);
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.CREATE, `quotations/${qId}`);
      }
      setError(err?.message || 'Unable to submit quotation request.');
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappUrl = buildWhatsAppClickToChatUrl(
    formatWhatsAppEnquiryMessage({
      customerName: fullName,
      customerPhone: phone,
      category: 'Car Quotation Request',
      preferredVehicle: `${preferredYear} ${preferredBrand} ${preferredModel} (${preferredCondition})`,
      budgetNgn: Number(budgetNgn || 0),
      paymentPreference,
      enquiryReference: submittedRef || undefined,
      questions: additionalRequirements,
    }),
    settings.whatsappNumber
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <SeoHead
        title="Request a Car Quotation | Car Depot by Ultimate Autos"
        description="Can't find the exact car you want? Submit your budget, brand, model, and payment preference to get a personalized quotation from Car Depot."
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="bg-[#0B0D10] text-white rounded-2xl p-6 sm:p-8 border border-slate-800">
          <div className="flex items-center gap-2 text-red-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            Custom Vehicle Sourcing
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl mb-2">
            CAN&apos;T FIND THE CAR YOU WANT? LET US FIND IT FOR YOU.
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Provide your exact specifications and budget in Nigerian Naira. Our sourcing team will provide an official dealership quotation with inspection and delivery options.
          </p>
        </div>

        {!user ? (
          <AuthPromptCard
            title="Sign in to Request a Car Quotation"
            description="Sign in with Google to receive an enquiry reference number and view live quotations from our sourcing team in your dashboard."
          />
        ) : submittedRef ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="font-display font-bold text-2xl text-slate-900">
              Quotation Request Submitted
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Quotation Reference:{' '}
              <span className="font-mono-num font-bold text-slate-900">{submittedRef}</span>. Our sourcing team is working on your request.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl"
              >
                <MessageCircle className="w-4 h-4" />
                Send Request on WhatsApp
              </a>
              <Link
                to="/dashboard?tab=quotations"
                className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl"
              >
                View My Quotations
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone / WhatsApp Number"
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={preferredBrand}
                onChange={(e) => setPreferredBrand(e.target.value)}
                placeholder="Preferred Brand (e.g. Toyota)"
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                value={preferredModel}
                onChange={(e) => setPreferredModel(e.target.value)}
                placeholder="Preferred Model (e.g. Highlander)"
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="number"
                required
                min={1985}
                max={2030}
                value={preferredYear}
                onChange={(e) => setPreferredYear(Number(e.target.value))}
                placeholder="Preferred Year"
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono-num"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="number"
                required
                min={0}
                value={budgetNgn}
                onChange={(e) => setBudgetNgn(e.target.value)}
                placeholder="Target Budget (₦)"
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono-num"
              />
              <select
                value={preferredCondition}
                onChange={(e) => setPreferredCondition(e.target.value as any)}
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Foreign Used">Foreign Used</option>
                <option value="Nigerian Used">Nigerian Used</option>
                <option value="Brand New">Brand New</option>
                <option value="Any">Any Condition</option>
              </select>
              <select
                value={paymentPreference}
                onChange={(e) => setPaymentPreference(e.target.value as any)}
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Outright">Outright Purchase</option>
                <option value="Installment">Installment / Save to Own</option>
                <option value="Financing">Buy Now Pay Later Financing</option>
              </select>
            </div>

            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Delivery / Inspection Location (e.g. Lagos, Abuja)"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
            />

            <textarea
              rows={4}
              value={additionalRequirements}
              onChange={(e) => setAdditionalRequirements(e.target.value)}
              placeholder="Preferred trim, interior color, mileage ceiling, or custom notes..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
            />

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {submitting ? 'Submitting Quotation Request...' : 'Request Official Car Quotation'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

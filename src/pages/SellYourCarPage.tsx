import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, MessageCircle, UploadCloud } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  buildWhatsAppClickToChatUrl,
  formatWhatsAppEnquiryMessage,
  generateReference,
} from '../lib/format';
import { AuthPromptCard } from '../components/AuthPromptCard';
import { ImageUploader } from '../components/ImageUploader';
import { SeoHead } from '../components/SeoHead';

export function SellYourCarPage() {
  const { user, userProfile, settings } = useApp();

  const [arrangement, setArrangement] = useState<'direct_purchase' | 'consignment'>(
    'direct_purchase'
  );
  const [fullName, setFullName] = useState(userProfile?.fullName || user?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2020);
  const [mileageKm, setMileageKm] = useState('');
  const [condition, setCondition] = useState<'Foreign Used' | 'Nigerian Used' | 'Brand New'>(
    'Nigerian Used'
  );
  const [transmission, setTransmission] = useState<'Automatic' | 'Manual' | 'CVT' | 'Semi-Automatic'>(
    'Automatic'
  );
  const [fuelType, setFuelType] = useState<'Petrol' | 'Diesel' | 'Hybrid' | 'Electric'>('Petrol');
  const [location, setLocation] = useState('Lagos');
  const [expectedPriceNgn, setExpectedPriceNgn] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);

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

    const subId = `sell_${Date.now()}`;
    const refCode = generateReference('SELL');
    setSubmitting(true);

    try {
      await setDoc(doc(db, 'vehicleSubmissions', subId), {
        referenceNumber: refCode,
        userId: user.uid,
        arrangement,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        make: make.trim(),
        model: model.trim(),
        year: Number(year),
        mileageKm: Number(mileageKm || 0),
        condition,
        transmission,
        fuelType,
        location: location.trim(),
        expectedPriceNgn: Number(expectedPriceNgn || 0),
        description: description.trim(),
        images,
        status: 'pending_review',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'users', user.uid, 'notifications', `notif_${Date.now()}`), {
        userId: user.uid,
        title: 'Vehicle Valuation Submission Received',
        message: `Your ${year} ${make} ${model} (${refCode}) is pending inspection and review by Car Depot Administration.`,
        category: 'valuation',
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
          category: `Sell Your Car (${arrangement})`,
          preferredVehicle: `${year} ${make} ${model}`,
          budgetNgn: Number(expectedPriceNgn || 0),
          message: description.trim(),
        }),
      });

      setSubmittedRef(refCode);
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.CREATE, `vehicleSubmissions/${subId}`);
      }
      setError(err?.message || 'Unable to submit vehicle for valuation.');
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappUrl = buildWhatsAppClickToChatUrl(
    formatWhatsAppEnquiryMessage({
      customerName: fullName,
      customerPhone: phone,
      category:
        arrangement === 'direct_purchase' ? 'Sell Car (Direct Purchase)' : 'Sell Car (Consignment)',
      preferredVehicle: `${year} ${make} ${model}`,
      budgetNgn: Number(expectedPriceNgn || 0),
      enquiryReference: submittedRef || undefined,
      questions: description,
    }),
    settings.whatsappNumber
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <SeoHead
        title="Sell My Car in Lagos | Valuation & Consignment | Car Depot by Ultimate Autos"
        description="Sell your car in Lagos directly to Ultimate Autos or list on consignment through Car Depot. Submit your vehicle photos and details for fast valuation."
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="bg-[#0B0D10] text-white rounded-2xl p-6 sm:p-8 border border-slate-800">
          <div className="flex items-center gap-2 text-red-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <UploadCloud className="w-4 h-4" />
            Sell Your Car
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl mb-2">
            Vehicle Valuation &amp; Consignment
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Choose Direct Purchase for an outright dealership offer or Consignment to let Car Depot advertise and sell your car. All submissions require admin inspection and approval before listing.
          </p>
        </div>

        {!user ? (
          <AuthPromptCard
            title="Sign in to Submit Your Vehicle"
            description="Sign in with Google to upload your vehicle photos, receive a valuation reference number, and view dealership offers in your dashboard."
          />
        ) : submittedRef ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="font-display font-bold text-2xl text-slate-900">
              Vehicle Submitted for Review
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Reference Number:{' '}
              <span className="font-mono-num font-bold text-slate-900">{submittedRef}</span>. Our appraisal team will inspect your details and send a valuation offer.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl"
              >
                <MessageCircle className="w-4 h-4" />
                Send Details on WhatsApp
              </a>
              <Link
                to="/dashboard?tab=submissions"
                className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl"
              >
                Track Submission
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6">
            {/* Arrangement Toggle */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Preferred Selling Arrangement
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setArrangement('direct_purchase')}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    arrangement === 'direct_purchase'
                      ? 'bg-[#0B0D10] text-white border-[#0B0D10]'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <p className="font-display font-bold text-sm">A. Direct Purchase</p>
                  <p className="text-xs opacity-80 mt-1">
                    Ultimate Autos inspects and purchases your vehicle directly.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setArrangement('consignment')}
                  className={`p-4 rounded-xl border text-left transition-colors ${
                    arrangement === 'consignment'
                      ? 'bg-[#0B0D10] text-white border-[#0B0D10]'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <p className="font-display font-bold text-sm">B. Consignment</p>
                  <p className="text-xs opacity-80 mt-1">
                    Car Depot markets and sells your vehicle to verified buyers on your behalf.
                  </p>
                </button>
              </div>
            </div>

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
                placeholder="Phone / WhatsApp"
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="Vehicle Make (e.g. Lexus)"
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Model (e.g. RX 350)"
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="number"
                required
                min={1985}
                max={2030}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                placeholder="Year"
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono-num"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Foreign Used">Foreign Used</option>
                <option value="Nigerian Used">Nigerian Used</option>
                <option value="Brand New">Brand New</option>
              </select>
              <select
                value={transmission}
                onChange={(e) => setTransmission(e.target.value as any)}
                className="px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Automatic">Automatic</option>
                <option value="Manual">Manual</option>
                <option value="CVT">CVT</option>
                <option value="Semi-Automatic">Semi-Automatic</option>
              </select>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as any)}
                className="px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="Petrol">Petrol</option>
                <option value="Diesel">Diesel</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Electric">Electric</option>
              </select>
              <input
                type="number"
                required
                min={0}
                value={mileageKm}
                onChange={(e) => setMileageKm(e.target.value)}
                placeholder="Mileage (km)"
                className="px-3 py-2.5 text-sm border border-slate-300 rounded-lg font-mono-num"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Vehicle Location (e.g. Lekki, Lagos)"
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="number"
                required
                min={0}
                value={expectedPriceNgn}
                onChange={(e) => setExpectedPriceNgn(e.target.value)}
                placeholder="Expected Selling Price (₦)"
                className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono-num"
              />
            </div>

            <textarea
              required
              minLength={5}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe vehicle condition, service history, trim, customs papers, and any faults..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
            />

            <ImageUploader
              label="Vehicle Photographs (Exterior, Interior, Dashboard)"
              urls={images}
              onChange={setImages}
              maxFiles={10}
              folder="car-depot/sell-submissions"
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
              {submitting ? 'Submitting Vehicle...' : 'Submit Vehicle for Valuation'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

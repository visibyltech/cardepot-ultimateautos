import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Car,
  CheckCircle2,
  CreditCard,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  PiggyBank,
  Share2,
} from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  buildWhatsAppClickToChatUrl,
  formatNaira,
  formatNumber,
  formatWhatsAppEnquiryMessage,
  generateReference,
} from '../lib/format';
import { SeoHead } from '../components/SeoHead';
import { VehicleCard } from '../components/VehicleCard';

export function VehicleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const {
    vehicles,
    vehiclesLoading,
    settings,
    user,
    userProfile,
    isInWishlist,
    toggleWishlist,
    loginWithGoogle,
  } = useApp();

  const vehicle = useMemo(
    () => vehicles.find((v) => v.slug === slug || v.id === slug),
    [vehicles, slug]
  );

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);

  // Enquiry Form State
  const [customerName, setCustomerName] = useState(userProfile?.fullName || user?.displayName || '');
  const [customerPhone, setCustomerPhone] = useState(userProfile?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [paymentPreference, setPaymentPreference] = useState('Outright');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [enquirySuccessRef, setEnquirySuccessRef] = useState<string | null>(null);
  const [enquiryError, setEnquiryError] = useState<string | null>(null);

  useEffect(() => {
    setActiveImageIdx(0);
    setEnquirySuccessRef(null);
    setEnquiryError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  const similarVehicles = useMemo(() => {
    if (!vehicle) return [];
    return vehicles
      .filter(
        (v) =>
          v.id !== vehicle.id &&
          v.status === 'available' &&
          (v.make === vehicle.make || v.bodyType === vehicle.bodyType)
      )
      .slice(0, 4);
  }, [vehicles, vehicle]);

  if (vehiclesLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="h-96 bg-white border border-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Car className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h1 className="font-display font-bold text-2xl text-slate-900 mb-2">
          Vehicle Listing Not Found
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          This listing may have been removed or its URL changed. Explore our live showroom inventory below.
        </p>
        <Link
          to="/cars"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl"
        >
          Browse All Cars
        </Link>
      </div>
    );
  }

  const saved = isInWishlist(vehicle.id);
  const images = vehicle.images || [];
  const mainImage = images[activeImageIdx] || images[0];

  const vehicleWhatsAppUrl = buildWhatsAppClickToChatUrl(
    formatWhatsAppEnquiryMessage({
      customerName: customerName || userProfile?.fullName || 'Prospective Buyer',
      customerPhone: customerPhone || userProfile?.phone || '',
      category: 'Vehicle Enquiry',
      preferredVehicle: `${vehicle.year} ${vehicle.name} (Ref: ${vehicle.referenceCode})`,
      budgetNgn: vehicle.priceNgn,
      paymentPreference,
      enquiryReference: enquirySuccessRef || vehicle.referenceCode,
      questions: message || `I am interested in the ${vehicle.year} ${vehicle.name}.`,
    }),
    settings.whatsappNumber
  );

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${vehicle.year} ${vehicle.name} — ${formatNaira(vehicle.priceNgn)}`,
          text: `Check out this ${vehicle.year} ${vehicle.name} at Car Depot by Ultimate Autos`,
          url: shareUrl,
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnquiryError(null);

    if (!user) {
      await loginWithGoogle();
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setEnquiryError('Please provide your full name and phone number.');
      return;
    }

    setSubmitting(true);
    const refCode = generateReference('CD');
    const enqId = `enq_${Date.now()}`;

    try {
      const notifyRes = await fetch('/api/whatsapp/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enquiryReference: refCode,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          category: 'car_purchase',
          preferredVehicle: `${vehicle.year} ${vehicle.name} (${vehicle.referenceCode})`,
          budgetNgn: vehicle.priceNgn,
          paymentPreference,
          message: message.trim() || `Enquiry for ${vehicle.year} ${vehicle.name}`,
        }),
      });
      const notifyData = await notifyRes.json();

      await setDoc(doc(db, 'enquiries', enqId), {
        referenceNumber: refCode,
        userId: user.uid,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || user.email || '',
        vehicleId: vehicle.id,
        vehicleName: `${vehicle.year} ${vehicle.name}`,
        category: 'car_purchase',
        budgetNgn: vehicle.priceNgn,
        paymentPreference,
        message: message.trim() || `Interested in ${vehicle.year} ${vehicle.name} (${vehicle.referenceCode})`,
        source: 'website',
        status: 'new',
        whatsappNotificationStatus: notifyData.status || 'not_configured',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setEnquirySuccessRef(refCode);
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.CREATE, `enquiries/${enqId}`);
      }
      setEnquiryError(err?.message || 'Could not submit enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: `${vehicle.year} ${vehicle.name}`,
    brand: { '@type': 'Brand', name: vehicle.make },
    model: vehicle.model,
    vehicleModelDate: String(vehicle.year),
    mileageFromOdometer: {
      '@type': 'QuantitativeValue',
      value: vehicle.mileageKm,
      unitCode: 'KMT',
    },
    fuelType: vehicle.fuelType,
    vehicleTransmission: vehicle.transmission,
    bodyType: vehicle.bodyType,
    description: vehicle.description,
    image: vehicle.images,
    offers: {
      '@type': 'Offer',
      price: vehicle.priceNgn,
      priceCurrency: 'NGN',
      availability:
        vehicle.status === 'available'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-8">
      <SeoHead
        title={`${vehicle.year} ${vehicle.name} for Sale in ${vehicle.location} | Car Depot`}
        description={`${vehicle.condition} ${vehicle.year} ${vehicle.name} (${formatNumber(
          vehicle.mileageKm
        )} km, ${vehicle.transmission}) listed at ${formatNaira(
          vehicle.priceNgn
        )} by Car Depot by Ultimate Autos.`}
        jsonLd={jsonLd}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/cars"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-800"
            >
              <Share2 className="w-3.5 h-3.5" />
              {shareCopied ? 'Link Copied' : 'Share'}
            </button>
            <button
              type="button"
              onClick={() => toggleWishlist(vehicle)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                saved
                  ? 'bg-red-600 border-red-600 text-white'
                  : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        {/* Main Detail Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left: Photo Gallery + Specs + Description */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="relative aspect-[16/10] bg-slate-900">
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={`${vehicle.year} ${vehicle.name}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <Car className="w-12 h-12 mb-2" />
                    <span className="text-sm">{vehicle.year} {vehicle.name}</span>
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="p-3 flex gap-2 overflow-x-auto bg-slate-50 border-t border-slate-200">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveImageIdx(i)}
                      className={`w-20 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                        activeImageIdx === i ? 'border-red-600' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${i + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Specifications Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
              <h2 className="font-display font-bold text-lg text-slate-900 mb-4">
                Vehicle Specifications
              </h2>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                {[
                  { label: 'Reference Code', value: vehicle.referenceCode, mono: true },
                  { label: 'Make', value: vehicle.make },
                  { label: 'Model', value: vehicle.model },
                  { label: 'Year', value: String(vehicle.year), mono: true },
                  { label: 'Condition', value: vehicle.condition },
                  { label: 'Body Type', value: vehicle.bodyType },
                  { label: 'Transmission', value: vehicle.transmission },
                  { label: 'Fuel Type', value: vehicle.fuelType },
                  { label: 'Mileage', value: `${formatNumber(vehicle.mileageKm)} km`, mono: true },
                  { label: 'Engine Size', value: vehicle.engineSize || 'Standard' },
                  { label: 'Exterior Color', value: vehicle.exteriorColor || 'Not specified' },
                  { label: 'Location', value: vehicle.location },
                ].map((spec) => (
                  <div key={spec.label} className="pb-3 border-b border-slate-100">
                    <dt className="text-xs text-slate-500">{spec.label}</dt>
                    <dd
                      className={`font-semibold text-slate-900 mt-0.5 ${
                        spec.mono ? 'font-mono-num' : ''
                      }`}
                    >
                      {spec.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Description */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
              <h2 className="font-display font-bold text-lg text-slate-900 mb-3">
                Dealership Description
              </h2>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                {vehicle.description}
              </p>
            </div>
          </div>

          {/* Right: Contiguous Purchase, Financing & Enquiry Column */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-mono-num text-slate-500 mb-1">
                    Ref: {vehicle.referenceCode} · {vehicle.status.toUpperCase()}
                  </p>
                  <h1 className="font-display font-bold text-2xl text-slate-900">
                    {vehicle.year} {vehicle.name}
                  </h1>
                </div>
                {vehicle.verified && (
                  <BadgeCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                )}
              </div>

              <div className="flex items-baseline gap-3">
                <span className="font-mono-num font-bold text-3xl text-red-600">
                  {formatNaira(vehicle.priceNgn)}
                </span>
                {vehicle.previousPriceNgn && vehicle.previousPriceNgn > vehicle.priceNgn && (
                  <span className="font-mono-num text-sm text-slate-400 line-through">
                    {formatNaira(vehicle.previousPriceNgn)}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                {vehicle.location} · Listed by {settings.businessName}
              </p>

              {/* Direct Contact Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <a
                  href={vehicleWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp Enquiry
                </a>
                <a
                  href={`tel:${settings.phoneNumber.replace(/\s+/g, '')}`}
                  className="inline-flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call Dealership
                </a>
              </div>

              {/* Financing & Save to Own Shortcuts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                {vehicle.financingAvailable && (
                  <Link
                    to={`/financing?vehicleId=${encodeURIComponent(vehicle.id)}`}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-xl transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    Apply for Financing
                  </Link>
                )}
                {vehicle.saveToOwnAvailable && (
                  <Link
                    to={`/save-to-own?vehicleId=${encodeURIComponent(vehicle.id)}`}
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 text-xs font-semibold rounded-xl transition-colors"
                  >
                    <PiggyBank className="w-4 h-4" />
                    Start Save to Own
                  </Link>
                )}
              </div>
            </div>

            {/* Enquiry Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
              <h2 className="font-display font-bold text-base text-slate-900 mb-3">
                Submit Vehicle Enquiry
              </h2>

              {enquirySuccessRef ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    Enquiry Logged — Ref: <span className="font-mono-num">{enquirySuccessRef}</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Your enquiry has been saved to your dashboard. You can also send it directly on WhatsApp for immediate sales response.
                  </p>
                  <a
                    href={vehicleWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-600 text-white text-xs font-semibold rounded-lg"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Send Pre-Filled WhatsApp Message
                  </a>
                </div>
              ) : (
                <form onSubmit={handleEnquirySubmit} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone / WhatsApp Number (e.g. +234...)"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                  <select
                    value={paymentPreference}
                    onChange={(e) => setPaymentPreference(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Outright">Outright Purchase</option>
                    <option value="Financing">Buy Now Pay Later Financing</option>
                    <option value="Save to Own">Save to Own Plan</option>
                    <option value="Inspection">Book Vehicle Inspection</option>
                  </select>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Questions about this ${vehicle.year} ${vehicle.name}...`}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />

                  {enquiryError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                      {enquiryError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    {user
                      ? submitting
                        ? 'Submitting Enquiry...'
                        : 'Submit Enquiry'
                      : 'Sign in with Google & Submit Enquiry'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Similar Vehicles */}
        {similarVehicles.length > 0 && (
          <section className="pt-4">
            <h2 className="font-display font-bold text-xl text-slate-900 mb-4">
              Similar Vehicles
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
              {similarVehicles.map((v) => (
                <VehicleCard key={v.id} vehicle={v} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

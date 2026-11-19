import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatNaira, generateReference } from '../lib/format';
import { AuthPromptCard } from '../components/AuthPromptCard';
import { ImageUploader } from '../components/ImageUploader';
import { SeoHead } from '../components/SeoHead';

export function FinancingPage() {
  const { user, userProfile, vehicles } = useApp();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('vehicleId') || '';

  const eligibleVehicles = useMemo(
    () => vehicles.filter((v) => v.status === 'available' && v.financingAvailable),
    [vehicles]
  );

  const [vehicleId, setVehicleId] = useState(preselectedId);
  const selectedVehicle = useMemo(
    () => eligibleVehicles.find((v) => v.id === vehicleId) || eligibleVehicles[0] || null,
    [eligibleVehicles, vehicleId]
  );

  useEffect(() => {
    if (preselectedId) setVehicleId(preselectedId);
  }, [preselectedId]);

  const [fullName, setFullName] = useState(userProfile?.fullName || user?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState<
    'Employed' | 'Self-Employed' | 'Business Owner' | 'Corporate'
  >('Employed');
  const [employerName, setEmployerName] = useState('');
  const [monthlyIncomeNgn, setMonthlyIncomeNgn] = useState('');
  const [preferredDepositNgn, setPreferredDepositNgn] = useState('');
  const [repaymentMonths, setRepaymentMonths] = useState(12);
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  const [acceptedDisclosure, setAcceptedDisclosure] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setFullName((prev) => prev || userProfile.fullName);
      setPhone((prev) => prev || userProfile.phone || '');
      setEmail((prev) => prev || userProfile.email);
    }
  }, [userProfile]);

  const estimatedPrincipal = useMemo(() => {
    if (!selectedVehicle) return 0;
    const dep = Math.max(0, Number(preferredDepositNgn || 0));
    return Math.max(0, selectedVehicle.priceNgn - dep);
  }, [selectedVehicle, preferredDepositNgn]);

  const illustrativeMonthly = useMemo(() => {
    if (!estimatedPrincipal || !repaymentMonths) return 0;
    return Math.round(estimatedPrincipal / repaymentMonths);
  }, [estimatedPrincipal, repaymentMonths]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) return;
    if (!selectedVehicle) {
      setError('Please select an eligible vehicle first.');
      return;
    }
    if (!acceptedDisclosure) {
      setError('You must acknowledge the dealership financing review and disclosure terms.');
      return;
    }

    const appId = `fin_${Date.now()}`;
    const refCode = generateReference('FIN');
    setSubmitting(true);

    try {
      await setDoc(doc(db, 'financingApplications', appId), {
        referenceNumber: refCode,
        userId: user.uid,
        vehicleId: selectedVehicle.id,
        vehicleName: `${selectedVehicle.year} ${selectedVehicle.name}`,
        vehiclePriceNgn: selectedVehicle.priceNgn,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        residentialAddress: residentialAddress.trim(),
        employmentStatus,
        employerName: employerName.trim(),
        monthlyIncomeNgn: Number(monthlyIncomeNgn || 0),
        preferredDepositNgn: Number(preferredDepositNgn || 0),
        repaymentMonths: Number(repaymentMonths),
        documentUrls,
        acceptedDisclosure: true,
        status: 'submitted',
        approvedDepositNgn: 0,
        approvedMonthlyPaymentNgn: 0,
        approvedMonths: 0,
        depositRecordedNgn: 0,
        repaymentSchedule: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'users', user.uid, 'notifications', `notif_${Date.now()}`), {
        userId: user.uid,
        title: 'Financing Application Received',
        message: `Application ${refCode} for ${selectedVehicle.year} ${selectedVehicle.name} has been submitted for dealership review.`,
        category: 'financing',
        referenceNumber: refCode,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      setSubmittedRef(refCode);
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        if (selectedVehicle.isSampleInventory) {
          setError(
            'This vehicle listing is currently syncing with dealership inventory. Please contact our sales desk on WhatsApp or try again shortly.'
          );
          return;
        }
        handleFirestoreError(err, OperationType.CREATE, `financingApplications/${appId}`);
      }
      setError(err?.message || 'Unable to submit financing application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <SeoHead
        title="Car Financing in Lagos | Buy Now Pay Later | Car Depot by Ultimate Autos"
        description="Apply for structured Buy Now Pay Later car financing in Lagos, Nigeria. Select your preferred deposit and repayment tenure subject to dealership approval."
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="bg-[#0B0D10] text-white rounded-2xl p-6 sm:p-8 border border-slate-800">
          <div className="flex items-center gap-2 text-red-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <CreditCard className="w-4 h-4" />
            Buy Now Pay Later
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl mb-2">
            Car Financing Application
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Submit your personal, employment, and proposed repayment details for a financing-eligible vehicle. All applications undergo dealership eligibility review—financing is never automatically approved.
          </p>
        </div>

        {!user ? (
          <AuthPromptCard
            title="Sign in to Apply for Car Financing"
            description="Sign in with your Google account so you can upload supporting documents, receive an application reference number, and track dealership review updates."
          />
        ) : submittedRef ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="font-display font-bold text-2xl text-slate-900">
              Application Submitted for Review
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Your Buy Now Pay Later application reference is{' '}
              <span className="font-mono-num font-bold text-slate-900">{submittedRef}</span>. Our credit and sales team will review your documents and update your status in your dashboard.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/dashboard?tab=financing"
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl"
              >
                Track in My Dashboard
              </Link>
              <Link
                to="/cars"
                className="px-5 py-2.5 border border-slate-300 text-slate-800 text-sm font-semibold rounded-xl"
              >
                Browse More Cars
              </Link>
            </div>
          </div>
        ) : eligibleVehicles.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
            <h2 className="font-display font-bold text-lg text-slate-900">
              No Financing-Eligible Vehicles Listed Yet
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Once our dealership publishes vehicles marked eligible for Buy Now Pay Later, you can select them directly here. Need financing for a specific car now? Request a custom quotation.
            </p>
            <Link
              to="/request-car"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl"
            >
              Request Financing Quotation
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6">
              {/* Step 1: Select Vehicle */}
              <div className="space-y-3">
                <h2 className="font-display font-bold text-base text-slate-900">
                  01. Select Financing-Eligible Vehicle
                </h2>
                <select
                  value={selectedVehicle?.id || ''}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {eligibleVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.year} {v.name} — {formatNaira(v.priceNgn)} ({v.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Personal Information */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h2 className="font-display font-bold text-base text-slate-900">
                  02. Personal Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Legal Name"
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
                  <input
                    type="text"
                    required
                    value={residentialAddress}
                    onChange={(e) => setResidentialAddress(e.target.value)}
                    placeholder="Residential Address in Nigeria"
                    className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Step 3: Employment & Repayment Proposal */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h2 className="font-display font-bold text-base text-slate-900">
                  03. Employment &amp; Proposed Terms
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={employmentStatus}
                    onChange={(e) => setEmploymentStatus(e.target.value as any)}
                    className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Employed">Salaried / Employed</option>
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Business Owner">Business Owner</option>
                    <option value="Corporate">Corporate Fleet</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={employerName}
                    onChange={(e) => setEmployerName(e.target.value)}
                    placeholder="Employer or Business Name"
                    className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
                  />
                  <input
                    type="number"
                    required
                    min={0}
                    value={monthlyIncomeNgn}
                    onChange={(e) => setMonthlyIncomeNgn(e.target.value)}
                    placeholder="Monthly Income (₦)"
                    className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono-num"
                  />
                  <input
                    type="number"
                    required
                    min={0}
                    value={preferredDepositNgn}
                    onChange={(e) => setPreferredDepositNgn(e.target.value)}
                    placeholder="Preferred Initial Deposit (₦)"
                    className="px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono-num"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Proposed Repayment Duration
                  </label>
                  <select
                    value={repaymentMonths}
                    onChange={(e) => setRepaymentMonths(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {[6, 12, 18, 24, 36].map((m) => (
                      <option key={m} value={m}>
                        {m} Months
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 4: Supporting Documents */}
              <div className="pt-4 border-t border-slate-100">
                <ImageUploader
                  label="04. Supporting Documents (Valid ID, Bank Statement, Proof of Income)"
                  urls={documentUrls}
                  onChange={setDocumentUrls}
                  maxFiles={6}
                  folder="car-depot/financing-docs"
                  accept="image/*,application/pdf"
                  helperText="Upload clear photos or PDFs of your ID and income verification."
                />
              </div>

              {/* Mandatory Disclosure */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedDisclosure}
                    onChange={(e) => setAcceptedDisclosure(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-red-600"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    I confirm that all submitted details are accurate and acknowledge the{' '}
                    <Link to="/policies/financing-terms" className="underline text-red-600">
                      Car Depot Financing Terms
                    </Link>
                    . All applications are strictly subject to dealership verification, credit checks, and formal approval.
                  </span>
                </label>
              </div>

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
                {submitting ? 'Submitting Application...' : 'Submit Financing Application'}
              </button>
            </div>

            {/* Right Summary Box */}
            {selectedVehicle && (
              <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 lg:sticky lg:top-20">
                <div className="flex items-center gap-2 text-slate-900 font-display font-bold text-base">
                  <ShieldCheck className="w-5 h-5 text-red-600" />
                  Application Summary
                </div>
                <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vehicle</span>
                    <span className="font-semibold text-right">
                      {selectedVehicle.year} {selectedVehicle.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vehicle Price</span>
                    <span className="font-mono-num font-bold text-slate-900">
                      {formatNaira(selectedVehicle.priceNgn)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Proposed Deposit</span>
                    <span className="font-mono-num font-semibold text-slate-900">
                      {formatNaira(Number(preferredDepositNgn || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Principal Balance</span>
                    <span className="font-mono-num font-semibold text-slate-900">
                      {formatNaira(estimatedPrincipal)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-100">
                    <span className="text-slate-600">Indicative Monthly Base</span>
                    <span className="font-mono-num font-bold text-red-600">
                      {formatNaira(illustrativeMonthly)} / mo
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  *Indicative base excludes dealership interest/service fees. Final approved deposit, interest rate, and repayment schedule are issued solely by Car Depot Administration upon approval.
                </p>
              </aside>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

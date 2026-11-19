import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  PiggyBank,
  ShieldCheck,
} from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatNaira, generateReference } from '../lib/format';
import { AuthPromptCard } from '../components/AuthPromptCard';
import { SeoHead } from '../components/SeoHead';

export function SaveToOwnPage() {
  const { user, vehicles } = useApp();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('vehicleId') || '';

  const eligibleVehicles = useMemo(
    () => vehicles.filter((v) => v.status === 'available' && v.saveToOwnAvailable),
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

  const [durationMonths, setDurationMonths] = useState(12);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRef, setCreatedRef] = useState<string | null>(null);

  const totalInstallments = frequency === 'weekly' ? durationMonths * 4 : durationMonths;
  const suggestedContribution = useMemo(() => {
    if (!selectedVehicle || !totalInstallments) return 0;
    return Math.ceil(selectedVehicle.priceNgn / totalInstallments);
  }, [selectedVehicle, totalInstallments]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user || !selectedVehicle) return;
    if (!agreedToTerms) {
      setError('Please read and accept the Save to Own Agreement, Refund, and Price-Lock policies.');
      return;
    }

    setCreating(true);
    const planId = `sav_${Date.now()}`;
    const refCode = generateReference('SAV');

    try {
      await setDoc(doc(db, 'savingsPlans', planId), {
        referenceNumber: refCode,
        userId: user.uid,
        vehicleId: selectedVehicle.id,
        vehicleName: `${selectedVehicle.year} ${selectedVehicle.name}`,
        targetPriceNgn: selectedVehicle.priceNgn,
        priceLocked: false,
        durationMonths,
        frequency,
        suggestedContributionNgn: suggestedContribution,
        confirmedPaidNgn: 0,
        pendingPaidNgn: 0,
        agreedToTerms: true,
        status: 'active',
        nextReminderDate: new Date(Date.now() + (frequency === 'weekly' ? 7 : 30) * 86400000)
          .toISOString()
          .slice(0, 10),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'users', user.uid, 'notifications', `notif_${Date.now()}`), {
        userId: user.uid,
        title: 'Save to Own Plan Created',
        message: `Your ${frequency} savings plan ${refCode} for ${selectedVehicle.year} ${selectedVehicle.name} is active. Make your first contribution in your dashboard.`,
        category: 'savings',
        referenceNumber: refCode,
        isRead: false,
        createdAt: serverTimestamp(),
      });

      setCreatedRef(refCode);
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        if (selectedVehicle.isSampleInventory) {
          setError(
            'This vehicle listing is currently syncing with dealership inventory. Please contact our sales desk on WhatsApp or try again shortly.'
          );
          return;
        }
        handleFirestoreError(err, OperationType.CREATE, `savingsPlans/${planId}`);
      }
      setError(err?.message || 'Unable to start Save to Own plan.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <SeoHead
        title="Save to Own (Pay Small Small) | Car Depot by Ultimate Autos"
        description="Save weekly or monthly towards owning your car in Nigeria. Transparent progress tracking, verified receipts, price-lock, and refund policies."
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="bg-[#0B0D10] text-white rounded-2xl p-6 sm:p-8 border border-slate-800">
          <div className="flex items-center gap-2 text-red-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <PiggyBank className="w-4 h-4" />
            Pay Small Small
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl mb-2">
            Save to Own Plan
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Choose a vehicle, set your weekly or monthly contribution schedule, and track your verified savings balance in your dashboard. All contributions are verified by Car Depot accounts before updating confirmed balances.
          </p>
        </div>

        {!user ? (
          <AuthPromptCard
            title="Sign in to Start a Save to Own Plan"
            description="Sign in with Google to configure your savings target, make contributions, upload receipts, and track your progress bar."
          />
        ) : createdRef ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h2 className="font-display font-bold text-2xl text-slate-900">
              Save to Own Plan Created
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Plan Reference:{' '}
              <span className="font-mono-num font-bold text-slate-900">{createdRef}</span>. Head to your dashboard to make contributions, upload payment receipts, and monitor your progress bar.
            </p>
            <Link
              to="/dashboard?tab=savings"
              className="inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl"
            >
              Open My Savings Dashboard
            </Link>
          </div>
        ) : eligibleVehicles.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
            <h2 className="font-display font-bold text-lg text-slate-900">
              No Save to Own Vehicles Published Yet
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Once our team publishes vehicles eligible for Save to Own, you can enroll directly here. You can also request a Car Quotation for a vehicle you want to save toward.
            </p>
            <Link
              to="/request-car"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl"
            >
              Request a Vehicle Quotation
            </Link>
          </div>
        ) : (
          <form onSubmit={handleCreatePlan} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  1. Select Vehicle
                </label>
                <select
                  value={selectedVehicle?.id || ''}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {eligibleVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.year} {v.name} — {formatNaira(v.priceNgn)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    2. Savings Duration
                  </label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {[3, 6, 9, 12, 18, 24].map((m) => (
                      <option key={m} value={m}>
                        {m} Months
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    3. Contribution Frequency
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['weekly', 'monthly'] as const).map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setFrequency(freq)}
                        className={`py-2.5 px-3 text-sm font-semibold rounded-lg border capitalize transition-colors ${
                          frequency === freq
                            ? 'bg-[#0B0D10] text-white border-[#0B0D10]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mandatory Policy Disclosures */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-700 leading-relaxed">
                <h3 className="font-display font-bold text-sm text-slate-900">
                  Save to Own Policy Summary
                </h3>
                <p>
                  <strong>Payment Verification:</strong> All deposits and receipts uploaded are verified by Car Depot Accounts before your confirmed balance increases.
                </p>
                <p>
                  <strong>Price-Lock Policy:</strong> Vehicle pricing is only locked upon achieving the dealership&apos;s qualifying deposit milestone and written confirmation from Administration.
                </p>
                <p>
                  <strong>If Vehicle Becomes Unavailable:</strong> If the specific unit is sold prior to price-lock, 100% of your confirmed balance may be transferred to an equivalent vehicle or refunded per our Refund Policy.
                </p>
                <p>
                  <strong>Refund Policy:</strong> Full details are published in our{' '}
                  <Link to="/policies/save-to-own-terms" className="underline text-red-600">
                    Save to Own Terms
                  </Link>{' '}
                  and{' '}
                  <Link to="/policies/refund-policy" className="underline text-red-600">
                    Refund Policy
                  </Link>
                  .
                </p>

                <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-red-600"
                  />
                  <span className="font-medium text-slate-900">
                    I agree to the Save to Own Agreement, Refund Policy, Price-Lock Policy, and Vehicle Replacement Terms.
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
                disabled={creating}
                className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {creating ? 'Creating Savings Plan...' : 'Activate Save to Own Plan'}
              </button>
            </div>

            {selectedVehicle && (
              <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 font-display font-bold text-base text-slate-900">
                  <ShieldCheck className="w-5 h-5 text-red-600" />
                  Savings Plan Calculator
                </div>
                <div className="space-y-3 text-sm pt-2 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target Vehicle</span>
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
                    <span className="text-slate-500">Schedule</span>
                    <span className="font-semibold capitalize">
                      {totalInstallments} {frequency === 'weekly' ? 'Weeks' : 'Months'}
                    </span>
                  </div>
                  <div className="bg-slate-900 text-white rounded-xl p-4 mt-2">
                    <p className="text-xs text-slate-400">
                      Suggested {frequency} contribution
                    </p>
                    <p className="font-mono-num font-bold text-2xl text-white mt-1">
                      {formatNaira(suggestedContribution)}
                    </p>
                  </div>
                </div>
              </aside>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

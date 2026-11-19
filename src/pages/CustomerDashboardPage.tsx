import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bell,
  Car,
  CreditCard,
  Heart,
  LogOut,
  MessageSquare,
  PiggyBank,
  Receipt,
  Settings as SettingsIcon,
  Sparkles,
  UploadCloud,
  User as UserIcon,
} from 'lucide-react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatNaira, generateReference } from '../lib/format';
import {
  CarQuotation,
  ChatConversation,
  Enquiry,
  FinancingApplication,
  PaymentRecord,
  SavingsPlan,
  VehicleSubmission,
} from '../types';
import { AuthPromptCard } from '../components/AuthPromptCard';
import { VehicleCard } from '../components/VehicleCard';
import { ImageUploader } from '../components/ImageUploader';
import { SeoHead } from '../components/SeoHead';

type TabId =
  | 'overview'
  | 'wishlist'
  | 'savings'
  | 'financing'
  | 'payments'
  | 'enquiries'
  | 'submissions'
  | 'quotations'
  | 'notifications'
  | 'chats'
  | 'settings';

export function CustomerDashboardPage() {
  const {
    user,
    userProfile,
    authReady,
    vehicles,
    wishlist,
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    logout,
  } = useApp();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabId) || 'overview';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [financingApps, setFinancingApps] = useState<FinancingApplication[]>([]);
  const [savingsPlans, setSavingsPlans] = useState<SavingsPlan[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [submissions, setSubmissions] = useState<VehicleSubmission[]>([]);
  const [quotations, setQuotations] = useState<CarQuotation[]>([]);
  const [chats, setChats] = useState<ChatConversation[]>([]);

  // Profile Settings State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [profileSaved, setProfileSaved] = useState(false);

  // Payment Contribution Modal State
  const [payingPlan, setPayingPlan] = useState<SavingsPlan | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'bank_transfer' | 'paystack'>('bank_transfer');
  const [receiptUrls, setReceiptUrls] = useState<string[]>([]);
  const [payStatusMsg, setPayStatusMsg] = useState<string | null>(null);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [paystackConfigured, setPaystackConfigured] = useState(false);

  const [paystackVerifyMsg, setPaystackVerifyMsg] = useState<string | null>(null);
  const [payingFinancingApp, setPayingFinancingApp] = useState<FinancingApplication | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabId | null;
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  useEffect(() => {
    const refParam = searchParams.get('reference') || searchParams.get('trxref');
    if (!refParam) return;
    fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference: refParam }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.verified) {
          setPaystackVerifyMsg(
            `Payment ${data.reference} (${formatNaira(data.amountNgn)}) verified by Paystack. Accounts Admin will finalize allocation.`
          );
          setActiveTab('payments');
        } else {
          setPaystackVerifyMsg(
            data.error || `Transaction ${refParam} could not be verified (${data.status || 'unverified'}).`
          );
        }
      })
      .catch(() => {
        setPaystackVerifyMsg('Unable to verify online payment at this moment.');
      });
  }, [searchParams]);

  useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.fullName);
      setPhone(userProfile.phone || '');
      setLocation(userProfile.location || '');
      setWhatsappOptIn(userProfile.whatsappOptIn ?? true);
      setEmailNotifications(userProfile.emailNotifications ?? true);
    }
  }, [userProfile]);

  useEffect(() => {
    fetch('/api/payments/status')
      .then((r) => r.json())
      .then((d) => setPaystackConfigured(Boolean(d.configured)))
      .catch(() => setPaystackConfigured(false));
  }, []);

  // Subscribe to all customer-owned collections cleanly
  useEffect(() => {
    if (!authReady || !user) return;

    const unsubs: Array<() => void> = [];

    const bind = <T,>(colName: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
      const q = query(
        collection(db, colName),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      unsubs.push(
        onSnapshot(
          q,
          (snap) => {
            setter(
              snap.docs.map((d) => {
                const data = d.data();
                return {
                  ...data,
                  id: d.id,
                  createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
                  updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
                } as T;
              })
            );
          },
          (err) => handleFirestoreError(err, OperationType.LIST, colName)
        )
      );
    };

    bind<Enquiry>('enquiries', setEnquiries);
    bind<FinancingApplication>('financingApplications', setFinancingApps);
    bind<SavingsPlan>('savingsPlans', setSavingsPlans);
    bind<PaymentRecord>('payments', setPayments);
    bind<VehicleSubmission>('vehicleSubmissions', setSubmissions);
    bind<CarQuotation>('quotations', setQuotations);
    bind<ChatConversation>('chatConversations', setChats);

    return () => unsubs.forEach((u) => u());
  }, [authReady, user]);

  const savedVehicleObjects = vehicles.filter((v) =>
    wishlist.some((w) => w.vehicleId === v.id)
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        fullName: fullName.trim(),
        phone: phone.trim(),
        location: location.trim(),
        whatsappOptIn,
        emailNotifications,
        updatedAt: serverTimestamp(),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleSubmitContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!payingPlan && !payingFinancingApp)) return;
    setPayStatusMsg(null);

    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      setPayStatusMsg('Please enter a valid payment amount in Naira.');
      return;
    }
    if (payMethod === 'bank_transfer' && receiptUrls.length === 0) {
      setPayStatusMsg('Please upload or attach your bank transfer receipt URL.');
      return;
    }

    setPaySubmitting(true);
    const paymentId = `pay_${Date.now()}`;
    const refCode = generateReference('PAY');
    const relatedType = payingPlan
      ? 'savings'
      : payingFinancingApp && (payingFinancingApp.depositRecordedNgn || 0) < (payingFinancingApp.approvedDepositNgn || 0)
      ? 'financing_deposit'
      : 'financing_installment';
    const relatedId = payingPlan ? payingPlan.id : payingFinancingApp!.id;
    const relatedLabel = payingPlan
      ? `${payingPlan.vehicleName} (${payingPlan.referenceNumber})`
      : `${payingFinancingApp!.vehicleName} (${payingFinancingApp!.referenceNumber})`;

    try {
      let gatewayReference = '';
      if (payMethod === 'paystack') {
        const initRes = await fetch('/api/payments/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            amountNgn: amount,
            reference: refCode,
            callbackUrl: window.location.href,
            metadata: { relatedId, relatedType, userId: user.uid },
          }),
        });
        const initData = await initRes.json();
        if (!initRes.ok || !initData.configured) {
          throw new Error(initData.error || 'Paystack gateway is not configured.');
        }
        gatewayReference = initData.reference;
        await setDoc(doc(db, 'payments', paymentId), {
          referenceNumber: refCode,
          userId: user.uid,
          relatedType,
          relatedId,
          amountNgn: amount,
          method: 'paystack',
          gatewayReference,
          status: 'pending_verification',
          notes: `Initialized Paystack payment for ${relatedLabel}.`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        window.location.assign(initData.authorizationUrl);
        return;
      }

      // Bank transfer receipt submission (pending admin verification)
      await setDoc(doc(db, 'payments', paymentId), {
        referenceNumber: refCode,
        userId: user.uid,
        relatedType,
        relatedId,
        amountNgn: amount,
        method: 'bank_transfer',
        receiptUrl: receiptUrls[0],
        status: 'pending_verification',
        notes: `Bank transfer payment for ${relatedLabel}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (payingPlan) {
        await updateDoc(doc(db, 'savingsPlans', payingPlan.id), {
          pendingPaidNgn: Number(payingPlan.pendingPaidNgn || 0) + amount,
          updatedAt: serverTimestamp(),
        });
      }

      setPayStatusMsg(
        `Receipt ${refCode} submitted! Your confirmed balance will update once our Accounts Admin verifies the transfer.`
      );
      setReceiptUrls([]);
      setPayAmount('');
    } catch (err: any) {
      setPayStatusMsg(err?.message || 'Unable to submit payment.');
    } finally {
      setPaySubmitting(false);
    }
  };

  const selectTab = (id: TabId) => {
    setActiveTab(id);
    setSearchParams({ tab: id });
  };

  if (!authReady) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="h-64 bg-white border border-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4">
        <SeoHead
          title="Customer Dashboard | Car Depot by Ultimate Autos"
          description="Sign in to view your saved vehicles, Save to Own plans, financing applications, quotations, and enquiries."
        />
        <AuthPromptCard />
      </div>
    );
  }

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: <UserIcon className="w-4 h-4" /> },
    { id: 'wishlist', label: 'Saved Cars', icon: <Heart className="w-4 h-4" />, count: wishlist.length },
    { id: 'savings', label: 'Save to Own', icon: <PiggyBank className="w-4 h-4" />, count: savingsPlans.length },
    { id: 'financing', label: 'Financing', icon: <CreditCard className="w-4 h-4" />, count: financingApps.length },
    { id: 'payments', label: 'Payments', icon: <Receipt className="w-4 h-4" />, count: payments.length },
    { id: 'enquiries', label: 'Enquiries', icon: <MessageSquare className="w-4 h-4" />, count: enquiries.length },
    { id: 'submissions', label: 'My Cars Sold', icon: <UploadCloud className="w-4 h-4" />, count: submissions.length },
    { id: 'quotations', label: 'Quotations', icon: <Sparkles className="w-4 h-4" />, count: quotations.length },
    { id: 'notifications', label: 'Alerts', icon: <Bell className="w-4 h-4" />, count: unreadNotificationsCount },
    { id: 'chats', label: 'AI Chats', icon: <Car className="w-4 h-4" />, count: chats.length },
    { id: 'settings', label: 'Profile', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-8">
      <SeoHead
        title="My Account Dashboard | Car Depot by Ultimate Autos"
        description="Track your vehicles, Save to Own plans, car financing applications, and payments."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Account Header */}
        <div className="bg-[#0B0D10] text-white rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400">Customer Dashboard</p>
            <h1 className="font-display font-bold text-xl sm:text-2xl">
              {userProfile?.fullName || user.displayName || 'Car Depot Member'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg border border-slate-700 self-start sm:self-auto"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {paystackVerifyMsg && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-800">
            {paystackVerifyMsg}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                activeTab === tab.id
                  ? 'bg-red-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className="font-mono-num opacity-80">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Saved Vehicles', value: wishlist.length, tab: 'wishlist' as TabId },
              { label: 'Active Save to Own', value: savingsPlans.length, tab: 'savings' as TabId },
              { label: 'Financing Applications', value: financingApps.length, tab: 'financing' as TabId },
              { label: 'Quotations & Enquiries', value: quotations.length + enquiries.length, tab: 'enquiries' as TabId },
            ].map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={() => selectTab(card.tab)}
                className="bg-white border border-slate-200 hover:border-red-500 rounded-2xl p-5 text-left transition-colors"
              >
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className="font-mono-num font-bold text-2xl text-slate-900 mt-1">
                  {card.value}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* WISHLIST */}
        {activeTab === 'wishlist' && (
          <div className="space-y-4">
            <h2 className="font-display font-bold text-lg text-slate-900">Saved Vehicles</h2>
            {savedVehicleObjects.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-600">
                No vehicles saved yet. Browse the{' '}
                <Link to="/cars" className="text-red-600 font-semibold underline">
                  Marketplace
                </Link>{' '}
                and tap the heart icon on cars you like.
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {savedVehicleObjects.map((v) => (
                  <VehicleCard key={v.id} vehicle={v} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SAVE TO OWN */}
        {activeTab === 'savings' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-slate-900">
                My Save to Own Plans
              </h2>
              <Link
                to="/save-to-own"
                className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg"
              >
                New Plan
              </Link>
            </div>

            {savingsPlans.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-600">
                You have no Save to Own plans yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {savingsPlans.map((plan) => {
                  const pct = Math.min(
                    100,
                    Math.round((plan.confirmedPaidNgn / Math.max(1, plan.targetPriceNgn)) * 100)
                  );
                  const outstanding = Math.max(0, plan.targetPriceNgn - plan.confirmedPaidNgn);
                  return (
                    <div
                      key={plan.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-mono-num text-slate-500">
                            {plan.referenceNumber} · {plan.status.toUpperCase()}
                          </p>
                          <h3 className="font-display font-bold text-base text-slate-900">
                            {plan.vehicleName}
                          </h3>
                        </div>
                        <span className="font-mono-num text-sm font-bold text-red-600">
                          {pct}%
                        </span>
                      </div>

                      {/* Savings Progress Bar */}
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-600 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">Confirmed Paid</p>
                          <p className="font-mono-num font-bold text-emerald-700">
                            {formatNaira(plan.confirmedPaidNgn)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Pending Review</p>
                          <p className="font-mono-num font-semibold text-amber-700">
                            {formatNaira(plan.pendingPaidNgn)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Outstanding</p>
                          <p className="font-mono-num font-bold text-slate-900">
                            {formatNaira(outstanding)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                        <span className="text-slate-600">
                          Suggested: <strong className="font-mono-num">{formatNaira(plan.suggestedContributionNgn)}</strong> / {plan.frequency}
                          {plan.nextReminderDate ? ` · Next: ${plan.nextReminderDate}` : ''}
                        </span>
                        <div className="flex items-center gap-2">
                          {plan.status === 'active' && (
                            <button
                              type="button"
                              onClick={() =>
                                updateDoc(doc(db, 'savingsPlans', plan.id), {
                                  status: 'refund_requested',
                                  updatedAt: serverTimestamp(),
                                })
                              }
                              className="px-3 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold rounded-lg"
                            >
                              Request Refund
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setPayingFinancingApp(null);
                              setPayingPlan(plan);
                              setPayAmount(String(plan.suggestedContributionNgn));
                              setPayStatusMsg(null);
                            }}
                            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
                          >
                            Make Contribution
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Contribution Submission Modal */}
            {payingPlan && (
              <div className="bg-white border border-slate-300 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Contribute to {payingPlan.vehicleName} ({payingPlan.referenceNumber})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setPayingPlan(null)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Close
                  </button>
                </div>

                <form onSubmit={handleSubmitContribution} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Amount (₦)
                      </label>
                      <input
                        type="number"
                        required
                        min={1000}
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Payment Method
                      </label>
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="bank_transfer">Bank Transfer (Upload Receipt)</option>
                        <option value="paystack" disabled={!paystackConfigured}>
                          Paystack Online {paystackConfigured ? '' : '(Not configured on server)'}
                        </option>
                      </select>
                    </div>
                  </div>

                  {payMethod === 'bank_transfer' && (
                    <ImageUploader
                      label="Upload Payment Receipt"
                      urls={receiptUrls}
                      onChange={setReceiptUrls}
                      maxFiles={1}
                      folder="car-depot/receipts"
                      accept="image/*,application/pdf"
                    />
                  )}

                  {payStatusMsg && (
                    <p className="text-xs text-slate-800 bg-slate-100 border border-slate-200 rounded-lg p-3">
                      {payStatusMsg}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={paySubmitting}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl"
                  >
                    {paySubmitting ? 'Submitting...' : 'Submit Contribution for Verification'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* FINANCING APPLICATIONS */}
        {activeTab === 'financing' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg text-slate-900">
                Financing Applications
              </h2>
              <Link
                to="/financing"
                className="px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg"
              >
                New Application
              </Link>
            </div>
            {financingApps.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-600">
                No financing applications submitted yet.
              </div>
            ) : (
              <div className="space-y-3">
                {financingApps.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-mono-num text-slate-500">
                          {app.referenceNumber} · Status: {app.status.replace('_', ' ').toUpperCase()}
                        </p>
                        <h3 className="font-display font-bold text-base text-slate-900">
                          {app.vehicleName} — {formatNaira(app.vehiclePriceNgn)}
                        </h3>
                      </div>
                      <span className="text-xs font-mono-num text-slate-600">
                        Proposed Deposit: {formatNaira(app.preferredDepositNgn)} ({app.repaymentMonths} mo)
                      </span>
                    </div>
                    {app.status === 'approved' && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900">
                        <span>
                          Approved Terms: Deposit {formatNaira(app.approvedDepositNgn)} · Monthly{' '}
                          {formatNaira(app.approvedMonthlyPaymentNgn)} for {app.approvedMonths} months · Recorded Deposit:{' '}
                          {formatNaira(app.depositRecordedNgn)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPayingPlan(null);
                            setPayingFinancingApp(app);
                            setPayAmount(
                              String(
                                (app.depositRecordedNgn || 0) < (app.approvedDepositNgn || 0)
                                  ? app.approvedDepositNgn - (app.depositRecordedNgn || 0)
                                  : app.approvedMonthlyPaymentNgn
                              )
                            );
                            setPayStatusMsg(null);
                          }}
                          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg"
                        >
                          Submit Deposit / Installment
                        </button>
                      </div>
                    )}
                    {app.adminRemarks && (
                      <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        Dealership Remarks: {app.adminRemarks}
                      </p>
                    )}
                  </div>
                ))}

                {payingFinancingApp && (
                  <div className="bg-white border border-slate-300 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold text-base text-slate-900">
                        Pay Deposit / Installment for {payingFinancingApp.vehicleName} ({payingFinancingApp.referenceNumber})
                      </h3>
                      <button
                        type="button"
                        onClick={() => setPayingFinancingApp(null)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                      >
                        Close
                      </button>
                    </div>
                    <form onSubmit={handleSubmitContribution} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="number"
                          required
                          min={1000}
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="Amount (₦)"
                          className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg font-mono-num"
                        />
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value as any)}
                          className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="bank_transfer">Bank Transfer (Upload Receipt)</option>
                          <option value="paystack" disabled={!paystackConfigured}>
                            Paystack Online {paystackConfigured ? '' : '(Not configured on server)'}
                          </option>
                        </select>
                      </div>
                      {payMethod === 'bank_transfer' && (
                        <ImageUploader
                          label="Upload Payment Receipt"
                          urls={receiptUrls}
                          onChange={setReceiptUrls}
                          maxFiles={1}
                          folder="car-depot/receipts"
                          accept="image/*,application/pdf"
                        />
                      )}
                      {payStatusMsg && (
                        <p className="text-xs text-slate-800 bg-slate-100 border border-slate-200 rounded-lg p-3">
                          {payStatusMsg}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={paySubmitting}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl"
                      >
                        {paySubmitting ? 'Submitting...' : 'Submit Payment for Verification'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <h2 className="font-display font-bold text-lg text-slate-900">Payment History</h2>
            {payments.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-600">
                No payment records yet.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                    <tr>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 px-4 font-mono-num text-xs">{p.referenceNumber}</td>
                        <td className="py-3 px-4 capitalize">{p.relatedType.replace('_', ' ')}</td>
                        <td className="py-3 px-4 capitalize">{p.method.replace('_', ' ')}</td>
                        <td className="py-3 px-4 font-mono-num font-semibold">
                          {formatNaira(p.amountNgn)}
                        </td>
                        <td className="py-3 px-4 capitalize text-xs font-semibold">
                          {p.status.replace('_', ' ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ENQUIRIES */}
        {activeTab === 'enquiries' && (
          <div className="space-y-3">
            <h2 className="font-display font-bold text-lg text-slate-900">Recent Enquiries</h2>
            {enquiries.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-600">
                No enquiries submitted yet.
              </div>
            ) : (
              enquiries.map((enq) => (
                <div key={enq.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="font-mono-num">{enq.referenceNumber}</span>
                    <span className="uppercase font-semibold">{enq.status}</span>
                  </div>
                  <p className="font-semibold text-sm text-slate-900">
                    {enq.vehicleName || enq.category.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-slate-600">{enq.message}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* SUBMITTED VEHICLES */}
        {activeTab === 'submissions' && (
          <div className="space-y-3">
            <h2 className="font-display font-bold text-lg text-slate-900">
              Submitted Vehicles (Sell Your Car)
            </h2>
            {submissions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-600">
                No vehicles submitted yet.
              </div>
            ) : (
              submissions.map((sub) => (
                <div key={sub.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="font-mono-num">{sub.referenceNumber}</span>
                    <span className="uppercase font-semibold">{sub.status.replace('_', ' ')}</span>
                  </div>
                  <p className="font-semibold text-sm text-slate-900">
                    {sub.year} {sub.make} {sub.model} ({sub.arrangement.replace('_', ' ')})
                  </p>
                  <p className="text-xs text-slate-600 font-mono-num">
                    Expected: {formatNaira(sub.expectedPriceNgn)}
                    {sub.proposedValuationNgn
                      ? ` · Dealership Valuation Offer: ${formatNaira(sub.proposedValuationNgn)}`
                      : ''}
                  </p>
                  {sub.adminOfferNotes && (
                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg">
                      {sub.adminOfferNotes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* QUOTATIONS */}
        {activeTab === 'quotations' && (
          <div className="space-y-3">
            <h2 className="font-display font-bold text-lg text-slate-900">Car Quotations</h2>
            {quotations.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-600">
                No quotation requests yet.
              </div>
            ) : (
              quotations.map((q) => (
                <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="font-mono-num">{q.referenceNumber}</span>
                    <span className="uppercase font-semibold">{q.status}</span>
                  </div>
                  <p className="font-semibold text-sm text-slate-900">
                    {q.preferredYear} {q.preferredBrand} {q.preferredModel} ({q.paymentPreference})
                  </p>
                  <p className="text-xs font-mono-num text-slate-600">
                    Budget: {formatNaira(q.budgetNgn)}
                    {q.quotedPriceNgn ? ` · Official Quote: ${formatNaira(q.quotedPriceNgn)}` : ''}
                  </p>
                  {q.adminQuoteNotes && (
                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg">
                      {q.adminQuoteNotes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            <h2 className="font-display font-bold text-lg text-slate-900">Notifications</h2>
            {notifications.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-600">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markNotificationRead(n.id)}
                  className={`border rounded-xl p-4 cursor-pointer transition-colors ${
                    n.isRead ? 'bg-white border-slate-200' : 'bg-red-50/40 border-red-200'
                  }`}
                >
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-900">{n.title}</span>
                    <span className="text-slate-500">{n.isRead ? 'Read' : 'Unread'}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* AI CHATS */}
        {activeTab === 'chats' && (
          <div className="space-y-3">
            <h2 className="font-display font-bold text-lg text-slate-900">AI Assistant History</h2>
            {chats.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-600">
                No saved AI assistant conversations yet.
              </div>
            ) : (
              chats.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="font-mono-num">{c.enquiryReference || c.sessionId}</span>
                    <span>{c.messages.length} messages</span>
                  </div>
                  <p className="text-xs text-slate-700">
                    {c.messages[c.messages.length - 1]?.text || 'Conversation logged'}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveProfile}
            className="bg-white border border-slate-200 rounded-2xl p-6 max-w-xl space-y-4"
          >
            <h2 className="font-display font-bold text-lg text-slate-900">
              Account Profile &amp; Preferences
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone / WhatsApp Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234..."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={whatsappOptIn}
                onChange={(e) => setWhatsappOptIn(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              Receive WhatsApp savings reminders &amp; enquiry updates
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              Receive email notifications
            </label>
            {profileSaved && (
              <p className="text-xs text-emerald-700 font-semibold">Profile settings saved.</p>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl"
            >
              Save Profile
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

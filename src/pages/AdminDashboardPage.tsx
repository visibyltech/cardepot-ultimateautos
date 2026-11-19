import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Car,
  Check,
  CreditCard,
  ExternalLink,
  MessageSquare,
  PiggyBank,
  Plus,
  Receipt,
  Settings,
  ShieldAlert,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatNaira, generateReference, slugifyVehicle } from '../lib/format';
import {
  CarQuotation,
  ChatConversation,
  Enquiry,
  FinancingApplication,
  PaymentRecord,
  SavingsPlan,
  Testimonial,
  UserProfile,
  Vehicle,
  VehicleSubmission,
  WhatsAppLog,
} from '../types';
import { AuthPromptCard } from '../components/AuthPromptCard';
import { ImageUploader } from '../components/ImageUploader';
import { SeoHead } from '../components/SeoHead';

type AdminTab =
  | 'overview'
  | 'vehicles'
  | 'financing'
  | 'payments'
  | 'submissions'
  | 'quotations'
  | 'enquiries'
  | 'chatbot'
  | 'customers'
  | 'settings';

export function AdminDashboardPage() {
  const {
    user,
    authReady,
    isAdmin,
    vehicles,
    settings,
    seedSampleInventory,
    clearSampleInventory,
  } = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const [financingApps, setFinancingApps] = useState<FinancingApplication[]>([]);
  const [savingsPlans, setSavingsPlans] = useState<SavingsPlan[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [submissions, setSubmissions] = useState<VehicleSubmission[]>([]);
  const [quotations, setQuotations] = useState<CarQuotation[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [allTestimonials, setAllTestimonials] = useState<Testimonial[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>([]);

  // Vehicle Editor State
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vName, setVName] = useState('');
  const [vMake, setVMake] = useState('');
  const [vModel, setVModel] = useState('');
  const [vYear, setVYear] = useState(2022);
  const [vPrice, setVPrice] = useState('');
  const [vPrevPrice, setVPrevPrice] = useState('');
  const [vLocation, setVLocation] = useState('Lekki, Lagos');
  const [vCondition, setVCondition] = useState<'Foreign Used' | 'Nigerian Used' | 'Brand New'>('Foreign Used');
  const [vTransmission, setVTransmission] = useState<'Automatic' | 'Manual' | 'CVT' | 'Semi-Automatic'>('Automatic');
  const [vFuel, setVFuel] = useState<'Petrol' | 'Diesel' | 'Hybrid' | 'Electric'>('Petrol');
  const [vBody, setVBody] = useState<'SUV' | 'Sedan' | 'Hatchback' | 'Coupe' | 'Pickup' | 'Bus' | 'Convertible' | 'Wagon'>('SUV');
  const [vMileage, setVMileage] = useState('45000');
  const [vEngine, setVEngine] = useState('');
  const [vColor, setVColor] = useState('');
  const [vDescription, setVDescription] = useState('');
  const [vImages, setVImages] = useState<string[]>([]);
  const [vVerified, setVVerified] = useState(true);
  const [vFeatured, setVFeatured] = useState(false);
  const [vFinancing, setVFinancing] = useState(true);
  const [vSaveToOwn, setVSaveToOwn] = useState(true);
  const [vStatus, setVStatus] = useState<'available' | 'reserved' | 'sold'>('available');
  const [vIsSample, setVIsSample] = useState(false);
  const [vSaving, setVSaving] = useState(false);
  const [sampleActionBusy, setSampleActionBusy] = useState(false);
  const [confirmClearSamples, setConfirmClearSamples] = useState(false);

  // Settings & Chatbot Editor State
  const [sForm, setSForm] = useState(settings);
  const [brandsInput, setBrandsInput] = useState(settings.popularBrands.join(', '));
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Testimonial Editor
  const [tName, setTName] = useState('');
  const [tLoc, setTLoc] = useState('Lagos');
  const [tCar, setTCar] = useState('');
  const [tQuote, setTQuote] = useState('');

  // Inline Valuation Offer, Quotation & Financing Approval State (no window.prompt)
  const [valuationTargetId, setValuationTargetId] = useState<string | null>(null);
  const [valuationAmount, setValuationAmount] = useState('');
  const [valuationNotes, setValuationNotes] = useState('');

  const [quotationTargetId, setQuotationTargetId] = useState<string | null>(null);
  const [quotationAmount, setQuotationAmount] = useState('');
  const [quotationNotes, setQuotationNotes] = useState('');

  const [financingEditId, setFinancingEditId] = useState<string | null>(null);
  const [finDeposit, setFinDeposit] = useState('');
  const [finMonths, setFinMonths] = useState('12');
  const [finRate, setFinRate] = useState('15');
  const [finRecordedDeposit, setFinRecordedDeposit] = useState('');
  const [finRemarks, setFinRemarks] = useState('');

  useEffect(() => {
    setSForm(settings);
    setBrandsInput(settings.popularBrands.join(', '));
  }, [settings]);

  useEffect(() => {
    if (!authReady || !user || !isAdmin) return;
    const unsubs: Array<() => void> = [];

    const bind = <T,>(col: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
      const q = query(collection(db, col), orderBy('createdAt', 'desc'));
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
          (err) => handleFirestoreError(err, OperationType.LIST, col)
        )
      );
    };

    bind<FinancingApplication>('financingApplications', setFinancingApps);
    bind<SavingsPlan>('savingsPlans', setSavingsPlans);
    bind<PaymentRecord>('payments', setPayments);
    bind<VehicleSubmission>('vehicleSubmissions', setSubmissions);
    bind<CarQuotation>('quotations', setQuotations);
    bind<Enquiry>('enquiries', setEnquiries);
    bind<ChatConversation>('chatConversations', setChats);
    bind<UserProfile>('users', setCustomers);
    bind<Testimonial>('testimonials', setAllTestimonials);
    bind<WhatsAppLog>('whatsappLogs', setWhatsappLogs);

    return () => unsubs.forEach((u) => u());
  }, [authReady, user, isAdmin]);

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
        <AuthPromptCard title="Admin Sign In Required" description="Sign in with an authorized administrator account to access Car Depot management tools." />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4">
        <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
          <h1 className="font-display font-bold text-xl text-slate-900">
            Administrator Access Restricted
          </h1>
          <p className="text-sm text-slate-600">
            Signed in as <span className="font-medium">{user.email}</span>. Only authorized Car Depot administrators can access this console.
          </p>
          <Link
            to="/dashboard"
            className="inline-block px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl"
          >
            Go to Customer Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const openNewVehicleForm = () => {
    setEditingVehicleId(null);
    setVName('');
    setVMake('');
    setVModel('');
    setVYear(2022);
    setVPrice('');
    setVPrevPrice('');
    setVLocation('Lekki, Lagos');
    setVCondition('Foreign Used');
    setVTransmission('Automatic');
    setVFuel('Petrol');
    setVBody('SUV');
    setVMileage('45000');
    setVEngine('');
    setVColor('');
    setVDescription('');
    setVImages([]);
    setVVerified(true);
    setVFeatured(false);
    setVFinancing(true);
    setVSaveToOwn(true);
    setVStatus('available');
    setVIsSample(false);
    setShowVehicleForm(true);
  };

  const openEditVehicle = (v: Vehicle) => {
    setEditingVehicleId(v.id);
    setVName(v.name);
    setVMake(v.make);
    setVModel(v.model);
    setVYear(v.year);
    setVPrice(String(v.priceNgn));
    setVPrevPrice(v.previousPriceNgn ? String(v.previousPriceNgn) : '');
    setVLocation(v.location);
    setVCondition(v.condition);
    setVTransmission(v.transmission);
    setVFuel(v.fuelType);
    setVBody(v.bodyType);
    setVMileage(String(v.mileageKm));
    setVEngine(v.engineSize || '');
    setVColor(v.exteriorColor || '');
    setVDescription(v.description);
    setVImages(v.images || []);
    setVVerified(v.verified);
    setVFeatured(v.featured);
    setVFinancing(v.financingAvailable);
    setVSaveToOwn(v.saveToOwnAvailable);
    setVStatus(v.status);
    setVIsSample(Boolean(v.isSampleInventory));
    setShowVehicleForm(true);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setVSaving(true);
    const id = editingVehicleId || `veh_${Date.now()}`;
    const existing = vehicles.find((x) => x.id === editingVehicleId);
    const refCode = existing?.referenceCode || generateReference('VEH');
    const finalName = vName.trim() || `${vMake.trim()} ${vModel.trim()}`;
    const slug = existing?.slug || slugifyVehicle(finalName, Number(vYear), refCode);

    const payload: Record<string, any> = {
      slug,
      referenceCode: refCode,
      name: finalName,
      make: vMake.trim(),
      model: vModel.trim(),
      year: Number(vYear),
      priceNgn: Number(vPrice || 0),
      location: vLocation.trim(),
      condition: vCondition,
      transmission: vTransmission,
      fuelType: vFuel,
      bodyType: vBody,
      mileageKm: Number(vMileage || 0),
      engineSize: vEngine.trim(),
      exteriorColor: vColor.trim(),
      description: vDescription.trim(),
      images: vImages,
      verified: vVerified,
      featured: vFeatured,
      financingAvailable: vFinancing,
      saveToOwnAvailable: vSaveToOwn,
      status: vStatus,
      popularityScore: existing?.popularityScore || 0,
      isSampleInventory: vIsSample,
      updatedAt: serverTimestamp(),
    };
    if (vPrevPrice && Number(vPrevPrice) > 0) {
      payload.previousPriceNgn = Number(vPrevPrice);
    }

    try {
      if (editingVehicleId) {
        await updateDoc(doc(db, 'vehicles', id), payload);
      } else {
        await setDoc(doc(db, 'vehicles', id), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      setShowVehicleForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `vehicles/${id}`);
    } finally {
      setVSaving(false);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'vehicles', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `vehicles/${id}`);
    }
  };

  const handleMarkSold = async (v: Vehicle, nextStatus: 'available' | 'reserved' | 'sold') => {
    try {
      await updateDoc(doc(db, 'vehicles', v.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `vehicles/${v.id}`);
    }
  };

  const handleReassignBodyType = async (v: Vehicle, bodyType: Vehicle['bodyType']) => {
    try {
      await updateDoc(doc(db, 'vehicles', v.id), {
        bodyType,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `vehicles/${v.id}`);
    }
  };

  const handlePromoteToVerifiedStock = async (v: Vehicle) => {
    try {
      await updateDoc(doc(db, 'vehicles', v.id), {
        isSampleInventory: false,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `vehicles/${v.id}`);
    }
  };

  // Financing Admin Actions
  const handleUpdateFinancing = async (
    app: FinancingApplication,
    status: FinancingApplication['status'],
    depositNgn?: number,
    months?: number,
    interestPercent?: number,
    remarks?: string,
    recordedDeposit?: number
  ) => {
    const appDeposit = typeof depositNgn === 'number' ? depositNgn : app.approvedDepositNgn || app.preferredDepositNgn;
    const appMonths = typeof months === 'number' ? months : app.approvedMonths || app.repaymentMonths;
    const rate = typeof interestPercent === 'number' ? interestPercent : app.interestRatePercent || 0;
    const principal = Math.max(0, app.vehiclePriceNgn - appDeposit);
    const totalWithInterest = principal * (1 + rate / 100);
    const monthlyPayment = status === 'approved' && appMonths > 0 ? Math.ceil(totalWithInterest / appMonths) : app.approvedMonthlyPaymentNgn;

    const schedule =
      status === 'approved' && app.repaymentSchedule.length === 0
        ? Array.from({ length: Math.min(60, appMonths) }, (_, i) => ({
            installmentNumber: i + 1,
            dueDate: new Date(Date.now() + (i + 1) * 30 * 86400000).toISOString().slice(0, 10),
            amountNgn: monthlyPayment,
            status: 'pending',
          }))
        : app.repaymentSchedule;

    try {
      await updateDoc(doc(db, 'financingApplications', app.id), {
        status,
        approvedDepositNgn: status === 'approved' ? appDeposit : app.approvedDepositNgn,
        approvedMonths: status === 'approved' ? appMonths : app.approvedMonths,
        approvedMonthlyPaymentNgn: monthlyPayment,
        interestRatePercent: rate,
        depositRecordedNgn: typeof recordedDeposit === 'number' ? recordedDeposit : app.depositRecordedNgn,
        repaymentSchedule: schedule,
        adminRemarks: remarks ?? app.adminRemarks ?? '',
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'users', app.userId, 'notifications', `notif_${Date.now()}`), {
        userId: app.userId,
        title: `Financing Application ${status.replace('_', ' ')}`,
        message: `Your financing application ${app.referenceNumber} for ${app.vehicleName} is now: ${status.replace('_', ' ')}.`,
        category: 'financing',
        referenceNumber: app.referenceNumber,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `financingApplications/${app.id}`);
    }
  };

  // Payment Verification Action
  const handleVerifyPayment = async (p: PaymentRecord, approve: boolean) => {
    try {
      await updateDoc(doc(db, 'payments', p.id), {
        status: approve ? 'verified' : 'rejected',
        verifiedBy: user.uid,
        updatedAt: serverTimestamp(),
      });

      if (p.relatedType === 'savings') {
        const plan = savingsPlans.find((sp) => sp.id === p.relatedId);
        if (plan) {
          const nextConfirmed = approve
            ? Number(plan.confirmedPaidNgn || 0) + Number(p.amountNgn)
            : Number(plan.confirmedPaidNgn || 0);
          const nextPending = Math.max(0, Number(plan.pendingPaidNgn || 0) - Number(p.amountNgn));
          await updateDoc(doc(db, 'savingsPlans', plan.id), {
            confirmedPaidNgn: nextConfirmed,
            pendingPaidNgn: nextPending,
            status: nextConfirmed >= plan.targetPriceNgn ? 'completed' : plan.status,
            updatedAt: serverTimestamp(),
          });
        }
      } else if (
        approve &&
        (p.relatedType === 'financing_deposit' || p.relatedType === 'financing_installment')
      ) {
        const finApp = financingApps.find((fa) => fa.id === p.relatedId);
        if (finApp) {
          if (p.relatedType === 'financing_deposit') {
            await updateDoc(doc(db, 'financingApplications', finApp.id), {
              depositRecordedNgn: Number(finApp.depositRecordedNgn || 0) + Number(p.amountNgn),
              updatedAt: serverTimestamp(),
            });
          } else {
            let marked = false;
            const nextSchedule = (finApp.repaymentSchedule || []).map((item) => {
              if (!marked && item.status !== 'paid') {
                marked = true;
                return { ...item, status: 'paid' as const };
              }
              return item;
            });
            await updateDoc(doc(db, 'financingApplications', finApp.id), {
              repaymentSchedule: nextSchedule,
              updatedAt: serverTimestamp(),
            });
          }
        }
      }

      await setDoc(doc(db, 'users', p.userId, 'notifications', `notif_${Date.now()}`), {
        userId: p.userId,
        title: approve ? 'Payment Verified' : 'Payment Rejected',
        message: `Payment ${p.referenceNumber} (${formatNaira(p.amountNgn)}) has been ${approve ? 'verified' : 'rejected'} by Accounts Administration.`,
        category: 'payment',
        referenceNumber: p.referenceNumber,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `payments/${p.id}`);
    }
  };

  const handlePublishSubmissionToVehicle = async (sub: VehicleSubmission) => {
    const vehId = `veh_${Date.now()}`;
    const refCode = generateReference('VEH');
    const name = `${sub.make} ${sub.model}`;
    const price = sub.proposedValuationNgn || sub.expectedPriceNgn;

    try {
      await setDoc(doc(db, 'vehicles', vehId), {
        slug: slugifyVehicle(name, sub.year, refCode),
        referenceCode: refCode,
        name,
        make: sub.make,
        model: sub.model,
        year: sub.year,
        priceNgn: price,
        location: sub.location,
        condition: sub.condition,
        transmission: sub.transmission,
        fuelType: sub.fuelType,
        bodyType: 'SUV',
        mileageKm: sub.mileageKm,
        description: sub.description,
        images: sub.images,
        verified: true,
        featured: false,
        financingAvailable: true,
        saveToOwnAvailable: true,
        status: 'available',
        popularityScore: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'vehicleSubmissions', sub.id), {
        status: 'approved_for_listing',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `vehicles/${vehId}`);
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsedBrands = brandsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);

    try {
      await setDoc(doc(db, 'settings', 'dealership'), {
        ...sForm,
        popularBrands: parsedBrands,
        updatedAt: serverTimestamp(),
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/dealership');
    }
  };

  const handleAddTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `test_${Date.now()}`;
    try {
      await setDoc(doc(db, 'testimonials', id), {
        customerName: tName.trim(),
        location: tLoc.trim(),
        vehiclePurchased: tCar.trim(),
        quote: tQuote.trim(),
        rating: 5,
        published: true,
        createdAt: serverTimestamp(),
      });
      setTName('');
      setTCar('');
      setTQuote('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `testimonials/${id}`);
    }
  };

  const verifiedRevenue = payments
    .filter((p) => p.status === 'verified')
    .reduce((acc, p) => acc + p.amountNgn, 0);

  const pendingPaymentsCount = payments.filter((p) => p.status === 'pending_verification').length;
  const pendingFinancingCount = financingApps.filter((a) => a.status === 'submitted').length;

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'vehicles', label: 'Vehicles', icon: <Car className="w-4 h-4" /> },
    { id: 'financing', label: 'Financing', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'payments', label: 'Payments & Savings', icon: <Receipt className="w-4 h-4" /> },
    { id: 'submissions', label: 'Sell Submissions', icon: <UploadCloud className="w-4 h-4" /> },
    { id: 'quotations', label: 'Quotations', icon: <PiggyBank className="w-4 h-4" /> },
    { id: 'enquiries', label: 'Enquiries', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'chatbot', label: 'AI Chatbot & WhatsApp', icon: <Bot className="w-4 h-4" /> },
    { id: 'customers', label: 'Customers & Reviews', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: 'Business Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-8">
      <SeoHead
        title="Admin Console | Car Depot by Ultimate Autos"
        description="Dealership administration dashboard."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="bg-[#0B0D10] text-white rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-red-500 font-semibold uppercase tracking-wider">
              Dealership Administration
            </p>
            <h1 className="font-display font-bold text-xl sm:text-2xl">
              Car Depot Management Console
            </h1>
          </div>
          <button
            type="button"
            onClick={openNewVehicleForm}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Vehicle Listing
          </button>
        </div>

        {/* Admin Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                activeTab === item.id
                  ? 'bg-[#0B0D10] text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Vehicles', val: String(vehicles.length) },
                { label: 'Pending Financing', val: String(pendingFinancingCount) },
                { label: 'Pending Payment Reviews', val: String(pendingPaymentsCount) },
                { label: 'Verified Payments Total', val: formatNaira(verifiedRevenue) },
                { label: 'Active Save to Own', val: String(savingsPlans.length) },
                { label: 'Sell Submissions', val: String(submissions.length) },
                { label: 'Car Quotations', val: String(quotations.length) },
                { label: 'AI Chat Sessions', val: String(chats.length) },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <p className="text-xs text-slate-500">{kpi.label}</p>
                  <p className="font-mono-num font-bold text-2xl text-slate-900 mt-1">{kpi.val}</p>
                </div>
              ))}
            </div>

            {/* Sales & Payment Reports */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display font-bold text-base sm:text-lg text-slate-900">
                    Sales &amp; Payment Reports
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live breakdown across Save to Own contributions, financing deposits/installments, and inventory status.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  {
                    label: 'Verified Savings',
                    val: formatNaira(
                      payments
                        .filter((p) => p.status === 'verified' && p.relatedType === 'savings')
                        .reduce((acc, p) => acc + p.amountNgn, 0)
                    ),
                  },
                  {
                    label: 'Verified Financing',
                    val: formatNaira(
                      payments
                        .filter(
                          (p) =>
                            p.status === 'verified' &&
                            (p.relatedType === 'financing_deposit' ||
                              p.relatedType === 'financing_installment')
                        )
                        .reduce((acc, p) => acc + p.amountNgn, 0)
                    ),
                  },
                  {
                    label: 'Pending Amount',
                    val: formatNaira(
                      payments
                        .filter((p) => p.status === 'pending_verification')
                        .reduce((acc, p) => acc + p.amountNgn, 0)
                    ),
                  },
                  {
                    label: 'Rejected Payments',
                    val: String(payments.filter((p) => p.status === 'rejected').length),
                  },
                  {
                    label: 'Available Cars',
                    val: String(vehicles.filter((v) => v.status === 'available').length),
                  },
                  {
                    label: 'Sold / Reserved',
                    val: String(
                      vehicles.filter((v) => v.status === 'sold' || v.status === 'reserved').length
                    ),
                  },
                ].map((rep) => (
                  <div key={rep.label} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-[11px] text-slate-500">{rep.label}</p>
                    <p className="font-mono-num font-bold text-sm sm:text-base text-slate-900 mt-1">
                      {rep.val}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VEHICLES */}
        {activeTab === 'vehicles' && (
          <div className="space-y-5">
            {showVehicleForm && (
              <form
                onSubmit={handleSaveVehicle}
                className="bg-white border border-slate-300 rounded-2xl p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-lg text-slate-900">
                    {editingVehicleId ? 'Edit Vehicle Listing' : 'Publish New Vehicle'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowVehicleForm(false)}
                    className="text-xs font-semibold text-slate-500"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    value={vMake}
                    onChange={(e) => setVMake(e.target.value)}
                    placeholder="Make (e.g. Toyota)"
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    value={vModel}
                    onChange={(e) => setVModel(e.target.value)}
                    placeholder="Model (e.g. Camry XSE)"
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={vName}
                    onChange={(e) => setVName(e.target.value)}
                    placeholder="Display Name (defaults to Make + Model)"
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <input
                    type="number"
                    required
                    value={vYear}
                    onChange={(e) => setVYear(Number(e.target.value))}
                    placeholder="Year"
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                  />
                  <input
                    type="number"
                    required
                    value={vPrice}
                    onChange={(e) => setVPrice(e.target.value)}
                    placeholder="Price (₦)"
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                  />
                  <input
                    type="number"
                    value={vPrevPrice}
                    onChange={(e) => setVPrevPrice(e.target.value)}
                    placeholder="Previous Price (optional)"
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                  />
                  <input
                    type="number"
                    required
                    value={vMileage}
                    onChange={(e) => setVMileage(e.target.value)}
                    placeholder="Mileage (km)"
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <select
                    value={vCondition}
                    onChange={(e) => setVCondition(e.target.value as any)}
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Foreign Used">Foreign Used</option>
                    <option value="Nigerian Used">Nigerian Used</option>
                    <option value="Brand New">Brand New</option>
                  </select>
                  <select
                    value={vTransmission}
                    onChange={(e) => setVTransmission(e.target.value as any)}
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                    <option value="CVT">CVT</option>
                    <option value="Semi-Automatic">Semi-Automatic</option>
                  </select>
                  <select
                    value={vFuel}
                    onChange={(e) => setVFuel(e.target.value as any)}
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Electric">Electric</option>
                  </select>
                  <select
                    value={vBody}
                    onChange={(e) => setVBody(e.target.value as any)}
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {['SUV', 'Sedan', 'Hatchback', 'Coupe', 'Pickup', 'Bus', 'Convertible', 'Wagon'].map(
                      (b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    required
                    value={vLocation}
                    onChange={(e) => setVLocation(e.target.value)}
                    placeholder="Location"
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={vEngine}
                    onChange={(e) => setVEngine(e.target.value)}
                    placeholder="Engine (e.g. 2.5L V6)"
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={vColor}
                    onChange={(e) => setVColor(e.target.value)}
                    placeholder="Exterior Color"
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <select
                    value={vStatus}
                    onChange={(e) => setVStatus(e.target.value as any)}
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>

                <textarea
                  required
                  rows={3}
                  value={vDescription}
                  onChange={(e) => setVDescription(e.target.value)}
                  placeholder="Full vehicle description, trim, history, and inspection highlights..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />

                <ImageUploader
                  label="Vehicle Photographs"
                  urls={vImages}
                  onChange={setVImages}
                  maxFiles={12}
                  folder="car-depot/vehicles"
                />

                <div className="flex flex-wrap gap-4 text-xs font-medium">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={vVerified} onChange={(e) => setVVerified(e.target.checked)} className="accent-red-600" />
                    Verified Dealership Listing
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={vFeatured} onChange={(e) => setVFeatured(e.target.checked)} className="accent-red-600" />
                    Featured on Homepage
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={vFinancing} onChange={(e) => setVFinancing(e.target.checked)} className="accent-red-600" />
                    Buy Now Pay Later Eligible
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={vSaveToOwn} onChange={(e) => setVSaveToOwn(e.target.checked)} className="accent-red-600" />
                    Save to Own Eligible
                  </label>
                  <label className="flex items-center gap-2 text-slate-600">
                    <input type="checkbox" checked={vIsSample} onChange={(e) => setVIsSample(e.target.checked)} className="accent-amber-600" />
                    Internal: Presentation Stock (Uncheck when replacing with verified dealership stock)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={vSaving}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl"
                >
                  {vSaving ? 'Saving Vehicle...' : 'Save & Publish Vehicle'}
                </button>
              </form>
            )}

            {/* Internal Stock Classification & Sample Inventory Controls */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                <span>
                  <strong className="text-slate-900 font-mono-num">
                    {vehicles.filter((v) => !v.isSampleInventory).length}
                  </strong>{' '}
                  Verified Dealership Stock
                </span>
                <span>·</span>
                <span>
                  <strong className="text-amber-700 font-mono-num">
                    {vehicles.filter((v) => v.isSampleInventory).length}
                  </strong>{' '}
                  Presentation Stock (Internal Admin Label Only)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={sampleActionBusy}
                  onClick={async () => {
                    setSampleActionBusy(true);
                    try {
                      await seedSampleInventory();
                    } finally {
                      setSampleActionBusy(false);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  {sampleActionBusy ? 'Working...' : 'Sync / Restore Presentation Stock'}
                </button>
                {vehicles.some((v) => v.isSampleInventory) &&
                  (confirmClearSamples ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={sampleActionBusy}
                        onClick={async () => {
                          setSampleActionBusy(true);
                          try {
                            await clearSampleInventory();
                            setConfirmClearSamples(false);
                          } finally {
                            setSampleActionBusy(false);
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg"
                      >
                        Confirm Clear All Sample Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClearSamples(false)}
                        className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearSamples(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg"
                    >
                      Clear Sample Stock
                    </button>
                  ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Stock Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicles.map((v) => (
                    <tr key={v.id}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {v.images?.[0] && (
                            <img
                              src={v.images[0]}
                              alt={v.name}
                              referrerPolicy="no-referrer"
                              className="w-12 h-9 rounded object-cover border border-slate-200 shrink-0"
                            />
                          )}
                          <div>
                            <p className="font-semibold text-slate-900">
                              {v.year} {v.name}
                            </p>
                            <p className="text-xs text-slate-500 font-mono-num">
                              {v.referenceCode} · {v.location}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={v.bodyType}
                          onChange={(e) =>
                            handleReassignBodyType(v, e.target.value as Vehicle['bodyType'])
                          }
                          aria-label={`Category for ${v.name}`}
                          className="px-2 py-1 text-xs border border-slate-200 rounded bg-white"
                        >
                          {['SUV', 'Sedan', 'Hatchback', 'Coupe', 'Pickup', 'Bus', 'Convertible', 'Wagon'].map(
                            (b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            )
                          )}
                        </select>
                      </td>
                      <td className="py-3 px-4 font-mono-num font-bold whitespace-nowrap">
                        {formatNaira(v.priceNgn)}
                      </td>
                      <td className="py-3 px-4">
                        {v.isSampleInventory ? (
                          <span className="inline-block px-2 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded">
                            Presentation Stock
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                            Verified Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 uppercase text-xs font-semibold">{v.status}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to={`/cars/${v.slug}`}
                            className="p-1.5 border border-slate-200 rounded hover:bg-slate-100"
                            title="Preview Listing"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => openEditVehicle(v)}
                            className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded hover:bg-slate-100"
                          >
                            Edit / Replace
                          </button>
                          {v.isSampleInventory && (
                            <button
                              type="button"
                              onClick={() => handlePromoteToVerifiedStock(v)}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded"
                              title="Mark as verified dealership stock"
                            >
                              Verify Stock
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleMarkSold(v, v.status === 'sold' ? 'available' : 'sold')}
                            className="px-2.5 py-1 text-xs font-semibold bg-slate-900 text-white rounded"
                          >
                            {v.status === 'sold' ? 'Relist' : 'Mark Sold'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVehicle(v.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Delete Vehicle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {vehicles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No vehicles uploaded yet. Click &ldquo;Add Vehicle Listing&rdquo; or &ldquo;Sync / Restore Presentation Stock&rdquo; above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FINANCING APPLICATIONS */}
        {activeTab === 'financing' && (
          <div className="space-y-4">
            {financingApps.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                No financing applications received yet.
              </div>
            ) : (
              financingApps.map((app) => (
                <div key={app.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="text-xs font-mono-num text-slate-500">
                        {app.referenceNumber} · {app.status.toUpperCase()}
                      </p>
                      <h3 className="font-display font-bold text-base text-slate-900">
                        {app.fullName} — {app.vehicleName} ({formatNaira(app.vehiclePriceNgn)})
                      </h3>
                      <p className="text-xs text-slate-600">
                        {app.phone} · {app.email} · {app.employmentStatus} at {app.employerName} · Income: {formatNaira(app.monthlyIncomeNgn)}/mo
                      </p>
                    </div>
                    <div className="text-xs font-mono-num text-right">
                      <p>Proposed Deposit: {formatNaira(app.preferredDepositNgn)}</p>
                      <p>Duration: {app.repaymentMonths} months</p>
                    </div>
                  </div>
                  {app.documentUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {app.documentUrls.map((u, idx) => (
                        <a
                          key={idx}
                          href={u}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-red-600 underline"
                        >
                          Document #{idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setFinancingEditId(financingEditId === app.id ? null : app.id);
                        setFinDeposit(String(app.approvedDepositNgn || app.preferredDepositNgn));
                        setFinMonths(String(app.approvedMonths || app.repaymentMonths));
                        setFinRate(String(app.interestRatePercent ?? 15));
                        setFinRecordedDeposit(String(app.depositRecordedNgn || 0));
                        setFinRemarks(app.adminRemarks || '');
                      }}
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg"
                    >
                      Set Terms &amp; Record Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateFinancing(
                          app,
                          'info_requested',
                          undefined,
                          undefined,
                          undefined,
                          'Please upload recent 6-month bank statement and valid government ID.'
                        )
                      }
                      className="px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg"
                    >
                      Request More Info
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateFinancing(
                          app,
                          'rejected',
                          undefined,
                          undefined,
                          undefined,
                          'Application declined after eligibility review.'
                        )
                      }
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg"
                    >
                      Reject
                    </button>
                  </div>

                  {financingEditId === app.id && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-semibold text-slate-900">
                        Approve Terms &amp; Deposit Confirmation
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="block text-[11px] text-slate-600 mb-1">Approved Deposit (₦)</label>
                          <input
                            type="number"
                            value={finDeposit}
                            onChange={(e) => setFinDeposit(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono-num bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-600 mb-1">Tenure (Months)</label>
                          <input
                            type="number"
                            value={finMonths}
                            onChange={(e) => setFinMonths(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono-num bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-600 mb-1">Rate (%)</label>
                          <input
                            type="number"
                            value={finRate}
                            onChange={(e) => setFinRate(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono-num bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-600 mb-1">Deposit Recorded (₦)</label>
                          <input
                            type="number"
                            value={finRecordedDeposit}
                            onChange={(e) => setFinRecordedDeposit(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-mono-num bg-white"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        value={finRemarks}
                        onChange={(e) => setFinRemarks(e.target.value)}
                        placeholder="Dealership remarks / conditions..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateFinancing(
                              app,
                              'approved',
                              Number(finDeposit || 0),
                              Number(finMonths || 12),
                              Number(finRate || 0),
                              finRemarks || 'Approved subject to deposit confirmation.',
                              Number(finRecordedDeposit || 0)
                            );
                            setFinancingEditId(null);
                          }}
                          className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg"
                        >
                          Approve &amp; Save Schedule
                        </button>
                        <button
                          type="button"
                          onClick={() => setFinancingEditId(null)}
                          className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg bg-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {app.repaymentSchedule.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <p className="text-xs font-semibold text-slate-800">
                        Repayment Schedule ({app.repaymentSchedule.filter((i) => i.status === 'paid').length}/{app.repaymentSchedule.length} Paid)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {app.repaymentSchedule.map((inst) => (
                          <button
                            key={inst.installmentNumber}
                            type="button"
                            onClick={() => {
                              const nextSchedule = app.repaymentSchedule.map((item) =>
                                item.installmentNumber === inst.installmentNumber
                                  ? { ...item, status: item.status === 'paid' ? 'pending' : 'paid' }
                                  : item
                              );
                              updateDoc(doc(db, 'financingApplications', app.id), {
                                repaymentSchedule: nextSchedule,
                                updatedAt: serverTimestamp(),
                              });
                            }}
                            className={`px-2.5 py-1 text-[11px] font-mono-num rounded border transition-colors ${
                              inst.status === 'paid'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-red-500'
                            }`}
                          >
                            #{inst.installmentNumber} · {inst.dueDate} · {formatNaira(inst.amountNgn)} ({inst.status})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* PAYMENTS & SAVINGS */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h2 className="font-display font-bold text-base text-slate-900">
                Payment Receipts &amp; Verification Queue
              </h2>
              {payments.length === 0 ? (
                <p className="text-sm text-slate-500">No payments submitted yet.</p>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div key={p.id} className="border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-mono-num text-xs text-slate-500">
                          {p.referenceNumber} · {p.status.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="font-mono-num font-bold text-base text-slate-900">
                          {formatNaira(p.amountNgn)}
                        </p>
                        <p className="text-xs text-slate-600">{p.notes}</p>
                        {p.receiptUrl && (
                          <a
                            href={p.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-red-600 underline"
                          >
                            View Uploaded Receipt
                          </a>
                        )}
                      </div>
                      {p.status === 'pending_verification' && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleVerifyPayment(p, true)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Verify Payment
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifyPayment(p, false)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h2 className="font-display font-bold text-base text-slate-900">
                Active Save to Own Plans
              </h2>
              {savingsPlans.map((sp) => (
                <div key={sp.id} className="border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono-num text-xs text-slate-500">
                      {sp.referenceNumber} · {sp.status.toUpperCase()} · Price Locked: {sp.priceLocked ? 'Yes' : 'No'}
                    </p>
                    <p className="font-semibold text-sm text-slate-900">{sp.vehicleName}</p>
                    <p className="font-mono-num text-xs text-slate-600">
                      Confirmed: {formatNaira(sp.confirmedPaidNgn)} / Target: {formatNaira(sp.targetPriceNgn)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateDoc(doc(db, 'savingsPlans', sp.id), {
                        priceLocked: !sp.priceLocked,
                        updatedAt: serverTimestamp(),
                      })
                    }
                    className="px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-100"
                  >
                    {sp.priceLocked ? 'Unlock Price' : 'Confirm Price Lock'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SELL SUBMISSIONS */}
        {activeTab === 'submissions' && (
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                No customer vehicle submissions yet.
              </div>
            ) : (
              submissions.map((sub) => (
                <div key={sub.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-mono-num text-xs text-slate-500">
                        {sub.referenceNumber} · {sub.arrangement.replace('_', ' ').toUpperCase()} · {sub.status.toUpperCase()}
                      </p>
                      <h3 className="font-display font-bold text-base text-slate-900">
                        {sub.year} {sub.make} {sub.model} — Expected: {formatNaira(sub.expectedPriceNgn)}
                      </h3>
                      <p className="text-xs text-slate-600">
                        Owner: {sub.fullName} ({sub.phone}) · {sub.location}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700">{sub.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setValuationTargetId(valuationTargetId === sub.id ? null : sub.id);
                        setValuationAmount(String(sub.proposedValuationNgn || sub.expectedPriceNgn));
                        setValuationNotes(sub.adminOfferNotes || '');
                      }}
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg"
                    >
                      Record Valuation Offer
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePublishSubmissionToVehicle(sub)}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg"
                    >
                      Approve &amp; Publish to Inventory
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateDoc(doc(db, 'vehicleSubmissions', sub.id), {
                          status: 'declined',
                          updatedAt: serverTimestamp(),
                        })
                      }
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg"
                    >
                      Decline
                    </button>
                  </div>
                  {valuationTargetId === sub.id && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="number"
                          value={valuationAmount}
                          onChange={(e) => setValuationAmount(e.target.value)}
                          placeholder="Proposed Valuation (₦)"
                          className="px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-num bg-white"
                        />
                        <input
                          type="text"
                          value={valuationNotes}
                          onChange={(e) => setValuationNotes(e.target.value)}
                          placeholder="Offer notes for seller..."
                          className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const num = Number(valuationAmount);
                            if (!num || num <= 0) return;
                            await updateDoc(doc(db, 'vehicleSubmissions', sub.id), {
                              proposedValuationNgn: num,
                              status: 'offer_sent',
                              adminOfferNotes:
                                valuationNotes.trim() ||
                                `Dealership valuation offer of ${formatNaira(num)} sent.`,
                              updatedAt: serverTimestamp(),
                            });
                            setValuationTargetId(null);
                          }}
                          className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg"
                        >
                          Send Valuation Offer
                        </button>
                        <button
                          type="button"
                          onClick={() => setValuationTargetId(null)}
                          className="px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded-lg bg-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* QUOTATIONS */}
        {activeTab === 'quotations' && (
          <div className="space-y-3">
            {quotations.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                No car quotation requests yet.
              </div>
            ) : (
              quotations.map((q) => (
                <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="font-mono-num">{q.referenceNumber}</span>
                    <span className="uppercase font-semibold">{q.status}</span>
                  </div>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    {q.preferredYear} {q.preferredBrand} {q.preferredModel} — Budget: {formatNaira(q.budgetNgn)}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {q.fullName} · {q.phone} · {q.paymentPreference} · {q.location}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuotationTargetId(quotationTargetId === q.id ? null : q.id);
                      setQuotationAmount(String(q.quotedPriceNgn || q.budgetNgn));
                      setQuotationNotes(q.adminQuoteNotes || '');
                    }}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg"
                  >
                    Provide Official Quotation
                  </button>
                  {quotationTargetId === q.id && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 mt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="number"
                          value={quotationAmount}
                          onChange={(e) => setQuotationAmount(e.target.value)}
                          placeholder="Official Quoted Price (₦)"
                          className="px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono-num bg-white"
                        />
                        <input
                          type="text"
                          value={quotationNotes}
                          onChange={(e) => setQuotationNotes(e.target.value)}
                          placeholder="Sourcing timeline & notes..."
                          className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const num = Number(quotationAmount);
                            if (!num || num <= 0) return;
                            await updateDoc(doc(db, 'quotations', q.id), {
                              quotedPriceNgn: num,
                              status: 'quoted',
                              adminQuoteNotes:
                                quotationNotes.trim() ||
                                `Official quotation provided at ${formatNaira(num)}.`,
                              updatedAt: serverTimestamp(),
                            });
                            setQuotationTargetId(null);
                          }}
                          className="px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg"
                        >
                          Send Official Quote
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuotationTargetId(null)}
                          className="px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded-lg bg-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ENQUIRIES */}
        {activeTab === 'enquiries' && (
          <div className="space-y-3">
            {enquiries.map((enq) => (
              <div key={enq.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span className="font-mono-num">{enq.referenceNumber} · {enq.source.toUpperCase()}</span>
                  <span className="uppercase font-semibold">{enq.status} · WA: {enq.whatsappNotificationStatus}</span>
                </div>
                <p className="font-semibold text-sm text-slate-900">
                  {enq.customerName} ({enq.customerPhone}) — {enq.vehicleName || enq.category}
                </p>
                <p className="text-xs text-slate-600">{enq.message}</p>
                <div className="flex gap-2">
                  {(['contacted', 'quoted', 'closed'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        updateDoc(doc(db, 'enquiries', enq.id), {
                          status: st,
                          updatedAt: serverTimestamp(),
                        })
                      }
                      className="px-2.5 py-1 border border-slate-300 text-xs font-semibold rounded capitalize hover:bg-slate-100"
                    >
                      Mark {st}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI CHATBOT & WHATSAPP */}
        {activeTab === 'chatbot' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <h2 className="font-display font-bold text-lg text-slate-900">
                AI Chatbot Configuration
              </h2>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={sForm.chatbotEnabled}
                  onChange={(e) => setSForm({ ...sForm, chatbotEnabled: e.target.checked })}
                  className="w-4 h-4 accent-red-600"
                />
                Enable AI Chatbot on Live Website
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chatbot Name</label>
                <input
                  type="text"
                  value={sForm.chatbotName}
                  onChange={(e) => setSForm({ ...sForm, chatbotName: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Welcome Message</label>
                <textarea
                  rows={3}
                  value={sForm.chatbotWelcomeMessage}
                  onChange={(e) => setSForm({ ...sForm, chatbotWelcomeMessage: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dealership Instructions for AI
                </label>
                <textarea
                  rows={3}
                  value={sForm.chatbotInstructions}
                  onChange={(e) => setSForm({ ...sForm, chatbotInstructions: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              {/* FAQs Editor */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Dealership FAQs Used by AI</h3>
                {sForm.faqs.map((faq, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between gap-2 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{faq.question}</p>
                      <p className="text-slate-600 mt-0.5">{faq.answer}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSForm({ ...sForm, faqs: sForm.faqs.filter((_, idx) => idx !== i) })
                      }
                      className="text-red-600 shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    value={newFaqQ}
                    onChange={(e) => setNewFaqQ(e.target.value)}
                    placeholder="FAQ Question"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={newFaqA}
                    onChange={(e) => setNewFaqA(e.target.value)}
                    placeholder="FAQ Answer"
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newFaqQ.trim() || !newFaqA.trim()) return;
                    setSForm({
                      ...sForm,
                      faqs: [...sForm.faqs, { question: newFaqQ.trim(), answer: newFaqA.trim() }],
                    });
                    setNewFaqQ('');
                    setNewFaqA('');
                  }}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg"
                >
                  Add FAQ
                </button>
              </div>

              {settingsSaved && (
                <p className="text-xs font-semibold text-emerald-700">Chatbot settings saved!</p>
              )}
              <button
                type="button"
                onClick={() => handleSaveSettings()}
                className="px-6 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl"
              >
                Save Chatbot Configuration
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
              <h2 className="font-display font-bold text-lg text-slate-900">
                Customer AI Conversations &amp; Unanswered Questions
              </h2>
              {chats.length === 0 ? (
                <p className="text-sm text-slate-500">No logged customer conversations yet.</p>
              ) : (
                chats.map((c) => (
                  <div key={c.id} className="border border-slate-200 rounded-xl p-4 space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span className="font-mono-num">
                        {c.customerName || 'User'} · {c.enquiryReference || c.sessionId}
                      </span>
                      <span>
                        {c.unansweredFlag ? 'UNANSWERED FLAGGED · ' : ''}
                        WA: {c.whatsappNotificationStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">
                      {c.messages.map((m) => `${m.role}: ${m.text}`).join(' | ').slice(0, 300)}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
              <h2 className="font-display font-bold text-lg text-slate-900">
                WhatsApp Notification Delivery Logs ({whatsappLogs.length})
              </h2>
              {whatsappLogs.length === 0 ? (
                <p className="text-sm text-slate-500">No WhatsApp notification logs recorded yet.</p>
              ) : (
                whatsappLogs.map((log) => (
                  <div key={log.id} className="border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex justify-between font-mono-num text-slate-500">
                      <span>{log.enquiryReference} · {log.recipientPhone}</span>
                      <span className="uppercase font-semibold">{log.status}</span>
                    </div>
                    <p className="text-slate-700">{log.payloadSummary}</p>
                    {log.errorMessage && <p className="text-red-600">{log.errorMessage}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CUSTOMERS & TESTIMONIALS */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <h2 className="font-display font-bold text-lg text-slate-900">
                Publish Verified Customer Testimonial
              </h2>
              <form onSubmit={handleAddTestimonial} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    value={tName}
                    onChange={(e) => setTName(e.target.value)}
                    placeholder="Customer Name"
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    value={tLoc}
                    onChange={(e) => setTLoc(e.target.value)}
                    placeholder="Location"
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    value={tCar}
                    onChange={(e) => setTCar(e.target.value)}
                    placeholder="Vehicle Purchased"
                    className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <textarea
                  required
                  rows={2}
                  value={tQuote}
                  onChange={(e) => setTQuote(e.target.value)}
                  placeholder="Verified customer quote..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg"
                >
                  Publish Testimonial
                </button>
              </form>

              <div className="space-y-2 pt-3 border-t border-slate-100">
                {allTestimonials.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg text-xs">
                    <div>
                      <p className="font-semibold">{t.customerName} ({t.vehiclePurchased})</p>
                      <p className="text-slate-600">{t.quote}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteDoc(doc(db, 'testimonials', t.id))}
                      className="text-red-600 font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
              <h2 className="font-display font-bold text-lg text-slate-900">
                Registered Customers ({customers.length})
              </h2>
              {customers.map((c) => (
                <div key={c.uid} className="text-xs border-b border-slate-100 pb-2 flex justify-between">
                  <span className="font-semibold">{c.fullName} ({c.email})</span>
                  <span className="text-slate-500">{c.phone || 'No phone'} · {c.location}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BUSINESS SETTINGS */}
        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveSettings}
            className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl space-y-4"
          >
            <h2 className="font-display font-bold text-lg text-slate-900">
              Dealership &amp; Google Business Profile Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  value={sForm.businessName}
                  onChange={(e) => setSForm({ ...sForm, businessName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline</label>
                <input
                  type="text"
                  value={sForm.tagline}
                  onChange={(e) => setSForm({ ...sForm, tagline: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                <input
                  type="text"
                  value={sForm.whatsappNumber}
                  onChange={(e) => setSForm({ ...sForm, whatsappNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telephone Number</label>
                <input
                  type="text"
                  value={sForm.phoneNumber}
                  onChange={(e) => setSForm({ ...sForm, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirmed Showroom Address (from Google Business Profile)
              </label>
              <input
                type="text"
                value={sForm.address}
                onChange={(e) => setSForm({ ...sForm, address: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Hours</label>
              <input
                type="text"
                value={sForm.businessHours}
                onChange={(e) => setSForm({ ...sForm, businessHours: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Popular Brands (comma separated)
              </label>
              <input
                type="text"
                value={brandsInput}
                onChange={(e) => setBrandsInput(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-800">
                Homepage Promotional Banners
              </p>
              {sForm.promoBanners.map((banner, idx) => (
                <div key={banner.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Banner #{idx + 1}</span>
                    <label className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={banner.active}
                        onChange={(e) => {
                          const next = [...sForm.promoBanners];
                          next[idx] = { ...banner, active: e.target.checked };
                          setSForm({ ...sForm, promoBanners: next });
                        }}
                        className="accent-red-600"
                      />
                      Active
                    </label>
                  </div>
                  <input
                    type="text"
                    value={banner.title}
                    onChange={(e) => {
                      const next = [...sForm.promoBanners];
                      next[idx] = { ...banner, title: e.target.value };
                      setSForm({ ...sForm, promoBanners: next });
                    }}
                    placeholder="Banner Title"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={banner.subtitle}
                    onChange={(e) => {
                      const next = [...sForm.promoBanners];
                      next[idx] = { ...banner, subtitle: e.target.value };
                      setSForm({ ...sForm, promoBanners: next });
                    }}
                    placeholder="Banner Subtitle"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              ))}
            </div>

            {settingsSaved && (
              <p className="text-xs font-semibold text-emerald-700">
                Dealership settings saved and live across the website!
              </p>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl"
            >
              Save Business Settings
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

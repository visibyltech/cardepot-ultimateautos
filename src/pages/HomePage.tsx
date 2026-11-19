import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Car,
  CreditCard,
  PiggyBank,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  TrendingDown,
  UploadCloud,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { VehicleCard } from '../components/VehicleCard';
import { SeoHead } from '../components/SeoHead';
import { OFFICIAL_LOGO_PATH, formatNaira } from '../lib/format';

type HomeCollectionTab =
  | 'all'
  | 'featured'
  | 'affordable'
  | 'luxury'
  | 'installment'
  | 'reduced';

const BODY_CATEGORIES = [
  { label: 'SUVs', value: 'SUV' },
  { label: 'Sedans', value: 'Sedan' },
  { label: 'Pickups', value: 'Pickup' },
  { label: 'Coupes', value: 'Coupe' },
  { label: 'Hatchbacks', value: 'Hatchback' },
  { label: 'Buses & Vans', value: 'Bus' },
];

export function HomePage() {
  const { vehicles, vehiclesLoading, settings, testimonials, isAdmin } = useApp();
  const [heroSearch, setHeroSearch] = useState('');
  const [activeTab, setActiveTab] = useState<HomeCollectionTab>('all');
  const navigate = useNavigate();

  const availableVehicles = useMemo(
    () => vehicles.filter((v) => v.status !== 'sold'),
    [vehicles]
  );

  const featuredVehicles = useMemo(
    () => availableVehicles.filter((v) => v.featured),
    [availableVehicles]
  );

  const affordableVehicles = useMemo(
    () => availableVehicles.filter((v) => v.priceNgn <= 15000000),
    [availableVehicles]
  );

  const luxuryVehicles = useMemo(
    () => availableVehicles.filter((v) => v.priceNgn >= 30000000),
    [availableVehicles]
  );

  const installmentVehicles = useMemo(
    () => availableVehicles.filter((v) => v.financingAvailable || v.saveToOwnAvailable),
    [availableVehicles]
  );

  const reducedVehicles = useMemo(
    () =>
      availableVehicles.filter(
        (v) => typeof v.previousPriceNgn === 'number' && v.previousPriceNgn > v.priceNgn
      ),
    [availableVehicles]
  );

  const brandCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of availableVehicles) {
      map[v.make.toLowerCase()] = (map[v.make.toLowerCase()] || 0) + 1;
    }
    return map;
  }, [availableVehicles]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of availableVehicles) {
      map[v.bodyType] = (map[v.bodyType] || 0) + 1;
    }
    return map;
  }, [availableVehicles]);

  const displayedVehicles = useMemo(() => {
    switch (activeTab) {
      case 'featured':
        return featuredVehicles;
      case 'affordable':
        return affordableVehicles;
      case 'luxury':
        return luxuryVehicles;
      case 'installment':
        return installmentVehicles;
      case 'reduced':
        return reducedVehicles;
      default:
        return availableVehicles;
    }
  }, [
    availableVehicles,
    featuredVehicles,
    affordableVehicles,
    luxuryVehicles,
    installmentVehicles,
    reducedVehicles,
    activeTab,
  ]);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroSearch.trim();
    navigate(q ? `/cars?q=${encodeURIComponent(q)}` : '/cars');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SeoHead
        title="Car Depot by Ultimate Autos | Foreign & Nigerian Used Cars in Lagos"
        description="Buy, sell, finance or save towards owning your next vehicle with Car Depot by Ultimate Autos — Your Trusted Car Partner in Lagos, Nigeria."
      />

      {/* Compact Automotive Hero Banner (fast access to vehicles on Android mobile) */}
      <section className="bg-[#0B0D10] text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <p className="text-xs font-semibold tracking-wider text-red-500 uppercase">
                {settings.tagline}
              </p>
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-[1.1] text-balance">
                FIND YOUR DREAM CAR. PAY YOUR WAY.
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                Buy, sell, finance or save towards owning your next vehicle. Verified foreign and Nigerian used vehicles in Lagos with transparent dealership support.
              </p>

              {/* Hero Search */}
              <form
                onSubmit={handleHeroSearch}
                className="flex items-center bg-white rounded-xl overflow-hidden shadow-lg max-w-xl"
              >
                <Search className="w-5 h-5 text-slate-400 ml-3.5 shrink-0" />
                <input
                  type="search"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Search Toyota Camry, Lexus RX 350, SUV..."
                  aria-label="Search cars"
                  className="w-full px-3 py-3.5 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors"
                >
                  Search
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/cars"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-100 text-sm font-semibold rounded-xl transition-colors"
                >
                  Browse Cars
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/sell-your-car"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  Sell Your Car
                </Link>
              </div>
            </div>

            {/* Right Visual Showcase (Official Brand Lockup + Architectural Showroom Graphic) */}
            <div className="lg:col-span-5 hidden sm:block">
              <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-[#151921] to-black border border-slate-800 p-6 overflow-hidden">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 400 180"
                  className="w-full h-36 opacity-25 mb-2"
                  fill="none"
                >
                  <path
                    d="M25 130 C55 128, 82 95, 130 78 C178 60, 248 58, 295 82 C330 98, 362 110, 382 126"
                    stroke="#DC2626"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M15 142 H385"
                    stroke="#94A3B8"
                    strokeWidth="1.2"
                    strokeDasharray="6 6"
                  />
                  <circle cx="105" cy="136" r="24" stroke="#E2E8F0" strokeWidth="2" />
                  <circle cx="305" cy="136" r="24" stroke="#E2E8F0" strokeWidth="2" />
                </svg>
                <div className="flex flex-col items-center text-center">
                  <img
                    src={OFFICIAL_LOGO_PATH}
                    alt="Car Depot by Ultimate Autos"
                    className="h-24 w-auto object-contain mb-3"
                    referrerPolicy="no-referrer"
                  />
                  <p className="text-xs text-slate-300 font-medium">
                    {settings.publicListingTitle}
                  </p>
                  <p className="font-mono-num text-xs text-slate-400 mt-1">
                    WhatsApp &amp; Sales: {settings.whatsappNumber}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Prominent Service Shortcuts */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-7">
            <Link
              to="/cars"
              className="group bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl p-4 flex items-center gap-3 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-red-600/15 text-red-500 flex items-center justify-center shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-semibold text-sm text-white truncate">
                  Buy a Car
                </p>
                <p className="text-xs text-slate-400 truncate">Verified inventory</p>
              </div>
            </Link>

            <Link
              to="/financing"
              className="group bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl p-4 flex items-center gap-3 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-700/40 text-slate-200 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-semibold text-sm text-white truncate">
                  Buy Now Pay Later
                </p>
                <p className="text-xs text-slate-400 truncate">Car financing plans</p>
              </div>
            </Link>

            <Link
              to="/save-to-own"
              className="group bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl p-4 flex items-center gap-3 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-700/40 text-slate-200 flex items-center justify-center shrink-0">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-semibold text-sm text-white truncate">
                  Save to Own
                </p>
                <p className="text-xs text-slate-400 truncate">Pay Small Small</p>
              </div>
            </Link>

            <Link
              to="/sell-your-car"
              className="group bg-slate-900/90 hover:bg-slate-800 border border-slate-800 rounded-xl p-4 flex items-center gap-3 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-red-600/15 text-red-500 flex items-center justify-center shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-semibold text-sm text-white truncate">
                  Sell Your Car
                </p>
                <p className="text-xs text-slate-400 truncate">Direct or consignment</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Marketplace Showcase (Immediate Vehicle Visibility) */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900">
              Showroom Vehicles
            </h2>
            <p className="text-sm text-slate-600">
              Explore live vehicles inspected and listed by Car Depot by Ultimate Autos.
            </p>
          </div>
          <Link
            to="/cars"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 whitespace-nowrap"
          >
            View All Filters
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Interactive Marketplace Collection Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-5">
          {(
            [
              { id: 'all', label: 'Recently Added' },
              { id: 'featured', label: 'Featured' },
              { id: 'affordable', label: 'Affordable (≤ ₦15M)' },
              { id: 'luxury', label: 'Luxury Vehicles' },
              { id: 'installment', label: 'Available on Installment' },
              { id: 'reduced', label: 'Recently Reduced' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#0B0D10] text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {vehiclesLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white border border-slate-200 rounded-xl h-64 animate-pulse"
              />
            ))}
          </div>
        ) : displayedVehicles.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center">
            <Car className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="font-display font-bold text-lg text-slate-900 mb-1">
              {availableVehicles.length === 0
                ? 'Live Showroom Inventory Coming Soon'
                : 'No vehicles match this category right now'}
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              {availableVehicles.length === 0
                ? 'Our dealership team has not published live vehicles in this view yet. Tell us the exact car you want and we will source and send you a verified quotation.'
                : 'Try switching tabs or submit a Car Quotation request for the exact model you are looking for.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/request-car"
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Request a Car Quotation
              </Link>
              <Link
                to="/sell-your-car"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Sell Your Vehicle
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-800 text-sm font-semibold rounded-xl transition-colors"
                >
                  Add Vehicle in Admin
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {displayedVehicles.slice(0, 12).map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}
      </section>

      {/* Popular Brands & Cars by Category */}
      <section className="bg-white border-y border-slate-200 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900 mb-4">
              Popular Car Brands
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {settings.popularBrands.map((brand) => {
                const count = brandCounts[brand.toLowerCase()] || 0;
                return (
                  <Link
                    key={brand}
                    to={`/cars?make=${encodeURIComponent(brand)}`}
                    className="group px-3 py-3 bg-slate-50 hover:bg-slate-900 hover:text-white border border-slate-200 rounded-xl text-center transition-colors"
                  >
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-white truncate">
                      {brand}
                    </p>
                    <p className="text-[11px] font-mono-num text-slate-500 group-hover:text-slate-300 mt-0.5">
                      {count} {count === 1 ? 'car' : 'cars'}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900 mb-4">
              Cars by Category
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {BODY_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.value] || 0;
                return (
                  <Link
                    key={cat.value}
                    to={`/cars?bodyType=${encodeURIComponent(cat.value)}`}
                    className="px-4 py-3 bg-slate-50 hover:border-red-500 border border-slate-200 rounded-xl flex items-center justify-between text-sm font-semibold text-slate-800 transition-colors"
                  >
                    <div>
                      <span className="block">{cat.label}</span>
                      <span className="block text-[11px] font-mono-num font-normal text-slate-500">
                        {count} available
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Jiji-Style Marketplace Sections */}
      {!vehiclesLoading && availableVehicles.length > 0 && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-8 space-y-10">
          {featuredVehicles.length > 0 && (
            <section>
              <div className="flex items-end justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900">
                    Featured Showroom Vehicles
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Hand-picked dealership highlights ready for inspection and immediate delivery.
                  </p>
                </div>
                <Link
                  to="/cars?featured=1"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 whitespace-nowrap"
                >
                  See All Featured
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {featuredVehicles.slice(0, 4).map((v) => (
                  <VehicleCard key={`feat-${v.id}`} vehicle={v} />
                ))}
              </div>
            </section>
          )}

          {affordableVehicles.length > 0 && (
            <section>
              <div className="flex items-end justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900">
                    Affordable Vehicles (₦15M &amp; Under)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Budget-friendly, inspected Nigerian and Foreign Used cars for daily driving.
                  </p>
                </div>
                <Link
                  to="/cars?maxPrice=15000000"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 whitespace-nowrap"
                >
                  View Affordable Cars
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {affordableVehicles.slice(0, 4).map((v) => (
                  <VehicleCard key={`aff-${v.id}`} vehicle={v} />
                ))}
              </div>
            </section>
          )}

          {luxuryVehicles.length > 0 && (
            <section>
              <div className="flex items-end justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900">
                    Luxury &amp; Executive Collection
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Premium SUVs and executive sedans with verified customs clearance.
                  </p>
                </div>
                <Link
                  to="/cars?minPrice=30000000"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 whitespace-nowrap"
                >
                  View Luxury Fleet
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {luxuryVehicles.slice(0, 4).map((v) => (
                  <VehicleCard key={`lux-${v.id}`} vehicle={v} />
                ))}
              </div>
            </section>
          )}

          {installmentVehicles.length > 0 && (
            <section>
              <div className="flex items-end justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900">
                    Available on Installment (Financing &amp; Save to Own)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Apply for Buy Now Pay Later financing or contribute toward ownership via Save to Own.
                  </p>
                </div>
                <Link
                  to="/cars?financing=1"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 whitespace-nowrap"
                >
                  Explore Installment Cars
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {installmentVehicles.slice(0, 4).map((v) => (
                  <VehicleCard key={`inst-${v.id}`} vehicle={v} />
                ))}
              </div>
            </section>
          )}

          {reducedVehicles.length > 0 && (
            <section>
              <div className="flex items-end justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-display font-bold text-lg sm:text-xl text-slate-900 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    Recently Reduced Prices
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Limited-time showroom price reductions across select inspected vehicles.
                  </p>
                </div>
                <Link
                  to="/cars?reduced=1"
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 whitespace-nowrap"
                >
                  View Price Drops
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {reducedVehicles.slice(0, 4).map((v) => (
                  <VehicleCard key={`red-${v.id}`} vehicle={v} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Admin-Managed Financing & Save to Own Promotional Banners */}
      {settings.promoBanners?.some((b) => b.active) && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settings.promoBanners
              .filter((b) => b.active)
              .map((banner, idx) => (
                <div
                  key={banner.id}
                  className={`rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${
                    idx === 0
                      ? 'bg-[#0B0D10] text-white border-slate-800'
                      : 'bg-white text-slate-900 border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-base sm:text-lg">{banner.title}</h3>
                    <p
                      className={`text-xs sm:text-sm ${
                        idx === 0 ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {banner.subtitle}
                    </p>
                  </div>
                  <Link
                    to={banner.ctaPath || '/cars'}
                    className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 transition-colors ${
                      idx === 0
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    {banner.ctaLabel || 'Learn More'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Financing, Save to Own & Sell Your Car Promotions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-[#0B0D10] text-white rounded-2xl p-6 flex flex-col justify-between border border-slate-800">
            <div>
              <CreditCard className="w-7 h-7 text-red-500 mb-3" />
              <h3 className="font-display font-bold text-lg mb-2">
                Buy Now Pay Later Financing
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Select an eligible vehicle, propose your deposit and repayment duration, and submit supporting documents for dealership review. All applications are subject to verification and approval.
              </p>
            </div>
            <Link
              to="/financing"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Explore Car Financing
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <PiggyBank className="w-7 h-7 text-red-600 mb-3" />
              <h3 className="font-display font-bold text-lg text-slate-900 mb-2">
                Save to Own (Pay Small Small)
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Build steadily toward your next car with weekly or monthly contributions. Monitor your verified savings progress, upload receipts, and review transparent price-lock and refund policies.
              </p>
            </div>
            <Link
              to="/save-to-own"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Start Save to Own
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <Tag className="w-7 h-7 text-slate-800 mb-3" />
              <h3 className="font-display font-bold text-lg text-slate-900 mb-2">
                Sell Your Car with Ultimate Autos
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Choose Direct Purchase for an outright dealership offer or Consignment so Car Depot markets and sells your vehicle to verified buyers on your behalf.
              </p>
            </div>
            <Link
              to="/sell-your-car"
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-300 hover:bg-slate-100 text-slate-900 text-sm font-semibold rounded-xl transition-colors"
            >
              Get a Vehicle Valuation
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Request a Car Quotation Banner */}
      <section className="bg-[#0B0D10] text-white py-10 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-balance">
              CAN&apos;T FIND THE CAR YOU WANT? LET US FIND IT FOR YOU.
            </h2>
            <p className="text-sm sm:text-base text-slate-300">
              Tell us your preferred brand, model, year, condition, budget in Naira, and payment preference (Outright, Installment, or Financing) for a custom dealership quotation.
            </p>
          </div>
          <Link
            to="/request-car"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl whitespace-nowrap shrink-0 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Request a Car Quotation
          </Link>
        </div>
      </section>

      {/* Verified Customer Testimonials (Strictly Admin-Published from Firestore) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display font-bold text-xl text-slate-900">
              Customer Testimonials
            </h2>
            <p className="text-sm text-slate-600">
              Verified feedback from Car Depot by Ultimate Autos buyers and sellers.
            </p>
          </div>
        </div>

        {testimonials.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-600">
            <ShieldCheck className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            Verified customer testimonials published by our dealership administration will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <p className="text-sm text-slate-700 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="pt-3 border-t border-slate-100">
                  <p className="font-semibold text-sm text-slate-900">{t.customerName}</p>
                  <p className="text-xs text-slate-500">
                    {t.vehiclePurchased} · {t.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

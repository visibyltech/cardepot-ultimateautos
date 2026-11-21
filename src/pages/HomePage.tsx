import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Car,
  Truck,
  Bus,
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

const HERO_SLIDES = [
  { src: '/assets/vehicles/range-rover-sport-2020-1.jpg', alt: 'Range Rover Sport' },
  { src: '/assets/vehicles/lexus-rx350-2020-1.jpg', alt: 'Lexus RX 350' },
  { src: '/assets/vehicles/mercedes-gle-2021-1.jpg', alt: 'Mercedes-Benz GLE' },
  { src: '/assets/vehicles/toyota-prado-2021-1.jpg', alt: 'Toyota Land Cruiser Prado' },
  { src: '/assets/vehicles/lexus-es350-2020-1.jpg', alt: 'Lexus ES 350' },
];

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

const BRAND_LOGO_SLUGS: Record<string, string> = {
  toyota: 'toyota',
  lexus: 'lexus',
  hyundai: 'hyundai',
  ford: 'ford',
  'land rover': 'landrover',
  landrover: 'landrover',
  kia: 'kia',
  honda: 'honda',
  mercedes: 'mercedesbenz',
  'mercedes-benz': 'mercedesbenz',
  bmw: 'bmw',
  nissan: 'nissan',
  volkswagen: 'volkswagen',
  audi: 'audi',
  jeep: 'jeep',
  mazda: 'mazda',
  mitsubishi: 'mitsubishi',
  peugeot: 'peugeot',
  volvo: 'volvo',
  chevrolet: 'chevrolet',
  porsche: 'porsche',
  jaguar: 'jaguar',
  'range rover': 'landrover',
};

function getBrandLogo(brand: string) {
  return BRAND_LOGO_SLUGS[brand.trim().toLowerCase()] || null;
}

function CategoryIcon({ value }: { value: string }) {
  if (value === 'Pickup') return <Truck className="h-10 w-10" strokeWidth={1.5} />;
  if (value === 'Bus') return <Bus className="h-10 w-10" strokeWidth={1.5} />;
  return <Car className="h-10 w-10" strokeWidth={1.5} />;
}

export function HomePage() {
  const { vehicles, vehiclesLoading, settings, testimonials, isAdmin } = useApp();
  const [heroSearch, setHeroSearch] = useState('');
  const [heroSlide, setHeroSlide] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHeroSlide((current) => (current + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, []);

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

      {/* Premium image-led automotive hero */}
      <section className="bg-[#090B10] text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 sm:pt-7 pb-6 sm:pb-8">
          <div className="relative isolate min-h-[430px] sm:min-h-[470px] overflow-hidden rounded-[26px] sm:rounded-[32px] bg-[#111722] shadow-2xl shadow-black/30">
            {HERO_SLIDES.map((slide, index) => (
              <img
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                aria-hidden={index !== heroSlide}
                className={`absolute inset-0 -z-20 h-full w-full object-cover object-center transition-opacity duration-1000 ease-in-out ${index === heroSlide ? 'opacity-100' : 'opacity-0'}`}
                fetchPriority={index === 0 ? 'high' : 'auto'}
              />
            ))}
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#080A0F] via-[#080A0F]/65 to-[#080A0F]/10 sm:bg-gradient-to-r sm:from-[#080A0F]/95 sm:via-[#080A0F]/65 sm:to-[#080A0F]/10" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/20 via-transparent to-black/25" />
            <div className="absolute bottom-4 right-5 z-10 flex items-center gap-2 sm:bottom-6 sm:right-8" aria-label="Hero vehicle slideshow">
              {HERO_SLIDES.map((slide, index) => (
                <button
                  key={slide.src}
                  type="button"
                  onClick={() => setHeroSlide(index)}
                  aria-label={`Show ${slide.alt}`}
                  aria-current={index === heroSlide ? 'true' : undefined}
                  className={`h-2 rounded-full transition-all duration-300 ${index === heroSlide ? 'w-7 bg-red-500' : 'w-2 bg-white/65 hover:bg-white'}`}
                />
              ))}
            </div>
            <div className="flex min-h-[430px] sm:min-h-[470px] flex-col justify-end sm:justify-center p-5 sm:p-10 lg:p-14">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  CAR DEPOT • LAGOS • NIGERIA
                </div>
                <h1 className="max-w-xl font-display text-[2.25rem] sm:text-5xl lg:text-6xl font-extrabold leading-[1.02] tracking-tight text-white">
                  Find your next car.
                  <span className="mt-1 block text-red-500">Drive your way.</span>
                </h1>
                <p className="mt-3 max-w-md text-sm sm:text-base font-medium leading-relaxed text-slate-200">
                  Quality cars. Flexible ways to own.
                </p>

                <form
                  onSubmit={handleHeroSearch}
                  className="mt-6 flex w-full max-w-xl items-center overflow-hidden rounded-2xl border border-white/70 bg-white p-1.5 shadow-xl shadow-black/20"
                >
                  <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" />
                  <input
                    type="search"
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    placeholder="Search make, model or budget"
                    aria-label="Search cars by make, model or budget"
                    className="min-w-0 w-full bg-transparent px-3 py-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Search vehicles"
                    className="inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white transition-colors hover:bg-red-700"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </form>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    to="/cars"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-950/30 transition-colors hover:bg-red-700"
                  >
                    Explore Cars
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/sell-your-car"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/35 bg-black/30 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
                  >
                    Sell Your Car
                  </Link>
                </div>
                <p className="mt-4 text-[10px] sm:text-xs font-semibold tracking-[0.12em] text-white/75">
                  BUY <span className="px-1 text-red-400">•</span> SELL <span className="px-1 text-red-400">•</span> FINANCE <span className="px-1 text-red-400">•</span> SAVE TO OWN
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <Link
              to="/cars"
              className="group flex min-h-[66px] items-center gap-3 rounded-2xl border border-slate-800 bg-[#111722] px-3.5 py-3 transition-all hover:border-red-500/60 hover:bg-[#171E2A]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <Car className="h-5 w-5" />
              </span>
              <span className="min-w-0 text-sm font-bold text-white">Browse Cars</span>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-red-400" />
            </Link>
            <Link
              to="/financing"
              className="group flex min-h-[66px] items-center gap-3 rounded-2xl border border-slate-800 bg-[#111722] px-3.5 py-3 transition-all hover:border-red-500/60 hover:bg-[#171E2A]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-200">
                <CreditCard className="h-5 w-5" />
              </span>
              <span className="min-w-0 text-sm font-bold text-white">Car Finance</span>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-red-400" />
            </Link>
            <Link
              to="/save-to-own"
              className="group flex min-h-[66px] items-center gap-3 rounded-2xl border border-slate-800 bg-[#111722] px-3.5 py-3 transition-all hover:border-red-500/60 hover:bg-[#171E2A]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-200">
                <PiggyBank className="h-5 w-5" />
              </span>
              <span className="min-w-0 text-sm font-bold text-white">Save to Own</span>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-red-400" />
            </Link>
            <Link
              to="/request-car"
              className="group flex min-h-[66px] items-center gap-3 rounded-2xl border border-slate-800 bg-[#111722] px-3.5 py-3 transition-all hover:border-red-500/60 hover:bg-[#171E2A]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="min-w-0 text-sm font-bold text-white">Find My Car</span>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-red-400" />
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
                const logo = getBrandLogo(brand);
                return (
                  <Link
                    key={brand}
                    to={`/cars?make=${encodeURIComponent(brand)}`}
                    className="group relative isolate min-h-[104px] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 px-3 py-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md"
                  >
                    {logo && (
                      <img
                        src={`https://cdn.simpleicons.org/${logo}`}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="pointer-events-none absolute -right-2 -bottom-2 h-20 w-20 object-contain opacity-[0.09] grayscale transition-all duration-300 group-hover:opacity-[0.16] group-hover:grayscale-0"
                        onError={(event) => { event.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <span className="relative z-10 flex h-10 items-center justify-center">
                      {logo ? (
                        <img
                          src={`https://cdn.simpleicons.org/${logo}`}
                          alt={`${brand} logo`}
                          loading="lazy"
                          className="max-h-8 max-w-[76px] object-contain opacity-75 transition-opacity group-hover:opacity-100"
                          onError={(event) => { event.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="font-display text-lg font-extrabold tracking-tight text-slate-400 group-hover:text-red-600">
                          {brand.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <p className="relative z-10 mt-1 truncate text-sm font-bold text-slate-800">
                      {brand}
                    </p>
                    <p className="relative z-10 mt-0.5 font-mono-num text-[11px] text-slate-500">
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
                    className="group relative isolate min-h-[112px] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-3.5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md"
                  >
                    <div className="relative z-10">
                      <span className="block font-bold">{cat.label}</span>
                      <span className="mt-1 block font-mono-num text-[11px] font-normal text-slate-500">
                        {count} available
                      </span>
                    </div>
                    <span className="pointer-events-none absolute -bottom-2 -right-1 text-slate-300/60 transition-colors group-hover:text-red-200">
                      <CategoryIcon value={cat.value} />
                    </span>
                    <ArrowRight className="absolute bottom-3 left-3.5 z-10 h-4 w-4 text-slate-400 transition-all group-hover:translate-x-1 group-hover:text-red-600" />
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
